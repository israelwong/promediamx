// app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.actions.ts
'use server';

import { z } from 'zod';
// import { revalidatePath } from 'next/cache';
import {
    IniciarConexionWhatsAppInputSchema,
    IniciarConexionWhatsAppOutputSchema,
    DesconectarWhatsAppInputSchema,
    MetaOAuthCallbackQuerySchema,
    WhatsAppOAuthStateSchema,
    ShortLivedTokenResponseSchema,
    LongLivedTokenResponseSchema,
    MetaPhoneNumberDataSchema,
    // MetaUserBusinessAccountSchema, // Importa el schema necesario para whatsapp_business_account
    // MetaUserAccountsResponseSchema // Si necesitas obtener WABAs asociados al usuario
} from './asistenteWhatsAppConfig.schemas';
import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta la ruta a tu cliente Prisma
// import { obtenerUsuarioServidor } from '@/lib/auth'; // Ajusta la ruta a tu helper de autenticación
import { ActionResult } from '@/app/admin/_lib/types';
// import { AsistenteVirtual } from '@prisma/client'; // Importa el tipo si es necesario

// Constantes de Configuración de Meta - ¡Mover a variables de entorno!
// const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID; // Usar NEXT_PUBLIC_ si se lee en cliente, sino solo en server
// const META_APP_SECRET = process.env.META_APP_SECRET;
// const META_API_VERSION = process.env.META_API_VERSION || 'v19.0'; // O la versión que estés usando

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
// Este es el ID de configuración de "Embedded Signup" que obtienes de tu App de Meta.
// Es muy recomendado para un flujo de onboarding más integrado.
const META_EMBEDDED_SIGNUP_CONFIG_ID = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;

