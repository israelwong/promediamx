// app/admin/_lib/ia/funcionesEjecucion.actions.ts
'use server';

import prisma from '../prismaClient';
import { type ActionResult } from '../types'; // Asegúrate que la ruta es correcta
import { ChatMessageItemSchema, type ChatMessageItem } from './ia.schemas'; // Este schema DEBE incluir functionResponseNombre
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import { z } from 'zod';

import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions';
import type { EnviarMensajeWhatsAppApiInput } from '../actions/whatsapp/whatsapp.schemas';

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
    contentFuncion: string | null;
    mediaItemsFuncion?: MediaItem[] | null;
    role: 'assistant' | 'system';
    nombreFuncionEjecutada?: string;
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
}): Promise<ActionResult<ChatMessageItem | null>> { // Asegurar que todas las rutas devuelvan esto
    const timestampInicio = Date.now(); // Lo usaremos en el log final
    console.log(`[enviarMensajeInterno V4] Tarea (función ${input.nombreFuncionEjecutada || 'N/A'}) - INICIO para conv ${input.conversacionId}. Rol: ${input.role}, Canal: ${input.canalOriginal}`);
    // ... (otros logs como los tenías) ...

    try {
        if (!input.conversacionId || !input.role) {
            console.warn(`[enviarMensajeInterno V4] Faltan datos críticos (conversacionId, role). Abortando.`);
            return { success: false, error: 'Faltan datos (conversacionId, role).', data: null }; // AJUSTADO: Devolver ActionResult
        }

        const tieneContentValido = input.contentFuncion && input.contentFuncion.trim() !== "";
        const tieneMediaValida = Array.isArray(input.mediaItemsFuncion) && input.mediaItemsFuncion.length > 0 && input.mediaItemsFuncion.some(m => m.url && m.tipo);

        if (!tieneContentValido && !tieneMediaValida) {
            console.warn(`[enviarMensajeInterno V4] No hay content ni media válida para enviar para conv ${input.conversacionId}. Abortando.`);
            return { success: false, error: 'Se requiere content o media válida para enviar.', data: null }; // AJUSTADO: Devolver ActionResult
        }

        const textoPrincipalInteraccion = input.contentFuncion ||
            (tieneMediaValida ? (input.mediaItemsFuncion![0].caption || `[Media: ${input.mediaItemsFuncion![0].tipo}]`) : "[Respuesta sin texto visible]");

        const dataToCreateInDB: Prisma.InteraccionCreateInput = {
            conversacion: { connect: { id: input.conversacionId } },
            role: input.role,
            mensajeTexto: textoPrincipalInteraccion,
            mediaUrl: null,
            mediaType: null,
        };

        if (input.role === 'assistant' && input.nombreFuncionEjecutada) {
            dataToCreateInDB.parteTipo = InteraccionParteTipo.FUNCTION_RESPONSE;
            dataToCreateInDB.functionResponseNombre = input.nombreFuncionEjecutada;
            dataToCreateInDB.functionResponseData = {
                content: input.contentFuncion,
                media: input.mediaItemsFuncion || null,
            } as Prisma.InputJsonValue;
        } else if (input.role === 'assistant' && (tieneContentValido || tieneMediaValida)) {
            dataToCreateInDB.parteTipo = InteraccionParteTipo.TEXT;
            if (tieneMediaValida) {
                dataToCreateInDB.functionResponseData = {
                    content: input.contentFuncion,
                    media: input.mediaItemsFuncion || null,
                } as Prisma.InputJsonValue;
            }
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreateInDB,
            select: {
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true, // Este campo debe existir en el SELECT y en el tipo ChatMessageItem
                mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } },
            }
        });

        const parsedNuevaInteraccion = ChatMessageItemSchema.safeParse(nuevaInteraccion);
        const interaccionPrincipalGuardada: ChatMessageItem | null = parsedNuevaInteraccion.success ? parsedNuevaInteraccion.data : null;

        if (!parsedNuevaInteraccion.success) {
            console.error(`[enviarMensajeInterno V4] Error Zod parseando interacción guardada (ID: ${nuevaInteraccion.id}):`, parsedNuevaInteraccion.error.flatten().fieldErrors);
        } else {
            // AJUSTADO: Asegurarse que ChatMessageItemSchema tenga functionResponseNombre
            console.log(`[enviarMensajeInterno V4] Interacción guardada en DB (ID: ${interaccionPrincipalGuardada?.id}), ParteTipo: ${interaccionPrincipalGuardada?.parteTipo}, FN Resp Nombre: ${interaccionPrincipalGuardada?.functionResponseNombre}`);
        }

        await prisma.conversacion.update({ where: { id: input.conversacionId }, data: { updatedAt: new Date() } });

        const esCanalWhatsApp = input.canalOriginal?.toLowerCase().includes('whatsapp') ?? false;
        if (esCanalWhatsApp && input.destinatarioWaId && input.negocioPhoneNumberIdEnvia && input.role === 'assistant') {
            const asistente = await prisma.asistenteVirtual.findFirst({ where: { phoneNumberId: input.negocioPhoneNumberIdEnvia, status: 'activo' }, select: { token: true, id: true } });

            if (asistente?.token) {
                const commonWhatsAppParams: Pick<EnviarMensajeWhatsAppApiInput, "destinatarioWaId" | "negocioPhoneNumberIdEnvia" | "tokenAccesoAsistente"> = {
                    destinatarioWaId: input.destinatarioWaId,
                    negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
                    tokenAccesoAsistente: asistente.token,
                };

                if (tieneContentValido) {
                    const resultadoEnvioTexto = await enviarMensajeWhatsAppApiAction({ // AJUSTADO: Usar resultadoEnvioTexto
                        ...commonWhatsAppParams, tipoMensaje: 'text', mensajeTexto: input.contentFuncion!,
                    });
                    if (resultadoEnvioTexto.success) console.log(`[enviarMensajeInterno V4] WHATSAPP: TEXTO enviado a ${input.destinatarioWaId}. MsgID: ${resultadoEnvioTexto.data}`);
                    else console.warn(`[enviarMensajeInterno V4] WHATSAPP: Fallo al enviar TEXTO a ${input.destinatarioWaId}. Error: ${resultadoEnvioTexto.error}`);
                    if (tieneMediaValida) await new Promise(resolve => setTimeout(resolve, 700));
                }

                if (tieneMediaValida) {
                    for (let i = 0; i < input.mediaItemsFuncion!.length; i++) {
                        const media = input.mediaItemsFuncion![i];
                        if (!media.url || !media.tipo) continue;

                        const mediaInput: EnviarMensajeWhatsAppApiInput = {
                            ...commonWhatsAppParams,
                            tipoMensaje: media.tipo,
                            mediaUrl: media.url,
                            caption: media.caption ?? undefined, // AJUSTADO: Convertir null a undefined
                            filename: media.tipo === 'document' ? (media.filename || "documento") : undefined,
                        };
                        const resultadoEnvioMedia = await enviarMensajeWhatsAppApiAction(mediaInput); // AJUSTADO: Usar resultadoEnvioMedia
                        if (resultadoEnvioMedia.success) console.log(`[enviarMensajeInterno V4] WHATSAPP: Media ${i + 1} (${media.tipo}) enviado a ${input.destinatarioWaId}. MsgID: ${resultadoEnvioMedia.data}`);
                        else console.warn(`[enviarMensajeInterno V4] WHATSAPP: Fallo al enviar media ${i + 1} (${media.tipo}) a ${input.destinatarioWaId}. Error: ${resultadoEnvioMedia.error}, MediaInput:`, mediaInput);
                        if (input.mediaItemsFuncion!.length > 1 && i < input.mediaItemsFuncion!.length - 1) await new Promise(resolve => setTimeout(resolve, 900));
                    }
                }
            } else { console.error(`[enviarMensajeInterno V4] WHATSAPP: No token/asistente para PNID ${input.negocioPhoneNumberIdEnvia}.`); }
        }
        console.log(`[enviarMensajeInterno V4] Tarea (función ${input.nombreFuncionEjecutada || 'N/A'}) - FIN para conv ${input.conversacionId}. Duración: ${Date.now() - timestampInicio}ms`); // AJUSTADO: Usar timestampInicio
        return { success: true, data: interaccionPrincipalGuardada }; // AJUSTADO: Devolver ActionResult
    } catch (e: unknown) { // AJUSTADO: Nombrar la variable de error para usarla
        const errorMsg = e instanceof Error ? e.message : "Error desconocido al guardar/enviar mensaje interno.";
        console.error(`[enviarMensajeInterno V4] Error catastrófico para conv ${input.conversacionId}:`, e);
        return { success: false, error: errorMsg, data: null }; // AJUSTADO: Devolver ActionResult
    }
}

