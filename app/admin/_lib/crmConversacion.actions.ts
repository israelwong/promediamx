// app/admin/_lib/crmConversacion.actions.ts ---
'use server';

import { Prisma } from '@prisma/client';
import prisma from './prismaClient'; // Asegúrate que la ruta a tu prismaClient sea correcta
import { ActionResult } from './types'; // Asumiendo que ActionResult y ConversationPreviewItem están en types.ts
import {
    ConversationPreviewItem,
    ChatMessageItem,
    EnviarMensajeInput,
    ConversationDetailsForPanel,
    LeadDetailsForPanel,
    EtiquetaCrmItem,
    EnviarMensajeUsuarioInput,
    IniciarConversacionWebchatInput,
    EnviarMensajeWebchatInput,
    EnviarMensajeWebchatData,
    TareaCapacidadIA,
    ParametroParaIA,
    RespuestaAsistenteConHerramientas,
    IniciarConversacionWebchatDataConDispatcher
} from '@/app/admin/_lib/crmConversacion.types';

import { AgenteBasico } from '@/app/admin/_lib/agente.types';
import { MensajeEntrantePayload } from '@/app/admin/_lib/webhook.types'; // Importar el nuevo tipo
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions'; // Importar la nueva acción de IA
import { dispatchTareaEjecutadaAction } from './ia/funcionesEjecucion.actions'; // Ajusta la ruta si es necesario



/******************** CRM CHATPANEL ************************ */
/******************** CRM CHATPANEL ************************ */
/******************** CRM CHATPANEL ************************ */

async function crearInteraccionSistema(conversacionId: string, mensaje: string) {
    try {
        await prisma.interaccion.create({
            data: {
                conversacionId,
                role: 'system',
                mensaje,
            },
        });
        await prisma.conversacion.update({
            where: { id: conversacionId },
            data: { updatedAt: new Date() }
        });
    } catch (logError) {
        console.error("Error al crear interacción de sistema:", logError);
    }
}

export async function obtenerDetallesConversacionParaPanelAction(
    conversationId: string
): Promise<ActionResult<ConversationDetailsForPanel>> {
    try {
        if (!conversationId) {
            return { success: false, error: 'El ID de la conversación es requerido.' };
        }
        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversationId },
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
            },
        });
        if (!conversacion) {
            return { success: false, error: 'Conversación no encontrada.' };
        }
        const data: ConversationDetailsForPanel = {
            id: conversacion.id,
            status: conversacion.status ?? 'desconocido',
            leadId: conversacion.leadId,
            leadNombre: conversacion.lead?.nombre ?? 'Desconocido',
            agenteCrmActual: conversacion.agenteCrmActual ? {
                id: conversacion.agenteCrmActual.id,
                nombre: conversacion.agenteCrmActual.nombre,
            } : null,
        };
        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerDetallesConversacionParaPanelAction:', error);
        return { success: false, error: 'No se pudieron cargar los detalles de la conversación.' };
    }
}

export async function obtenerAgentesCrmNegocioAction(
    negocioId: string
): Promise<ActionResult<AgenteBasico[]>> {
    try {
        if (!negocioId) {
            return { success: false, error: 'El ID del negocio es requerido.' };
        }
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true },
        });

        if (!crm) {
            return { success: false, error: 'CRM no encontrado para este negocio.', data: [] };
        }

        const agentes = await prisma.agente.findMany({
            where: {
                crmId: crm.id,
                status: 'activo',
            },
            select: {
                id: true,
                nombre: true,
            },
            orderBy: {
                nombre: 'asc',
            },
        });

        const data: AgenteBasico[] = agentes.map(agente => ({
            id: agente.id,
            nombre: agente.nombre ?? 'Agente sin nombre',
        }));

        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerAgentesCrmNegocioAction:', error);
        return { success: false, error: 'No se pudieron cargar los agentes del CRM.' };
    }
}

export async function asignarAgenteConversacionAction(
    conversationId: string,
    agenteCrmId: string | null,
    nombreAgenteQueAsigna?: string | null
): Promise<ActionResult<ConversationDetailsForPanel | null>> {
    try {
        if (!conversationId) {
            return { success: false, error: 'El ID de la conversación es requerido.' };
        }
        let agenteAsignadoNombre = 'nadie (desasignado)';
        if (agenteCrmId) {
            const agente = await prisma.agente.findUnique({
                where: { id: agenteCrmId },
                select: { nombre: true }
            });
            if (agente) {
                agenteAsignadoNombre = agente.nombre ?? `Agente ID: ${agenteCrmId}`;
            } else {
                return { success: false, error: 'El agente especificado para asignar no existe.', data: null };
            }
        }
        const conversacionActualizada = await prisma.conversacion.update({
            where: { id: conversationId },
            data: {
                agenteCrmActualId: agenteCrmId,
                updatedAt: new Date(),
            },
            select: {
                id: true, status: true, leadId: true,
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true } },
            },
        });
        if (!conversacionActualizada) {
            return { success: false, error: 'No se pudo actualizar la asignación del agente.', data: null };
        }
        const mensajeSistema = agenteCrmId
            ? `Conversación asignada a ${agenteAsignadoNombre}${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`
            : `Conversación desasignada de agente${nombreAgenteQueAsigna ? ` por ${nombreAgenteQueAsigna}` : ''}.`;
        await crearInteraccionSistema(conversationId, mensajeSistema);
        const data: ConversationDetailsForPanel = {
            id: conversacionActualizada.id,
            status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId,
            leadNombre: conversacionActualizada.lead?.nombre ?? "Desconocido",
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre,
            } : null,
        };
        return { success: true, data };
    } catch (error) {
        console.error('Error en asignarAgenteConversacionAction:', error);
        let errorMessage = 'No se pudo asignar el agente a la conversación.';
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025' && error.meta?.cause === 'Record to update not found.') {
                errorMessage = 'La conversación especificada no existe.';
            } else if (error.code === 'P2025') {
                errorMessage = 'Error de referencia: el agente o la conversación no existen.';
            }
        }
        return { success: false, error: errorMessage, data: null };
    }
}

export async function actualizarEstadoConversacionAction(
    conversationId: string,
    nuevoStatus: string,
    nombreAgenteQueActualiza?: string | null
): Promise<ActionResult<ConversationDetailsForPanel | null>> {
    try {
        if (!conversationId || !nuevoStatus) {
            return { success: false, error: 'ID de conversación y nuevo estado son requeridos.' };
        }
        const conversacionActualizada = await prisma.conversacion.update({
            where: { id: conversationId },
            data: {
                status: nuevoStatus,
                updatedAt: new Date(),
            },
            select: {
                id: true, status: true, leadId: true,
                lead: { select: { nombre: true } },
                agenteCrmActual: { select: { id: true, nombre: true } },
            },
        });
        if (!conversacionActualizada) {
            return { success: false, error: 'No se pudo actualizar la conversación o no fue encontrada.', data: null };
        }
        const mensajeSistema = `Estado de la conversación cambiado a: ${nuevoStatus.replace('_', ' ')}${nombreAgenteQueActualiza ? ` por ${nombreAgenteQueActualiza}` : ''}.`;
        await crearInteraccionSistema(conversationId, mensajeSistema);
        const data: ConversationDetailsForPanel = {
            id: conversacionActualizada.id,
            status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId,
            leadNombre: conversacionActualizada.lead?.nombre ?? "Desconocido",
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre,
            } : null,
        };
        return { success: true, data };
    } catch (error) {
        console.error('Error en actualizarEstadoConversacionAction:', error);
        return { success: false, error: 'No se pudo actualizar el estado de la conversación.', data: null };
    }
}

