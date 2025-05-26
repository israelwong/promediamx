// app/admin/_lib/actions/crm/conversacion.actions.ts
'use server';

import { InteraccionParteTipo, Prisma } from '@prisma/client'; // Importar InteraccionParteTipo
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarConversacionesParamsSchema,
    type ConversacionPreviewItemData, // Este tipo se infiere de conversacionPreviewItemSchema
    conversacionPreviewItemSchema,    // Usaremos este para validar la salida
    obtenerDetallesConversacionParamsSchema,
    type ConversationDetailsForPanelData, // Se infiere de conversacionDetailsForPanelSchema
    conversacionDetailsForPanelSchema,   // Usaremos este para validar la salida
    obtenerMensajesCrmParamsSchema,      // Renombrado desde obtenerMensajesParamsSchema
    type ChatMessageItemCrmData,        // Renombrado desde ChatMessageItemData
    chatMessageItemCrmSchema,          // Renombrado desde chatMessageItemSchema
    enviarMensajeCrmParamsSchema,        // Renombrado desde enviarMensajeParamsSchema
    asignarAgenteConversacionParamsSchema,
    gestionarPausaAutomatizacionParamsSchema,
    archivarConversacionParamsSchema,
    desarchivarConversacionParamsSchema
} from './conversacion.schemas'; // Asegúrate que esta es la ruta a tus schemas refactorizados
import { z } from 'zod';

