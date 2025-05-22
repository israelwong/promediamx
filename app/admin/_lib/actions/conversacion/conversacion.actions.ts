'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient'; // Asegúrate que esta ruta sea correcta
import type { ActionResult } from '@/app/admin/_lib/types'; // Asumiendo que ActionResult es global
import {
    listarConversacionesParamsSchema,
    ConversacionPreviewItemData,
    obtenerDetallesConversacionParamsSchema,
    ConversationDetailsForPanelData,
    obtenerMensajesParamsSchema,
    ChatMessageItemData,
    chatMessageItemSchema, // Para validar la salida de obtenerMensajes
    enviarMensajeParamsSchema,
    asignarAgenteConversacionParamsSchema,
    gestionarPausaAutomatizacionParamsSchema,
    archivarConversacionParamsSchema,
} from './conversacion.schemas';
import { z } from 'zod';

export async function listarConversacionesAction(
    params: z.infer<typeof listarConversacionesParamsSchema>
): Promise<ActionResult<ConversacionPreviewItemData[]>> {
    // ... (código de la acción listarConversacionesAction sin cambios)
    const validation = listarConversacionesParamsSchema.safeParse(params);
    if (!validation.success) {
        console.error("Error de validación en listarConversacionesAction:", validation.error.flatten());
        return { success: false, error: "Parámetros de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId, searchTerm, filtroStatus, filtroPipelineId } = validation.data;
    try {
        const whereClause: Prisma.ConversacionWhereInput = {
            lead: {
                crm: { negocioId: negocioId, },
                ...(filtroPipelineId && { pipelineId: filtroPipelineId }),
            },
        };
        if (filtroStatus === 'activas') {
            whereClause.status = { notIn: ['archivada', 'cerrada'] };
        } else if (filtroStatus === 'archivadas') {
            whereClause.status = 'archivada';
        }
        if (searchTerm && searchTerm.trim() !== '') {
            whereClause.OR = [{ lead: { nombre: { contains: searchTerm, mode: 'insensitive' } } }];
        }
        const conversacionesPrisma = await prisma.conversacion.findMany({
            where: whereClause,
            select: {
                id: true, status: true, updatedAt: true,
                asistenteVirtual: { select: { canalConversacional: { select: { nombre: true } } } },
                lead: { select: { id: true, nombre: true, /* avatarUrl si existe */ } },
                Interaccion: { orderBy: { createdAt: 'desc' }, take: 1, select: { mensaje: true, createdAt: true } },
            },
            orderBy: { updatedAt: 'desc' }, take: 100,
        });
        const data: ConversacionPreviewItemData[] = conversacionesPrisma.map((conv) => {
            const ultimaInteraccion = conv.Interaccion[0];
            let canal: ConversacionPreviewItemData['canalOrigen'] = 'otro';
            const canalNombre = conv.asistenteVirtual?.canalConversacional?.nombre?.toLowerCase();
            if (canalNombre === 'whatsapp') canal = 'whatsapp';
            else if (canalNombre === 'web chat') canal = 'webchat';
            const avatarUrlLead: string | null | undefined = undefined; // Lógica para avatarUrl
            return {
                id: conv.id,
                leadId: conv.lead?.id,
                leadName: conv.lead?.nombre ?? 'Contacto desconocido',
                lastMessagePreview: ultimaInteraccion?.mensaje?.substring(0, 50) ?? '...',
                lastMessageTimestamp: ultimaInteraccion?.createdAt ?? conv.updatedAt,
                status: conv.status ?? 'desconocido',
                canalOrigen: canal,
                avatarUrl: avatarUrlLead,
            };
        });
        return { success: true, data };
    } catch (error) {
        console.error('Error en listarConversacionesAction:', error);
        return { success: false, error: 'No se pudieron cargar las conversaciones.' };
    }
}


// --- NUEVA VERSIÓN DE obtenerDetallesConversacionParaPanelAction ---
export async function obtenerDetallesConversacionAction( // Renombrada para claridad o mantener si es diferente
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
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
                // Podrías seleccionar el canal aquí también si es necesario para el panel
                // asistenteVirtual: { select: { canalConversacional: { select: { nombre: true } } } },
            },
        });

        if (!conversacion) {
            return { success: false, error: 'Conversación no encontrada.' };
        }

        // Mapear a la estructura de ConversationDetailsForPanelData
        const data: ConversationDetailsForPanelData = {
            id: conversacion.id,
            status: conversacion.status ?? 'desconocido', // Proporcionar un valor por defecto si status puede ser null
            leadId: conversacion.leadId,
            leadNombre: conversacion.lead?.nombre ?? null, // Mantener null si no hay nombre
            agenteCrmActual: conversacion.agenteCrmActual ? {
                id: conversacion.agenteCrmActual.id,
                nombre: conversacion.agenteCrmActual.nombre ?? null, // El nombre del agente también puede ser null
            } : null,
            // canalOrigen: determinarCanal(conversacion.asistenteVirtual?.canalConversacional?.nombre) // Función helper si es necesario
        };

        // Opcional: Validar la salida con Zod
        // const parsedData = conversacionDetailsForPanelSchema.safeParse(data);
        // if (!parsedData.success) {
        //   console.error("Error de validación Zod en salida de obtenerDetallesConversacionAction:", parsedData.error.flatten());
        //   return { success: false, error: "Error al procesar datos de detalle de conversación." };
        // }
        // return { success: true, data: parsedData.data };

        return { success: true, data };

    } catch (error) {
        console.error('Error en obtenerDetallesConversacionAction:', error);
        return { success: false, error: 'No se pudieron cargar los detalles de la conversación.' };
    }
}