export async function actualizarEtiquetasLeadAction(
    leadId: string,
    etiquetaIds: string[],
    conversationId: string,
    nombreAgenteQueActualiza?: string | null
): Promise<ActionResult<null>> {
    try {
        if (!leadId) {
            return { success: false, error: 'El ID del Lead es requerido.' };
        }
        if (!conversationId) {
            return { success: false, error: 'El ID de la Conversación es requerido para registrar la acción.' };
        }
        if (!Array.isArray(etiquetaIds)) {
            return { success: false, error: 'Se esperaba un array de IDs de etiquetas.' };
        }
        await prisma.$transaction(async (tx) => {
            await tx.leadEtiqueta.deleteMany({
                where: { leadId: leadId },
            });
            if (etiquetaIds.length > 0) {
                await tx.leadEtiqueta.createMany({
                    data: etiquetaIds.map(etiquetaId => ({
                        leadId: leadId,
                        etiquetaId: etiquetaId,
                    })),
                });
            }
        });
        const mensajeSistema = `Etiquetas del lead actualizadas${nombreAgenteQueActualiza ? ` por ${nombreAgenteQueActualiza}` : ''}.`;
        await crearInteraccionSistema(conversationId, mensajeSistema);
        return { success: true, data: null };
    } catch (error) {
        console.error('Error en actualizarEtiquetasLeadAction:', error);
        return { success: false, error: 'No se pudieron actualizar las etiquetas del lead.' };
    }
}

export async function obtenerLeadDetallesCompletosAction(
    leadId: string
): Promise<ActionResult<LeadDetailsForPanel | null>> {
    try {
        if (!leadId) {
            return { success: false, error: 'El ID del Lead es requerido.' };
        }
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
            },
        });
        if (!lead) {
            return { success: false, error: 'Lead no encontrado.', data: null };
        }
        const leadData: LeadDetailsForPanel = {
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
        };
        return { success: true, data: leadData };
    } catch (error) {
        console.error('Error en obtenerLeadDetallesCompletosAction:', error);
        return { success: false, error: 'No se pudieron cargar los detalles del lead.', data: null };
    }
}

export async function obtenerEtiquetasCrmNegocioAction(
    negocioId: string
): Promise<ActionResult<EtiquetaCrmItem[]>> {
    try {
        if (!negocioId) {
            return { success: false, error: 'El ID del negocio es requerido.' };
        }
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });
        if (!crm) {
            return { success: false, error: 'CRM no encontrado para este negocio.', data: [] };
        }
        const etiquetas = await prisma.etiquetaCRM.findMany({
            where: { crmId: crm.id, status: 'activo' },
            select: { id: true, nombre: true, color: true, },
            orderBy: { orden: 'asc' },
        });
        return { success: true, data: etiquetas };
    } catch (error) {
        console.error('Error en obtenerEtiquetasCrmNegocioAction:', error);
        return { success: false, error: 'No se pudieron cargar las etiquetas del CRM.' };
    }
}

export async function obtenerEtiquetasAsignadasLeadAction(
    leadId: string
): Promise<ActionResult<string[]>> {
    try {
        if (!leadId) {
            return { success: false, error: 'El ID del Lead es requerido.' };
        }
        const leadEtiquetas = await prisma.leadEtiqueta.findMany({
            where: { leadId: leadId },
            select: { etiquetaId: true },
        });
        const data = leadEtiquetas.map(le => le.etiquetaId);
        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerEtiquetasAsignadasLeadAction:', error);
        return { success: false, error: 'No se pudieron cargar las etiquetas asignadas al lead.' };
    }
}

// --- Función auxiliar para crear interacción de sistema (si no la tienes global) ---
// Asegúrate que esta función exista y esté accesible, o copia/mueve su lógica aquí.
// Esta versión es simplificada y asume que existe en este archivo.
async function crearInteraccionSistemaInterna(conversacionId: string, mensaje: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    try {
        await db.interaccion.create({
            data: {
                conversacionId,
                role: 'system',
                mensaje,
            },
        });
        // No actualizamos updatedAt aquí necesariamente, la acción principal lo hará.
    } catch (logError) {
        console.error("Error al crear interacción de sistema interna:", logError);
        // No lanzar error aquí para no detener la acción principal
    }
}

export async function obtenerAgenteCrmPorUsuarioAction(
    usuarioId: string,
    negocioId: string
): Promise<ActionResult<AgenteBasico | null>> {
    console.log(`[Agente Actions] Buscando Agente para Usuario ${usuarioId} en Negocio ${negocioId}`);
    if (!usuarioId || !negocioId) {
        return { success: false, error: "Se requiere ID de usuario y negocio." };
    }

    try {
        // 1. Encontrar el CRM del negocio
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });

        if (!crm) {
            console.log(`[Agente Actions] No se encontró CRM para Negocio ${negocioId}`);
            return { success: true, data: null }; // No hay CRM, por lo tanto no hay agente
        }

        // 2. Buscar al Agente en ese CRM que tenga el userId correspondiente
        // ASUNCIÓN: El modelo Agente tiene un campo 'userId' que lo vincula al modelo Usuario
        const agente = await prisma.agente.findFirst({
            where: {
                crmId: crm.id,
                userId: usuarioId, // Busca por el ID del Usuario logueado
                status: 'activo' // Opcional: Asegurar que el agente esté activo
            },
            select: {
                id: true,
                nombre: true,
                // email: true // Podrías devolver el email si lo necesitas
            }
        });

        if (!agente) {
            console.log(`[Agente Actions] No se encontró Agente activo para Usuario ${usuarioId} en CRM ${crm.id}`);
            return { success: true, data: null }; // El usuario no es un agente activo en este CRM
        }

        console.log(`[Agente Actions] Agente encontrado: ID=${agente.id}, Nombre=${agente.nombre}`);
        const agenteBasico: AgenteBasico = {
            id: agente.id,
            nombre: agente.nombre // El nombre puede ser null si así está en tu BD
        };

        return { success: true, data: agenteBasico };

    } catch (error) {
        console.error("[Agente Actions] Error buscando Agente por Usuario y Negocio:", error);
        return { success: false, error: "Error al buscar la información del agente.", data: null };
    }
}

export async function pausarAutomatizacionAction(
    conversationId: string,
    agenteId: string, // Podría ser Agente.id o Usuario.id dependiendo de tu lógica
    nombreAgente: string | null | undefined
): Promise<ActionResult<ConversationDetailsForPanel | null>> {
    console.log(`[Gestion Conv] Pausando automatización para ${conversationId} por ${nombreAgente || agenteId}`);
    if (!conversationId || !agenteId) {
        return { success: false, error: "Se requiere ID de conversación y agente." };
    }

    const estadoPausado = 'en_espera_agente'; // O 'hitl_activo'

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversationId },
                data: {
                    status: estadoPausado,
                    updatedAt: new Date(),
                },
                select: { // Seleccionar datos para devolver ConversationDetailsForPanel
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });

            // Registrar la acción en el historial (como mensaje de sistema)
            const mensajeSistema = `Automatización pausada por ${nombreAgente || 'un usuario'}.`;
            await crearInteraccionSistemaInterna(conversationId, mensajeSistema, tx);

            // Podrías registrar también en Bitacora si lo deseas
            // await tx.bitacora.create({ data: { leadId: conv.leadId, agenteId: ???, tipoAccion: 'pausa_ia', descripcion: mensajeSistema } });

            return conv;
        });

        if (!conversacionActualizada) {
            return { success: false, error: 'No se pudo actualizar la conversación (quizás no existe).', data: null };
        }

        // Mapear al tipo de retorno esperado
        const data: ConversationDetailsForPanel = {
            id: conversacionActualizada.id,
            status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId,
            leadNombre: conversacionActualizada.lead?.nombre ?? "Desconocido",
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre,
            } : null,
        };

        return { success: true, data: data };

    } catch (error) {
        console.error(`[Gestion Conv] Error al pausar automatización para ${conversationId}:`, error);
        return { success: false, error: "Error interno al pausar la automatización.", data: null };
    }
}