export async function listarConversacionesAction(
    params: z.infer<typeof listarConversacionesParamsSchema>
): Promise<ActionResult<ConversacionPreviewItemData[]>> {
    const validation = listarConversacionesParamsSchema.safeParse(params);
    if (!validation.success) {
        console.error("Error de validación en listarConversacionesAction:", validation.error.flatten());
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
                id: true,
                status: true,
                updatedAt: true,
                asistenteVirtual: {
                    select: {
                        canalConversacional: {
                            select: { nombre: true, icono: true } // Añadir icono del canal
                        }
                    }
                },
                lead: {
                    select: {
                        id: true,
                        nombre: true,
                        // avatarUrl: true, // Si tu modelo Lead tiene avatarUrl
                    }
                },
                Interaccion: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        mensajeTexto: true,
                        mensaje: true, // Seleccionar también el campo antiguo 'mensaje'
                        createdAt: true
                    }
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        });

        const data = conversacionesPrisma.map((conv) => {
            const ultimaInteraccion = conv.Interaccion[0];
            let canal: ConversacionPreviewItemData['canalOrigen'] = 'desconocido';
            let canalIcono: string | null = null;

            const canalConversacional = conv.asistenteVirtual?.canalConversacional;
            if (canalConversacional?.nombre) {
                const nombreNormalizado = canalConversacional.nombre.toLowerCase();
                if (nombreNormalizado.includes('whatsapp')) canal = 'whatsapp';
                else if (nombreNormalizado.includes('webchat') || nombreNormalizado.includes('web chat')) canal = 'webchat';
                else canal = 'otro';
                canalIcono = canalConversacional.icono || null;
            }

            const previewText = ultimaInteraccion?.mensajeTexto ?? ultimaInteraccion?.mensaje ?? null;

            return {
                id: conv.id,
                leadId: conv.lead?.id,
                leadName: conv.lead?.nombre ?? 'Contacto desconocido',
                lastMessagePreview: previewText ? previewText.substring(0, 70) : (ultimaInteraccion ? '[Sin contenido visible]' : '...'),
                lastMessageTimestamp: ultimaInteraccion?.createdAt ?? conv.updatedAt,
                status: conv.status ?? 'desconocido',
                canalOrigen: canal,
                canalIcono: canalIcono, // Añadir el icono
                avatarUrl: undefined, // Reemplazar con conv.lead?.avatarUrl si existe
            };
        });

        const parsedData = z.array(conversacionPreviewItemSchema).safeParse(data);
        if (!parsedData.success) {
            console.error("Error Zod en salida de listarConversacionesAction:", parsedData.error.flatten().fieldErrors);
            return { success: false, error: "Error al procesar datos de conversaciones." };
        }
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error('Error en listarConversacionesAction:', error);
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

    try {
        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversacionId },
            select: {
                id: true,
                status: true,
                leadId: true,
                lead: { select: { nombre: true } },
                agenteCrmActualId: true,
                agenteCrmActual: {
                    select: { id: true, nombre: true },
                },
                // --- ESTA ES LA PARTE CLAVE QUE FALTA EN TU VERSIÓN ---
                asistenteVirtual: {
                    select: {
                        canalConversacional: {
                            select: { nombre: true, icono: true }
                        }
                    }
                },
                // --- FIN DE LA PARTE CLAVE ---
            },
        });

        if (!conversacion) {
            return { success: false, error: 'Conversación no encontrada.' };
        }

        // --- USAR determinarInfoCanal ---
        const { canalOrigen, canalIcono } = determinarInfoCanal(
            conversacion.asistenteVirtual?.canalConversacional?.nombre,
            conversacion.asistenteVirtual?.canalConversacional?.icono
        );
        // --- FIN USO ---

        const data: ConversationDetailsForPanelData = {
            id: conversacion.id,
            status: conversacion.status ?? 'desconocido',
            leadId: conversacion.leadId,
            leadNombre: conversacion.lead?.nombre ?? null,
            agenteCrmActual: conversacion.agenteCrmActual ? {
                id: conversacion.agenteCrmActual.id,
                nombre: conversacion.agenteCrmActual.nombre ?? null,
            } : null,
            canalOrigen: canalOrigen,   // <-- Ahora se poblará
            canalIcono: canalIcono,     // <-- Ahora se poblará
        };

        const parsedData = conversacionDetailsForPanelSchema.safeParse(data);
        if (!parsedData.success) {
            console.error("Error Zod en salida de obtenerDetallesConversacionAction:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos de detalle de conversación." };
        }
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error('Error en obtenerDetallesConversacionAction:', error);
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
                id: true,
                conversacionId: true,
                role: true,
                mensajeTexto: true,
                mensaje: true, // Seleccionar también el campo antiguo 'mensaje'
                parteTipo: true,
                functionCallNombre: true,
                functionCallArgs: true,
                functionResponseData: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                agenteCrmId: true,
                agenteCrm: {
                    select: { id: true, nombre: true },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: limit > 0 ? limit : undefined,
        });

        const mappedData = interacciones.map((interaccion) => {
            let parsedArgs: Record<string, unknown> | null = null;
            if (interaccion.functionCallArgs) {
                if (typeof interaccion.functionCallArgs === 'object' && interaccion.functionCallArgs !== null) parsedArgs = interaccion.functionCallArgs as Record<string, unknown>;
                else if (typeof interaccion.functionCallArgs === 'string') try { parsedArgs = JSON.parse(interaccion.functionCallArgs); } catch (e) { console.warn(`No se pudo parsear functionCallArgs para interaccion ${interaccion.id}`, e); }
            }
            let parsedResponseData: Record<string, unknown> | null = null;
            if (interaccion.functionResponseData) {
                if (typeof interaccion.functionResponseData === 'object' && interaccion.functionResponseData !== null) parsedResponseData = interaccion.functionResponseData as Record<string, unknown>;
                else if (typeof interaccion.functionResponseData === 'string') try { parsedResponseData = JSON.parse(interaccion.functionResponseData); } catch (e) { console.warn(`No se pudo parsear functionResponseData para interaccion ${interaccion.id}`, e); }
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
                } : null,
            };
        });

        const parsedDataResult = z.array(chatMessageItemCrmSchema).safeParse(mappedData);
        if (!parsedDataResult.success) {
            console.error("Error de validación Zod en salida de obtenerMensajesCrmAction:", parsedDataResult.error.flatten().fieldErrors);
            console.error("Datos que fallaron (primeros 2):", JSON.stringify(mappedData.slice(0, 2), null, 2));
            return { success: false, error: "Error al procesar datos de mensajes del CRM." };
        }
        return { success: true, data: parsedDataResult.data };
    } catch (error) {
        console.error(`Error en obtenerMensajesCrmAction para conv ${conversacionId}:`, error);
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
                    agenteCrm: { select: { id: true, nombre: true } },
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
        };
        const parsedData = chatMessageItemCrmSchema.safeParse(dataToParse);
        if (!parsedData.success) {
            console.error("Error de validación Zod en salida de enviarMensajeCrmAction:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos del mensaje enviado desde CRM." };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('Error en enviarMensajeCrmAction:', error);
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
    if (!conversacionId || !mensaje) return { success: false, error: "Faltan datos para crear interacción de sistema." }
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
        console.error("Error al crear interacción de sistema:", logError);
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
            agenteAsignadoNombre = agente.nombre ?? `Agente ID: ${agenteCrmId}`;
        }

        const conversacionActualizada = await prisma.conversacion.update({
            where: { id: conversacionId },
            data: { agenteCrmActualId: agenteCrmId, updatedAt: new Date() },
            select: {
                id: true, status: true, leadId: true,
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true } },
            },
        });

        const mensajeSistema = agenteCrmId
            ? `Conversación asignada a ${agenteAsignadoNombre}${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`
            : `Conversación desasignada de agente${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`;
        await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema });

        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) {
            console.error("Error Zod en salida de asignarAgenteAction:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos de detalle de conversación post-asignación." };
        }
        return { success: true, data: parsedData.data };
    } catch (error) {
        console.error('Error en asignarAgenteAction:', error);
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
                where: { id: conversacionId },
                data: { status: estadoPausado, updatedAt: new Date() },
                select: {
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });
            const mensajeSistema = `Automatización pausada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });
        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) { console.error("Error Zod en salida de pausarAutomatizacionConversacionAction:", parsedData.error.flatten()); return { success: false, error: "Error al procesar datos post-pausa." }; }
        return { success: true, data: parsedData.data };
    } catch { return { success: false, error: "Error al pausar la automatización.", data: null }; }
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
                where: { id: conversacionId },
                data: { status: estadoActivo, updatedAt: new Date() },
                select: {
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });
            const mensajeSistema = `Automatización reanudada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });
        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id, status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) { console.error("Error Zod en salida de reanudarAutomatizacionConversacionAction:", parsedData.error.flatten()); return { success: false, error: "Error al procesar datos post-reanudación." }; }
        return { success: true, data: parsedData.data };
    } catch { return { success: false, error: "Error al reanudar la automatización.", data: null }; }
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
                where: { id: conversacionId },
                data: { status: estadoArchivado, updatedAt: new Date() },
            });
            const mensajeSistema = `Conversación archivada${nombreUsuarioQueArchiva ? ` por ${nombreUsuarioQueArchiva}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
        });
        return { success: true, data: null };
    } catch { return { success: false, error: "Error al archivar la conversación." }; }
}


