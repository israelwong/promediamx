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
    desarchivarConversacionParamsSchema,
    EnviarMensajeCrmParams
} from './conversacion.schemas';
import { z } from 'zod';

// Importar la acción para enviar mensajes de WhatsApp y su tipo de input
import { enviarMensajeWhatsAppApiAction } from '../whatsapp/helpers/actions.helpers-x';


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

// --- FUNCIÓN AUXILIAR (SE MANTIENE PORQUE VARIAS ACCIONES LA USAN) ---
function determinarInfoCanal(
    canalNombreAsistente?: string | null,
    canalIconoAsistente?: string | null,
    conversacionWhatsappId?: string | null,
    conversacionPhoneNumberId?: string | null
): { canalOrigen: 'whatsapp' | 'webchat' | 'otro' | 'desconocido', canalIcono: string | null } {
    if (conversacionWhatsappId || conversacionPhoneNumberId) {
        return { canalOrigen: 'whatsapp', canalIcono: 'whatsapp' };
    }
    if (canalNombreAsistente) {
        const nombreNormalizado = canalNombreAsistente.toLowerCase().trim();
        if (nombreNormalizado.includes('whatsapp')) return { canalOrigen: 'whatsapp', canalIcono: canalIconoAsistente || 'whatsapp' };
        if (nombreNormalizado.includes('webchat')) return { canalOrigen: 'webchat', canalIcono: canalIconoAsistente || 'webchat' };
        return { canalOrigen: 'otro', canalIcono: canalIconoAsistente ?? null };
    }
    return { canalOrigen: 'desconocido', canalIcono: null };
}

// --- ACCIONES DE LECTURA ---

export async function listarConversacionesAction(
    params: z.infer<typeof listarConversacionesParamsSchema>
): Promise<ActionResult<ConversacionPreviewItemData[]>> {
    const validation = listarConversacionesParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId, searchTerm, filtroStatus, filtroPipelineId } = validation.data;
    try {
        const whereClause: Prisma.ConversacionWhereInput = {
            lead: { crm: { negocioId: negocioId }, ...(filtroPipelineId && { pipelineId: filtroPipelineId }), },
            leadId: { not: null },
            status: filtroStatus === 'activas' ? { notIn: ['archivada', 'cerrada'] } : 'archivada',
            ...(searchTerm && {
                OR: [
                    { lead: { nombre: { contains: searchTerm, mode: 'insensitive' } } },
                    { lead: { email: { contains: searchTerm, mode: 'insensitive' } } },
                    { lead: { telefono: { contains: searchTerm, mode: 'insensitive' } } },
                ]
            })
        };

        const conversacionesPrisma = await prisma.conversacion.findMany({
            where: whereClause,
            select: {
                id: true, status: true, updatedAt: true,
                lead: { select: { id: true, nombre: true } },
                Interaccion: { orderBy: { createdAt: 'desc' }, take: 1, select: { mensajeTexto: true, role: true, parteTipo: true, functionCallNombre: true, createdAt: true } },
            },
            orderBy: { updatedAt: 'desc' }, take: 100,
        });

        if (!conversacionesPrisma.length) return { success: true, data: [] };

        const conversationIds = conversacionesPrisma.map(c => c.id);
        const canalesAgrupados = await prisma.interaccion.groupBy({
            by: ['conversacionId', 'canalInteraccion'],
            where: { conversacionId: { in: conversationIds }, canalInteraccion: { not: null } },
        });

        const canalesPorConversacion = new Map<string, string[]>();
        canalesAgrupados.forEach(g => {
            if (!g.canalInteraccion) return;
            const canales = canalesPorConversacion.get(g.conversacionId) || [];
            if (!canales.includes(g.canalInteraccion)) canales.push(g.canalInteraccion);
            canalesPorConversacion.set(g.conversacionId, canales);
        });

        const data: ConversacionPreviewItemData[] = conversacionesPrisma.map(conv => {
            const ultimaInteraccion = conv.Interaccion[0];
            let previewText: string | null = 'Conversación iniciada';
            if (ultimaInteraccion) {
                if (ultimaInteraccion.mensajeTexto) previewText = ultimaInteraccion.mensajeTexto;
                else if (ultimaInteraccion.parteTipo === 'FUNCTION_CALL') previewText = `[Ejecutando: ${ultimaInteraccion.functionCallNombre}]`;
                else if (ultimaInteraccion.parteTipo === 'FUNCTION_RESPONSE') previewText = `[Respuesta de herramienta]`;
                else if (ultimaInteraccion.role === 'system') previewText = `[Acción del sistema]`;
                else previewText = 'Interacción sin texto';
            }
            return {
                id: conv.id,
                leadId: conv.lead?.id ?? null,
                leadName: conv.lead?.nombre ?? 'Contacto desconocido',
                lastMessagePreview: previewText,
                lastMessageTimestamp: ultimaInteraccion?.createdAt ?? conv.updatedAt,
                status: conv.status ?? 'desconocido',
                canalesInvolucrados: canalesPorConversacion.get(conv.id) ?? null,
                avatarUrl: null,
            };
        });

        return { success: true, data: z.array(conversacionPreviewItemSchema).parse(data) };
    } catch (error) {
        console.error('[listarConversacionesAction] Error:', error);
        return { success: false, error: 'No se pudieron cargar las conversaciones.' };
    }
}