export async function reanudarAutomatizacionAction(
    conversationId: string,
    agenteId: string,
    nombreAgente: string | null | undefined
): Promise<ActionResult<ConversationDetailsForPanel | null>> {
    console.log(`[Gestion Conv] Reanudando automatización para ${conversationId} por ${nombreAgente || agenteId}`);
    if (!conversationId || !agenteId) {
        return { success: false, error: "Se requiere ID de conversación y agente." };
    }

    const estadoActivo = 'abierta'; // Estado al que volverá la conversación

    try {
        const conversacionActualizada = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversacion.update({
                where: { id: conversationId },
                data: {
                    status: estadoActivo,
                    updatedAt: new Date(),
                },
                select: { // Seleccionar datos para devolver ConversationDetailsForPanel
                    id: true, status: true, leadId: true,
                    lead: { select: { nombre: true } },
                    agenteCrmActual: { select: { id: true, nombre: true } },
                },
            });

            const mensajeSistema = `Automatización reanudada por ${nombreAgente || 'un usuario'}.`;
            await crearInteraccionSistemaInterna(conversationId, mensajeSistema, tx);

            return conv;
        });

        if (!conversacionActualizada) {
            return { success: false, error: 'No se pudo actualizar la conversación (quizás no existe).', data: null };
        }

        const data: ConversationDetailsForPanel = {
            id: conversacionActualizada.id,
            status: conversacionActualizada.status,
            leadId: conversacionActualizada.leadId,
            leadNombre: conversacionActualizada.lead?.nombre ?? "Desconocido",
            agenteCrmActual: conversacionActualizada.agenteCrmActual ? {
                id: conversacionActualizada.agenteCrmActual.id,
                nombre: conversacionActualizada.agenteCrmActual.nombre,
            } : null,
        };

        return { success: true, data: data };

    } catch (error) {
        console.error(`[Gestion Conv] Error al reanudar automatización para ${conversationId}:`, error);
        return { success: false, error: "Error interno al reanudar la automatización.", data: null };
    }
}

export async function archivarConversacionAction(
    conversationId: string,
    usuarioIdQueArchiva: string, // ID del Usuario
    agenteCrmIdQueArchiva: string | null, // ID del Agente (o null)
    nombreUsuarioQueArchiva: string | null | undefined
): Promise<ActionResult<null>> {
    const nombreDisplay = nombreUsuarioQueArchiva || `Usuario ${usuarioIdQueArchiva.substring(0, 4)}...`;
    console.log(`[Gestion Conv] Archivando conversación ${conversationId} por ${nombreDisplay} (Usuario: ${usuarioIdQueArchiva}, AgenteCRM: ${agenteCrmIdQueArchiva ?? 'N/A'})`);

    if (!conversationId || !usuarioIdQueArchiva) { // Validar usuarioId también
        return { success: false, error: "Se requiere ID de conversación y usuario." };
    }

    const estadoArchivado = 'archivada';

    try {
        await prisma.$transaction(async (tx) => {
            const conversacion = await tx.conversacion.update({ // Guardar resultado para obtener leadId
                where: { id: conversationId },
                data: {
                    status: estadoArchivado,
                    updatedAt: new Date(),
                },
                select: { leadId: true } // Seleccionar leadId para Bitacora
            });

            // 2. Registrar la acción en el historial del chat
            const mensajeSistema = `Conversación archivada por ${nombreDisplay}.`;
            await crearInteraccionSistemaInterna(conversationId, mensajeSistema, tx);

            // 3. (Opcional) Registrar en Bitacora
            if (conversacion?.leadId) {
                await tx.bitacora.create({
                    data: {
                        leadId: conversacion.leadId,
                        agenteId: agenteCrmIdQueArchiva, // <-- Usar el ID del Agente CRM (puede ser null)
                        tipoAccion: 'archivar_conv',
                        descripcion: mensajeSistema,
                    }
                });
            }
        });

        console.log(`[Gestion Conv] Conversación ${conversationId} archivada exitosamente.`);
        return { success: true, data: null };

    } catch (error) {
        console.error(`[Gestion Conv] Error al archivar conversación ${conversationId}:`, error);
        // No intentar actualizar TareaEjecutada aquí, no es parte de una tarea IA
        return { success: false, error: "Error interno al archivar la conversación.", data: null };
    }
}

