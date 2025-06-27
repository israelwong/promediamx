'use server';

import { type ActionResult } from '../types';
import type { MediaItem } from '../actions/conversacion/conversacion.schemas';
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import { ChatMessageItemSchema, type ChatMessageItem } from '../ia/ia.schemas';
import prisma from '../prismaClient';
import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions';

// Esta función auxiliar para marcar errores se mantiene sin cambios
export async function actualizarTareaEjecutadaFallidaDispatcher(
    tareaEjecutadaId: string,
    mensajeError: string,
    metadataOriginal?: Record<string, unknown> | null
) {
    console.warn(`[Dispatcher Helper] Fallo en Tarea ${tareaEjecutadaId}. Error: ${mensajeError}.`);
    try {
        let finalMetadata: Record<string, unknown> = {
            ...(metadataOriginal || {}),
            error_dispatcher: mensajeError,
            ejecucionDispatcherExitosa: false,
            timestamp_fallo_dispatcher: new Date().toISOString(),
        };

        if (!metadataOriginal && tareaEjecutadaId) {
            const tareaActual = await prisma.tareaEjecutada.findUnique({
                where: { id: tareaEjecutadaId },
                select: { metadata: true }
            });
            if (tareaActual?.metadata) {
                let parsedExistingMetadata = {};
                if (typeof tareaActual.metadata === 'string') {
                    try { parsedExistingMetadata = JSON.parse(tareaActual.metadata); } catch { /* Ignorar error de parseo */ }
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
        console.error(`[Dispatcher Helper] Error CRÍTICO al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

/**
 * ===================================================================================
 * HELPER PARA GUARDAR Y ENVIAR MENSAJES (VERSIÓN FINAL)
 * ===================================================================================
 * Propósito: Centraliza la lógica de guardar una interacción y enviarla por WhatsApp.
 * Esta versión está completa, corregida y alineada con la arquitectura final.
 * ===================================================================================
 */
export async function enviarMensajeInternoYWhatsAppAction(input: {
    conversacionId: string;
    contentFuncion: string | null;
    mediaItemsFuncion?: MediaItem[] | null;
    uiComponentPayload?: Record<string, unknown> | null;
    aiContextData?: Record<string, unknown> | null;
    role: 'assistant' | 'system';
    parteTipo?: InteraccionParteTipo;
    nombreFuncionEjecutada?: string;
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
}): Promise<ActionResult<ChatMessageItem | null>> {

    try {
        if (!input.conversacionId || !input.role) {
            return { success: false, error: 'Faltan datos (conversacionId, role) para enviarMensajeInterno.', data: null };
        }

        const tieneContentValido = input.contentFuncion && input.contentFuncion.trim() !== "";
        const tieneMediaValida = Array.isArray(input.mediaItemsFuncion) && input.mediaItemsFuncion.length > 0;
        const tieneUiPayloadValido = input.uiComponentPayload && typeof input.uiComponentPayload === 'object' && Object.keys(input.uiComponentPayload).length > 0;

        if (!tieneContentValido && !tieneMediaValida && !tieneUiPayloadValido) {
            console.warn(`[enviarMensajeInterno] No hay contenido válido para enviar. Abortando.`);
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
            parteTipo: input.parteTipo || InteraccionParteTipo.TEXT,
            canalInteraccion: input.canalOriginal || undefined,
        };

        if (input.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE && input.nombreFuncionEjecutada) {
            dataToCreateInDB.functionResponseNombre = input.nombreFuncionEjecutada;
            dataToCreateInDB.functionResponseData = input.aiContextData
                ? input.aiContextData as Prisma.InputJsonValue
                : { content: input.contentFuncion, media: input.mediaItemsFuncion || null } as Prisma.InputJsonValue;
        }

        if (input.uiComponentPayload) {
            dataToCreateInDB.uiComponentPayload = input.uiComponentPayload as Prisma.InputJsonValue;
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreateInDB,
            select: {
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true,
                uiComponentPayload: true, mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } }, canalInteraccion: true,
            }
        });

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
                if (input.contentFuncion) {
                    await enviarMensajeWhatsAppApiAction({ ...commonWhatsAppParams, tipoMensaje: 'text', mensajeTexto: input.contentFuncion });
                    if (input.mediaItemsFuncion && input.mediaItemsFuncion.length > 0) await new Promise(resolve => setTimeout(resolve, 600));
                }
                if (input.mediaItemsFuncion && input.mediaItemsFuncion.length > 0) {
                    for (const media of input.mediaItemsFuncion) {
                        if (!media.url || !media.tipo) continue;
                        await enviarMensajeWhatsAppApiAction({
                            ...commonWhatsAppParams,
                            tipoMensaje: media.tipo as 'image' | 'video' | 'audio' | 'document',
                            mediaUrl: media.url,
                            caption: media.caption ?? undefined,
                            filename: media.filename ?? undefined
                        });
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }
            } else {
                console.error(`[enviarMensajeInterno] No se encontró token de WhatsApp para PNID ${input.negocioPhoneNumberIdEnvia}.`);
            }
        }

        const parsedNuevaInteraccion = ChatMessageItemSchema.safeParse(nuevaInteraccion);
        return { success: true, data: parsedNuevaInteraccion.success ? parsedNuevaInteraccion.data : null };

    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "Error desconocido al guardar/enviar mensaje.";
        console.error(`[enviarMensajeInterno] Error catastrófico para conv ${input.conversacionId}:`, e);
        return { success: false, error: errorMsg, data: null };
    }
}