export async function obtenerDetallesConversacionAction(
    params: z.infer<typeof obtenerDetallesConversacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData>> {
    const validation = obtenerDetallesConversacionParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "ID de conversación inválido." };
    const { conversacionId } = validation.data;
    try {
        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversacionId },
            select: {
                id: true, status: true, leadId: true, updatedAt: true, whatsappId: true, phoneNumberId: true,
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true, userId: true } },
                asistenteVirtual: { select: { nombre: true, canalConversacional: { select: { nombre: true, icono: true } } } },
            },
        });
        if (!conversacion) return { success: false, error: 'Conversación no encontrada.' };

        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacion.asistenteVirtual?.canalConversacional?.nombre,
            conversacion.asistenteVirtual?.canalConversacional?.icono,
            conversacion.whatsappId,
            conversacion.phoneNumberId
        );
        const data: ConversationDetailsForPanelData = {
            id: conversacion.id,
            status: conversacion.status,
            leadId: conversacion.leadId,
            leadNombre: conversacion.lead?.nombre ?? null,
            agenteCrmActual: conversacion.agenteCrmActual,
            canalOrigen, canalIcono,
            asistenteNombre: conversacion.asistenteVirtual?.nombre,
            updatedAt: conversacion.updatedAt,
        };
        return { success: true, data: conversacionDetailsForPanelSchema.parse(data) };
    } catch {
        return { success: false, error: 'No se pudieron cargar los detalles.' };
    }
}

export async function obtenerMensajesCrmAction(
    params: z.infer<typeof obtenerMensajesCrmParamsSchema>
): Promise<ActionResult<ChatMessageItemCrmData[]>> {
    const validation = obtenerMensajesCrmParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };
    const { conversacionId, limit } = validation.data;
    try {
        const interacciones = await prisma.interaccion.findMany({
            where: { conversacionId },
            select: {
                id: true, conversacionId: true, role: true, mensajeTexto: true, parteTipo: true,
                functionCallNombre: true, functionCallArgs: true, functionResponseData: true,
                mediaUrl: true, mediaType: true, uiComponentPayload: true, canalInteraccion: true,
                createdAt: true, agenteCrm: { select: { id: true, nombre: true, userId: true } },
            },
            orderBy: { createdAt: 'asc' }, take: limit > 0 ? limit : undefined,
        });
        return { success: true, data: z.array(chatMessageItemCrmSchema).parse(interacciones) };
    } catch {
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}

// --- ACCIONES DE ESCRITURA ---

export async function enviarMensajeCrmAction(params: EnviarMensajeCrmParams): Promise<ActionResult<ChatMessageItemCrmData>> {
    const validation = enviarMensajeCrmParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Datos de mensaje inválidos." };
    const { conversacionId, mensaje, role, agenteCrmId } = validation.data;
    try {
        const nuevaInteraccionDb = await prisma.$transaction(async (tx) => {
            const interaccion = await tx.interaccion.create({
                data: {
                    conversacionId, mensajeTexto: mensaje, role,
                    parteTipo: 'TEXT', agenteCrmId, canalInteraccion: "crm",
                },
                select: {
                    id: true, conversacionId: true, role: true, mensajeTexto: true, parteTipo: true,
                    functionCallNombre: true, functionCallArgs: true, functionResponseData: true,
                    mediaUrl: true, mediaType: true, uiComponentPayload: true, canalInteraccion: true,
                    createdAt: true, agenteCrm: { select: { id: true, nombre: true, userId: true } },
                },
            });
            await tx.conversacion.update({
                where: { id: conversacionId },
                data: { updatedAt: new Date(), ...(role === 'agent' && { status: 'hitl_activo' }) }
            });
            return interaccion;
        });

        const conversacionParaWhatsApp = await prisma.conversacion.findUnique({
            where: { id: conversacionId },
            select: { lead: { select: { telefono: true } }, asistenteVirtual: { select: { phoneNumberId: true, token: true } } }
        });
        if (conversacionParaWhatsApp?.lead?.telefono && conversacionParaWhatsApp.asistenteVirtual?.phoneNumberId && conversacionParaWhatsApp.asistenteVirtual.token) {
            await enviarMensajeWhatsAppApiAction({
                destinatarioWaId: conversacionParaWhatsApp.lead.telefono,
                negocioPhoneNumberIdEnvia: conversacionParaWhatsApp.asistenteVirtual.phoneNumberId,
                tokenAccesoAsistente: conversacionParaWhatsApp.asistenteVirtual.token,
                mensajeTexto: mensaje, tipoMensaje: 'text',
            });
        }
        return { success: true, data: chatMessageItemCrmSchema.parse(nuevaInteraccionDb) };
    } catch {
        return { success: false, error: 'No se pudo enviar el mensaje.' };
    }
}

export async function asignarAgenteAction(params: z.infer<typeof asignarAgenteConversacionParamsSchema>): Promise<ActionResult<ConversationDetailsForPanelData>> {
    // ... La lógica interna de la función se mantiene, los errores de tipo ya están resueltos.
    // Solo devolvemos el resultado de la llamada a obtenerDetallesConversacionAction.
    const validation = asignarAgenteConversacionParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };
    const { conversacionId, agenteCrmId, nombreAgenteQueAsigna } = validation.data;
    try {
        let agenteAsignadoNombre = 'nadie (desasignado)';
        if (agenteCrmId) {
            const agente = await prisma.agente.findUnique({ where: { id: agenteCrmId }, select: { nombre: true } });
            if (!agente) return { success: false, error: 'Agente no existe.' };
            agenteAsignadoNombre = agente.nombre ?? 'Agente sin nombre';
        }
        await prisma.conversacion.update({ where: { id: conversacionId }, data: { agenteCrmActualId: agenteCrmId } });
        const mensajeSistema = `Conversación asignada a ${agenteAsignadoNombre}${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`;
        await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema });
        return obtenerDetallesConversacionAction({ conversacionId });
    } catch {
        return { success: false, error: 'No se pudo asignar el agente.' };
    }
}