// -----------------------------------------------------------------------------
// dispatchTareaEjecutadaAction AJUSTADO
// -----------------------------------------------------------------------------
export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {
    const timestampInicio = Date.now();
    console.log(`[Dispatcher V4] Tarea ${tareaEjecutadaId} - INICIO.`);
    let metadataObj: Record<string, unknown> = {};
    let funcionContext: SimpleFuncionContext | undefined = undefined;
    // AJUSTADO: Declarar resultadoEjecucionDeFuncion en un scope más alto
    let resultadoEjecucionDeFuncion: ActionResult<FunctionResponseMediaData | unknown> | null = null;

    try {
        const tareaEjecutada = await prisma.tareaEjecutada.findUnique({ where: { id: tareaEjecutadaId } });
        if (!tareaEjecutada) { return { success: false, error: `TareaEjecutada ID ${tareaEjecutadaId} no encontrada.` }; }
        // ... (parseo de metadata como lo tenías, asegurando que metadataObj se pueble)
        if (typeof tareaEjecutada.metadata === 'string') {
            try { metadataObj = JSON.parse(tareaEjecutada.metadata); } catch { await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Error al parsear metadata.", null); return { success: false, error: "Error al parsear metadatos." }; }
        } else if (typeof tareaEjecutada.metadata === 'object' && tareaEjecutada.metadata !== null) {
            metadataObj = tareaEjecutada.metadata as Record<string, unknown>;
        } else { await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadata en formato inesperado.", null); return { success: false, error: "Metadatos en formato inesperado." }; }

        const { funcionLlamada, argumentos: argsFromIA, conversacionId, leadId, asistenteVirtualId, canalNombre, destinatarioWaId, negocioPhoneNumberIdEnvia } = metadataObj;
        if (typeof funcionLlamada !== 'string' || typeof argsFromIA === 'undefined' || typeof conversacionId !== 'string' || typeof asistenteVirtualId !== 'string' || typeof leadId !== 'string') {
            const errorMsg = "Metadata incompleta o con tipos incorrectos.";
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj);
            return { success: false, error: errorMsg };
        }

        let responseContentParaUsuario: string | null = null;
        let responseMediaParaEnviar: MediaItem[] | null = null;

        const asistenteDb = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteVirtualId },
            include: {
                negocio: {
                    include: {
                        AgendaConfiguracion: true,
                        cliente: { select: { stripeCustomerId: true, email: true } },
                        configuracionPago: true // <-- Añadido para incluir configuracionPago
                    }
                }
            }
        });
        if (!asistenteDb?.negocioId || !asistenteDb.negocio) {
            responseContentParaUsuario = "Error: Configuración de negocio no encontrada para el asistente.";
            // await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, responseContentParaUsuario, metadataObj); // Se maneja más abajo
        } else {
            const idiomaDelNegocio = (asistenteDb.negocio as { idiomaCliente?: string })?.idiomaCliente || 'es-MX';
            const monedaDelNegocio = asistenteDb.negocio.configuracionPago?.monedaPrincipal || 'MXN';
            funcionContext = {
                canalNombre: typeof canalNombre === 'string' ? canalNombre : "webchat",
                negocioId: asistenteDb.negocioId, asistenteId: asistenteVirtualId, leadId: leadId,
                idiomaLocale: idiomaDelNegocio, monedaNegocio: monedaDelNegocio,
            };

            try {
                switch (funcionLlamada) {
                    case 'mostrarDetalleOferta': {
                        console.log(`[Dispatcher V4] Tarea ${tareaEjecutadaId} - Llamando ejecutarMostrarDetalleOfertaAction con args:`, argsFromIA, "y contexto:", funcionContext);
                        // AJUSTADO: La función ahora devuelve ActionResult<FunctionResponseMediaData>
                        // y usa 'success' en lugar de 'ok'
                        resultadoEjecucionDeFuncion = await ejecutarMostrarDetalleOfertaAction(argsFromIA, funcionContext);

                        console.log(`[Dispatcher V4] Tarea ${tareaEjecutadaId} - Resultado de ${funcionLlamada}:`, JSON.stringify(resultadoEjecucionDeFuncion, null, 2));

                        // AJUSTADO: Verificar 'success' y que 'data' exista
                        if (resultadoEjecucionDeFuncion && resultadoEjecucionDeFuncion.success && resultadoEjecucionDeFuncion.data) {
                            const data = resultadoEjecucionDeFuncion.data as FunctionResponseMediaData; // Cast a FunctionResponseMediaData
                            responseContentParaUsuario = data.content ?? null;
                            responseMediaParaEnviar = data.media ?? null;
                        } else if (resultadoEjecucionDeFuncion) { // Si hay resultado pero no fue exitoso
                            responseContentParaUsuario = resultadoEjecucionDeFuncion.error || `No pude procesar '${funcionLlamada}'.`;
                        } else { // Si resultadoEjecucionDeFuncion es null (no debería pasar si la función siempre devuelve ActionResult)
                            responseContentParaUsuario = `Respuesta inesperada de '${funcionLlamada}'.`;
                        }
                        break;
                    }
                    // ... tus otros cases, adaptados de forma similar ...
                    default:
                        responseContentParaUsuario = `La acción '${funcionLlamada}' aún no está configurada.`;
                        break;
                }
            } catch (error: unknown) { /* ... manejo de error Zod/ejecución ... */
                console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Error en Zod/ejecución para "${funcionLlamada}":`, error);
                if (error instanceof z.ZodError) {
                    responseContentParaUsuario = `Problema con datos para ${funcionLlamada}.`; console.error(`[Dispatcher V2] ZodError ${funcionLlamada}:`, error.flatten().fieldErrors);
                } else if (error instanceof Error) {
                    responseContentParaUsuario = `Error procesando ${funcionLlamada}: ${error.message}`;
                } else { responseContentParaUsuario = `Error inesperado procesando ${funcionLlamada}.`; }
                await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error en case ${funcionLlamada}: ${responseContentParaUsuario}`, metadataObj);
            }
        }

        if (responseContentParaUsuario || (responseMediaParaEnviar && responseMediaParaEnviar.length > 0)) {
            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId,
                contentFuncion: responseContentParaUsuario,
                mediaItemsFuncion: responseMediaParaEnviar,
                role: 'assistant',
                nombreFuncionEjecutada: funcionLlamada,
                canalOriginal: typeof canalNombre === 'string' ? canalNombre : undefined,
                destinatarioWaId: typeof destinatarioWaId === 'string' ? destinatarioWaId : undefined,
                negocioPhoneNumberIdEnvia: typeof negocioPhoneNumberIdEnvia === 'string' ? negocioPhoneNumberIdEnvia : undefined,
            });
        } else {
            console.warn(`[Dispatcher V4] Tarea ${tareaEjecutadaId} - No se generó content ni media para función "${funcionLlamada}".`);
            // Si hubo un error en la función y responseContentParaUsuario ya tiene el error, se enviará ese error.
            // Si la función simplemente no produjo output (content y media son null/vacío), no se envía nada.
            // Considera si quieres enviar un mensaje de error genérico si !resultadoEjecucionDeFuncion?.success aquí.
            if (resultadoEjecucionDeFuncion && !resultadoEjecucionDeFuncion.success && !responseContentParaUsuario) {
                // Si la función falló pero no se asignó responseContentParaUsuario (ej. error muy genérico)
                responseContentParaUsuario = resultadoEjecucionDeFuncion.error || "Ocurrió un error procesando tu solicitud.";
                // Podrías llamar a enviarMensajeInternoYWhatsAppAction aquí con este mensaje de error.
            }
        }

        // AJUSTADO: Ahora resultadoEjecucionDeFuncion está en el scope correcto
        const ejecucionFuncionOk = resultadoEjecucionDeFuncion?.success ?? false; // Default a false si es null
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({
                    ...metadataObj,
                    resultadoDispatcher: {
                        contentEnviado: !!responseContentParaUsuario,
                        mediaEnviadaCount: responseMediaParaEnviar?.length || 0,
                        errorFuncionOriginal: !ejecucionFuncionOk && resultadoEjecucionDeFuncion ? resultadoEjecucionDeFuncion.error : null,
                    },
                    ejecucionFuncionOk: ejecucionFuncionOk, // Guardar si la función original tuvo éxito
                })
            }
        });

        console.log(`[Dispatcher V4] Tarea ${tareaEjecutadaId} - FIN. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: null };
    } catch (error: unknown) {
        // Manejo de error catastrófico
        const errorMsg = error instanceof Error ? error.message : "Error desconocido en dispatcher.";
        console.error(`[Dispatcher V4] Error catastrófico para tarea ${tareaEjecutadaId}:`, error);
        return { success: false, error: errorMsg, data: null };
    }
    // Retorno por defecto para cubrir todos los caminos de ejecución
    return { success: false, error: "Error desconocido: no se alcanzó ningún return explícito.", data: null };
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