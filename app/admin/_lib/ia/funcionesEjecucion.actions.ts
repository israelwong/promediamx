// app/admin/_lib/ia/funcionesEjecucion.actions.ts
'use server';

import prisma from '../prismaClient';
import { type ActionResult } from '../types'; // Asegúrate que la ruta es correcta
import { ChatMessageItemSchema, type ChatMessageItem } from './ia.schemas'; // Este schema DEBE incluir functionResponseNombre
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import { z } from 'zod';

import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions';
// import type { EnviarMensajeWhatsAppApiInput } from '../actions/whatsapp/whatsapp.schemas';

// Importaciones de tus funciones...
// ... (como las tenías)
import {
    // EjecutarMostrarDetalleOfertaParamsSchema, // Ya no se usa aquí, la función lo valida internamente
} from '../funciones/mostrarDetalleOferta/mostrarDetalleOferta.schemas'; // Solo para referencia de la ruta
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/mostrarDetalleOferta/mostrarDetalleOferta.actions';

import {
    type FunctionResponseMediaData,
    type MediaItem
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import { type SimpleFuncionContext } from "@/app/admin/_lib/types";

// -----------------------------------------------------------------------------
// enviarMensajeInternoYWhatsAppAction AJUSTADO
// -----------------------------------------------------------------------------
async function enviarMensajeInternoYWhatsAppAction(input: {
    conversacionId: string;
    contentFuncion: string | null; // Este es el functionResponseData.content
    mediaItemsFuncion?: MediaItem[] | null; // Este es el functionResponseData.media
    uiComponentPayload?: Record<string, unknown> | null; // Este es el functionResponseData.uiComponentPayload
    role: 'assistant' | 'system';
    nombreFuncionEjecutada?: string; // El nombre de la función que se ejecutó
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
}): Promise<ActionResult<ChatMessageItem | null>> {
    const timestampInicio = Date.now();

    console.log(`[enviarMensajeInterno V6 DEBUG] Input RECIBIDO:
        ContentFuncion: ${input.contentFuncion?.substring(0, 70)}...
        MediaItemsFuncion Count: ${input.mediaItemsFuncion?.length || 0}
        UiComponentPayload Existe: ${!!input.uiComponentPayload}
        Canal Original: ${input.canalOriginal}`);

    if (input.mediaItemsFuncion && input.mediaItemsFuncion.length > 0) {
        console.log(`[enviarMensajeInterno V6 DEBUG] Primer MediaItem RECIBIDO:`, JSON.stringify(input.mediaItemsFuncion[0]));
    }
    if (input.uiComponentPayload) {
        console.log(`[enviarMensajeInterno V6 DEBUG] uiComponentPayload RECIBIDO:`, JSON.stringify(input.uiComponentPayload).substring(0, 200) + "...");
    }


    try {
        if (!input.conversacionId || !input.role) {
            return { success: false, error: 'Faltan datos (conversacionId, role).', data: null };
        }

        const tieneContentValido = input.contentFuncion && input.contentFuncion.trim() !== "";
        const tieneMediaValida = Array.isArray(input.mediaItemsFuncion) && input.mediaItemsFuncion.length > 0;
        const tieneUiPayloadValido = input.uiComponentPayload && typeof input.uiComponentPayload === 'object' && Object.keys(input.uiComponentPayload).length > 0;

        if (!tieneContentValido && !tieneMediaValida && !tieneUiPayloadValido) {
            console.warn(`[enviarMensajeInterno V6] No hay content, ni media, ni uiPayload válido para enviar. Abortando.`);
            return { success: false, error: 'Se requiere contenido, media o payload de UI para enviar.', data: null };
        }

        // El mensajeTexto principal para la Interaccion
        // Si hay uiPayload, contentFuncion es un acompañamiento. Si no, es el contenido principal.
        let textoPrincipalInteraccion = input.contentFuncion;
        if (!textoPrincipalInteraccion) {
            if (tieneUiPayloadValido) {
                textoPrincipalInteraccion = `[UI Componente: ${(input.uiComponentPayload as { componentType?: string })?.componentType || 'Personalizado'}]`;
            } else if (tieneMediaValida) {
                textoPrincipalInteraccion = input.mediaItemsFuncion![0].caption || `[Media: ${input.mediaItemsFuncion![0].tipo}]`;
            } else {
                textoPrincipalInteraccion = "[Respuesta sin texto visible]";
            }
        }

        const dataToCreateInDB: Prisma.InteraccionCreateInput = {
            conversacion: { connect: { id: input.conversacionId } },
            role: input.role,
            mensajeTexto: textoPrincipalInteraccion,
            parteTipo: InteraccionParteTipo.TEXT, // Default, se cambiará si es FUNCTION_RESPONSE
            uiComponentPayload: undefined, // Inicializar
            functionResponseData: undefined, // Inicializar
        };

        if (input.role === 'assistant' && input.nombreFuncionEjecutada) {
            dataToCreateInDB.parteTipo = InteraccionParteTipo.FUNCTION_RESPONSE;
            dataToCreateInDB.functionResponseNombre = input.nombreFuncionEjecutada;

            // Guardar siempre functionResponseData con el content y media para WhatsApp/fallback
            dataToCreateInDB.functionResponseData = {
                content: input.contentFuncion,
                media: input.mediaItemsFuncion || null,
                // No incluimos uiComponentPayload DENTRO de functionResponseData,
                // a menos que el schema FunctionResponseMediaData lo requiera explícitamente.
                // La idea es que uiComponentPayload sea un campo de primer nivel en Interaccion.
            } as Prisma.InputJsonValue;

            // Guardar el uiComponentPayload en el campo raíz de Interaccion si se proporcionó
            if (input.uiComponentPayload) {
                dataToCreateInDB.uiComponentPayload = input.uiComponentPayload as Prisma.InputJsonValue;
                console.log(`[enviarMensajeInterno V6] Guardando Interaccion.uiComponentPayload:`, dataToCreateInDB.uiComponentPayload);
            }
            console.log(`[enviarMensajeInterno V6] Interacción como FUNCTION_RESPONSE. functionResponseData:`, dataToCreateInDB.functionResponseData);
        } else if (input.role === 'assistant' && (tieneContentValido || tieneMediaValida)) {
            // Mensaje simple del asistente (no de función)
            dataToCreateInDB.parteTipo = InteraccionParteTipo.TEXT;
            // Si tiene media, la guardamos en functionResponseData.media por consistencia
            // aunque uiComponentPayload no aplique aquí típicamente.
            if (tieneMediaValida) {
                dataToCreateInDB.functionResponseData = {
                    content: input.contentFuncion, // El texto que acompaña a esta media
                    media: input.mediaItemsFuncion || null,
                } as Prisma.InputJsonValue;
                console.log(`[enviarMensajeInterno V6] Interacción TEXT del asistente con media guardada en functionResponseData.`);
            }
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreateInDB,
            select: {
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true,
                uiComponentPayload: true, // Asegurar que se selecciona
                mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } },
            }
        });

        const parsedNuevaInteraccion = ChatMessageItemSchema.safeParse(nuevaInteraccion);
        const interaccionGuardada: ChatMessageItem | null = parsedNuevaInteraccion.success ? parsedNuevaInteraccion.data : null;

        if (!parsedNuevaInteraccion.success) {
            console.error(`[enviarMensajeInterno V6] Error Zod parseando nuevaInteraccion (ID: ${nuevaInteraccion.id}):`, parsedNuevaInteraccion.error.flatten().fieldErrors, "Raw data:", nuevaInteraccion);
        } else {
            console.log(`[enviarMensajeInterno V6] Interacción DB (ID: ${interaccionGuardada?.id}), ParteTipo: ${interaccionGuardada?.parteTipo}, FN_Resp_Nombre: ${interaccionGuardada?.functionResponseNombre}, Tiene_uiPayload: ${!!interaccionGuardada}`);
        }

        await prisma.conversacion.update({ where: { id: input.conversacionId }, data: { updatedAt: new Date() } });

        // Lógica de envío a WhatsApp (USA contentFuncion y mediaItemsFuncion, IGNORA uiComponentPayload)
        const esCanalWhatsApp = input.canalOriginal?.toLowerCase().includes('whatsapp') ?? false;
        if (esCanalWhatsApp && input.destinatarioWaId && input.negocioPhoneNumberIdEnvia && input.role === 'assistant') {
            // ... (tu lógica de envío a WhatsApp se mantiene igual, usando input.contentFuncion e input.mediaItemsFuncion)
            // ... Asegúrate que esta parte está robusta y maneja los errores de envío.
            const asistente = await prisma.asistenteVirtual.findFirst({ where: { phoneNumberId: input.negocioPhoneNumberIdEnvia, status: 'activo' }, select: { token: true } });
            if (asistente?.token) {
                const commonWhatsAppParams = { destinatarioWaId: input.destinatarioWaId, negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia, tokenAccesoAsistente: asistente.token };
                if (tieneContentValido) {
                    console.log(`[enviarMensajeInterno V6 DEBUG] WHATSAPP: Preparando para enviar TEXTO: "${input.contentFuncion!.substring(0, 70)}..."`);

                    const resTxt = await enviarMensajeWhatsAppApiAction({ ...commonWhatsAppParams, tipoMensaje: 'text', mensajeTexto: input.contentFuncion! });
                    if (!resTxt.success) console.warn(`[EnviarMsgInternoV6] Fallo envío WA Texto: ${resTxt.error}`);
                    if (tieneMediaValida) await new Promise(resolve => setTimeout(resolve, 600));
                }
                if (tieneMediaValida) {
                    console.log(`[enviarMensajeInterno V6 DEBUG] WHATSAPP: Hay ${input.mediaItemsFuncion!.length} media items para enviar.`);

                    for (const media of input.mediaItemsFuncion!) {

                        // LOG CLAVE
                        console.log(`[enviarMensajeInterno V6 DEBUG] WHATSAPP: Procesando mediaItem para envío: Tipo=${media.tipo}, URL=${media.url}`);
                        if (!media.url || !media.tipo) {
                            console.warn(`[enviarMensajeInterno V6 DEBUG] WHATSAPP: Media item inválido OMITIDO.`, media);
                            continue;
                        }

                        if (!media.url || !media.tipo) continue;
                        const resMedia = await enviarMensajeWhatsAppApiAction({ ...commonWhatsAppParams, tipoMensaje: media.tipo, mediaUrl: media.url, caption: media.caption ?? undefined, filename: media.filename ?? undefined });
                        if (!resMedia.success) console.warn(`[EnviarMsgInternoV6] Fallo envío WA Media ${media.tipo}: ${resMedia.error}`);
                        await new Promise(resolve => setTimeout(resolve, 800)); // Pausa mayor entre media
                    }
                }
            } else { console.error(`[EnviarMsgInternoV6] No token WA para PNID ${input.negocioPhoneNumberIdEnvia}.`); }
        }

        console.log(`[enviarMensajeInterno V6] Fin para conv ${input.conversacionId}. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: interaccionGuardada };
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "Error desconocido al guardar/enviar mensaje.";
        console.error(`[enviarMensajeInterno V6] Error catastrófico para conv ${input.conversacionId}:`, e);
        return { success: false, error: errorMsg, data: null };
    }
}
async function actualizarTareaEjecutadaFallidaDispatcher(
    tareaEjecutadaId: string,
    mensajeError: string,
    metadataOriginal?: Record<string, unknown> | null
) {
    // ... (sin cambios respecto a la versión anterior que te di)
    console.warn(`[Dispatcher V2] Fallo en Tarea ${tareaEjecutadaId}. Error: ${mensajeError}. Metadata Original:`, metadataOriginal);
    try {
        let finalMetadata: Record<string, unknown> = {
            ...(metadataOriginal || {}),
            error_dispatcher: mensajeError,
            ejecucionDispatcherExitosa: false,
        };
        if (!metadataOriginal && tareaEjecutadaId) {
            const tareaActual = await prisma.tareaEjecutada.findUnique({
                where: { id: tareaEjecutadaId },
                select: { metadata: true }
            });
            if (tareaActual?.metadata) {
                let parsedExistingMetadata = {};
                if (typeof tareaActual.metadata === 'string') {
                    try { parsedExistingMetadata = JSON.parse(tareaActual.metadata); } catch (e) {
                        console.error(`[Dispatcher V2] Error parseando metadata (string) para Tarea ${tareaEjecutadaId} en fallo:`, e);
                    }
                } else if (typeof tareaActual.metadata === 'object' && tareaActual.metadata !== null) {
                    parsedExistingMetadata = tareaActual.metadata as Record<string, unknown>;
                }
                finalMetadata = { ...parsedExistingMetadata, ...finalMetadata };
            }
        }
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify(finalMetadata) }
        });
    } catch (updateError) {
        console.error(`[Dispatcher V2] Error crítico al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {
    const timestampInicio = Date.now();
    console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - INICIO.`);

    let metadataObj: Record<string, unknown> = {};
    let funcionContext: SimpleFuncionContext; // No será opcional, se construirá o habrá error.

    // Declarar en un scope más alto para que esté disponible para la actualización final de TareaEjecutada
    let resultadoEjecucionDeFuncion: ActionResult<FunctionResponseMediaData | unknown> | null = null;
    let responseContentParaUsuario: string | null = null;
    let responseMediaParaEnviar: MediaItem[] | null = null;
    let uiPayloadDesdeFuncion: Record<string, unknown> | null = null;

    try {
        const tareaEjecutada = await prisma.tareaEjecutada.findUnique({ where: { id: tareaEjecutadaId } });

        if (!tareaEjecutada) {
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - NO ENCONTRADA.`);
            return { success: false, error: `TareaEjecutada con ID ${tareaEjecutadaId} no encontrada.`, data: null };
        }

        if (!tareaEjecutada.metadata) {
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - SIN METADATOS.`);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadatos faltantes en TareaEjecutada.", null);
            return { success: false, error: "Metadatos no encontrados en TareaEjecutada.", data: null };
        }

        try {
            if (typeof tareaEjecutada.metadata === 'string') {
                metadataObj = JSON.parse(tareaEjecutada.metadata);
            } else if (typeof tareaEjecutada.metadata === 'object' && tareaEjecutada.metadata !== null) {
                metadataObj = tareaEjecutada.metadata as Record<string, unknown>;
            } else {
                throw new Error("Metadata en formato inesperado o nulo.");
            }
        } catch (e) {
            const parseErrorMsg = e instanceof Error ? e.message : "Error desconocido al parsear metadata.";
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - ERROR PARSEANDO METADATA: ${parseErrorMsg}`, tareaEjecutada.metadata);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error al parsear metadata: ${parseErrorMsg}`, null);
            return { success: false, error: `Error al parsear metadatos: ${parseErrorMsg}`, data: null };
        }

        console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Metadata parseada:`, JSON.stringify(metadataObj, null, 2).substring(0, 700) + "...");

        const {
            funcionLlamada,
            argumentos: argsFromIA, // Estos son los argumentos que la IA generó para la función
            conversacionId,
            leadId,
            asistenteVirtualId,
            canalNombre, // Este viene de la metadata que guardamos al crear TareaEjecutada
            destinatarioWaId,       // Específico de WhatsApp
            negocioPhoneNumberIdEnvia // Específico de WhatsApp
        } = metadataObj;

        if (
            typeof funcionLlamada !== 'string' || !funcionLlamada.trim() ||
            typeof argsFromIA === 'undefined' || // Puede ser null o un objeto vacío, pero debe estar definido
            typeof conversacionId !== 'string' ||
            typeof asistenteVirtualId !== 'string' ||
            typeof leadId !== 'string' // Asumimos que leadId siempre estará
        ) {
            const errorMsg = "Metadata crítica incompleta o con tipos incorrectos (funcionLlamada, argsFromIA, conversacionId, asistenteVirtualId, leadId).";
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - ${errorMsg}`, metadataObj);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj);
            return { success: false, error: errorMsg, data: null };
        }

        const asistenteDb = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteVirtualId },
            include: {
                negocio: {
                    include: {
                        // AgendaConfiguracion: true, // Incluir si es necesario para alguna función
                        // cliente: { select: { stripeCustomerId: true, email: true } }, // Incluir si es necesario
                        configuracionPago: { select: { monedaPrincipal: true } }, // Para la moneda
                        // Añade aquí cualquier campo de 'negocio' que necesites para 'idiomaLocale'
                        // Ejemplo: si tienes 'idiomaPreferido' en Negocio:
                        // idiomaPreferido: true, 
                    }
                }
            }
        });

        if (!asistenteDb?.negocioId || !asistenteDb.negocio) {
            const errorMsg = "Configuración de negocio o asistente no encontrada.";
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - ${errorMsg} para asistenteId: ${asistenteVirtualId}`);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj);
            // No llamaremos a enviarMensajeInterno aquí porque no tenemos contexto de conversación para el error.
            return { success: false, error: errorMsg, data: null };
        }

        // Construir el SimpleFuncionContext
        // AJUSTA la obtención de idiomaDelNegocio según tu schema de Negocio
        // Define a type that includes the possible fields for idioma
        type NegocioWithIdioma = typeof asistenteDb.negocio & {
            idiomaPreferido?: string;
            idiomaCliente?: string;
        };
        const negocioWithIdioma = asistenteDb.negocio as NegocioWithIdioma;
        const idiomaDelNegocio = negocioWithIdioma.idiomaPreferido ||
            negocioWithIdioma.idiomaCliente ||
            'es-MX';
        const monedaDelNegocio = asistenteDb.negocio.configuracionPago?.monedaPrincipal || 'MXN';

        funcionContext = {
            canalNombre: typeof canalNombre === 'string' && canalNombre.trim() !== '' ? canalNombre : "webchat", // Default robusto
            negocioId: asistenteDb.negocioId,
            asistenteId: asistenteVirtualId,
            leadId: leadId,
            idiomaLocale: idiomaDelNegocio,
            monedaNegocio: monedaDelNegocio,
        };
        console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - FuncionContext construido:`, funcionContext);
        console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Despachando función: "${funcionLlamada}" con ArgsFromIA:`, argsFromIA);

        try {
            // El switch para llamar a la función de acción correspondiente
            switch (funcionLlamada) {
                case 'mostrarDetalleOferta':
                    // argsFromIA son los parámetros que la IA pensó que la función necesita (ej. { ofertaId: "..." } o { nombre_de_la_oferta: "..." })
                    // ejecutarMostrarDetalleOfertaAction ya valida estos 'argsFromIA' internamente con su propio Zod schema.
                    {
                        const rawResult = await ejecutarMostrarDetalleOfertaAction(argsFromIA, funcionContext);
                        // Adaptar validationErrors si es necesario
                        if (rawResult && 'validationErrors' in rawResult && Array.isArray(rawResult.validationErrors)) {
                            // Convertir ZodIssue[] a Record<string, string[]>
                            const zodIssues = rawResult.validationErrors as z.ZodIssue[];
                            const validationErrors: Record<string, string[]> = {};
                            for (const issue of zodIssues) {
                                const key = issue.path.join('.') || '_global';
                                if (!validationErrors[key]) validationErrors[key] = [];
                                validationErrors[key].push(issue.message);
                            }
                            resultadoEjecucionDeFuncion = { ...rawResult, validationErrors };
                        } else if (rawResult && 'validationErrors' in rawResult && rawResult.validationErrors && typeof rawResult.validationErrors === 'object') {
                            // Si validationErrors es Record<string, string[] | undefined>, normalizar a Record<string, string[]>
                            const original = rawResult.validationErrors as Record<string, string[] | undefined>;
                            const validationErrors: Record<string, string[]> = {};
                            for (const key in original) {
                                validationErrors[key] = original[key] ?? [];
                            }
                            resultadoEjecucionDeFuncion = { ...rawResult, validationErrors };
                        } else {
                            resultadoEjecucionDeFuncion = rawResult;
                        }
                    }
                    break;

                // case 'brindarInformacionDelNegocio':
                //   resultadoEjecucionDeFuncion = await ejecutarBrindarInfoNegocioAction(argsFromIA, funcionContext);
                //   break;

                // ... AÑADE TODOS TUS CASES AQUÍ, llamando a la función correspondiente ...
                // Todas deben aceptar (argsFromIA, funcionContext) y devolver Promise<ActionResult<FunctionResponseMediaData | any>>

                default:
                    console.warn(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Función desconocida o no manejada en switch: "${funcionLlamada}"`);
                    resultadoEjecucionDeFuncion = {
                        success: false,
                        error: `La acción solicitada '${funcionLlamada}' no está configurada o no es reconocida.`,
                        data: null // Asegurar que data sea null en este caso
                    };
                    break;
            }

            console.log(`[Dispatcher V5 DEBUG] Resultado CRUDO de ${funcionLlamada}:`, JSON.stringify(resultadoEjecucionDeFuncion, null, 2).substring(0, 500) + "...");


            // Procesar el resultado de la función ejecutada
            if (resultadoEjecucionDeFuncion && resultadoEjecucionDeFuncion.success && resultadoEjecucionDeFuncion.data) {
                const dataDeFuncion = resultadoEjecucionDeFuncion.data as FunctionResponseMediaData; // Esperamos esta estructura
                responseContentParaUsuario = dataDeFuncion.content ?? null; // Texto para WhatsApp, HTML simple para WebChat, o fallback
                responseMediaParaEnviar = dataDeFuncion.media ?? null;       // Media para WhatsApp
                uiPayloadDesdeFuncion = dataDeFuncion.uiComponentPayload ?? null; // Payload de UI para WebChat

                // LOG CLAVE
                console.log(`[Dispatcher V5 DEBUG] Datos EXTRAÍDOS para enviar:
                  Content: ${responseContentParaUsuario?.substring(0, 70)}...
                  Media Items Count: ${responseMediaParaEnviar?.length || 0}
                  Tiene UI Payload: ${!!uiPayloadDesdeFuncion}`);
                if (responseMediaParaEnviar && responseMediaParaEnviar.length > 0) {
                    console.log(`[Dispatcher V5 DEBUG] Primer MediaItem para enviar:`, JSON.stringify(responseMediaParaEnviar[0]));
                }
                if (uiPayloadDesdeFuncion) {
                    console.log(`[Dispatcher V5 DEBUG] uiPayload para enviar:`, JSON.stringify(uiPayloadDesdeFuncion).substring(0, 200) + "...");
                }


            } else if (resultadoEjecucionDeFuncion) { // Función no exitosa o data es null/undefined
                responseContentParaUsuario = resultadoEjecucionDeFuncion.error || `Hubo un problema al procesar '${funcionLlamada}'. Intenta de nuevo.`;
                console.warn(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Función "${funcionLlamada}" NO tuvo éxito o no devolvió datos. Error: ${resultadoEjecucionDeFuncion.error}`);
            } else { // resultadoEjecucionDeFuncion es null (no debería pasar si el switch está bien)
                responseContentParaUsuario = `Respuesta inesperada o no implementada para '${funcionLlamada}'.`;
                console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Función "${funcionLlamada}" devolvió null/undefined resultado.`);
                resultadoEjecucionDeFuncion = { success: false, error: responseContentParaUsuario, data: null }; // Para el log final
            }

        } catch (execError: unknown) {
            const errorMsgBase = `Error crítico durante la ejecución de la función de acción '${funcionLlamada}'`;
            console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - ${errorMsgBase}:`, execError);
            responseContentParaUsuario = `Lo siento, ocurrió un error técnico al intentar procesar tu solicitud sobre '${funcionLlamada}'.`;
            if (execError instanceof z.ZodError) { // Si la función interna usa Zod y este no fue capturado
                responseContentParaUsuario = `Hubo un problema con los datos para la acción.`;
                console.error(`[Dispatcher V5] ZodError en ${funcionLlamada} (no capturado por la acción):`, execError.flatten().fieldErrors);
            }
            // Asegurar que resultadoEjecucionDeFuncion refleje el error para el log final
            resultadoEjecucionDeFuncion = { success: false, error: responseContentParaUsuario, data: null };
            // No llamamos a actualizarTareaEjecutadaFallidaDispatcher aquí directamente, se hará al final.
        }

        // Enviar la respuesta (texto, media, o UI) al usuario
        // Solo enviar si hay algo que enviar (content, media o uiPayload)
        if (responseContentParaUsuario || (responseMediaParaEnviar && responseMediaParaEnviar.length > 0) || uiPayloadDesdeFuncion) {

            console.log(`[Dispatcher V5 DEBUG] Llamando a enviarMensajeInterno con:
        ContentFuncion: ${responseContentParaUsuario?.substring(0, 70)}...
        MediaItemsFuncion Count: ${responseMediaParaEnviar?.length || 0}
        Tiene UiComponentPayload: ${!!uiPayloadDesdeFuncion}`);

            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId,
                contentFuncion: responseContentParaUsuario,
                mediaItemsFuncion: responseMediaParaEnviar,
                uiComponentPayload: uiPayloadDesdeFuncion, // Pasar el payload
                role: 'assistant',
                nombreFuncionEjecutada: funcionLlamada,
                canalOriginal: funcionContext.canalNombre, // Usar el canal del contexto
                destinatarioWaId: typeof destinatarioWaId === 'string' ? destinatarioWaId : undefined,
                negocioPhoneNumberIdEnvia: typeof negocioPhoneNumberIdEnvia === 'string' ? negocioPhoneNumberIdEnvia : undefined,
            });
        } else {
            console.warn(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - No se generó contenido, media, ni uiPayload para la función "${funcionLlamada}". No se enviará respuesta al usuario.`);
            // Si resultadoEjecucionDeFuncion fue exitoso pero no produjo output, es un caso válido.
            // Si no fue exitoso, el error ya está en responseContentParaUsuario (y en resultadoEjecucionDeFuncion.error).
        }

        // Actualizar TareaEjecutada con el resultado final
        const ejecucionFuncionOriginalOk = resultadoEjecucionDeFuncion?.success ?? false;

        // Asegurarse de que errorFuncionOriginal sea un string o null
        let errorOriginalString: string | null = null;
        if (!ejecucionFuncionOriginalOk && resultadoEjecucionDeFuncion && resultadoEjecucionDeFuncion.error) {
            if (typeof resultadoEjecucionDeFuncion.error === 'string') {
                errorOriginalString = resultadoEjecucionDeFuncion.error;
            } else if (
                typeof resultadoEjecucionDeFuncion.error === 'object' &&
                resultadoEjecucionDeFuncion.error !== null &&
                'message' in resultadoEjecucionDeFuncion.error &&
                typeof (resultadoEjecucionDeFuncion.error as { message?: unknown }).message === 'string'
            ) {
                errorOriginalString = (resultadoEjecucionDeFuncion.error as { message: string }).message; // Usar el mensaje del error
            } else {
                // Intentar serializar si es un objeto, o poner un string genérico
                try {
                    errorOriginalString = JSON.stringify(resultadoEjecucionDeFuncion.error);
                } catch {
                    errorOriginalString = "Error no serializable en la función original.";
                }
            }
        }

        // metadataObj ya es un objeto JS parseado de la metadata original
        const metadataParaGuardar = { // No necesita tipado explícito como Prisma.InputJsonObject aquí
            ...metadataObj,
            resultadoDespacho: {
                timestamp: new Date().toISOString(),
                ejecucionFuncionExito: ejecucionFuncionOriginalOk,
                errorFuncionOriginal: errorOriginalString, // Usar el string procesado
                mensajeEnviadoAlUsuario: !!(responseContentParaUsuario || responseMediaParaEnviar?.length || uiPayloadDesdeFuncion),
                tipoContenidoEnviado: uiPayloadDesdeFuncion ? 'uiComponent' : (responseMediaParaEnviar?.length ? 'media' : (responseContentParaUsuario ? 'text' : 'ninguno')),
            },
            // Renombrar para claridad, o puedes mantener tu 'ejecucionFuncionOk' y 'ejecucionDispatcherExitosa'
            estadoFuncionOriginal: ejecucionFuncionOriginalOk ? "EXITO" : "FALLO",
            estadoDispatcher: "COMPLETADO", // El dispatcher llegó hasta aquí
        };

        try {
            await prisma.tareaEjecutada.update({
                where: { id: tareaEjecutadaId },
                data: {
                    // Convertir explícitamente a string JSON para el campo 'metadata' de Prisma
                    metadata: JSON.stringify(metadataParaGuardar)
                }
            });
            console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - Metadata actualizada exitosamente.`);
        } catch (updateError) {
            console.error(`[Dispatcher V5] Error al actualizar TareaEjecutada ${tareaEjecutadaId} con metadata:`, updateError);
            console.error(`[Dispatcher V5] Metadata que se intentó guardar (stringified):`, JSON.stringify(metadataParaGuardar, null, 2));
            // No llamar a actualizarTareaEjecutadaFallidaDispatcher aquí para evitar bucles infinitos
            // El error original ya debería haber sido capturado y logueado, o se loguea el catastrophicError.
        }

        console.log(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - FIN. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: null };

    } catch (catastrophicError: unknown) {
        const errorMsg = catastrophicError instanceof Error ? catastrophicError.message : "Error catastrófico desconocido en dispatcher.";
        console.error(`[Dispatcher V5] Tarea ${tareaEjecutadaId} - ERROR CATASTRÓFICO:`, catastrophicError);
        // Asegurarse que tareaEjecutadaId es válido antes de llamar a la función de actualización
        if (typeof tareaEjecutadaId === 'string' && tareaEjecutadaId) {
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error catastrófico dispatcher: ${errorMsg}`, metadataObj);
        }
        return { success: false, error: errorMsg, data: null };
    }
}