export async function obtenerListaConversacionesAction(
    negocioId: string,
    searchTerm?: string | null,
    filtroStatus: 'activas' | 'archivadas' | 'todas' = 'activas',
    filtroPipelineId?: string | null
): Promise<ActionResult<ConversationPreviewItem[]>> {

    console.log(filtroPipelineId); // Debug

    // --- FIN FIRMA ACTUALIZADA ---
    try {
        if (!negocioId) {
            return { success: false, error: 'El ID del negocio es requerido.' };
        }

        // Construir cláusula Where dinámicamente
        const whereClause: Prisma.ConversacionWhereInput = {
            // Filtrar por negocio
            lead: {
                crm: {
                    negocioId: negocioId,
                },
                // --- CORRECCIÓN: Aplicar filtro de Pipeline ID ---
                ...(filtroPipelineId && filtroPipelineId !== 'all' && {
                    pipelineId: filtroPipelineId // Aplicar el filtro si se proporciona
                })
                // --- FIN CORRECCIÓN ---
            },
            // Filtrar por Status de Conversación
            ...(filtroStatus === 'activas' && {
                status: { notIn: ['archivada', 'cerrada'] }
            }),
            ...(filtroStatus === 'archivadas' && {
                status: 'archivada'
            }),
        };

        // Añadir búsqueda por término si existe
        if (searchTerm && searchTerm.trim() !== '') {
            // Asegurar que OR exista antes de añadirle condiciones
            if (!whereClause.OR) {
                whereClause.OR = [];
            }
            whereClause.OR.push(
                { lead: { nombre: { contains: searchTerm, mode: 'insensitive' } } }
            );
            // Podrías añadir más condiciones OR aquí si buscas en más campos
        }

        const conversaciones = await prisma.conversacion.findMany({
            where: whereClause, // Usar la cláusula where construida
            select: {
                id: true, status: true, updatedAt: true,
                asistenteVirtual: { select: { canalConversacional: { select: { nombre: true } } } },
                lead: { select: { id: true, nombre: true } },
                Interaccion: { orderBy: { createdAt: 'desc' }, take: 1, select: { mensaje: true, createdAt: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 100, // Considera paginación
        });

        // Mapear resultados
        const data: ConversationPreviewItem[] = conversaciones.map((conv) => {
            const ultimaInteraccion = conv.Interaccion[0];
            let canal: ConversationPreviewItem['canalOrigen'] = 'otro';
            const canalNombre = conv.asistenteVirtual?.canalConversacional?.nombre?.toLowerCase();
            if (canalNombre === 'whatsapp') canal = 'whatsapp';
            else if (canalNombre === 'web chat') canal = 'webchat';

            return {
                id: conv.id,
                leadId: conv.lead?.id,
                leadName: conv.lead?.nombre ?? 'Contacto desconocido',
                lastMessagePreview: ultimaInteraccion?.mensaje?.substring(0, 50) ?? '...',
                lastMessageTimestamp: ultimaInteraccion?.createdAt ?? conv.updatedAt,
                status: conv.status ?? 'desconocido',
                canalOrigen: canal,
            };
        });

        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerListaConversacionesAction:', error);
        return { success: false, error: 'No se pudieron cargar las conversaciones.' };
    }
}

export async function obtenerUltimosMensajesAction(
    conversationId: string,
    limit: number = 50 // Obtener los últimos 50 por defecto
): Promise<ActionResult<ChatMessageItem[]>> {
    console.log(`[CRM Actions] obtenerUltimosMensajesAction llamada para conv: ${conversationId}, limite: ${limit}`);
    try {
        if (!conversationId) {
            return { success: false, error: 'El ID de la conversación es requerido.' };
        }
        const interacciones = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId },
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
            orderBy: { createdAt: 'asc' }, // Obtener en orden cronológico
            take: limit > 0 ? limit : undefined, // Aplicar límite si es positivo
            // skip: podrías añadir skip para paginación futura
        });

        const data: ChatMessageItem[] = interacciones.map((interaccion) => {
            const role = ['user', 'assistant', 'agent', 'system'].includes(interaccion.role)
                ? interaccion.role as ChatMessageItem['role']
                : 'system';
            const agenteCrmData: AgenteBasico | null = interaccion.agenteCrm
                ? { id: interaccion.agenteCrm.id, nombre: interaccion.agenteCrm.nombre }
                : null;

            return {
                id: interaccion.id,
                conversacionId: interaccion.conversacionId,
                role: role,
                mensaje: interaccion.mensaje,
                mediaUrl: interaccion.mediaUrl,
                mediaType: interaccion.mediaType,
                createdAt: interaccion.createdAt, // Ya es Date
                agenteCrm: agenteCrmData,
            };
        });

        console.log(`[CRM Actions] ${data.length} mensajes obtenidos para conv: ${conversationId}`);
        return { success: true, data };
    } catch (error) {
        console.error(`[CRM Actions] Error en obtenerUltimosMensajesAction para conv ${conversationId}:`, error);
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}


/**
 * Envía un nuevo mensaje (interacción) a una conversación con el rol 'user'.
 * Utilizado por el panel de pruebas para simular un mensaje del cliente final.
 * @param input Datos del mensaje a enviar (conversationId, mensaje).
 * @returns ActionResult con el ChatMessageItem creado.
 */
export async function enviarMensajeComoUsuarioAction(
    input: EnviarMensajeUsuarioInput
): Promise<ActionResult<ChatMessageItem>> {
    try {
        if (!input.conversationId || !input.mensaje) {
            return { success: false, error: 'Faltan datos para enviar el mensaje (conversationId, mensaje).' };
        }

        const conversacion = await prisma.conversacion.findUnique({
            where: { id: input.conversationId },
            select: { id: true, status: true }
        });

        if (!conversacion) {
            return { success: false, error: 'La conversación especificada no existe.' };
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: {
                conversacionId: input.conversationId,
                mensaje: input.mensaje,
                role: 'user',
            },
            select: {
                id: true, conversacionId: true, role: true, mensaje: true,
                mediaUrl: true, mediaType: true, createdAt: true,
            }
        });

        await prisma.conversacion.update({
            where: { id: input.conversationId },
            data: { updatedAt: new Date() }
        });

        const data: ChatMessageItem = {
            id: nuevaInteraccion.id,
            conversacionId: nuevaInteraccion.conversacionId,
            role: nuevaInteraccion.role as ChatMessageItem['role'],
            mensaje: nuevaInteraccion.mensaje,
            mediaUrl: nuevaInteraccion.mediaUrl,
            mediaType: nuevaInteraccion.mediaType,
            createdAt: nuevaInteraccion.createdAt,
        };
        return { success: true, data };
    } catch (error) {
        console.error('Error en enviarMensajeComoUsuarioAction:', error);
        let errorMessage = 'No se pudo enviar el mensaje como usuario.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

// El tipo de retorno ahora es más simple, ya que el dispatcher maneja la respuesta final de la función
interface ProcesarMensajeEntranteData {
    conversacionId: string;
    interaccionUsuarioId: string;
    interaccionAsistenteId?: string; // ID de la *primera* respuesta del asistente (texto o "procesando")
    leadId: string;
    asistenteId: string;
    respuestaAsistenteInicial?: string | null; // La respuesta textual inicial de la IA
    llamadaFuncionDetectada?: boolean; // Indicar si se detectó una llamada a función
}

export async function procesarMensajeEntranteAction(
    payload: MensajeEntrantePayload
): Promise<ActionResult<ProcesarMensajeEntranteData>> {

    let tareaEjecutadaCreadaId: string | null = null; // Para llamar al dispatcher después

    try {
        const { canalOrigenId, remitenteId, nombreRemitente, mensajeTexto } = payload;

        if (!canalOrigenId || !remitenteId || !mensajeTexto) {
            return { success: false, error: 'Faltan datos esenciales en el payload.' };
        }

        // Identificar Asistente (asumiendo phoneNumberId para WhatsApp)
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: { phoneNumberId: canalOrigenId }, // Usar el campo correcto para identificar por WhatsApp
            include: { negocio: { include: { CRM: true } } }
        });

        if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
            return { success: false, error: `Asistente/Negocio/CRM no encontrado para canalOrigenId: ${canalOrigenId}` };
        }
        const crmId = asistente.negocio.CRM.id;
        const negocioNombre = asistente.negocio.nombre;

        let leadIdVar: string = '';
        let interaccionUsuarioIdVar: string = '';
        let conversationIdVar: string = '';
        let interaccionAsistenteIdVar: string | undefined;
        let respuestaAsistenteTextoVar: string | null = null;
        let llamadaFuncionDetectadaVar: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;
        let estadoConversacionActual: string = 'abierta'; // Estado por defecto

        await prisma.$transaction(async (tx) => {
            // Buscar o Crear Lead (usando 'telefono' para WhatsApp)
            let lead = await tx.lead.findFirst({
                where: { telefono: remitenteId, crmId: crmId },
            });
            if (!lead) {
                console.log(`Creando nuevo Lead para WhatsApp ${remitenteId} en CRM ${crmId}.`);
                // Necesitamos obtener o crear el CanalCRM para WhatsApp
                let canalWhatsapp = await tx.canalCRM.findFirst({ where: { crmId: crmId, nombre: 'WhatsApp' } });
                if (!canalWhatsapp) {
                    canalWhatsapp = await tx.canalCRM.create({ data: { crmId: crmId, nombre: 'WhatsApp', status: 'activo' } });
                }
                lead = await tx.lead.create({
                    data: {
                        crmId: crmId,
                        nombre: nombreRemitente || `Usuario WhatsApp ${remitenteId.slice(-4)}`, // Usar últimos 4 dígitos
                        telefono: remitenteId, // Guardar número de WhatsApp
                        canalId: canalWhatsapp.id,
                        status: 'nuevo',
                    },
                });
            }
            leadIdVar = lead.id;

            // Buscar o Crear Conversación
            let conversacion = await tx.conversacion.findFirst({
                where: { leadId: lead.id, asistenteVirtualId: asistente.id, status: { notIn: ['cerrada', 'archivada'] } }, // Buscar activa o en espera
                orderBy: { createdAt: 'desc' },
            });

            const now = new Date();
            if (!conversacion) {
                console.log(`Creando nueva Conversación WhatsApp para Lead ${lead.id}, Asistente ${asistente.id}.`);
                conversacion = await tx.conversacion.create({
                    data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta', updatedAt: now, whatsappId: remitenteId }, // Guardar ID de WhatsApp si es útil
                });
            } else {
                console.log(`Continuando Conversación WhatsApp activa ID: ${conversacion.id}, Estado: ${conversacion.status}`);
                estadoConversacionActual = conversacion.status; // Guardar estado actual
                await tx.conversacion.update({ where: { id: conversacion.id }, data: { updatedAt: now } });
            }
            conversationIdVar = conversacion.id;

            // Guardar Interacción del Usuario
            const interaccionUsuario = await tx.interaccion.create({
                data: { conversacionId: conversationIdVar, role: 'user', mensaje: mensajeTexto },
            });
            interaccionUsuarioIdVar = interaccionUsuario.id;

            // --- VERIFICAR ESTADO ANTES DE LLAMAR A IA ---
            if (estadoConversacionActual === 'en_espera_agente' || estadoConversacionActual === 'hitl_activo') {
                console.log(`[Procesar Mensaje Entrante] Conversación ${conversationIdVar} está en estado ${estadoConversacionActual}. No se llamará a la IA.`);
                return; // Salir de la transacción sin llamar a IA
            }
            // --- FIN VERIFICACIÓN ---

            // Obtener Historial y Tareas (Dentro de la transacción)
            const historialInteracciones = await tx.interaccion.findMany({
                where: { conversacionId: conversationIdVar }, orderBy: { createdAt: 'asc' }, take: 20
            });
            const historialParaIA: Pick<ChatMessageItem, 'role' | 'mensaje'>[] = historialInteracciones
                .filter(i => i.id !== interaccionUsuarioIdVar) // Excluir el mensaje actual que acabamos de guardar
                .map(i => ({ role: i.role as ChatMessageItem['role'], mensaje: i.mensaje }));

            // --- OBTENER TAREAS DISPONIBLES ---
            const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistente.id, tx);
            // --- FIN OBTENER TAREAS ---

            // Llamar a la IA
            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: historialParaIA,
                mensajeUsuarioActual: mensajeTexto,
                contextoAsistente: {
                    nombreAsistente: asistente.nombre,
                    descripcionAsistente: asistente.descripcion,
                    nombreNegocio: negocioNombre,
                },
                // --- PASAR TAREAS A LA IA ---
                tareasDisponibles: tareasDisponibles,
                // --- FIN PASAR TAREAS ---
            });

            // Procesar respuesta de IA
            if (resultadoIA.success && resultadoIA.data) {
                const respuestaIA = resultadoIA.data;
                respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
                llamadaFuncionDetectadaVar = respuestaIA.llamadaFuncion;

                // Guardar respuesta textual si existe
                if (respuestaAsistenteTextoVar) {
                    const interaccionAsistente = await tx.interaccion.create({
                        data: { conversacionId: conversationIdVar, role: 'assistant', mensaje: respuestaAsistenteTextoVar },
                    });
                    interaccionAsistenteIdVar = interaccionAsistente.id;
                }

                // Registrar TareaEjecutada si hubo llamada a función
                if (llamadaFuncionDetectadaVar) {
                    const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombreInterno === llamadaFuncionDetectadaVar?.nombreFuncion);
                    if (tareaCoincidente) {
                        const tareaEjecutada = await tx.tareaEjecutada.create({
                            data: {
                                asistenteVirtualId: asistente.id,
                                tareaId: tareaCoincidente.id,
                                fechaEjecutada: new Date(),
                                metadata: JSON.stringify({
                                    conversacionId: conversationIdVar,
                                    leadId: leadIdVar,
                                    asistenteVirtualId: asistente.id,
                                    funcionLlamada: llamadaFuncionDetectadaVar.nombreFuncion,
                                    argumentos: llamadaFuncionDetectadaVar.argumentos,
                                })
                            }
                        });
                        tareaEjecutadaCreadaId = tareaEjecutada.id;

                        // Generar mensaje "procesando" si no hubo texto inicial
                        if (!respuestaAsistenteTextoVar) {
                            respuestaAsistenteTextoVar = `Entendido. Procesando: ${llamadaFuncionDetectadaVar.nombreFuncion}.`;
                            if (!interaccionAsistenteIdVar) {
                                const i = await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'assistant', mensaje: respuestaAsistenteTextoVar } });
                                interaccionAsistenteIdVar = i.id;
                            }
                        }
                    } else { console.warn(`IA intentó llamar a función desconocida: ${llamadaFuncionDetectadaVar.nombreFuncion}`); }
                }

                // Actualizar timestamp final de conversación
                await tx.conversacion.update({ where: { id: conversationIdVar }, data: { updatedAt: new Date() } });

            } else {
                console.warn(`IA no generó respuesta o hubo error: ${resultadoIA.error}`);
                await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'system', mensaje: `Error interno IA: ${resultadoIA.error || 'Desconocido'}` } });
                await tx.conversacion.update({ where: { id: conversationIdVar }, data: { updatedAt: new Date() } }); // Actualizar timestamp incluso con error de IA
            }
        }); // Fin de la transacción

        // Llamar al Dispatcher si se creó una TareaEjecutada
        if (tareaEjecutadaCreadaId) {
            console.log(`[Procesar Mensaje Entrante] Llamando al dispatcher para TareaEjecutada ID: ${tareaEjecutadaCreadaId}`);
            dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId).catch(dispatchError => {
                console.error(`[Procesar Mensaje Entrante] Error en dispatchTareaEjecutadaAction para ${tareaEjecutadaCreadaId}:`, dispatchError);
            });
        }

        return {
            success: true,
            data: {
                conversacionId: conversationIdVar,
                interaccionUsuarioId: interaccionUsuarioIdVar,
                interaccionAsistenteId: interaccionAsistenteIdVar,
                leadId: leadIdVar,
                asistenteId: asistente.id,
                respuestaAsistenteInicial: respuestaAsistenteTextoVar, // Devolver el texto inicial
                llamadaFuncionDetectada: !!llamadaFuncionDetectadaVar // Indicar si se detectó llamada
            }
        };

    } catch (error) {
        console.error('Error en procesarMensajeEntranteAction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar el mensaje entrante.' };
    }
}




