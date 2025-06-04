import { type ActionResult } from '../types';
import type { MediaItem } from '../actions/conversacion/conversacion.schemas';
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import { ChatMessageItemSchema, type ChatMessageItem } from '../ia/ia.schemas';
import prisma from '../prismaClient'; // Asegúrate que la ruta a tu cliente Prisma es correcta

// Asumo que estas acciones de WhatsApp son globales o están en un lugar accesible
import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions';


// -----------------------------------------------------------------------------
// Función Auxiliar: actualizarTareaEjecutadaFallidaDispatcher
// -----------------------------------------------------------------------------
export async function actualizarTareaEjecutadaFallidaDispatcher(
    tareaEjecutadaId: string,
    mensajeError: string,
    metadataOriginal?: Record<string, unknown> | null
) {
    console.warn(`[Dispatcher Refactor] Fallo en Tarea ${tareaEjecutadaId}. Error: ${mensajeError}.`);
    try {
        let finalMetadata: Record<string, unknown> = {
            ...(metadataOriginal || {}), // Mantener metadata original si existe
            error_dispatcher: mensajeError,
            ejecucionDispatcherExitosa: false, // O un campo similar para indicar fallo en este punto
            timestamp_fallo_dispatcher: new Date().toISOString(),
        };

        // Si no se pasó metadataOriginal, intentar recuperarla de la BD
        if (!metadataOriginal && tareaEjecutadaId) {
            const tareaActual = await prisma.tareaEjecutada.findUnique({
                where: { id: tareaEjecutadaId },
                select: { metadata: true }
            });
            if (tareaActual?.metadata) {
                let parsedExistingMetadata = {};
                if (typeof tareaActual.metadata === 'string') {
                    try { parsedExistingMetadata = JSON.parse(tareaActual.metadata); } catch { /* Log error si es necesario */ }
                } else if (typeof tareaActual.metadata === 'object' && tareaActual.metadata !== null) {
                    parsedExistingMetadata = tareaActual.metadata as Record<string, unknown>;
                }
                finalMetadata = { ...parsedExistingMetadata, ...finalMetadata }; // Combinar, dando precedencia a los errores nuevos
            }
        }

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify(finalMetadata) }
        });
    } catch (updateError) {
        console.error(`[Dispatcher Refactor] Error CRÍTICO al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}


// -----------------------------------------------------------------------------
// Función Auxiliar: enviarMensajeInternoYWhatsAppAction
// (Este es tu código V6, revisado para asegurar consistencia)
// -----------------------------------------------------------------------------
export async function enviarMensajeInternoYWhatsAppAction(input: {
    conversacionId: string;
    contentFuncion: string | null;
    mediaItemsFuncion?: MediaItem[] | null;
    uiComponentPayload?: Record<string, unknown> | null;
    aiContextData?: Record<string, unknown> | null; // <--- CAMBIAR NOMBRE AQUÍ (o mantenerlo y ajustar la llamada)
    role: 'assistant' | 'system';
    nombreFuncionEjecutada?: string;
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
}): Promise<ActionResult<ChatMessageItem | null>> {
    // const timestampInicio = Date.now();
    // console.log(`[enviarMensajeInterno DISPATCHER V6] Input: Canal ${input.canalOriginal}, Contenido: ${input.contentFuncion ? input.contentFuncion.substring(0,50)+'...' : 'N/A'}`);

    try {
        if (!input.conversacionId || !input.role) {
            return { success: false, error: 'Faltan datos (conversacionId, role) para enviarMensajeInterno.', data: null };
        }

        const tieneContentValido = input.contentFuncion && input.contentFuncion.trim() !== "";
        const tieneMediaValida = Array.isArray(input.mediaItemsFuncion) && input.mediaItemsFuncion.length > 0;
        const tieneUiPayloadValido = input.uiComponentPayload && typeof input.uiComponentPayload === 'object' && Object.keys(input.uiComponentPayload).length > 0;

        if (!tieneContentValido && !tieneMediaValida && !tieneUiPayloadValido) {
            console.warn(`[enviarMensajeInterno DISPATCHER V6] No hay content, ni media, ni uiPayload válido para enviar. Abortando.`);
            return { success: false, error: 'Se requiere contenido, media o payload de UI para enviar.', data: null };
        }

        let textoPrincipalInteraccion = input.contentFuncion;
        if (!textoPrincipalInteraccion) {
            if (tieneUiPayloadValido) textoPrincipalInteraccion = `[UI Componente: ${(input.uiComponentPayload as { componentType?: string })?.componentType || 'Personalizado'}]`;
            else if (tieneMediaValida) textoPrincipalInteraccion = input.mediaItemsFuncion![0].caption || `[Media: ${input.mediaItemsFuncion![0].tipo}]`;
            else textoPrincipalInteraccion = "[Respuesta sin texto visible]";
        }

        const dataToCreateInDB: Prisma.InteraccionCreateInput = {
            conversacion: { connect: { id: input.conversacionId } },
            role: input.role,
            mensajeTexto: textoPrincipalInteraccion,
            parteTipo: InteraccionParteTipo.TEXT,
            canalInteraccion: input.canalOriginal || undefined,
        };

        if (input.role === 'assistant' && input.nombreFuncionEjecutada) {
            dataToCreateInDB.parteTipo = InteraccionParteTipo.FUNCTION_RESPONSE;
            dataToCreateInDB.functionResponseNombre = input.nombreFuncionEjecutada;
            // Guardar el payload que la función generó para la IA (puede ser texto, o estructura con media)
            // dataToCreateInDB.functionResponseData = {
            //     content: input.contentFuncion, // El contenido textual/HTML que la función preparó
            //     media: input.mediaItemsFuncion || null, // La media que la función preparó
            //     // uiComponentPayload NO va dentro de functionResponseData, sino como campo raíz
            // } as Prisma.InputJsonValue;

            // AHORA GUARDAMOS aiContextData aquí:
            dataToCreateInDB.functionResponseData = input.aiContextData // Usar el aiContextData completo
                ? input.aiContextData as Prisma.InputJsonValue
                : { // Fallback si aiContextData no se proveyó por alguna razón
                    content: input.contentFuncion, // Lo que el usuario vio
                    media: input.mediaItemsFuncion || null
                } as Prisma.InputJsonValue;

            if (input.uiComponentPayload) {
                dataToCreateInDB.uiComponentPayload = input.uiComponentPayload as Prisma.InputJsonValue;
            }
        } else if (input.role === 'assistant' && (tieneMediaValida || tieneUiPayloadValido)) {
            // Mensaje simple del asistente que podría tener media o un UI component (aunque menos común sin ser de función)
            // Si tiene media, la guardamos en functionResponseData.media por consistencia
            if (tieneMediaValida) {
                dataToCreateInDB.functionResponseData = { content: input.contentFuncion, media: input.mediaItemsFuncion || null } as Prisma.InputJsonValue;
            }
            if (input.uiComponentPayload) { // Si es mensaje de texto pero con UI component
                dataToCreateInDB.uiComponentPayload = input.uiComponentPayload as Prisma.InputJsonValue;
            }
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreateInDB,
            select: { // Asegúrate que este select coincide con lo que ChatMessageItemSchema espera
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true,
                uiComponentPayload: true, mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } }, canalInteraccion: true,
            }
        });

        const parsedNuevaInteraccion = ChatMessageItemSchema.safeParse(nuevaInteraccion);
        const interaccionGuardada: ChatMessageItem | null = parsedNuevaInteraccion.success ? parsedNuevaInteraccion.data : null;

        if (!parsedNuevaInteraccion.success) {
            console.error(`[enviarMensajeInterno DISPATCHER V6] Error Zod parseando nuevaInteraccion (ID: ${nuevaInteraccion.id}):`, parsedNuevaInteraccion.error.flatten().fieldErrors, "Raw data:", nuevaInteraccion);
        }

        await prisma.conversacion.update({ where: { id: input.conversacionId }, data: { updatedAt: new Date() } });

        const esCanalWhatsApp = input.canalOriginal?.toLowerCase().includes('whatsapp') ?? false;
        if (esCanalWhatsApp && input.destinatarioWaId && input.negocioPhoneNumberIdEnvia && input.role === 'assistant') {
            const asistenteTokenInfo = await prisma.asistenteVirtual.findFirst({
                where: { phoneNumberId: input.negocioPhoneNumberIdEnvia, status: 'activo' },
                select: { token: true }
            });
            if (asistenteTokenInfo?.token) {
                const commonWhatsAppParams = {
                    destinatarioWaId: input.destinatarioWaId,
                    negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
                    tokenAccesoAsistente: asistenteTokenInfo.token
                };
                if (input.contentFuncion) { // Enviar texto principal si existe
                    await enviarMensajeWhatsAppApiAction({ ...commonWhatsAppParams, tipoMensaje: 'text', mensajeTexto: input.contentFuncion });
                    if (input.mediaItemsFuncion && input.mediaItemsFuncion.length > 0) await new Promise(resolve => setTimeout(resolve, 600)); // Pausa si hay media
                }
                if (input.mediaItemsFuncion && input.mediaItemsFuncion.length > 0) {
                    for (const media of input.mediaItemsFuncion) {
                        if (!media.url || !media.tipo) continue;
                        await enviarMensajeWhatsAppApiAction({
                            ...commonWhatsAppParams,
                            tipoMensaje: media.tipo as 'image' | 'video' | 'audio' | 'document', // Ajusta los valores según los permitidos por EnviarMensajeWhatsAppApiInputSchema
                            mediaUrl: media.url,
                            caption: media.caption ?? undefined,
                            filename: media.filename ?? undefined
                        });
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }
            } else {
                console.error(`[EnviarMsgInterno DISPATCHER V6] No token WA para PNID ${input.negocioPhoneNumberIdEnvia}.`);
            }
        }
        // console.log(`[enviarMensajeInterno DISPATCHER V6] Fin para conv ${input.conversacionId}. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: interaccionGuardada };
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "Error desconocido al guardar/enviar mensaje.";
        console.error(`[enviarMensajeInterno DISPATCHER V6] Error catastrófico para conv ${input.conversacionId}:`, e);
        return { success: false, error: errorMsg, data: null };
    }
}