function determinarInfoCanal(
    canalNombreOriginal?: string | null,
    canalIconoOriginal?: string | null
): { canalOrigen: ConversationDetailsForPanelData['canalOrigen'], canalIcono: string | null } {
    let canalOrigen: ConversationDetailsForPanelData['canalOrigen'] = 'desconocido';
    const canalIconoRetorno: string | null = canalIconoOriginal || null;

    if (canalNombreOriginal) {
        const nombreNormalizado = canalNombreOriginal.toLowerCase().trim();
        if (nombreNormalizado.includes('whatsapp')) {
            canalOrigen = 'whatsapp';
        } else if (nombreNormalizado.includes('webchat') || nombreNormalizado.includes('web chat')) {
            canalOrigen = 'webchat';
        } else if (nombreNormalizado) {
            canalOrigen = 'otro';
        }
    }
    return { canalOrigen, canalIcono: canalIconoRetorno };
}

export async function desarchivarConversacionAction(
    params: z.infer<typeof desarchivarConversacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> { // Devolver detalles para actualizar UI
    const validation = desarchivarConversacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { conversacionId, nombreUsuarioQueDesarchiva } = validation.data;

    // Determinar a qué estado volver. 'abierta' es un default razonable.
    // Podrías tener una lógica más compleja si guardas el estado previo al archivo.
    const estadoPrevioAlArchivo = 'abierta';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId },
                data: { status: estadoPrevioAlArchivo, updatedAt: new Date() },
                select: { // Seleccionar los campos necesarios para ConversationDetailsForPanelData
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                    asistenteVirtual: { select: { canalConversacional: { select: { nombre: true, icono: true } } } },
                },
            });
            const mensajeSistema = `Conversación desarchivada${nombreUsuarioQueDesarchiva ? ` por ${nombreUsuarioQueDesarchiva}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx);
            return conv;
        });

        const { canalOrigen, canalIcono } = determinarInfoCanal( // Asumiendo que determinarInfoCanal está en este archivo o importada
            conversacionActualizada.asistenteVirtual?.canalConversacional?.nombre,
            conversacionActualizada.asistenteVirtual?.canalConversacional?.icono
        );

        const returnData: ConversationDetailsForPanelData = {
            id: conversacionActualizada.id,
            status: conversacionActualizada.status ?? 'desconocido',
            leadId: conversacionActualizada.leadId,
            leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre ?? null,
            } : null,
            canalOrigen: canalOrigen,
            canalIcono: canalIcono,
        };

        const parsedData = conversacionDetailsForPanelSchema.safeParse(returnData);
        if (!parsedData.success) {
            console.error("Error Zod en salida de desarchivarConversacionAction:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos post-desarchivo.", data: null };
        }
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error('Error en desarchivarConversacionAction:', error);
        return { success: false, error: "Error al desarchivar la conversación.", data: null };
    }
}

