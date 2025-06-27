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
    actualizarEtapaLeadEnPipelineParamsSchema,
    PipelineSimple
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





// --- REFACTORIZACIÓN de obtenerDatosPipelineKanban ---
export async function obtenerDatosPipelineKanbanAction(
    params: z.infer<typeof obtenerDatosPipelineKanbanParamsSchema>
): Promise<ActionResult<KanbanBoardData | null>> {
    const validation = obtenerDatosPipelineKanbanParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { negocioId } = validation.data;

    try {
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true, // crmId
                        Pipeline: { // Etapas del pipeline
                            where: { status: 'activo' }, // Solo etapas activas
                            orderBy: { orden: 'asc' },
                            select: {
                                id: true,
                                nombre: true,
                                orden: true,
                                // color: true, // Si tus etapas tienen color
                                Lead: { // Leads asociados a esta etapa
                                    where: {
                                        // Podrías añadir filtros adicionales para los leads si es necesario
                                        // ej. status del lead !='perdido' o !='descartado'
                                    },
                                    orderBy: { updatedAt: 'desc' }, // O por un campo 'ordenEnEtapa' si lo tuvieras
                                    select: {
                                        id: true,
                                        nombre: true,
                                        createdAt: true,
                                        updatedAt: true,
                                        pipelineId: true,
                                        valorEstimado: true,
                                        agente: { select: { id: true, nombre: true } },
                                        Etiquetas: {
                                            select: { etiqueta: { select: { id: true, nombre: true, color: true } } },
                                            take: 3 // Limitar número de etiquetas para la tarjeta
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!negocioConCRM?.CRM) {
            return { success: true, data: { crmId: null, columns: [] } }; // CRM no existe o no está configurado
        }

        const crmId = negocioConCRM.CRM.id;
        const columnsData: KanbanBoardData['columns'] = negocioConCRM.CRM.Pipeline.map(etapa => ({
            id: etapa.id,
            nombre: etapa.nombre,
            orden: etapa.orden ?? 0, // Asegurar que orden tenga un valor
            // color: etapa.color ?? null, // Si aplica
            leads: etapa.Lead.map(lead => ({
                id: lead.id,
                nombre: lead.nombre,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                pipelineId: lead.pipelineId,
                valorEstimado: lead.valorEstimado,
                agente: lead.agente ? { id: lead.agente.id, nombre: lead.agente.nombre ?? null } : null,
                Etiquetas: lead.Etiquetas.map(le => ({ etiqueta: { id: le.etiqueta.id, nombre: le.etiqueta.nombre, color: le.etiqueta.color ?? null } })),
            })),
        }));

        // Opcional: Validar con Zod antes de devolver
        // const parseResult = kanbanBoardDataSchema.safeParse({ crmId, columns: columnsData });
        // if (!parseResult.success) { /* ... manejo de error ... */ }
        // return { success: true, data: parseResult.data };

        return { success: true, data: { crmId, columns: columnsData } };

    } catch (error) {
        console.error(`Error en obtenerDatosPipelineKanbanAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los datos del pipeline.', data: null };
    }
}


// --- REFACTORIZACIÓN de actualizarEtapaLead ---
export async function actualizarEtapaLeadEnPipelineAction(
    params: z.infer<typeof actualizarEtapaLeadEnPipelineParamsSchema>
): Promise<ActionResult<{ leadId: string; nuevoPipelineId: string } | null>> {
    const validation = actualizarEtapaLeadEnPipelineParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para actualizar." };
    }
    // CORRECCIÓN: Obtenemos los nuevos IDs
    const { leadId, nuevoPipelineId, clienteId, negocioId } = validation.data;

    try {
        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                pipelineId: nuevoPipelineId,
                updatedAt: new Date(),
            },
            select: { id: true, pipelineId: true }
        });

        // CORRECCIÓN: Invalidamos el caché de la página de leads
        const path = `/admin/clientes/${clienteId}/negocios/${negocioId}/leads`;
        revalidatePath(path);
        console.log(`Ruta revalidada: ${path}`);

        return { success: true, data: { leadId: updatedLead.id, nuevoPipelineId: updatedLead.pipelineId! } };
    } catch (error) {
        console.error(`Error al actualizar etapa para lead ${leadId}:`, error);
        return { success: false, error: 'No se pudo actualizar la etapa del Lead.' };
    }
}

// export async function obtenerPipelinesCrmAction(negocioId: string): Promise<ActionResult<PipelineSimple[]>> {
//     if (!negocioId) return { success: false, error: "ID de negocio requerido." };
//     try {
//         // Buscar el CRM asociado al negocio
//         const crm = await prisma.cRM.findUnique({
//             where: { negocioId: negocioId },
//             select: { id: true }
//         });

//         // Si no hay CRM, devolver lista vacía
//         if (!crm) return { success: true, data: [] };

//         // Obtener pipelines activos de ese CRM
//         const pipelines = await prisma.pipelineCRM.findMany({
//             where: {
//                 crmId: crm.id,
//                 status: 'activo' // Solo mostrar pipelines activos en el filtro
//             },
//             select: { id: true, nombre: true },
//             orderBy: { orden: 'asc' } // Ordenar por el campo 'orden'
//         });

//         return { success: true, data: pipelines };
//     } catch (error) {
//         console.error("Error obteniendo pipelines:", error);
//         return { success: false, error: "Error al obtener etapas del pipeline." };
//     }
// }



export async function obtenerPipelinesCrmAction(negocioId: string): Promise<ActionResult<PipelineSimple[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio requerido." };
    }
    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: true, data: [] };
        }

        const pipelines = await prisma.pipelineCRM.findMany({
            where: {
                crmId: crm.id,
                status: 'activo'
            },
            select: { id: true, nombre: true },
            orderBy: { orden: 'asc' }
        });

        return { success: true, data: pipelines };
    } catch (error) {
        console.error("Error obteniendo pipelines:", error);
        return { success: false, error: "Error al obtener etapas del pipeline." };
    }
}
// La función revalidatePath ya está importada de 'next/cache' y puede usarse directamente.