/***********  WHATSAPP ************/
/***********  WHATSAPP ************/
/***********  WHATSAPP ************/

// Obtener el historial de mensajes de una conversación específica
export async function obtenerMensajesConversacionAction(
    conversationId: string
): Promise<ActionResult<ChatMessageItem[]>> {
    try {
        if (!conversationId) {
            return { success: false, error: 'El ID de la conversación es requerido.' };
        }
        const interacciones = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId },
            select: {
                id: true,
                conversacionId: true,
                role: true,
                mensaje: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                agenteCrmId: true,
                agenteCrm: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const data: ChatMessageItem[] = interacciones.map((interaccion) => ({
            id: interaccion.id,
            conversacionId: interaccion.conversacionId,
            role: interaccion.role as ChatMessageItem['role'],
            mensaje: interaccion.mensaje,
            mediaUrl: interaccion.mediaUrl,
            mediaType: interaccion.mediaType,
            createdAt: interaccion.createdAt,
            agenteCrm: interaccion.agenteCrm ? {
                id: interaccion.agenteCrm.id,
                nombre: interaccion.agenteCrm.nombre,
            } : null,
        }));
        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerMensajesConversacionAction:', error);
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}

export async function enviarMensajeAction(
    input: EnviarMensajeInput
): Promise<ActionResult<ChatMessageItem>> {
    try {
        if (!input.conversacionId || !input.mensaje || !input.role) {
            return { success: false, error: 'Faltan datos para enviar el mensaje.' };
        }

        // --- Lógica de Pausa Automática ---
        let updateConversationStatus = false;
        if (input.role === 'agent') {
            // Si envía un agente (humano desde CRM), pausar la IA
            updateConversationStatus = true;
            console.log(`[enviarMensajeAction] Mensaje de agente detectado. Pausando conversación ${input.conversacionId}.`);
        }
        // --- Fin Lógica de Pausa ---

        // Usar transacción para asegurar que el mensaje y el estado se actualicen juntos
        const nuevaInteraccion = await prisma.$transaction(async (tx) => {
            const interaccion = await tx.interaccion.create({
                data: {
                    conversacionId: input.conversacionId,
                    mensaje: input.mensaje,
                    role: input.role,
                    agenteCrmId: input.agenteCrmId, // Será null si es propietario/admin
                },
                select: {
                    id: true, conversacionId: true, role: true, mensaje: true,
                    mediaUrl: true, mediaType: true, createdAt: true,
                    agenteCrm: { select: { id: true, nombre: true } },
                }
            });

            // Actualizar Conversacion (timestamp y status si es necesario)
            await tx.conversacion.update({
                where: { id: input.conversacionId },
                data: {
                    updatedAt: new Date(),
                    // Actualizar status solo si es un agente enviando
                    ...(updateConversationStatus && { status: 'en_espera_agente' })
                }
            });

            return interaccion;
        });

        const data: ChatMessageItem = {
            id: nuevaInteraccion.id,
            conversacionId: nuevaInteraccion.conversacionId,
            role: nuevaInteraccion.role as ChatMessageItem['role'],
            mensaje: nuevaInteraccion.mensaje,
            mediaUrl: nuevaInteraccion.mediaUrl,
            mediaType: nuevaInteraccion.mediaType,
            createdAt: nuevaInteraccion.createdAt,
            agenteCrm: nuevaInteraccion.agenteCrm ? {
                id: nuevaInteraccion.agenteCrm.id,
                nombre: nuevaInteraccion.agenteCrm.nombre,
            } : null,
        };
        return { success: true, data };
    } catch (error) {
        console.error('Error en enviarMensajeAction:', error);
        // Manejo específico del error de FK si agenteCrmId es inválido
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            // Comprobar si el error es específicamente en el campo agenteCrmId
            const fieldNameMatch = error.message.match(/Foreign key constraint failed on the field: `(.*)`/);
            if (fieldNameMatch && fieldNameMatch[1] === 'agenteCrmId') {
                return { success: false, error: 'Error: El ID del agente especificado no es válido.' };
            }
        }
        return { success: false, error: 'No se pudo enviar el mensaje.' };
    }
}