// --- 1. Iniciar Proceso de Conexión con WhatsApp (Redirección a Meta) ---
export async function iniciarProcesoConexionWhatsAppAction(
    input: z.infer<typeof IniciarConexionWhatsAppInputSchema>
): Promise<ActionResult<z.infer<typeof IniciarConexionWhatsAppOutputSchema>>> {
    try {

        // const usuario = await obtenerUsuarioServidor(); // Implementar autenticación/autorización
        // if (!usuario) {
        //   return { success: false, error: "No autorizado." };
        // }

        const validation = IniciarConexionWhatsAppInputSchema.safeParse(input);
        if (!validation.success) {
            return { success: false, error: "Datos de entrada inválidos." };
        }

        const { asistenteId, negocioId, clienteId, oauthRedirectUri } = validation.data;

        if (!META_APP_ID) {
            console.error("CRITICAL_ERROR: META_APP_ID no está configurado en las variables de entorno.");
            return { success: false, error: "Error de configuración del servidor: Contacte al administrador (Ref: MAI_NA)." };
        }

        // TODO: Validar que el usuario tiene permisos sobre el negocioId y el asistenteId.
        // Ejemplo:
        // const asistente = await prisma.asistenteVirtual.findFirst({
        //   where: { 
        //     id: asistenteId, 
        //     negocioId: negocioId,
        //     negocio: { clienteId: usuario.clienteId } // Asumiendo que el usuario tiene un clienteId
        //   },
        // });
        // if (!asistente) {
        //   return { success: false, error: "Asistente no encontrado o no tienes permiso para configurarlo." };
        // }

        // El parámetro 'state' es crucial. Lo usaremos para pasar asistenteId y negocioId.
        const stateObject: z.infer<typeof WhatsAppOAuthStateSchema> = { asistenteId, negocioId, clienteId };
        const stateString = Buffer.from(JSON.stringify(stateObject)).toString('base64url'); // base64url es más seguro para URLs

        const metaOAuthUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
        metaOAuthUrl.searchParams.append('client_id', META_APP_ID);
        metaOAuthUrl.searchParams.append('redirect_uri', oauthRedirectUri);
        metaOAuthUrl.searchParams.append('state', stateString);
        metaOAuthUrl.searchParams.append('response_type', 'code'); // Queremos un código de autorización

        // Scopes para WhatsApp Business API
        const scopes = [
            'whatsapp_business_management', // Para administrar activos de WABA
            'whatsapp_business_messaging',  // Para enviar y recibir mensajes
            // 'business_management',          // Para acceder a información de la cuenta de negocios de Meta
        ];
        metaOAuthUrl.searchParams.append('scope', scopes.join(','));

        // Para el flujo de "Embedded Signup"
        if (META_EMBEDDED_SIGNUP_CONFIG_ID) {
            metaOAuthUrl.searchParams.append('config_id', META_EMBEDDED_SIGNUP_CONFIG_ID);

            // Opcionalmente, puedes pre-llenar información si tu config_id lo soporta
            // y si el usuario proporcionó un teléfono.
            // Esta parte es delicada y depende de la configuración de tu config_id en Meta.
            // if (telefonoWhatsAppBusiness) {
            //   const prefillData = { phone_number: telefonoWhatsAppBusiness };
            //   metaOAuthUrl.searchParams.append('prefill_data', JSON.stringify(prefillData));
            // }
        } else {
            // Si no usas config_id, podrías necesitar 'extras' para el flujo de WhatsApp estándar
            // (esto es menos común para el onboarding directo de la API de WhatsApp Cloud)
            // const extras = { setup: { business_vertical: "OTHER" } }; // O un vertical específico
            // metaOAuthUrl.searchParams.append('extras', JSON.stringify(extras));
            console.warn("META_EMBEDDED_SIGNUP_CONFIG_ID no está configurado. Se usará un flujo OAuth más genérico.");
        }

        console.log(`[WhatsApp Connect] Iniciando OAuth para Asistente ${asistenteId}. URL de Meta: ${metaOAuthUrl.toString()}`);
        return { success: true, data: { metaOAuthUrl: metaOAuthUrl.toString() } };

    } catch (error) {
        console.error("Error en iniciarProcesoConexionWhatsAppAction:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
        return { success: false, error: `Ocurrió un error al iniciar la conexión con WhatsApp: ${errorMessage}` };
    }
}

// --- 2. Manejar Callback de OAuth de Meta (Esta es la función compleja) ---
// Esta función será llamada por tu API Route Handler en /api/oauth/whatsapp/callback
// NO es una server action que llames directamente desde un componente de cliente.
// export async function procesarCallbackMetaOAuth(
//     query: z.infer<typeof MetaOAuthCallbackQuerySchema>
// ): Promise<ActionResult<{ asistenteId: string; negocioId: string; clienteId: string }>> { // Incluimos clienteId en el success data
//     console.log("[WhatsApp Callback] Iniciando procesamiento de callback de Meta con query:", query);

//     try {
//         // PASO 0: Validar credenciales de la app y parámetros de entrada
//         if (!META_APP_ID || !META_APP_SECRET) {
//             console.error("CRITICAL_ERROR: Credenciales de Meta (APP_ID o APP_SECRET) no configuradas.");
//             return { success: false, error: "Error de configuración del servidor (Ref: MCS_NC_CB)." };
//         }

//         const queryValidation = MetaOAuthCallbackQuerySchema.safeParse(query);
//         if (!queryValidation.success) {
//             console.error("[WhatsApp Callback] Parámetros de callback inválidos:", queryValidation.error.flatten());
//             return { success: false, error: "Parámetros de callback de Meta inválidos." };
//         }
//         const { code, state: encodedState } = queryValidation.data;
//         console.log(`[WhatsApp Callback] Código recibido: ${code ? 'Sí' : 'No'}, Estado recibido: ${encodedState ? 'Sí' : 'No'}`);

//         // PASO 1: Validar y decodificar el 'state'
//         let oauthState: z.infer<typeof WhatsAppOAuthStateSchema>;
//         try {
//             const decodedStateString = Buffer.from(encodedState, 'base64url').toString('utf-8');
//             const parsedState = WhatsAppOAuthStateSchema.safeParse(JSON.parse(decodedStateString));
//             if (!parsedState.success) {
//                 console.error("[WhatsApp Callback] 'state' parseado con Zod falló:", parsedState.error.flatten());
//                 throw new Error("El parámetro 'state' no pudo ser validado por Zod.");
//             }
//             oauthState = parsedState.data;
//             console.log("[WhatsApp Callback] 'state' decodificado y validado:", oauthState);
//         } catch (e) {
//             const errorMessage = e instanceof Error ? e.message : "Error desconocido al procesar 'state'.";
//             console.error("[WhatsApp Callback] Error al decodificar o parsear el parámetro 'state':", errorMessage, e);
//             return { success: false, error: `Parámetro 'state' inválido o corrupto: ${errorMessage}` };
//         }
//         const { asistenteId, negocioId, clienteId } = oauthState; // clienteId ahora se extrae del state

//         // PASO 2: Intercambiar el código por un token de acceso de corta duración
//         const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
//         const tokenRedirectUri = `${NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`; // Debe coincidir exactamente
//         const tokenParams = new URLSearchParams({
//             client_id: META_APP_ID,
//             redirect_uri: tokenRedirectUri,
//             client_secret: META_APP_SECRET,
//             code: code,
//         });

//         console.log(`[WhatsApp Callback] Solicitando token de corta duración a: ${tokenUrl} con redirect_uri: ${tokenRedirectUri}`);
//         const tokenRes = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
//         const tokenResBodyForLog = await tokenRes.clone().text(); // Clonar para loguear el cuerpo sin consumir el stream

//         if (!tokenRes.ok) {
//             let errorData;
//             try { errorData = await tokenRes.json(); } catch { errorData = { error: { message: tokenResBodyForLog || tokenRes.statusText } }; }
//             console.error("[WhatsApp Callback] Error al obtener token de corta duración de Meta. Status:", tokenRes.status, "Body:", errorData);
//             return { success: false, error: `Error de Meta al obtener token (SLT): ${errorData.error?.message || tokenRes.statusText}` };
//         }
//         const shortLivedTokenData = ShortLivedTokenResponseSchema.parse(await tokenRes.json());
//         const shortLivedToken = shortLivedTokenData.access_token;
//         console.log("[WhatsApp Callback] Token de corta duración obtenido exitosamente.");

//         // PASO 3: Intercambiar token de corta duración por uno de larga duración
//         const longLivedTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
//         const longLivedTokenParams = new URLSearchParams({
//             grant_type: 'fb_exchange_token',
//             client_id: META_APP_ID,
//             client_secret: META_APP_SECRET,
//             fb_exchange_token: shortLivedToken,
//         });

//         console.log(`[WhatsApp Callback] Solicitando token de larga duración a: ${longLivedTokenUrl}`);
//         const longLivedTokenRes = await fetch(`${longLivedTokenUrl}?${longLivedTokenParams.toString()}`);
//         const longLivedTokenResBodyForLog = await longLivedTokenRes.clone().text();

//         if (!longLivedTokenRes.ok) {
//             let errorData;
//             try { errorData = await longLivedTokenRes.json(); } catch { errorData = { error: { message: longLivedTokenResBodyForLog || longLivedTokenRes.statusText } }; }
//             console.error("[WhatsApp Callback] Error al obtener token de larga duración de Meta. Status:", longLivedTokenRes.status, "Body:", errorData);
//             return { success: false, error: `Error de Meta al obtener token (LLT): ${errorData.error?.message || longLivedTokenRes.statusText}` };
//         }
//         const longLivedTokenData = LongLivedTokenResponseSchema.parse(await longLivedTokenRes.json());
//         const longLivedUserAccessToken = longLivedTokenData.access_token;
//         console.log("[WhatsApp Callback] Token de larga duración de usuario obtenido exitosamente.");

//         // PASO 4: Depurar el token de larga duración para entender a qué activos tiene acceso
//         const appToken = `${META_APP_ID}|${META_APP_SECRET}`;
//         const debugTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${longLivedUserAccessToken}&access_token=${appToken}`;

//         console.log(`[WhatsApp Callback] Depurando token de usuario con URL: ${debugTokenUrl}`);
//         const debugTokenRes = await fetch(debugTokenUrl);
//         const debugTokenResBodyForLog = await debugTokenRes.clone().text();

//         if (!debugTokenRes.ok) {
//             let errorData;
//             try { errorData = await debugTokenRes.json(); } catch { errorData = { error: { message: debugTokenResBodyForLog || debugTokenRes.statusText } }; }
//             console.error("[WhatsApp Callback] Error al depurar token de Meta. Status:", debugTokenRes.status, "Body:", errorData);
//             return { success: false, error: `Error de Meta al depurar token: ${errorData.error?.message || debugTokenRes.statusText}` };
//         }
//         const debugTokenData = await debugTokenRes.json(); // Asumimos que esto no falla si debugTokenRes.ok es true
//         console.log("[WhatsApp Callback] Respuesta de debug_token:", JSON.stringify(debugTokenData, null, 2));

//         let wabaIdSeleccionadoPorUsuario: string | undefined;
//         let phoneNumberIdPotencialDeScope: string | undefined;

//         if (debugTokenData.data && debugTokenData.data.granular_scopes) {
//             for (const scopeInfo of debugTokenData.data.granular_scopes) {
//                 if (scopeInfo.scope === 'whatsapp_business_management' && scopeInfo.target_ids && scopeInfo.target_ids.length > 0) {
//                     wabaIdSeleccionadoPorUsuario = scopeInfo.target_ids[0]; // Tomar el primero; el flujo de Meta debería aclarar cuál seleccionó el usuario.
//                     console.log(`[WhatsApp Callback] WABA ID de granular_scopes (whatsapp_business_management - tomando el primero): ${wabaIdSeleccionadoPorUsuario}`);
//                 }
//                 if (scopeInfo.scope === 'whatsapp_business_messaging' && scopeInfo.target_ids && scopeInfo.target_ids.length > 0) {
//                     if (scopeInfo.target_ids[0] !== wabaIdSeleccionadoPorUsuario) {
//                         phoneNumberIdPotencialDeScope = scopeInfo.target_ids[0];
//                         console.log(`[WhatsApp Callback] Phone Number ID potencial de granular_scopes (whatsapp_business_messaging): ${phoneNumberIdPotencialDeScope}`);
//                     } else {
//                         console.log(`[WhatsApp Callback] Permiso de mensajería a nivel de WABA ${scopeInfo.target_ids[0]} según granular_scopes.`);
//                     }
//                 }
//             }
//         }

//         if (!wabaIdSeleccionadoPorUsuario) {
//             console.error("[WhatsApp Callback] No se pudo determinar un WABA ID de los granular_scopes. Respuesta de debug_token:", debugTokenData);
//             return { success: false, error: "No se pudo determinar la Cuenta de WhatsApp Business (WABA ID) autorizada. Asegúrate de seleccionar una cuenta y número durante el proceso con Meta." };
//         }
//         const whatsappBusinessAccountId = wabaIdSeleccionadoPorUsuario;

//         // PASO 5: Con el WABA ID, obtener los números de teléfono asociados
//         const phoneNumbersUrl = `https://graph.facebook.com/${META_API_VERSION}/${whatsappBusinessAccountId}/phone_numbers?access_token=${longLivedUserAccessToken}&fields=id,verified_name,display_phone_number,quality_rating,is_embedded_signup_number`;

//         console.log(`[WhatsApp Callback] Intentando obtener números de teléfono para WABA ID ${whatsappBusinessAccountId} desde: ${phoneNumbersUrl}`);
//         const phoneNumbersRes = await fetch(phoneNumbersUrl);
//         const phoneNumbersResBodyForLog = await phoneNumbersRes.clone().text();

//         if (!phoneNumbersRes.ok) {
//             let errorData;
//             try { errorData = await phoneNumbersRes.json(); } catch { errorData = { error: { message: phoneNumbersResBodyForLog || phoneNumbersRes.statusText } }; }
//             console.error(`[WhatsApp Callback] Error al obtener números de teléfono de Meta para WABA ${whatsappBusinessAccountId}. Status:`, phoneNumbersRes.status, "Body:", errorData);
//             return { success: false, error: `Error de Meta al obtener números para WABA ${whatsappBusinessAccountId}: ${errorData.error?.message || phoneNumbersRes.statusText}` };
//         }
//         const phoneNumbersResponse = await phoneNumbersRes.json();
//         console.log(`[WhatsApp Callback] Respuesta de números de teléfono para WABA ${whatsappBusinessAccountId}:`, JSON.stringify(phoneNumbersResponse, null, 2));

//         if (!phoneNumbersResponse.data || phoneNumbersResponse.data.length === 0) {
//             return { success: false, error: `La Cuenta de WhatsApp Business (ID: ${whatsappBusinessAccountId}) no tiene números de teléfono accesibles.` };
//         }

//         type PhoneNumberData = z.infer<typeof MetaPhoneNumberDataSchema> & { is_embedded_signup_number?: boolean };
//         let selectedPhoneNumberRaw: PhoneNumberData | undefined;
//         if (phoneNumberIdPotencialDeScope && phoneNumberIdPotencialDeScope !== whatsappBusinessAccountId) {
//             selectedPhoneNumberRaw = phoneNumbersResponse.data.find((p: PhoneNumberData) => p.id === phoneNumberIdPotencialDeScope);
//             if (selectedPhoneNumberRaw) {
//                 console.log(`[WhatsApp Callback] Número de teléfono seleccionado vía granular_scope de mensajería: ${phoneNumberIdPotencialDeScope}`);
//             } else {
//                 console.warn(`[WhatsApp Callback] Phone Number ID ${phoneNumberIdPotencialDeScope} de granular_scopes no encontrado en la lista de WABA ${whatsappBusinessAccountId}. Se buscará por 'is_embedded_signup_number' o se usará el primero.`);
//             }
//         }

//         if (!selectedPhoneNumberRaw) {
//             selectedPhoneNumberRaw = phoneNumbersResponse.data.find((p: PhoneNumberData) => p.is_embedded_signup_number === true);
//             if (selectedPhoneNumberRaw) {
//                 console.log(`[WhatsApp Callback] Número de teléfono seleccionado por 'is_embedded_signup_number': ${selectedPhoneNumberRaw.id}`);
//             }
//         }

//         if (!selectedPhoneNumberRaw && phoneNumbersResponse.data.length === 1) {
//             selectedPhoneNumberRaw = phoneNumbersResponse.data[0];
//             if (selectedPhoneNumberRaw) {
//                 console.log(`[WhatsApp Callback] Solo un número de teléfono encontrado para WABA ${whatsappBusinessAccountId}. Seleccionando: ${selectedPhoneNumberRaw.id}`);
//             } else {
//                 console.warn(`[WhatsApp Callback] Solo un número de teléfono encontrado para WABA ${whatsappBusinessAccountId}, pero no se pudo seleccionar.`);
//             }
//         }

//         if (!selectedPhoneNumberRaw && phoneNumbersResponse.data.length > 1) {
//             selectedPhoneNumberRaw = phoneNumbersResponse.data[0]; // Fallback al primero
//             if (selectedPhoneNumberRaw) {
//                 console.warn(`[WhatsApp Callback] Múltiples números de teléfono para WABA ${whatsappBusinessAccountId}. ADVERTENCIA: Tomando el primer número ${selectedPhoneNumberRaw.id} por defecto debido a ambigüedad. Idealmente, el flujo de Meta o una UI posterior debería permitir selección explícita.`);
//             } else {
//                 console.warn(`[WhatsApp Callback] Múltiples números de teléfono para WABA ${whatsappBusinessAccountId}. ADVERTENCIA: No se pudo seleccionar el primer número por defecto debido a que es undefined.`);
//             }
//         }

//         if (!selectedPhoneNumberRaw) {
//             return { success: false, error: `No se pudo identificar un número de teléfono específico para la WABA ${whatsappBusinessAccountId}.` };
//         }

//         const selectedPhoneNumberDataValidation = MetaPhoneNumberDataSchema.safeParse(selectedPhoneNumberRaw);
//         if (!selectedPhoneNumberDataValidation.success) {
//             console.error("[WhatsApp Callback] Datos del número de teléfono seleccionado de Meta no válidos:", selectedPhoneNumberDataValidation.error.flatten(), "Raw Data:", selectedPhoneNumberRaw);
//             return { success: false, error: "Respuesta de Meta para el número de teléfono seleccionado no tiene el formato esperado." };
//         }
//         const {
//             id: finalPhoneNumberId,
//             verified_name: whatsappDisplayName,
//             display_phone_number: whatsappBusiness,
//             quality_rating: whatsappQualityRating,
//         } = selectedPhoneNumberDataValidation.data;

//         console.log(`[WhatsApp Callback] Número de teléfono final seleccionado: ID=${finalPhoneNumberId}, DisplayName=${whatsappDisplayName}, Number=${whatsappBusiness}`);

//         // PASO 6: Actualizar la base de datos con la nueva configuración
//         console.log(`[WhatsApp Callback] Actualizando AsistenteVirtual ID: ${asistenteId} en BD.`);
//         await prisma.asistenteVirtual.update({
//             where: { id: asistenteId, negocioId: negocioId }, // Asegurar que pertenece al negocio correcto
//             data: {
//                 token: longLivedUserAccessToken,
//                 phoneNumberId: finalPhoneNumberId,
//                 whatsappBusinessAccountId: whatsappBusinessAccountId,
//                 whatsappDisplayName: whatsappDisplayName,
//                 whatsappBusiness: whatsappBusiness,
//                 whatsappQualityRating: whatsappQualityRating,
//                 whatsappConnectionStatus: 'CONECTADO',
//                 whatsappTokenLastSet: new Date(),
//             },
//         });

//         console.log(`[WhatsApp Callback] Base de datos actualizada para Asistente ${asistenteId}.`);

//         // Revalidar la ruta del asistente para que la UI se actualice
//         // La construcción de la ruta necesita el clienteId
//         const pathUserIsOn = `/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`;
//         revalidatePath(pathUserIsOn);
//         console.log(`[WhatsApp Callback] Path revalidado: ${pathUserIsOn}`);

//         console.log(`[WhatsApp Callback] Callback procesado exitosamente para Asistente ${asistenteId}.`);
//         return { success: true, data: { asistenteId, negocioId, clienteId } }; // Devolver clienteId para la redirección

//     } catch (error) {
//         const errorMessage = error instanceof Error ? error.message : "Error desconocido durante el callback.";
//         console.error("[WhatsApp Callback] Error general en procesarCallbackMetaOAuth:", errorMessage, error);
//         // Intentar obtener IDs del state para una redirección más útil en caso de error no manejado
//         let errorAsistenteId, errorNegocioId, errorClienteId;
//         if (query.state) { // Usar el 'state' original del query si oauthState no se populó
//             try {
//                 const decodedStateString = Buffer.from(query.state, 'base64url').toString('utf-8');
//                 const parsedState = WhatsAppOAuthStateSchema.parse(JSON.parse(decodedStateString));
//                 errorAsistenteId = parsedState.asistenteId;
//                 errorNegocioId = parsedState.negocioId;
//                 errorClienteId = parsedState.clienteId;
//             } catch { /* Ignorar si falla, la redirección será genérica */ }
//         }

//         return {
//             success: false,
//             error: `Error al procesar la conexión con WhatsApp: ${errorMessage}`,
//             // Devolver los IDs si se pudieron obtener del state, para una mejor redirección de error
//             data: (errorAsistenteId && errorNegocioId && errorClienteId)
//                 ? { asistenteId: errorAsistenteId, negocioId: errorNegocioId, clienteId: errorClienteId }
//                 : undefined
//         };
//     }
// }

// --- 2. Manejar Callback de OAuth de Meta ---
export async function procesarCallbackMetaOAuth(
    query: z.infer<typeof MetaOAuthCallbackQuerySchema>
): Promise<ActionResult<{ asistenteId: string; negocioId: string; clienteId: string }>> { // Incluimos clienteId en el success data
    console.log("[WhatsApp Callback] Iniciando procesamiento de callback de Meta con query:", query);

    try {
        // PASO 0: Validar credenciales de la app y parámetros de entrada
        if (!META_APP_ID || !META_APP_SECRET) {
            console.error("CRITICAL_ERROR: Credenciales de Meta (APP_ID o APP_SECRET) no configuradas.");
            return { success: false, error: "Error de configuración del servidor (Ref: MCS_NC_CB)." };
        }

        const queryValidation = MetaOAuthCallbackQuerySchema.safeParse(query);
        if (!queryValidation.success) {
            console.error("[WhatsApp Callback] Parámetros de callback inválidos:", queryValidation.error.flatten());
            return { success: false, error: "Parámetros de callback de Meta inválidos." };
        }
        const { code, state: encodedState } = queryValidation.data;
        console.log(`[WhatsApp Callback] Código recibido: ${code ? 'Sí' : 'No'}, Estado recibido: ${encodedState ? 'Sí' : 'No'}`);

        // PASO 1: Validar y decodificar el 'state'
        let oauthState: z.infer<typeof WhatsAppOAuthStateSchema>;
        try {
            const decodedStateString = Buffer.from(encodedState, 'base64url').toString('utf-8');
            const parsedState = WhatsAppOAuthStateSchema.safeParse(JSON.parse(decodedStateString));
            if (!parsedState.success) {
                console.error("[WhatsApp Callback] 'state' parseado con Zod falló:", parsedState.error.flatten());
                throw new Error("El parámetro 'state' no pudo ser validado por Zod.");
            }
            oauthState = parsedState.data;
            console.log("[WhatsApp Callback] 'state' decodificado y validado:", oauthState);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Error desconocido al procesar 'state'.";
            console.error("[WhatsApp Callback] Error al decodificar o parsear el parámetro 'state':", errorMessage, e);
            return { success: false, error: `Parámetro 'state' inválido o corrupto: ${errorMessage}` };
        }
        const { asistenteId, negocioId, clienteId } = oauthState; // clienteId ahora se extrae del state

        // PASO 2: Intercambiar el código por un token de acceso de corta duración
        const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
        const tokenRedirectUri = `${NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`; // Debe coincidir exactamente
        const tokenParams = new URLSearchParams({
            client_id: META_APP_ID,
            redirect_uri: tokenRedirectUri,
            client_secret: META_APP_SECRET,
            code: code,
        });

        console.log(`[WhatsApp Callback] Solicitando token de corta duración a: ${tokenUrl} con redirect_uri: ${tokenRedirectUri}`);
        const tokenRes = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
        const tokenResBodyForLog = await tokenRes.clone().text(); // Clonar para loguear el cuerpo sin consumir el stream

        if (!tokenRes.ok) {
            let errorData;
            try { errorData = await tokenRes.json(); } catch { errorData = { error: { message: tokenResBodyForLog || tokenRes.statusText } }; }
            console.error("[WhatsApp Callback] Error al obtener token de corta duración de Meta. Status:", tokenRes.status, "Body:", errorData);
            return { success: false, error: `Error de Meta al obtener token (SLT): ${errorData.error?.message || tokenRes.statusText}` };
        }
        const shortLivedTokenData = ShortLivedTokenResponseSchema.parse(await tokenRes.json());
        const shortLivedToken = shortLivedTokenData.access_token;
        console.log("[WhatsApp Callback] Token de corta duración obtenido exitosamente.");

        // PASO 3: Intercambiar token de corta duración por uno de larga duración
        const longLivedTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
        const longLivedTokenParams = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: META_APP_ID,
            client_secret: META_APP_SECRET,
            fb_exchange_token: shortLivedToken,
        });

        console.log(`[WhatsApp Callback] Solicitando token de larga duración a: ${longLivedTokenUrl}`);
        const longLivedTokenRes = await fetch(`${longLivedTokenUrl}?${longLivedTokenParams.toString()}`);
        const longLivedTokenResBodyForLog = await longLivedTokenRes.clone().text();

        if (!longLivedTokenRes.ok) {
            let errorData;
            try { errorData = await longLivedTokenRes.json(); } catch { errorData = { error: { message: longLivedTokenResBodyForLog || longLivedTokenRes.statusText } }; }
            console.error("[WhatsApp Callback] Error al obtener token de larga duración de Meta. Status:", longLivedTokenRes.status, "Body:", errorData);
            return { success: false, error: `Error de Meta al obtener token (LLT): ${errorData.error?.message || longLivedTokenRes.statusText}` };
        }
        const longLivedTokenData = LongLivedTokenResponseSchema.parse(await longLivedTokenRes.json());
        const longLivedUserAccessToken = longLivedTokenData.access_token;
        console.log("[WhatsApp Callback] Token de larga duración de usuario obtenido exitosamente.");

        // PASO 4: Depurar el token de larga duración para entender a qué activos tiene acceso
        const appToken = `${META_APP_ID}|${META_APP_SECRET}`;
        const debugTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${longLivedUserAccessToken}&access_token=${appToken}`;

        console.log(`[WhatsApp Callback] Depurando token de usuario con URL: ${debugTokenUrl}`);
        const debugTokenRes = await fetch(debugTokenUrl);
        const debugTokenResBodyForLog = await debugTokenRes.clone().text();

        if (!debugTokenRes.ok) {
            let errorData;
            try { errorData = await debugTokenRes.json(); } catch { errorData = { error: { message: debugTokenResBodyForLog || debugTokenRes.statusText } }; }
            console.error("[WhatsApp Callback] Error al depurar token de Meta. Status:", debugTokenRes.status, "Body:", errorData);
            return { success: false, error: `Error de Meta al depurar token: ${errorData.error?.message || debugTokenRes.statusText}` };
        }
        const debugTokenData = await debugTokenRes.json(); // Asumimos que esto no falla si debugTokenRes.ok es true
        console.log("[WhatsApp Callback] Respuesta de debug_token:", JSON.stringify(debugTokenData, null, 2));

        let wabaIdSeleccionadoPorUsuario: string | undefined;
        let phoneNumberIdPotencialDeScope: string | undefined;

        if (debugTokenData.data && debugTokenData.data.granular_scopes) {
            for (const scopeInfo of debugTokenData.data.granular_scopes) {
                if (scopeInfo.scope === 'whatsapp_business_management' && scopeInfo.target_ids && scopeInfo.target_ids.length > 0) {
                    wabaIdSeleccionadoPorUsuario = scopeInfo.target_ids[0]; // Tomar el primero; el flujo de Meta debería aclarar cuál seleccionó el usuario.
                    console.log(`[WhatsApp Callback] WABA ID de granular_scopes (whatsapp_business_management - tomando el primero): ${wabaIdSeleccionadoPorUsuario}`);
                }
                if (scopeInfo.scope === 'whatsapp_business_messaging' && scopeInfo.target_ids && scopeInfo.target_ids.length > 0) {
                    if (wabaIdSeleccionadoPorUsuario && scopeInfo.target_ids[0] !== wabaIdSeleccionadoPorUsuario) { // Comparar con el WABA ID ya identificado
                        phoneNumberIdPotencialDeScope = scopeInfo.target_ids[0];
                        console.log(`[WhatsApp Callback] Phone Number ID potencial de granular_scopes (whatsapp_business_messaging): ${phoneNumberIdPotencialDeScope}`);
                    } else if (wabaIdSeleccionadoPorUsuario) { // Solo loguear si wabaIdSeleccionadoPorUsuario está definido
                        console.log(`[WhatsApp Callback] Permiso de mensajería a nivel de WABA ${scopeInfo.target_ids[0]} según granular_scopes.`);
                    }
                }
            }
        }

        if (!wabaIdSeleccionadoPorUsuario) {
            console.error("[WhatsApp Callback] No se pudo determinar un WABA ID de los granular_scopes. Respuesta de debug_token:", debugTokenData);
            return { success: false, error: "No se pudo determinar la Cuenta de WhatsApp Business (WABA ID) autorizada. Asegúrate de seleccionar una cuenta y número durante el proceso con Meta." };
        }
        const whatsappBusinessAccountId = wabaIdSeleccionadoPorUsuario;

        // PASO 5: Con el WABA ID, obtener los números de teléfono asociados
        const phoneNumbersUrl = `https://graph.facebook.com/${META_API_VERSION}/${whatsappBusinessAccountId}/phone_numbers?access_token=${longLivedUserAccessToken}&fields=id,verified_name,display_phone_number,quality_rating,is_embedded_signup_number`;

        console.log(`[WhatsApp Callback] Intentando obtener números de teléfono para WABA ID ${whatsappBusinessAccountId} desde: ${phoneNumbersUrl}`);
        const phoneNumbersRes = await fetch(phoneNumbersUrl);
        const phoneNumbersResBodyForLog = await phoneNumbersRes.clone().text();

        if (!phoneNumbersRes.ok) {
            let errorData;
            try { errorData = await phoneNumbersRes.json(); } catch { errorData = { error: { message: phoneNumbersResBodyForLog || phoneNumbersRes.statusText } }; }
            console.error(`[WhatsApp Callback] Error al obtener números de teléfono de Meta para WABA ${whatsappBusinessAccountId}. Status:`, phoneNumbersRes.status, "Body:", errorData);
            return { success: false, error: `Error de Meta al obtener números para WABA ${whatsappBusinessAccountId}: ${errorData.error?.message || phoneNumbersRes.statusText}` };
        }
        const phoneNumbersResponse = await phoneNumbersRes.json();
        console.log(`[WhatsApp Callback] Respuesta de números de teléfono para WABA ${whatsappBusinessAccountId}:`, JSON.stringify(phoneNumbersResponse, null, 2));

        if (!phoneNumbersResponse.data || phoneNumbersResponse.data.length === 0) {
            return { success: false, error: `La Cuenta de WhatsApp Business (ID: ${whatsappBusinessAccountId}) no tiene números de teléfono accesibles.` };
        }

        type PhoneNumberData = z.infer<typeof MetaPhoneNumberDataSchema> & { is_embedded_signup_number?: boolean };
        let selectedPhoneNumberRaw: PhoneNumberData | undefined;
        if (phoneNumberIdPotencialDeScope && phoneNumberIdPotencialDeScope !== whatsappBusinessAccountId) {
            selectedPhoneNumberRaw = phoneNumbersResponse.data.find((p: PhoneNumberData) => p.id === phoneNumberIdPotencialDeScope);
            if (selectedPhoneNumberRaw) {
                console.log(`[WhatsApp Callback] Número de teléfono seleccionado vía granular_scope de mensajería: ${phoneNumberIdPotencialDeScope}`);
            } else {
                console.warn(`[WhatsApp Callback] Phone Number ID ${phoneNumberIdPotencialDeScope} de granular_scopes no encontrado en la lista de WABA ${whatsappBusinessAccountId}. Se buscará por 'is_embedded_signup_number' o se usará el primero.`);
            }
        }

        if (!selectedPhoneNumberRaw) {
            selectedPhoneNumberRaw = phoneNumbersResponse.data.find((p: PhoneNumberData) => p.is_embedded_signup_number === true);
            if (selectedPhoneNumberRaw) {
                console.log(`[WhatsApp Callback] Número de teléfono seleccionado por 'is_embedded_signup_number': ${selectedPhoneNumberRaw.id}`);
            }
        }

        if (!selectedPhoneNumberRaw && phoneNumbersResponse.data.length === 1) {
            selectedPhoneNumberRaw = phoneNumbersResponse.data[0];
            if (selectedPhoneNumberRaw) {
                console.log(`[WhatsApp Callback] Solo un número de teléfono encontrado para WABA ${whatsappBusinessAccountId}. Seleccionando: ${selectedPhoneNumberRaw.id}`);
            } else {
                console.warn(`[WhatsApp Callback] Solo un número de teléfono encontrado para WABA ${whatsappBusinessAccountId}, pero no se pudo seleccionar.`);
            }
        }

        if (!selectedPhoneNumberRaw && phoneNumbersResponse.data.length > 1) {
            selectedPhoneNumberRaw = phoneNumbersResponse.data[0]; // Fallback al primero
            if (selectedPhoneNumberRaw) {
                console.warn(`[WhatsApp Callback] Múltiples números de teléfono para WABA ${whatsappBusinessAccountId}. ADVERTENCIA: Tomando el primer número ${selectedPhoneNumberRaw.id} por defecto debido a ambigüedad. Idealmente, el flujo de Meta o una UI posterior debería permitir selección explícita.`);
            } else {
                console.warn(`[WhatsApp Callback] Múltiples números de teléfono para WABA ${whatsappBusinessAccountId}. ADVERTENCIA: No se pudo seleccionar el primer número por defecto debido a que es undefined.`);
            }
        }

        if (!selectedPhoneNumberRaw) {
            return { success: false, error: `No se pudo identificar un número de teléfono específico para la WABA ${whatsappBusinessAccountId}.` };
        }

        const selectedPhoneNumberDataValidation = MetaPhoneNumberDataSchema.safeParse(selectedPhoneNumberRaw);
        if (!selectedPhoneNumberDataValidation.success) {
            console.error("[WhatsApp Callback] Datos del número de teléfono seleccionado de Meta no válidos:", selectedPhoneNumberDataValidation.error.flatten(), "Raw Data:", selectedPhoneNumberRaw);
            return { success: false, error: "Respuesta de Meta para el número de teléfono seleccionado no tiene el formato esperado." };
        }
        const {
            id: finalPhoneNumberId,
            verified_name: whatsappDisplayName,
            display_phone_number: whatsappBusiness,
            quality_rating: whatsappQualityRating,
        } = selectedPhoneNumberDataValidation.data;

        console.log(`[WhatsApp Callback] Número de teléfono final seleccionado: ID=${finalPhoneNumberId}, DisplayName=${whatsappDisplayName}, Number=${whatsappBusiness}`);

        // PASO 6: Actualizar la base de datos con la nueva configuración
        console.log(`[WhatsApp Callback] Actualizando AsistenteVirtual ID: ${asistenteId} en BD.`);
        await prisma.asistenteVirtual.update({
            where: { id: asistenteId, negocioId: negocioId }, // Asegurar que pertenece al negocio correcto
            data: {
                token: longLivedUserAccessToken,
                phoneNumberId: finalPhoneNumberId,
                whatsappBusinessAccountId: whatsappBusinessAccountId,
                whatsappDisplayName: whatsappDisplayName,
                whatsappBusiness: whatsappBusiness,
                whatsappQualityRating: whatsappQualityRating,
                whatsappConnectionStatus: 'CONECTADO',
                whatsappTokenLastSet: new Date(),
            },
        });

        console.log(`[WhatsApp Callback] Base de datos actualizada para Asistente ${asistenteId}.`);

        // Revalidar la ruta del asistente para que la UI se actualice
        // La construcción de la ruta necesita el clienteId
        // const pathUserIsOn = `/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`;
        // revalidatePath(pathUserIsOn); // <--- COMENTADO TEMPORALMENTE
        // console.log(`[WhatsApp Callback] Path revalidado (simulado): ${pathUserIsOn}`);

        console.log(`[WhatsApp Callback] Callback procesado exitosamente para Asistente ${asistenteId}. La revalidación de path está desactivada temporalmente.`);
        return { success: true, data: { asistenteId, negocioId, clienteId } }; // Devolver clienteId para la redirección

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido durante el callback.";
        console.error("[WhatsApp Callback] Error general en procesarCallbackMetaOAuth:", errorMessage, error);
        // Intentar obtener IDs del state para una redirección más útil en caso de error no manejado
        let errorAsistenteId, errorNegocioId, errorClienteId;
        if (query.state) { // Usar el 'state' original del query si oauthState no se populó
            try {
                const decodedStateString = Buffer.from(query.state, 'base64url').toString('utf-8');
                const parsedState = WhatsAppOAuthStateSchema.parse(JSON.parse(decodedStateString));
                errorAsistenteId = parsedState.asistenteId;
                errorNegocioId = parsedState.negocioId;
                errorClienteId = parsedState.clienteId;
            } catch { /* Ignorar si falla, la redirección será genérica */ }
        }

        return {
            success: false,
            error: `Error al procesar la conexión con WhatsApp: ${errorMessage}`,
            // Devolver los IDs si se pudieron obtener del state, para una mejor redirección de error
            data: (errorAsistenteId && errorNegocioId && errorClienteId)
                ? { asistenteId: errorAsistenteId, negocioId: errorNegocioId, clienteId: errorClienteId }
                : undefined
        };
    }
}

