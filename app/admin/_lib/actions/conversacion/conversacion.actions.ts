// app/admin/_lib/actions/conversacion/conversacion.actions.ts
'use server';

import { InteraccionParteTipo, Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarConversacionesParamsSchema,
    type ConversacionPreviewItemData,
    conversacionPreviewItemSchema,
    obtenerDetallesConversacionParamsSchema,
    type ConversationDetailsForPanelData,
    conversacionDetailsForPanelSchema,
    obtenerMensajesCrmParamsSchema,
    type ChatMessageItemCrmData,
    chatMessageItemCrmSchema,
    enviarMensajeCrmParamsSchema,
    asignarAgenteConversacionParamsSchema,
    gestionarPausaAutomatizacionParamsSchema,
    archivarConversacionParamsSchema,
    desarchivarConversacionParamsSchema
} from './conversacion.schemas';
import { z } from 'zod';

// --- FUNCIÓN AUXILIAR CON LOGS MEJORADOS ---
function determinarInfoCanal(
    // Estos son del AsistenteVirtual.canalConversacional
    canalNombreAsistente?: string | null,
    canalIconoAsistente?: string | null,
    // Estos son de la Conversacion misma
    conversacionWhatsappId?: string | null,
    conversacionPhoneNumberId?: string | null
): { canalOrigen: ConversationDetailsForPanelData['canalOrigen'], canalIcono: string | null } {
    let canalOrigen: ConversationDetailsForPanelData['canalOrigen'] = 'desconocido';
    let canalIconoDeterminado: string | null = null;

    console.log(`[determinarInfoCanal V3] Inputs: NombreAsistente="${canalNombreAsistente}", IconoAsistente="${canalIconoAsistente}", ConvWhatsappId="${conversacionWhatsappId}", ConvPhoneNumberId="${conversacionPhoneNumberId}"`);

    // Prioridad 1: Si la conversación tiene identificadores de WhatsApp
    if (conversacionWhatsappId || conversacionPhoneNumberId) {
        canalOrigen = 'whatsapp';
        // Si tenemos un icono específico para WhatsApp desde el asistente, usarlo.
        // Sino, podríamos tener un icono por defecto para 'whatsapp'.
        if (canalNombreAsistente?.toLowerCase().includes('whatsapp') && canalIconoAsistente) {
            canalIconoDeterminado = canalIconoAsistente;
        } else {
            canalIconoDeterminado = 'whatsapp'; // O un valor que tu frontend interprete como el icono de WhatsApp
        }
        console.log(`[determinarInfoCanal V3] Determinado como 'whatsapp' por IDs de conversación. Icono: ${canalIconoDeterminado}`);
        return { canalOrigen, canalIcono: canalIconoDeterminado };
    }

    // Prioridad 2: Usar el nombre del canal del asistente si no hay IDs de WhatsApp en la conversación
    if (canalNombreAsistente) {
        const nombreNormalizado = canalNombreAsistente.toLowerCase().trim();
        if (nombreNormalizado.includes('whatsapp')) { // Podría ser un asistente multicanal cuyo default es WhatsApp
            canalOrigen = 'whatsapp';
        } else if (nombreNormalizado.includes('webchat') || nombreNormalizado.includes('web chat')) {
            canalOrigen = 'webchat';
        } else if (nombreNormalizado) {
            canalOrigen = 'otro';
        }
        canalIconoDeterminado = canalIconoAsistente || null;
        console.log(`[determinarInfoCanal V3] Determinado como '${canalOrigen}' por nombre de canal del asistente. Icono: ${canalIconoDeterminado}`);
        return { canalOrigen, canalIcono: canalIconoDeterminado };
    }

    console.log(`[determinarInfoCanal V3] No se pudo determinar un canal específico. Fallback a 'desconocido'.`);
    return { canalOrigen, canalIcono: null }; // Fallback
}