// --- NUEVA VERSIÓN DE obtenerMensajesConversacionAction ---
export async function obtenerMensajesAction(
    params: z.infer<typeof obtenerMensajesParamsSchema>
): Promise<ActionResult<ChatMessageItemData[]>> {
    const validation = obtenerMensajesParamsSchema.safeParse(params);
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
                mensaje: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                agenteCrmId: true,
                agenteCrm: { // Incluir info básica del agente si está asociado
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: limit > 0 ? limit : undefined,
        });

        // Mapear y validar con Zod
        const mappedData = interacciones.map((interaccion) => ({
            id: interaccion.id,
            conversacionId: interaccion.conversacionId,
            role: interaccion.role as ChatMessageItemData['role'], // Asumir que los roles en BD son válidos
            mensaje: interaccion.mensaje,
            mediaUrl: interaccion.mediaUrl,
            mediaType: interaccion.mediaType,
            createdAt: interaccion.createdAt, // Prisma devuelve Date
            agenteCrm: interaccion.agenteCrm ? {
                id: interaccion.agenteCrm.id,
                nombre: interaccion.agenteCrm.nombre ?? null,
            } : null,
        }));

        const parsedData = z.array(chatMessageItemSchema).safeParse(mappedData);
        if (!parsedData.success) {
            console.error("Error de validación Zod en salida de obtenerMensajesAction:", parsedData.error.flatten());
            // console.log("Datos que fallaron la validación en obtenerMensajesAction:", mappedData); // Para depurar
            return { success: false, error: "Error al procesar datos de mensajes." };
        }

        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error(`Error en obtenerMensajesAction para conv ${conversacionId}:`, error);
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}