// --- 3. Desconectar WhatsApp ---
export async function desconectarWhatsAppAction(
    input: z.infer<typeof DesconectarWhatsAppInputSchema>
): Promise<ActionResult<null>> {
    try {
        // const usuario = await obtenerUsuarioServidor(); // Implementar autenticación/autorización
        // if (!usuario) {
        //   return { success: false, error: "No autorizado." };
        // }

        const validation = DesconectarWhatsAppInputSchema.safeParse(input);
        if (!validation.success) {
            return { success: false, error: "ID de asistente inválido." };
        }
        const { asistenteId } = validation.data;

        // TODO: Validar permisos del usuario sobre el asistente.
        const asistente = await prisma.asistenteVirtual.findFirst({
            where: {
                id: asistenteId
                // negocio: { clienteId: usuario.clienteId } // Descomenta y define 'usuario' si es necesario
            },
            select: { negocioId: true } // Para revalidar path
        });
        if (!asistente) {
            return { success: false, error: "Asistente no encontrado o no tienes permiso." };
        }

        // Opcional: Intentar invalidar el token del lado de Meta.
        // Esto requiere el token de acceso del usuario.
        // DELETE https://graph.facebook.com/{user_id}/permissions?access_token={user_access_token}
        // Esto es más complejo porque necesitarías el user_id de Meta asociado al token.
        // Por simplicidad, a menudo solo se borra el token de la BD.

        await prisma.asistenteVirtual.update({
            where: { id: asistenteId },
            data: {
                token: null,
                phoneNumberId: null,
                whatsappBusinessAccountId: null,
                whatsappDisplayName: null,
                whatsappConnectionStatus: 'NO_CONECTADO',
                whatsappTokenLastSet: null,
                whatsappQualityRating: null,
                whatsappBusiness: null, // Limpiar también el número
            },
        });

        // const negocioId = asistente.negocioId; // Obtener de la consulta previa
        // revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/asistente/${asistenteId}`);
        console.log(`[WhatsApp Disconnect] WhatsApp desconectado para Asistente ${asistenteId}`);
        return { success: true, data: null };

    } catch (error) {
        console.error("Error en desconectarWhatsAppAction:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido.";
        return { success: false, error: `Ocurrió un error al desconectar WhatsApp: ${errorMessage}` };
    }
}