/***********  WEBCHAT ************/
/***********  WEBCHAT ************/
/***********  WEBCHAT ************/

const WEBCHAT_CRM_CANAL_NOMBRE = "Webchat";

async function obtenerOCrearCanalWebchat(crmId: string, tx: Prisma.TransactionClient): Promise<string> {
    let canal = await tx.canalCRM.findFirst({
        where: { crmId: crmId, nombre: WEBCHAT_CRM_CANAL_NOMBRE },
        select: { id: true },
    });
    if (!canal) {
        console.log(`[CRM Actions] CanalCRM "${WEBCHAT_CRM_CANAL_NOMBRE}" no encontrado para CRM ${crmId}. Creando...`);
        canal = await tx.canalCRM.create({
            data: { crmId: crmId, nombre: WEBCHAT_CRM_CANAL_NOMBRE, status: 'activo' },
            select: { id: true },
        });
        console.log(`[CRM Actions] CanalCRM "${WEBCHAT_CRM_CANAL_NOMBRE}" creado con ID: ${canal.id}`);
    }
    return canal.id;
}

// --- Función auxiliar para obtener el ID del primer pipeline activo ---
async function obtenerPrimerPipelineId(crmId: string, tx: Prisma.TransactionClient): Promise<string | null> {
    const primerPipeline = await tx.pipelineCRM.findFirst({
        where: {
            crmId: crmId,
            status: 'activo'
        },
        orderBy: {
            orden: 'asc' // Asume que 'orden' define la secuencia
        },
        select: { id: true }
    });
    return primerPipeline?.id ?? null;
}

//! WEBCHAT PASO 1: Crear lead y conversación
export async function iniciarConversacionWebchatAction(
    input: IniciarConversacionWebchatInput
): Promise<ActionResult<IniciarConversacionWebchatDataConDispatcher>> {
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        // ... (Validaciones iniciales y obtener asistente - sin cambios) ...
        const { asistenteId, mensajeInicial, remitenteIdWeb, nombreRemitenteSugerido } = input;

        if (!asistenteId || !mensajeInicial || !remitenteIdWeb)
            return { success: false, error: 'Datos esenciales incompletos.' };

        //! Obtener asistente y negocio
        const asistente = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, include: { negocio: { include: { CRM: true } } } });

        if (!asistente || !asistente.negocio || !asistente.negocio.CRM) return {
            success: false, error: `Asistente o configuración CRM no encontrada.`
        };

        const crmId = asistente.negocio.CRM.id;
        const negocioNombre = asistente.negocio.nombre;

        let leadIdVar: string = '';
        let interaccionUsuarioIdVar: string = '';
        let conversationIdVar: string = '';
        let interaccionAsistenteIdVar: string | undefined;
        let respuestaAsistenteTextoVar: string | null = null;
        let mensajeUsuarioGuardadoVar: ChatMessageItem | undefined;
        let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
        let llamadaFuncionDetectadaVar: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;

        await prisma.$transaction(async (tx) => {
            const canalWebchatId = await obtenerOCrearCanalWebchat(crmId, tx);

            let lead = await tx.lead.findFirst({
                where: { crmId: crmId, jsonParams: { path: ['webchatUserId'], equals: remitenteIdWeb } }
            });

            if (!lead) {
                //! Crear nuevo lead si no existe
                const primerPipelineId = await obtenerPrimerPipelineId(crmId, tx);
                if (!primerPipelineId) {
                    throw new Error(`No se encontró una etapa de pipeline activa inicial para el CRM ${crmId}. Configure el pipeline.`);
                }

                lead = await tx.lead.create({
                    data: {
                        crmId: crmId,
                        nombre: nombreRemitenteSugerido || `Usuario Webchat ${remitenteIdWeb.substring(0, 8)}`,
                        canalId: canalWebchatId,
                        status: 'nuevo',
                        pipelineId: primerPipelineId,
                        jsonParams: { webchatUserId: remitenteIdWeb }
                    },
                });
            }
            leadIdVar = lead.id;

            const nuevaConversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta' } }); conversationIdVar = nuevaConversacion.id;
            const interaccionUsuario = await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'user', mensaje: mensajeInicial } }); interaccionUsuarioIdVar = interaccionUsuario.id; mensajeUsuarioGuardadoVar = { ...interaccionUsuario, role: 'user', createdAt: interaccionUsuario.createdAt, mensaje: interaccionUsuario.mensaje || "" };

            //! Obtener tareas disponibles para el asistente
            const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistente.id, tx);
            console.log(`Tareas disponibles para el asistente ${asistente.nombre}:`, tareasDisponibles);

            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: [],
                mensajeUsuarioActual: mensajeInicial,
                contextoAsistente: {
                    nombreAsistente: asistente.nombre,
                    descripcionAsistente: asistente.descripcion,
                    nombreNegocio: negocioNombre
                },
                tareasDisponibles: tareasDisponibles
            });

            if (resultadoIA.success && resultadoIA.data) {
                const respuestaIA = resultadoIA.data;
                respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
                llamadaFuncionDetectadaVar = respuestaIA.llamadaFuncion;

                if (respuestaAsistenteTextoVar) {
                    const i = await tx.interaccion.create({
                        data: {
                            conversacionId: conversationIdVar, role: 'assistant',
                            mensaje: respuestaAsistenteTextoVar
                        }
                    });
                    interaccionAsistenteIdVar = i.id; mensajeAsistenteGuardadoVar = {
                        ...i, role: 'assistant', createdAt: i.createdAt, mensaje: i.mensaje || ""
                    };
                }
                if (llamadaFuncionDetectadaVar) {

                    const t = tareasDisponibles.find(t => t.funcionHerramienta?.nombreInterno === llamadaFuncionDetectadaVar?.nombreFuncion);

                    if (t) {
                        const te = await tx.tareaEjecutada.create({
                            data: {
                                asistenteVirtualId: asistente.id,
                                tareaId: t.id,
                                fechaEjecutada: new Date(),
                                metadata: JSON.stringify({
                                    conversacionId: conversationIdVar,
                                    leadId: leadIdVar,
                                    asistenteVirtualId: asistente.id,
                                    funcionLlamada: llamadaFuncionDetectadaVar.nombreFuncion,
                                    argumentos: llamadaFuncionDetectadaVar.argumentos
                                })
                            }
                        });
                        tareaEjecutadaCreadaId = te.id;

                        if (!respuestaAsistenteTextoVar) {
                            respuestaAsistenteTextoVar = `Entendido. Procesando: ${llamadaFuncionDetectadaVar.nombreFuncion}.`;

                            if (!interaccionAsistenteIdVar) {
                                const i = await tx.interaccion.create({
                                    data: {
                                        conversacionId: conversationIdVar,
                                        role: 'assistant',
                                        mensaje: respuestaAsistenteTextoVar
                                    }
                                });
                                interaccionAsistenteIdVar = i.id;
                                mensajeAsistenteGuardadoVar = {
                                    ...i,
                                    role: 'assistant',
                                    createdAt: i.createdAt,
                                    mensaje: i.mensaje || ""
                                };
                            }
                        }
                    } else {
                        console.warn(`IA intentó llamar a función desconocida: ${llamadaFuncionDetectadaVar.nombreFuncion}`);
                    }
                } await tx.conversacion.update({ where: { id: conversationIdVar }, data: { updatedAt: new Date() } });
            } else {
                console.warn(`IA no generó respuesta o hubo error: ${resultadoIA.error}`);
                await tx.interaccion.create({
                    data: {
                        conversacionId: conversationIdVar,
                        role: 'system',
                        mensaje: `Error interno IA: ${resultadoIA.error || 'Desconocido'}`
                    }
                });
            }

        });

        let mensajeResultadoDispatcher: ChatMessageItem | null = null;
        if (tareaEjecutadaCreadaId) {
            console.log(`Llamando dispatcher para Tarea: ${tareaEjecutadaCreadaId}`);

            //! Aquí llamamos al dispatcher para la tarea ejecutada
            const dispatchResult = await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
            if (dispatchResult.success && dispatchResult.data) {
                mensajeResultadoDispatcher = dispatchResult.data;
            } else if (!dispatchResult.success) {
                console.error(`Error dispatcher para ${tareaEjecutadaCreadaId}:`, dispatchResult.error);
            }
        }

        return {
            success: true,
            data: {
                conversationId: conversationIdVar, interaccionUsuarioId: interaccionUsuarioIdVar, leadId: leadIdVar,
                respuestaAsistente: respuestaAsistenteTextoVar, interaccionAsistenteId: interaccionAsistenteIdVar,
                mensajeUsuario: mensajeUsuarioGuardadoVar, mensajeAsistente: mensajeAsistenteGuardadoVar,
                mensajeResultadoFuncion: mensajeResultadoDispatcher
            }
        };

    } catch (error) {
        console.error('[CRM Actions] Error en iniciarConversacionWebchatAction:', error);
        // Devolver el error específico si es por falta de pipeline
        if (error instanceof Error && error.message.includes("Configure el pipeline")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: error instanceof Error ? error.message : 'Error interno.' };
    }
}