// --- NUEVA VERSIÓN DE enviarMensajeAction ---
export async function enviarMensajeConversacionAction( // Renombrada para evitar colisión si la antigua sigue en uso temporalmente
    params: z.infer<typeof enviarMensajeParamsSchema>
): Promise<ActionResult<ChatMessageItemData>> {
    const validation = enviarMensajeParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos de mensaje inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { conversacionId, mensaje, role, agenteCrmId } = validation.data;

    try {
        const updateConversationStatusData: Prisma.ConversacionUpdateInput = {
            updatedAt: new Date(),
        };

        // Lógica de Pausa Automática si el mensaje es de un 'agent'
        if (role === 'agent') {
            console.log(`[enviarMensajeConversacionAction] Mensaje de agente detectado. Pausando conversación ${conversacionId}.`);
            updateConversationStatusData.status = 'en_espera_agente'; // O el estado que uses para pausa
        }

        const nuevaInteraccion = await prisma.$transaction(async (tx) => {
            const interaccion = await tx.interaccion.create({
                data: {
                    conversacionId: conversacionId,
                    mensaje: mensaje,
                    role: role,
                    agenteCrmId: role === 'agent' ? agenteCrmId : null, // Solo asociar agenteCrmId si el rol es 'agent'
                },
                select: {
                    id: true, conversacionId: true, role: true, mensaje: true,
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

        const dataToParse: ChatMessageItemData = {
            id: nuevaInteraccion.id,
            conversacionId: nuevaInteraccion.conversacionId,
            role: nuevaInteraccion.role as ChatMessageItemData['role'],
            mensaje: nuevaInteraccion.mensaje,
            mediaUrl: nuevaInteraccion.mediaUrl,
            mediaType: nuevaInteraccion.mediaType,
            createdAt: nuevaInteraccion.createdAt,
            agenteCrm: nuevaInteraccion.agenteCrm ? {
                id: nuevaInteraccion.agenteCrm.id,
                nombre: nuevaInteraccion.agenteCrm.nombre ?? null,
            } : null,
        };

        const parsedData = chatMessageItemSchema.safeParse(dataToParse);
        if (!parsedData.success) {
            console.error("Error de validación Zod en salida de enviarMensajeConversacionAction:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos del mensaje enviado." };
        }

        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error('Error en enviarMensajeConversacionAction:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003' && (error.meta?.field_name as string)?.includes('agenteCrmId')) {
                return { success: false, error: 'Error: El ID del agente especificado no es válido.' };
            }
            if (error.code === 'P2025') { // Record not found (e.g. conversationId doesn't exist)
                return { success: false, error: 'Error: La conversación especificada no existe.' };
            }
        }
        return { success: false, error: 'No se pudo enviar el mensaje.' };
    }
}


// Acción auxiliar interna (o podrías hacerla exportable si se usa en otros lados)
export async function crearInteraccionSistemaAction(
    params: { conversacionId: string, mensaje: string },
    tx?: Prisma.TransactionClient // Para usar dentro de una transacción existente
): Promise<ActionResult<null>> {
    const db = tx || prisma;
    const { conversacionId, mensaje } = params;
    if (!conversacionId || !mensaje) return { success: false, error: "Faltan datos para crear interacción de sistema." }
    try {
        await db.interaccion.create({
            data: { conversacionId, role: 'system', mensaje },
        });
        // Considera si quieres actualizar Conversacion.updatedAt aquí o si la acción principal lo hará.
        // Si es llamada desde una transacción, la acción principal debería manejar el updatedAt de la conversación.
        if (!tx) { // Si no es parte de una transacción, actualiza el timestamp de la conversación
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


export async function asignarAgenteAction( // Renombrada
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
            select: { /* ... campos para ConversationDetailsForPanelData ... */
                id: true, status: true, leadId: true,
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true } },
            },
        });

        const mensajeSistema = agenteCrmId
            ? `Conversación asignada a ${agenteAsignadoNombre}${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`
            : `Conversación desasignada de agente${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`;
        await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema });

        const returnData: ConversationDetailsForPanelData = { /* ... mapear conversacionActualizada ... */
            id: conversacionActualizada.id, status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        return { success: true, data: returnData };
    } catch (error) { /* ... (manejo de error similar al original) ... */
        console.error('Error en asignarAgenteAction:', error);
        return { success: false, error: 'No se pudo asignar el agente.', data: null };
    }
}

export async function pausarAutomatizacionConversacionAction( // Renombrada
    params: z.infer<typeof gestionarPausaAutomatizacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = gestionarPausaAutomatizacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { conversacionId, nombreAgenteQueGestiona } = validation.data;
    const estadoPausado = 'en_espera_agente';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId },
                data: { status: estadoPausado, updatedAt: new Date() },
                select: { /* ... campos para ConversationDetailsForPanelData ... */
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });
            const mensajeSistema = `Automatización pausada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx); // Pasar tx
            return conv;
        });
        const returnData: ConversationDetailsForPanelData = { /* ... mapear conversacionActualizada ... */
            id: conversacionActualizada.id, status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        return { success: true, data: returnData };
    } catch (error) { /* ... (manejo de error) ... */
        console.error('Error en pausarAutomatizacionConversacionAction:', error);
        return { success: false, error: "Error al pausar la automatización.", data: null };
    }
}

export async function reanudarAutomatizacionConversacionAction( // Renombrada
    params: z.infer<typeof gestionarPausaAutomatizacionParamsSchema>
): Promise<ActionResult<ConversationDetailsForPanelData | null>> {
    const validation = gestionarPausaAutomatizacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { conversacionId, nombreAgenteQueGestiona } = validation.data;
    const estadoActivo = 'abierta';

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversacionId },
                data: { status: estadoActivo, updatedAt: new Date() },
                select: { /* ... campos para ConversationDetailsForPanelData ... */
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });
            const mensajeSistema = `Automatización reanudada${nombreAgenteQueGestiona ? ` por ${nombreAgenteQueGestiona}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx); // Pasar tx
            return conv;
        });
        const returnData: ConversationDetailsForPanelData = { /* ... mapear conversacionActualizada ... */
            id: conversacionActualizada.id, status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId, leadNombre: conversacionActualizada.lead?.nombre ?? null,
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? { id: conversacionActualizada.agenteCrmActual.id, nombre: conversacionActualizada.agenteCrmActual.nombre ?? null } : null,
        };
        return { success: true, data: returnData };
    } catch (error) { /* ... (manejo de error) ... */
        console.error('Error en reanudarAutomatizacionConversacionAction:', error);
        return { success: false, error: "Error al reanudar la automatización.", data: null };
    }
}

export async function archivarConversacionAction(
    params: z.infer<typeof archivarConversacionParamsSchema>
): Promise<ActionResult<null>> { // Devuelve null en caso de éxito
    const validation = archivarConversacionParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { conversacionId, nombreUsuarioQueArchiva } = validation.data;
    // Asumir que el ID del usuario/agente que archiva se obtiene de la sesión del servidor si es necesario para Bitacora.
    // O se pasa en el params si es indispensable desde el cliente.

    const estadoArchivado = 'archivada';
    try {
        // const conv = 
        await prisma.$transaction(async (tx) => {
            await tx.conversacion.update({
                where: { id: conversacionId },
                data: { status: estadoArchivado, updatedAt: new Date() },
                select: { leadId: true } // Para Bitacora si es necesario
            });
            const mensajeSistema = `Conversación archivada${nombreUsuarioQueArchiva ? ` por ${nombreUsuarioQueArchiva}` : ''}.`;
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema }, tx); // Pasar tx

            //   // Lógica de Bitacora si es necesaria
            //   if (conv?.leadId && usuarioIdQueArchiva) {
            //     await tx.bitacora.create({ data: { leadId: conv.leadId, /*agenteId: agenteCrmIdQueArchiva,*/ tipoAccion: 'archivar_conv', descripcion: mensajeSistema }});
            //   }
        });
        return { success: true, data: null };
    } catch (error) { /* ... (manejo de error) ... */
        console.error('Error en archivarConversacionAction:', error);
        return { success: false, error: "Error al archivar la conversación." };
    }
}