export async function listarConversacionesAction(
    params: z.infer<typeof listarConversacionesParamsSchema>
): Promise<ActionResult<ConversacionPreviewItemData[]>> {
    const validation = listarConversacionesParamsSchema.safeParse(params);
    if (!validation.success) {
        console.error("[listarConversacionesAction V3] Error de validación:", validation.error.flatten());
        return { success: false, error: "Parámetros de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId, searchTerm, filtroStatus, filtroPipelineId } = validation.data;
    try {
        const whereClause: Prisma.ConversacionWhereInput = {
            lead: {
                crm: { negocioId: negocioId },
                ...(filtroPipelineId && { pipelineId: filtroPipelineId }),
            },
            asistenteVirtual: { isNot: null },
        };

        if (filtroStatus === 'activas') {
            whereClause.status = { notIn: ['archivada', 'cerrada'] };
        } else if (filtroStatus === 'archivadas') {
            whereClause.status = 'archivada';
        }

        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.trim();
            whereClause.OR = [
                { lead: { nombre: { contains: term, mode: 'insensitive' } } },
                { lead: { email: { contains: term, mode: 'insensitive' } } },
                { lead: { telefono: { contains: term, mode: 'insensitive' } } },
            ];
        }

        const conversacionesPrisma = await prisma.conversacion.findMany({
            where: whereClause,
            select: {
                id: true, status: true, updatedAt: true,
                whatsappId: true, // Seleccionar para determinar canal
                phoneNumberId: true, // Seleccionar para determinar canal
                asistenteVirtual: { select: { canalConversacional: { select: { nombre: true, icono: true } } } },
                lead: { select: { id: true, nombre: true, /* avatarUrl: true, */ } },
                Interaccion: { orderBy: { createdAt: 'desc' }, take: 1, select: { mensajeTexto: true, mensaje: true, createdAt: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        });

        const dataPromises = conversacionesPrisma.map(async (conv) => {
            const ultimaInteraccion = conv.Interaccion[0];
            const { canalOrigen, canalIcono } = determinarInfoCanal(
                conv.asistenteVirtual?.canalConversacional?.nombre,
                conv.asistenteVirtual?.canalConversacional?.icono,
                conv.whatsappId,
                conv.phoneNumberId
            );
            const previewText = ultimaInteraccion?.mensajeTexto ?? ultimaInteraccion?.mensaje ?? null;
            return {
                id: conv.id, leadId: conv.lead?.id, leadName: conv.lead?.nombre ?? 'Contacto desconocido',
                lastMessagePreview: previewText ? previewText.substring(0, 70) : (ultimaInteraccion ? '[Media/Sin texto]' : '...'),
                lastMessageTimestamp: ultimaInteraccion?.createdAt ?? conv.updatedAt,
                status: conv.status ?? 'desconocido', canalOrigen: canalOrigen, canalIcono: canalIcono,
                avatarUrl: undefined,
            };
        });
        const data = await Promise.all(dataPromises);
        const parsedData = z.array(conversacionPreviewItemSchema).safeParse(data);
        if (!parsedData.success) {
            console.error("[listarConversacionesAction V3] Error Zod en datos de salida:", parsedData.error.flatten().fieldErrors);
            return { success: false, error: "Error al procesar datos de conversaciones." };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('[listarConversacionesAction V3] Error general:', error);
        return { success: false, error: 'No se pudieron cargar las conversaciones.' };
    }
}

export async function obtenerDetallesConversacionAction(
    params: z.infer<typeof obtenerDetallesConversacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData>> {
    const validation = obtenerDetallesConversacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de conversación inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { conversacionId } = validation.data;
    console.log(`[obtenerDetallesConversacionAction V3] Buscando detalles para convId: ${conversacionId}`);

    try {
        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversacionId },
            select: {
                id: true, status: true, leadId: true,
                whatsappId: true, // Seleccionar para determinar canal
                phoneNumberId: true, // Seleccionar para determinar canal
                lead: { select: { nombre: true } },
                agenteCrmActualId: true,
                agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                asistenteVirtual: {
                    select: {
                        nombre: true,
                        canalConversacional: { select: { nombre: true, icono: true } }
                    }
                },
            },
        });

        if (!conversacion) {
            console.warn(`[obtenerDetallesConversacionAction V3] Conversación no encontrada: ${conversacionId}`);
            return { success: false, error: 'Conversación no encontrada.' };
        }

        const canalNombreAsistente = conversacion.asistenteVirtual?.canalConversacional?.nombre;
        const canalIconoAsistente = conversacion.asistenteVirtual?.canalConversacional?.icono;
        console.log(`[obtenerDetallesConversacionAction V3] Datos de conv ${conversacionId}: whatsappId="${conversacion.whatsappId}", phoneNumberId="${conversacion.phoneNumberId}", CanalAsistenteNombre="${canalNombreAsistente}"`);

        const { canalOrigen, canalIcono } = determinarInfoCanal(
            canalNombreAsistente,
            canalIconoAsistente,
            conversacion.whatsappId,
            conversacion.phoneNumberId
        );

        const data: ConversationDetailsForPanelData = {
            id: conversacion.id,
            status: conversacion.status ?? 'desconocido',
            leadId: conversacion.leadId,
            leadNombre: conversacion.lead?.nombre ?? null,
            agenteCrmActual: conversacion.agenteCrmActual ? {
                id: conversacion.agenteCrmActual.id,
                nombre: conversacion.agenteCrmActual.nombre ?? null,
                userId: conversacion.agenteCrmActual.userId ?? null,
            } : null,
            canalOrigen: canalOrigen,
            canalIcono: canalIcono,
            asistenteNombre: conversacion.asistenteVirtual?.nombre ?? null,
        };

        const parsedData = conversacionDetailsForPanelSchema.safeParse(data);
        if (!parsedData.success) {
            console.error("[obtenerDetallesConversacionAction V3] Error Zod en datos de salida:", parsedData.error.flatten());
            console.error("[obtenerDetallesConversacionAction V3] Datos que fallaron validación Zod:", data);
            return { success: false, error: "Error al procesar datos de detalle de conversación." };
        }
        console.log(`[obtenerDetallesConversacionAction V3] Detalles procesados para conv ${conversacionId}:`, parsedData.data);
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error(`[obtenerDetallesConversacionAction V3] Error para conv ${conversacionId}:`, error);
        return { success: false, error: 'No se pudieron cargar los detalles de la conversación.' };
    }
}

export async function obtenerMensajesCrmAction(
    params: z.infer<typeof obtenerMensajesCrmParamsSchema>
): Promise<ActionResult<ChatMessageItemCrmData[]>> {
    const validation = obtenerMensajesCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { conversacionId, limit } = validation.data;

    try {
        const interacciones = await prisma.interaccion.findMany({
            where: { conversacionId: conversacionId },
            select: {
                id: true, conversacionId: true, role: true,
                mensajeTexto: true, mensaje: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, mediaUrl: true, mediaType: true,
                createdAt: true, agenteCrmId: true,
                agenteCrm: { select: { id: true, nombre: true, userId: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: limit > 0 ? limit : undefined,
        });

        const mappedDataPromises = interacciones.map(async (interaccion) => {
            let parsedArgs: Record<string, unknown> | null = null;
            if (interaccion.functionCallArgs) {
                if (typeof interaccion.functionCallArgs === 'object' && interaccion.functionCallArgs !== null) {
                    parsedArgs = interaccion.functionCallArgs as Record<string, unknown>;
                } else if (typeof interaccion.functionCallArgs === 'string') {
                    try { parsedArgs = JSON.parse(interaccion.functionCallArgs); }
                    catch (e) { console.warn(`[obtenerMensajesCrmAction V3] No se pudo parsear functionCallArgs (string) para interaccion ${interaccion.id}:`, e); parsedArgs = { errorParsing: true, raw: interaccion.functionCallArgs }; }
                }
            }

            let parsedResponseData: Record<string, unknown> | null = null;
            if (interaccion.functionResponseData) {
                if (typeof interaccion.functionResponseData === 'object' && interaccion.functionResponseData !== null) {
                    parsedResponseData = interaccion.functionResponseData as Record<string, unknown>;
                } else if (typeof interaccion.functionResponseData === 'string') {
                    try {
                        parsedResponseData = JSON.parse(interaccion.functionResponseData);
                    }
                    catch (e) {
                        console.warn(`[obtenerMensajesCrmAction V3] No se pudo parsear functionResponseData (string) para interaccion ${interaccion.id}:`, e, "Raw:", interaccion.functionResponseData);
                        parsedResponseData = { errorParsing: true, raw: interaccion.functionResponseData };
                    }
                }
            }

            const textoPrincipal = interaccion.mensajeTexto ?? interaccion.mensaje ?? null;

            return {
                id: interaccion.id,
                conversacionId: interaccion.conversacionId,
                role: interaccion.role,
                mensajeTexto: textoPrincipal,
                parteTipo: interaccion.parteTipo,
                functionCallNombre: interaccion.functionCallNombre,
                functionCallArgs: parsedArgs,
                functionResponseData: parsedResponseData,
                mediaUrl: interaccion.mediaUrl,
                mediaType: interaccion.mediaType,
                createdAt: interaccion.createdAt,
                agenteCrm: interaccion.agenteCrm ? {
                    id: interaccion.agenteCrm.id,
                    nombre: interaccion.agenteCrm.nombre ?? null,
                    userId: interaccion.agenteCrm.userId ?? null,
                } : null,
            };
        });

        const mappedData = await Promise.all(mappedDataPromises);

        const parsedDataResult = z.array(chatMessageItemCrmSchema).safeParse(mappedData);
        if (!parsedDataResult.success) {
            console.error("[obtenerMensajesCrmAction V3] Error de validación Zod en datos de salida:", parsedDataResult.error.flatten().fieldErrors);
            const errorPaths = parsedDataResult.error.flatten().fieldErrors as Record<string, unknown>;
            const errorIndices = Object.keys(errorPaths).map(path => path.match(/^\[(\d+)\]/)?.[1]).filter(Boolean).map(Number);
            const uniqueErrorIndices = Array.from(new Set(errorIndices));
            const failingItems = uniqueErrorIndices.map((index: number) => ({
                index,
                data: mappedData[index as number],
                errors: (errorPaths[`[${index}]`] as unknown) || "Error general en item"
            }));
            console.error("[obtenerMensajesCrmAction V3] Items que fallaron Zod (índice y datos):", JSON.stringify(failingItems, null, 2));
            return { success: false, error: "Error al procesar datos de mensajes del CRM." };
        }
        return { success: true, data: parsedDataResult.data };
    } catch (error) {
        console.error(`[obtenerMensajesCrmAction V3] Error general para conv ${conversacionId}:`, error);
        return { success: false, error: 'No se pudieron cargar los mensajes del CRM.' };
    }
}

export async function enviarMensajeCrmAction(
    params: z.infer<typeof enviarMensajeCrmParamsSchema>
): Promise<ActionResult<ChatMessageItemCrmData>> {
    const validation = enviarMensajeCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos de mensaje inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { conversacionId, mensaje, role, agenteCrmId } = validation.data;
    try {
        const updateConversationStatusData: Prisma.ConversacionUpdateInput = {
            updatedAt: new Date(),
        };
        if (role === 'agent') {
            updateConversationStatusData.status = 'en_espera_agente';
        }
        const nuevaInteraccion = await prisma.$transaction(async (tx) => {
            const interaccion = await tx.interaccion.create({
                data: {
                    conversacionId: conversacionId,
                    mensajeTexto: mensaje,
                    role: role,
                    parteTipo: InteraccionParteTipo.TEXT,
                    agenteCrmId: agenteCrmId,
                },
                select: {
                    id: true, conversacionId: true, role: true, mensajeTexto: true,
                    parteTipo: true, functionCallNombre: true, functionCallArgs: true, functionResponseData: true,
                    mediaUrl: true, mediaType: true, createdAt: true,
                    agenteCrm: { select: { id: true, nombre: true, userId: true } },
                }
            });
            await tx.conversacion.update({
                where: { id: conversacionId },
                data: updateConversationStatusData
            });
            return interaccion;
        });
        const dataToParse = {
            ...nuevaInteraccion,
            functionCallArgs: nuevaInteraccion.functionCallArgs ? nuevaInteraccion.functionCallArgs as Record<string, unknown> : null,
            functionResponseData: nuevaInteraccion.functionResponseData ? nuevaInteraccion.functionResponseData as Record<string, unknown> : null,
            agenteCrm: nuevaInteraccion.agenteCrm ? { ...nuevaInteraccion.agenteCrm, userId: nuevaInteraccion.agenteCrm.userId ?? null } : null,
        };
        const parsedData = chatMessageItemCrmSchema.safeParse(dataToParse);
        if (!parsedData.success) {
            console.error("[enviarMensajeCrmAction V3] Error de validación Zod en salida:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos del mensaje enviado desde CRM." };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('[enviarMensajeCrmAction V3] Error:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return { success: false, error: 'Error: El ID del agente o conversación no es válido.' };
        }
        return { success: false, error: 'No se pudo enviar el mensaje desde CRM.' };
    }
}

export async function crearInteraccionSistemaAction(
    params: { conversacionId: string, mensaje: string },
    tx?: Prisma.TransactionClient
): Promise<ActionResult<null>> {
    const db = tx || prisma;
    const { conversacionId, mensaje } = params;
    if (!conversacionId || !mensaje) {
        console.warn("[crearInteraccionSistemaAction V3] Faltan datos (conversacionId o mensaje).");
        return { success: false, error: "Faltan datos para crear interacción de sistema." }
    }
    try {
        await db.interaccion.create({
            data: {
                conversacionId,
                role: 'system',
                mensajeTexto: mensaje,
                parteTipo: InteraccionParteTipo.TEXT,
            },
        });
        if (!tx) {
            await db.conversacion.update({
                where: { id: conversacionId },
                data: { updatedAt: new Date() }
            });
        }
        return { success: true, data: null };
    } catch (logError) {
        console.error("[crearInteraccionSistemaAction V3] Error al crear interacción de sistema:", logError);
        return { success: false, error: "No se pudo crear la interacción de sistema." };
    }
}

export async function asignarAgenteAction(
    params: z.infer<typeof asignarAgenteConversacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = asignarAgenteConversacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { conversacionId, agenteCrmId, nombreAgenteQueAsigna } = validation.data;

    try {
        let agenteAsignadoNombre = 'nadie (desasignado)';
        if (agenteCrmId) {
            const agente = await prisma.agente.findUnique({
                where: { id: agenteCrmId },
                select: { nombre: true }
            });
            if (!agente) return { success: false, error: 'Agente especificado no existe.', data: null };
            agenteAsignadoNombre = agente.nombre ?? `Agente ID: ${agenteCrmId.substring(0, 6)}...`;
        }

        const conversacionActualizada = await prisma.conversacion.update({
            where: { id: conversacionId },
            data: { agenteCrmActualId: agenteCrmId, updatedAt: new Date() },
            select: {
                id: true, status: true, leadId: true,
                whatsappId: true, phoneNumberId: true, // Seleccionar para determinar canal
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                asistenteVirtual: { select: { nombre: true, canalConversacional: { select: { nombre: true, icono: true } } } },
            },
        });

        const mensajeSistema = agenteCrmId
            ? `Conversación asignada a ${agenteAsignadoNombre}${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`
            : `Conversación desasignada de agente${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`;
        await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema });

        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacionActualizada.asistenteVirtual?.canalConversacional?.nombre,
            conversacionActualizada.asistenteVirtual?.canalConversacional?.icono,
            conversacionActualizada.whatsappId,
            conversacionActualizada.phoneNumberId
        );

        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre ?? null,
                userId: conversacionActualizada.agenteCrmActual.userId ?? null,
            } : null,
            canalOrigen: canalOrigen, canalIcono: canalIcono,
            asistenteNombre: conversacionActualizada.asistenteVirtual?.nombre ?? null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) {
            console.error("[asignarAgenteAction V3] Error Zod en salida:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos post-asignación." };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('[asignarAgenteAction V3] Error:', error);
        return { success: false, error: 'No se pudo asignar el agente.', data: null };
    }
}

export async function pausarAutomatizacionConversacionAction(
    params: z.infer<typeof gestionarPausaAutomatizacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = gestionarPausaAutomatizacionParamsSchema.safeParse(params);
    if (!validation.success) { return { success: false, error: "Parámetros inválidos.", data: null }; }
    const { conversacionId, nombreAgenteQueGestiona } = validation.data;
    const estadoPausado = 'en_espera_agente';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId }, data: { status: estadoPausado, updatedAt: new Date() },
                select: {
                    id: true, status: true, leadId: true, lead: { select: { nombre: true } },
                    whatsappId: true, phoneNumberId: true,
                    agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                    asistenteVirtual: { select: { nombre: true, canalConversacional: { select: { nombre: true, icono: true } } } },
                },
            });
            const mensajeSistema = `Automatización pausada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });
        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacionActualizada.asistenteVirtual?.canalConversacional?.nombre,
            conversacionActualizada.asistenteVirtual?.canalConversacional?.icono,
            conversacionActualizada.whatsappId,
            conversacionActualizada.phoneNumberId
        );
        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null, userId: conversacionActualizada.agenteCrmActual.userId ?? null } : null,
            canalOrigen: canalOrigen, canalIcono: canalIcono, asistenteNombre: conversacionActualizada.asistenteVirtual?.nombre ?? null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) { console.error("[pausarAutomatizacion V3] Error Zod salida:", parsedData.error.flatten()); return { success: false, error: "Error procesando datos post-pausa." }; }
        return { success: true, data: parsedData.data };
    } catch (e) { console.error("[pausarAutomatizacion V3] Error:", e); return { success: false, error: "Error al pausar la automatización.", data: null }; }
}

export async function reanudarAutomatizacionConversacionAction(
    params: z.infer<typeof gestionarPausaAutomatizacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = gestionarPausaAutomatizacionParamsSchema.safeParse(params);
    if (!validation.success) { return { success: false, error: "Parámetros inválidos.", data: null }; }
    const { conversacionId, nombreAgenteQueGestiona } = validation.data;
    const estadoActivo = 'abierta';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId }, data: { status: estadoActivo, updatedAt: new Date() },
                select: {
                    id: true, status: true, leadId: true, lead: { select: { nombre: true } },
                    whatsappId: true, phoneNumberId: true,
                    agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                    asistenteVirtual: { select: { nombre: true, canalConversacional: { select: { nombre: true, icono: true } } } },
                },
            });
            const mensajeSistema = `Automatización reanudada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });
        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacionActualizada.asistenteVirtual?.canalConversacional?.nombre,
            conversacionActualizada.asistenteVirtual?.canalConversacional?.icono,
            conversacionActualizada.whatsappId,
            conversacionActualizada.phoneNumberId
        );
        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null, userId: conversacionActualizada.agenteCrmActual.userId ?? null } : null,
            canalOrigen: canalOrigen, canalIcono: canalIcono, asistenteNombre: conversacionActualizada.asistenteVirtual?.nombre ?? null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) { console.error("[reanudarAutomatizacion V3] Error Zod salida:", parsedData.error.flatten()); return { success: false, error: "Error procesando datos post-reanudación." }; }
        return { success: true, data: parsedData.data };
    } catch (e) { console.error("[reanudarAutomatizacion V3] Error:", e); return { success: false, error: "Error al reanudar la automatización.", data: null }; }
}