export async function enviarMensajeWebchatAction(
    input: EnviarMensajeWebchatInput
): Promise<ActionResult<EnviarMensajeWebchatData>> {
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        const { conversationId, mensaje } = input;

        if (!conversationId || !mensaje) {
            return { success: false, error: 'Datos esenciales incompletos: se requieren conversationId y mensaje.' };
        }

        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversationId },
            include: {
                asistenteVirtual: { include: { negocio: true } },
                lead: true,
            },
        });

        if (!conversacion) return { success: false, error: `Conversación con ID ${conversationId} no encontrada.` };
        if (!conversacion.asistenteVirtual) return { success: false, error: `La conversación ${conversationId} no tiene un asistente.` };
        if (!conversacion.asistenteVirtual.negocio) return { success: false, error: `El asistente de la conversación no está asociado a un negocio.` };
        if (!conversacion.lead) return { success: false, error: `La conversación no tiene un lead asociado.` };
        const asistenteId = conversacion.asistenteVirtualId!;

        let interaccionUsuarioIdVar: string = '';
        let respuestaAsistenteTextoVar: string | null = null;
        let interaccionAsistenteIdVar: string | undefined;
        let mensajeUsuarioGuardadoVar: ChatMessageItem | undefined;
        let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
        let llamadaFuncionDetectadaVar: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;

        const estadoActual = conversacion.status;
        await prisma.$transaction(async (tx) => {
            const interaccionUsuario = await tx.interaccion.create({
                data: { conversacionId: conversationId, role: 'user', mensaje: mensaje },
            });
            interaccionUsuarioIdVar = interaccionUsuario.id;
            mensajeUsuarioGuardadoVar = { ...interaccionUsuario, role: 'user', createdAt: interaccionUsuario.createdAt, mensaje: interaccionUsuario.mensaje || "" };

            // --- CORRECCIÓN: Verificar estado ANTES de llamar a IA ---
            if (estadoActual === 'en_espera_agente' || estadoActual === 'hitl_activo') { // Añadir otros estados de pausa si los usas
                console.log(`[CRM Actions] Conversación ${conversationId} está en estado ${estadoActual}. No se llamará a la IA.`);

                // Actualizar solo el timestamp de la conversación
                await tx.conversacion.update({
                    where: { id: conversationId }, data: { updatedAt: new Date() },
                });

                // Salir de la transacción sin llamar a IA ni dispatcher
                return;
            }
            // --- FIN CORRECCIÓN ---

            const historialInteracciones = await tx.interaccion.findMany({
                where: { conversacionId: conversationId },
                orderBy: { createdAt: 'asc' },
                take: 20,
            });
            const historialParaIA: Pick<ChatMessageItem, 'role' | 'mensaje'>[] = historialInteracciones.map(i => ({
                role: i.role as ChatMessageItem['role'],
                mensaje: i.mensaje,
            }));

            const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, tx);
            // console.log(`[CRM Actions] Tareas disponibles para el asistente ${conversacion.asistenteVirtual!.nombre}:`, tareasDisponibles);


            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: historialParaIA.filter(h => h.role !== 'system'),
                mensajeUsuarioActual: mensaje,
                contextoAsistente: {
                    nombreAsistente: conversacion.asistenteVirtual!.nombre,
                    descripcionAsistente: conversacion.asistenteVirtual!.descripcion,
                    nombreNegocio: conversacion.asistenteVirtual!.negocio?.nombre ?? 'Negocio desconocido',
                },
                tareasDisponibles: tareasDisponibles,
            });

            if (resultadoIA.success && resultadoIA.data) {
                const respuestaIA = resultadoIA.data;
                respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
                llamadaFuncionDetectadaVar = respuestaIA.llamadaFuncion;

                if (respuestaAsistenteTextoVar) {
                    const interaccionAsistente = await tx.interaccion.create({
                        data: {
                            conversacionId: conversationId,
                            role: 'assistant',
                            mensaje: respuestaAsistenteTextoVar,
                        },
                    });
                    interaccionAsistenteIdVar = interaccionAsistente.id;
                    mensajeAsistenteGuardadoVar = { ...interaccionAsistente, role: 'assistant', createdAt: interaccionAsistente.createdAt, mensaje: interaccionAsistente.mensaje || "" };
                }

                if (llamadaFuncionDetectadaVar) {
                    const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombreInterno === llamadaFuncionDetectadaVar?.nombreFuncion);
                    if (tareaCoincidente) {
                        const tareaEjecutada = await tx.tareaEjecutada.create({
                            data: {
                                asistenteVirtualId: asistenteId,
                                tareaId: tareaCoincidente.id,
                                fechaEjecutada: new Date(),
                                metadata: JSON.stringify({
                                    conversacionId: conversationId,
                                    leadId: conversacion.leadId,
                                    asistenteVirtualId: asistenteId,
                                    funcionLlamada: llamadaFuncionDetectadaVar.nombreFuncion,
                                    argumentos: llamadaFuncionDetectadaVar.argumentos,
                                })
                            }
                        });
                        tareaEjecutadaCreadaId = tareaEjecutada.id;

                        if (!respuestaAsistenteTextoVar) {
                            respuestaAsistenteTextoVar = `Entendido. Procesando tu solicitud para ${llamadaFuncionDetectadaVar.nombreFuncion}.`;
                            if (!interaccionAsistenteIdVar) {
                                const interaccionAsistenteFuncion = await tx.interaccion.create({
                                    data: { conversacionId: conversationId, role: 'assistant', mensaje: respuestaAsistenteTextoVar },
                                });
                                interaccionAsistenteIdVar = interaccionAsistenteFuncion.id;
                                mensajeAsistenteGuardadoVar = { ...interaccionAsistenteFuncion, role: 'assistant', createdAt: interaccionAsistenteFuncion.createdAt, mensaje: interaccionAsistenteFuncion.mensaje || "" };
                            }
                        }
                    } else {
                        console.warn(`[CRM Actions] IA intentó llamar a función desconocida: ${llamadaFuncionDetectadaVar.nombreFuncion}`);
                    }
                }
            } else {
                console.warn(`[CRM Actions] IA no generó respuesta para conversación ${conversationId} o hubo error: ${resultadoIA.error}`);
                await tx.interaccion.create({
                    data: {
                        conversacionId: conversationId,
                        role: 'system',
                        mensaje: `Lo siento, tuve un problema interno al procesar tu solicitud (${resultadoIA.error || 'Error desconocido'}). Por favor, intenta de nuevo o contacta a soporte.`,
                    },
                });
            }

            await tx.conversacion.update({
                where: { id: conversationId }, data: { updatedAt: new Date() },
            });
        }); // Fin de la transacción

        if (tareaEjecutadaCreadaId) {
            console.log(`[CRM Actions] Llamando al dispatcher para TareaEjecutada ID: ${tareaEjecutadaCreadaId}`);
            dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId).catch(dispatchError => {
                console.error(`[CRM Actions] Error en dispatchTareaEjecutadaAction para ${tareaEjecutadaCreadaId}:`, dispatchError);
            });
        }

        return {
            success: true,
            data: {
                interaccionUsuarioId: interaccionUsuarioIdVar,
                respuestaAsistente: respuestaAsistenteTextoVar,
                interaccionAsistenteId: interaccionAsistenteIdVar,
                mensajeUsuario: mensajeUsuarioGuardadoVar,
                mensajeAsistente: mensajeAsistenteGuardadoVar,
            }
        };

    } catch (error) {
        console.error('[CRM Actions] Error en enviarMensajeWebchatAction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al enviar el mensaje en webchat.' };
    }
}



