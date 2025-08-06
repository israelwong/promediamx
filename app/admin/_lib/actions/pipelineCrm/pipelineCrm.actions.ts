// app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarEtapasPipelineCrmParamsSchema,
    ObtenerEtapasPipelineCrmResultData,
    PipelineCrmData,
    crearEtapaPipelineCrmParamsSchema,
    editarEtapaPipelineCrmParamsSchema,
    eliminarEtapaPipelineCrmParamsSchema,
    reordenarEtapasPipelineCrmParamsSchema,
    obtenerDatosPipelineKanbanParamsSchema,
    KanbanBoardData, // Usaremos este como tipo de retorno para el data
    actualizarEtapaLeadParamsSchema,
} from './pipelineCrm.schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';


// Acción para obtener etapas y el crmId a partir del negocioId
export async function listarEtapasPipelineCrmAction(
    params: z.infer<typeof listarEtapasPipelineCrmParamsSchema>
): Promise<ActionResult<ObtenerEtapasPipelineCrmResultData>> {
    const validation = listarEtapasPipelineCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Pipeline: { // Nombre de la relación en el modelo CRM hacia PipelineCRM
                    orderBy: { orden: 'asc' },
                },
            },
        });

        if (!crm) {
            return { success: true, data: { crmId: null, etapas: [] } };
        }

        const etapasData: PipelineCrmData[] = crm.Pipeline.map((etapa, index) => ({
            ...etapa,
            orden: etapa.orden ?? index + 1, // Default orden si es null
            // color: etapa.color ?? null, // Si añades color
        }));

        return { success: true, data: { crmId: crm.id, etapas: etapasData } };
    } catch (error) {
        console.error(`Error en listarEtapasPipelineCrmAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar las etapas del pipeline.' };
    }
}

// Acción para CREAR una nueva Etapa de PipelineCRM
export async function crearEtapaPipelineCrmAction(
    params: z.infer<typeof crearEtapaPipelineCrmParamsSchema>
): Promise<ActionResult<PipelineCrmData | null>> {
    const validation = crearEtapaPipelineCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear la etapa.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, nombre, status /*, color*/ } = validation.data;

    try {
        const ultimaEtapa = await prisma.pipelineCRM.findFirst({
            where: { crmId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimaEtapa?.orden ?? 0) + 1;

        const nuevaEtapa = await prisma.pipelineCRM.create({
            data: {
                crmId,
                nombre,
                status: status || 'activo',
                orden: nuevoOrden,
                // color: color || null, // Si añades color
            },
        });
        // TODO: Revalidar path apropiado
        return { success: true, data: nuevaEtapa as PipelineCrmData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `La etapa '${nombre}' ya existe para este CRM.`, data: null };
        }
        return { success: false, error: 'No se pudo crear la etapa.', data: null };
    }
}

// Acción para EDITAR una Etapa de PipelineCRM existente
export async function editarEtapaPipelineCrmAction(
    params: z.infer<typeof editarEtapaPipelineCrmParamsSchema>
): Promise<ActionResult<PipelineCrmData | null>> {
    const validation = editarEtapaPipelineCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar la etapa.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { etapaId, datos } = validation.data;

    try {
        const etapaActualizada = await prisma.pipelineCRM.update({
            where: { id: etapaId },
            data: {
                nombre: datos.nombre,
                status: datos.status,
                // color: datos.color || null, // Si añades color
                updatedAt: new Date(),
            },
        });
        // TODO: Revalidar path
        return { success: true, data: etapaActualizada as PipelineCrmData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Etapa no encontrada.", data: null };
            if (error.code === 'P2002') return { success: false, error: `El nombre de etapa '${datos.nombre}' ya existe.`, data: null };
        }
        return { success: false, error: 'No se pudo actualizar la etapa.', data: null };
    }
}

// Acción para ELIMINAR una Etapa de PipelineCRM
export async function eliminarEtapaPipelineCrmAction(
    params: z.infer<typeof eliminarEtapaPipelineCrmParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarEtapaPipelineCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de etapa inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { etapaId } = validation.data;

    try {
        const leadsAsociados = await prisma.lead.count({ where: { pipelineId: etapaId } });
        if (leadsAsociados > 0) {
            return { success: false, error: `No se puede eliminar la etapa porque tiene ${leadsAsociados} lead(s) asociado(s). Mueve esos leads primero.` };
        }
        const etapaEliminada = await prisma.pipelineCRM.delete({ where: { id: etapaId }, select: { id: true } });
        // TODO: Revalidar path
        return { success: true, data: { id: etapaEliminada.id } };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Etapa no encontrada." };
        }
        return { success: false, error: 'No se pudo eliminar la etapa.' };
    }
}

// Acción para REORDENAR Etapas de PipelineCRM
export async function reordenarEtapasPipelineCrmAction(
    params: z.infer<typeof reordenarEtapasPipelineCrmParamsSchema>
): Promise<ActionResult<null>> {
    const validation = reordenarEtapasPipelineCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para reordenar etapas.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { crmId, etapasOrdenadas } = validation.data;

    if (etapasOrdenadas.length === 0) return { success: true, data: null };

    try {
        await prisma.$transaction(
            etapasOrdenadas.map((et) =>
                prisma.pipelineCRM.update({
                    where: { id: et.id, crmId: crmId },
                    data: { orden: et.orden },
                })
            )
        );
        // TODO: Revalidar path
        return { success: true, data: null };
    } catch (error) {
        console.error(`Error al reordenar etapas para CRM ${crmId}:`, error);
        return { success: false, error: 'No se pudo actualizar el orden de las etapas.' };
    }
}





export async function obtenerDatosPipelineKanbanAction(
    params: z.infer<typeof obtenerDatosPipelineKanbanParamsSchema>
): Promise<ActionResult<KanbanBoardData>> {

    const validation = obtenerDatosPipelineKanbanParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: false, error: "CRM no encontrado para este negocio." };
        }

        const pipelines = await prisma.pipelineCRM.findMany({
            where: { crmId: crm.id, status: 'activo' },
            orderBy: { orden: 'asc' },
            include: {
                Lead: {
                    orderBy: { updatedAt: 'desc' },
                    select: {
                        id: true, nombre: true, createdAt: true, updatedAt: true, valorEstimado: true, jsonParams: true,
                        agente: { select: { id: true, nombre: true } },
                        Etiquetas: { select: { etiqueta: { select: { id: true, nombre: true, color: true } } } },
                        Agenda: {
                            where: { status: 'PENDIENTE' },
                            orderBy: { fecha: 'asc' },
                            take: 1,
                            select: { fecha: true }
                        }
                    }
                }
            }
        });

        const kanbanData: KanbanBoardData = {
            columns: pipelines.map(pipeline => {
                const leadsConCita = pipeline.Lead.map(lead => ({
                    ...lead,
                    Etiquetas: lead.Etiquetas.map(e => e.etiqueta),
                    fechaProximaCita: lead.Agenda[0]?.fecha || null,
                    pipelineId: pipeline.id, // Añadido para cumplir con el tipo
                }));

                // Ordena los leads por la fecha de la próxima cita
                leadsConCita.sort((a, b) => {
                    if (a.fechaProximaCita && b.fechaProximaCita) {
                        return new Date(a.fechaProximaCita).getTime() - new Date(b.fechaProximaCita).getTime();
                    }
                    if (a.fechaProximaCita) return -1;
                    if (b.fechaProximaCita) return 1;
                    return 0;
                });

                return {
                    id: pipeline.id,
                    nombre: pipeline.nombre,
                    leads: leadsConCita,
                };
            }),
        };

        return { success: true, data: kanbanData };
    } catch (error) {
        console.error("Error en obtenerDatosPipelineKanbanAction:", error);
        return { success: false, error: "No se pudieron cargar los datos del pipeline." };
    }
}

/**
 * Actualiza la etapa (pipeline) de un lead.
 */
import { registrarEnBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';

export async function actualizarEtapaLeadEnPipelineAction(
    params: z.infer<typeof actualizarEtapaLeadParamsSchema>
): Promise<ActionResult<{ success: boolean }>> {
    const validation = actualizarEtapaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    const { leadId, nuevoPipelineId, negocioId, clienteId } = validation.data;

    try {
        // 1. Obtenemos el CRM del negocio para usar su ID en las verificaciones.
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true },
        });

        if (!crm) {
            throw new Error("El CRM para este negocio no fue encontrado.");
        }

        // 2. Verificamos que la etapa de destino exista Y pertenezca al CRM correcto.
        const pipelineDestino = await prisma.pipelineCRM.findFirst({
            where: {
                id: nuevoPipelineId,
                crmId: crm.id, // <-- Verificación de seguridad
            },
            select: { nombre: true },
        });

        if (!pipelineDestino) {
            throw new Error("La etapa de destino no existe o no pertenece a este negocio.");
        }

        // 3. Actualizamos el lead, asegurándonos de que también pertenezca al CRM correcto.
        const updateResult = await prisma.lead.updateMany({
            where: {
                id: leadId,
                crmId: crm.id, // <-- Verificación de seguridad
            },
            data: {
                pipelineId: nuevoPipelineId,
                status: pipelineDestino.nombre.toLowerCase(), // Usamos el nombre de la etapa como status
            },
        });

        // Si no se actualizó ninguna fila, significa que el lead no fue encontrado o no pertenece al CRM.
        if (updateResult.count === 0) {
            throw new Error("El lead no pudo ser actualizado. Es posible que no pertenezca a este negocio.");
        }

        // 4. Registramos la acción en la bitácora.
        await registrarEnBitacora({
            leadId,
            tipoAccion: 'actualizar_etapa',
            descripcion: `El lead ha sido movido a la etapa '${pipelineDestino.nombre}'.`,
            agenteId: null,
            metadata: {
                nuevoPipelineId,
                negocioId,
                clienteId,
            } as Prisma.JsonObject
        });

        // 5. Corregimos la revalidación de la ruta para usar correctamente las variables.
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/kanban`);

        return { success: true, data: { success: true } };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo mover el lead.";
        console.error(`Error al actualizar etapa para lead ${leadId}:`, errorMessage);
        return { success: false, error: errorMessage };
    }
}