export async function archivarConversacionAction(
    params: z.infer<typeof archivarConversacionParamsSchema>
): Promise<ActionResult<null>> {
    const validation = archivarConversacionParamsSchema.safeParse(params);
    if (!validation.success) { return { success: false, error: "Parámetros inválidos." }; }
    const { conversacionId, nombreUsuarioQueArchiva } = validation.data;
    const estadoArchivado = 'archivada';
    try {
        await prisma.$transaction(async (tx) => {
            await tx.conversacion.update({
                where: { id: conversacionId }, data: { status: estadoArchivado, updatedAt: new Date() },
            });
            const mensajeSistema = `Conversación archivada${nombreUsuarioQueArchiva ? ` por ${nombreUsuarioQueArchiva}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
        });
        return { success: true, data: null };
    } catch (e) { console.error("[archivarConversacion V3] Error:", e); return { success: false, error: "Error al archivar la conversación." }; }
}

export async function desarchivarConversacionAction(
    params: z.infer<typeof desarchivarConversacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = desarchivarConversacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { conversacionId, nombreUsuarioQueDesarchiva } = validation.data;
    const estadoPrevioAlArchivo = 'abierta';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId }, data: { status: estadoPrevioAlArchivo, updatedAt: new Date() },
                select: {
                    id: true, status: true, leadId: true, lead: { select: { nombre: true } },
                    whatsappId: true, phoneNumberId: true,
                    agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                    asistenteVirtual: { select: { nombre: true, canalConversacional: { select: { nombre: true, icono: true } } } },
                },
            });
            const mensajeSistema = `Conversación desarchivada${nombreUsuarioQueDesarchiva ? ` por ${nombreUsuarioQueDesarchiva}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });

        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacionActualizada.asistenteVirtual?.canalConversacional?.nombre,
            conversacionActualizada.asistenteVirtual?.canalConversacional?.icono,
            conversacionActualizada.whatsappId,
            conversacionActualizada.phoneNumberId
        );
        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre ?? null,
                userId: conversacionActualizada.agenteCrmActual.userId ?? null,
            } : null,
            canalOrigen: canalOrigen, canalIcono: canalIcono,
            asistenteNombre: conversacionActualizada.asistenteVirtual?.nombre ?? null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) {
            console.error("[desarchivarConversacionAction V3] Error Zod salida:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos post-desarchivo.", data: null };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('[desarchivarConversacionAction V3] Error:', error);
        return { success: false, error: "Error al desarchivar la conversación.", data: null };
    }
}