async function obtenerTareasCapacidadParaAsistente(asistenteId: string, tx: Prisma.TransactionClient): Promise<TareaCapacidadIA[]> {
    const suscripcionesTareas = await tx.asistenteTareaSuscripcion.findMany({
        where: {
            asistenteVirtualId: asistenteId,
            status: 'activo',
            tarea: { status: 'activo' },
        },
        include: {
            tarea: {
                include: {
                    tareaFuncion: {
                        include: {
                            parametrosRequeridos: {
                                include: { parametroRequerido: true },
                            },
                        },
                    },
                    camposPersonalizadosRequeridos: {
                        include: { crmCampoPersonalizado: true },
                    },
                },
            },
        },
    });

    const tareasCapacidad: TareaCapacidadIA[] = [];

    for (const suscripcion of suscripcionesTareas) {
        const tareaDb = suscripcion.tarea;
        if (!tareaDb) continue;

        let funcionHerramienta: TareaCapacidadIA['funcionHerramienta'] = null;
        if (tareaDb.tareaFuncion) {
            const parametrosFuncion: ParametroParaIA[] = tareaDb.tareaFuncion.parametrosRequeridos
                // Filtrar por si acaso parametroRequerido es null
                .filter(p => p.parametroRequerido)
                .map(p => {
                    // --- CORRECCIÓN AQUÍ ---
                    // Usar ?? para asegurar que siempre haya un string, incluso si ambos son null/undefined
                    const nombreParam = (p.parametroRequerido.nombreInterno ?? p.parametroRequerido.nombreVisible) ?? '';
                    if (nombreParam === '') {
                        console.warn(`[CRM Actions] Parámetro con ID ${p.parametroRequerido.id} no tiene nombreInterno ni nombreVisible.`);
                    }
                    return {
                        nombre: nombreParam,
                        tipo: p.parametroRequerido.tipoDato,
                        descripcion: p.parametroRequerido.descripcion || p.parametroRequerido.nombreVisible,
                        esObligatorio: p.esObligatorio,
                    };
                    // --- FIN CORRECCIÓN ---
                });

            funcionHerramienta = {
                nombreInterno: tareaDb.tareaFuncion.nombreInterno,
                nombreVisible: tareaDb.tareaFuncion.nombreVisible,
                descripcion: tareaDb.tareaFuncion.descripcion,
                parametros: parametrosFuncion,
            };
        }

        const camposPersonalizadosTarea: ParametroParaIA[] = tareaDb.camposPersonalizadosRequeridos
            // Filtrar por si acaso crmCampoPersonalizado es null
            .filter(cp => cp.crmCampoPersonalizado)
            .map(cp => {
                // --- CORRECCIÓN AQUÍ ---
                // Usar ?? para asegurar que siempre haya un string
                const nombreCampo = (cp.crmCampoPersonalizado.nombreCampo ?? cp.crmCampoPersonalizado.nombre) ?? '';
                if (nombreCampo === '') {
                    console.warn(`[CRM Actions] Campo Personalizado con ID ${cp.crmCampoPersonalizado.id} no tiene nombreCampo ni nombre.`);
                }
                return {
                    nombre: nombreCampo,
                    tipo: cp.crmCampoPersonalizado.tipo,
                    descripcion: cp.crmCampoPersonalizado.nombre, // Usar siempre el nombre visible como descripción
                    esObligatorio: cp.esRequerido,
                };
                // --- FIN CORRECCIÓN ---
            });

        tareasCapacidad.push({
            id: tareaDb.id,
            nombre: tareaDb.nombre,
            descripcion: tareaDb.descripcion,
            instruccionParaIA: tareaDb.instruccion,
            funcionHerramienta: funcionHerramienta,
            camposPersonalizadosRequeridos: camposPersonalizadosTarea.length > 0 ? camposPersonalizadosTarea : undefined,
        });
    }
    // console.log(`[CRM Actions] Tareas capacidad para Asistente ${asistenteId}:`, JSON.stringify(tareasCapacidad, null, 2)); // Log detallado opcional
    return tareasCapacidad;
}
