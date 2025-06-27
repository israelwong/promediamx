'use server';

import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
// import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
    IniciarConexionWhatsAppInputSchema,
    IniciarConexionWhatsAppOutputSchema,
    DesconectarWhatsAppInputSchema,
    MetaOAuthCallbackQuerySchema,
    WhatsAppOAuthStateSchema,
    ShortLivedTokenResponseSchema,
    LongLivedTokenResponseSchema,
    MetaPhoneNumberDataSchema,
    AsistenteConfigWhatsAppDataSchema,
} from './asistenteWhatsAppConfig.schemas';

// Variables de entorno
const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const META_EMBEDDED_SIGNUP_CONFIG_ID = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID; // Se mantiene, pero su uso es opcional

/**
 * Lógica de creación implícita del asistente si no existe.
 */
export async function createAsistenteWithDefaultName(
    negocioId: string,
    nombreNegocio: string
): Promise<z.infer<typeof AsistenteConfigWhatsAppDataSchema> | null> {
    const nombreAsistente = `Asistente para ${nombreNegocio}`;
    try {
        const nuevoAsistente = await prisma.$transaction(async (tx) => {
            const tareasActivas = await tx.tarea.findMany({ where: { status: 'activo' }, select: { id: true } });
            const asistenteCreado = await tx.asistenteVirtual.create({
                data: {
                    nombre: nombreAsistente,
                    negocioId: negocioId,
                    status: 'activo',
                    version: 1.0,
                    whatsappConnectionStatus: "NO_CONECTADO",
                }
            });
            if (tareasActivas.length > 0) {
                await tx.asistenteTareaSuscripcion.createMany({
                    data: tareasActivas.map(t => ({ asistenteVirtualId: asistenteCreado.id, tareaId: t.id, status: 'activo' }))
                });
            }
            return asistenteCreado;
        });
        revalidatePath(`/admin/clientes/`);
        return AsistenteConfigWhatsAppDataSchema.parse(nuevoAsistente);
    } catch (error) {
        console.error("Error en transacción de creación de asistente:", error);
        return null;
    }
}

/**
 * Obtiene los datos de configuración de WhatsApp de un asistente por el ID del negocio.
 */
export async function getAssistantConfigByBusinessId(negocioId: string): Promise<z.infer<typeof AsistenteConfigWhatsAppDataSchema> | null> {
    if (!negocioId) return null;
    try {
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: { negocioId },
            select: {
                id: true,
                whatsappBusiness: true,
                phoneNumberId: true,
                whatsappDisplayName: true,
                whatsappBusinessAccountId: true,
                whatsappConnectionStatus: true,
            }
        });
        if (!asistente) return null;
        return AsistenteConfigWhatsAppDataSchema.parse(asistente);
    } catch (error) {
        console.error("Error buscando asistente por negocio:", error);
        return null;
    }
}


/**
 * Acción para iniciar el Flujo OAuth con Meta (Basado en tu código funcional).
 */
export async function iniciarProcesoConexionWhatsAppAction(
    input: z.infer<typeof IniciarConexionWhatsAppInputSchema>
): Promise<ActionResult<z.infer<typeof IniciarConexionWhatsAppOutputSchema>>> {
    const validation = IniciarConexionWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada inválidos." };
    }

    if (!META_APP_ID) {
        console.error("CRITICAL_ERROR: META_APP_ID no está configurado en las variables de entorno.");
        return { success: false, error: "Error de configuración del servidor: Contacte al administrador (Ref: MAI_NA)." };
    }

    const { asistenteId, negocioId, clienteId, oauthRedirectUri } = validation.data;
    const stateObject: z.infer<typeof WhatsAppOAuthStateSchema> = { asistenteId, negocioId, clienteId };
    const stateString = Buffer.from(JSON.stringify(stateObject)).toString('base64url');

    const metaOAuthUrl = new URL(`https://www.facebook.com/${META_API_VERSION}/dialog/oauth`);
    metaOAuthUrl.searchParams.append('client_id', META_APP_ID);
    metaOAuthUrl.searchParams.append('redirect_uri', oauthRedirectUri);
    metaOAuthUrl.searchParams.append('state', stateString);
    metaOAuthUrl.searchParams.append('response_type', 'code');
    const scopes = ['whatsapp_business_management', 'whatsapp_business_messaging'];
    metaOAuthUrl.searchParams.append('scope', scopes.join(','));

    // Lógica opcional para Embedded Signup (no bloqueante)
    if (META_EMBEDDED_SIGNUP_CONFIG_ID) {
        metaOAuthUrl.searchParams.append('config_id', META_EMBEDDED_SIGNUP_CONFIG_ID);
    } else {
        console.warn("META_EMBEDDED_SIGNUP_CONFIG_ID no está configurado. Se usará un flujo OAuth más genérico.");
    }

    console.log(`[WhatsApp Connect] URL de OAuth generada: ${metaOAuthUrl.toString()}`);
    return { success: true, data: { metaOAuthUrl: metaOAuthUrl.toString() } };
}


/**
 * Acción para procesar el Callback de Meta (Lógica Corregida).
 */
export async function procesarCallbackMetaOAuth(
    query: z.infer<typeof MetaOAuthCallbackQuerySchema>
): Promise<ActionResult<{ asistenteId: string; negocioId: string; clienteId: string }>> {
    console.log("[WhatsApp Callback] Iniciando procesamiento:", query);

    try {
        if (!META_APP_ID || !META_APP_SECRET) {
            throw new Error("Credenciales de Meta no configuradas en el servidor.");
        }

        const queryValidation = MetaOAuthCallbackQuerySchema.safeParse(query);
        if (!queryValidation.success) {
            throw new Error("Parámetros de callback de Meta inválidos.");
        }
        const { code, state: encodedState } = queryValidation.data;

        const decodedStateString = Buffer.from(encodedState, 'base64url').toString('utf-8');
        const oauthState = WhatsAppOAuthStateSchema.parse(JSON.parse(decodedStateString));
        const { asistenteId, negocioId, clienteId } = oauthState;

        // Intercambiar tokens
        const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
        const tokenRedirectUri = `${NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`;
        const tokenParams = new URLSearchParams({ client_id: META_APP_ID, redirect_uri: tokenRedirectUri, client_secret: META_APP_SECRET, code });
        const tokenRes = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
        if (!tokenRes.ok) throw new Error(`Error de Meta al obtener token (SLT): ${(await tokenRes.json()).error?.message}`);
        const shortLivedTokenData = ShortLivedTokenResponseSchema.parse(await tokenRes.json());

        const longLivedTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`;
        const longLivedTokenParams = new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: META_APP_ID, client_secret: META_APP_SECRET, fb_exchange_token: shortLivedTokenData.access_token });
        const longLivedTokenRes = await fetch(`${longLivedTokenUrl}?${longLivedTokenParams.toString()}`);
        if (!longLivedTokenRes.ok) throw new Error(`Error de Meta al obtener token (LLT): ${(await longLivedTokenRes.json()).error?.message}`);
        const longLivedTokenData = LongLivedTokenResponseSchema.parse(await longLivedTokenRes.json());
        const longLivedUserAccessToken = longLivedTokenData.access_token;

        // Depurar token y obtener IDs
        const appToken = `${META_APP_ID}|${META_APP_SECRET}`;
        const debugTokenUrl = `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${longLivedUserAccessToken}&access_token=${appToken}`;
        const debugTokenRes = await fetch(debugTokenUrl);
        if (!debugTokenRes.ok) throw new Error("Error de Meta al depurar token.");
        const debugTokenData = await debugTokenRes.json();
        type GranularScope = { scope: string; target_ids?: string[] };
        const wabaIdScope = debugTokenData.data?.granular_scopes?.find((s: GranularScope) => s.scope === 'whatsapp_business_management');
        const wabaId = wabaIdScope?.target_ids?.[0];
        if (!wabaId) throw new Error("No se pudo determinar el WABA ID autorizado.");

        // Obtener y seleccionar número de teléfono
        const phoneNumbersUrl = `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers?access_token=${longLivedUserAccessToken}&fields=id,verified_name,display_phone_number,quality_rating,is_embedded_signup_number`;
        const phoneNumbersRes = await fetch(phoneNumbersUrl);
        if (!phoneNumbersRes.ok) throw new Error("Error de Meta al obtener números de teléfono.");
        const phoneNumbersResponse = await phoneNumbersRes.json();
        if (!phoneNumbersResponse.data?.length) throw new Error("La cuenta de WhatsApp no tiene números de teléfono accesibles.");
        type PhoneNumberData = z.infer<typeof MetaPhoneNumberDataSchema> & { is_embedded_signup_number?: boolean };
        const selectedPhoneNumberRaw: PhoneNumberData | undefined = phoneNumbersResponse.data.find((p: PhoneNumberData) => p.is_embedded_signup_number === true) || phoneNumbersResponse.data[0];
        if (!selectedPhoneNumberRaw) throw new Error("No se pudo identificar un número de teléfono específico.");
        const selectedPhoneNumberData = MetaPhoneNumberDataSchema.parse(selectedPhoneNumberRaw);
        const finalPhoneNumberId = selectedPhoneNumberData.id;

        // --- INICIO DE LA CORRECCIÓN ---
        await prisma.$transaction(async (tx) => {
            // 1. Buscar si el phoneNumberId ya está en uso por OTRO asistente.
            const existingAssistantWithPhone = await tx.asistenteVirtual.findUnique({
                where: { phoneNumberId: finalPhoneNumberId },
                select: { id: true }
            });

            // 2. Si existe y pertenece a otro asistente, "liberarlo".
            if (existingAssistantWithPhone && existingAssistantWithPhone.id !== asistenteId) {
                console.log(`[WhatsApp Callback] El phoneNumberId ${finalPhoneNumberId} ya está en uso por el asistente ${existingAssistantWithPhone.id}. Liberándolo...`);
                await tx.asistenteVirtual.update({
                    where: { id: existingAssistantWithPhone.id },
                    data: {
                        token: null,
                        phoneNumberId: null, // <-- Clave: quitar el ID para romper la restricción unique
                        whatsappBusinessAccountId: null,
                        whatsappDisplayName: null,
                        whatsappConnectionStatus: 'NO_CONECTADO',
                        whatsappTokenLastSet: null,
                        whatsappQualityRating: null,
                        whatsappBusiness: null,
                    }
                });
            }

            // 3. Ahora, actualizar el asistente actual con la nueva configuración.
            await tx.asistenteVirtual.update({
                where: { id: asistenteId },
                data: {
                    token: longLivedUserAccessToken,
                    phoneNumberId: finalPhoneNumberId,
                    whatsappBusinessAccountId: wabaId,
                    whatsappDisplayName: selectedPhoneNumberData.verified_name,
                    whatsappBusiness: selectedPhoneNumberData.display_phone_number,
                    whatsappQualityRating: selectedPhoneNumberData.quality_rating,
                    whatsappConnectionStatus: 'CONECTADO',
                    whatsappTokenLastSet: new Date(),
                },
            });
        });
        // --- FIN DE LA CORRECCIÓN ---

        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente`);
        return { success: true, data: oauthState };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido durante el callback.";
        console.error("[WhatsApp Callback] Error:", errorMessage, error);
        const stateData = query.state ? WhatsAppOAuthStateSchema.parse(JSON.parse(Buffer.from(query.state, 'base64url').toString('utf-8'))) : undefined;
        return { success: false, error: errorMessage, data: stateData };
    }
}


/**
 * Acción para Desconectar WhatsApp.
 */
export async function desconectarWhatsAppAction(
    input: z.infer<typeof DesconectarWhatsAppInputSchema>
): Promise<ActionResult<null>> {
    const validation = DesconectarWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "ID de asistente inválido." };
    }
    try {
        await prisma.asistenteVirtual.update({
            where: { id: validation.data.asistenteId },
            data: {
                token: null,
                phoneNumberId: null,
                whatsappBusinessAccountId: null,
                whatsappDisplayName: null,
                whatsappConnectionStatus: 'NO_CONECTADO',
                whatsappTokenLastSet: null,
                whatsappQualityRating: null,
                whatsappBusiness: null,
            },
        });
        revalidatePath(`/admin/clientes/`);
        return { success: true, data: null };
    } catch (error) {
        console.error("Error al desconectar WhatsApp:", error);
        return { success: false, error: "Ocurrió un error al desconectar WhatsApp." };
    }
}
