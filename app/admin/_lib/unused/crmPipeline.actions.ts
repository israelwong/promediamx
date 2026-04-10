'use server';
import prisma from '../prismaClient'; // Ajusta ruta
import { PipelineCRM } from '../types'; // Ajusta ruta
import { Prisma } from '@prisma/client';
import { PipelineColumnData, LeadCardData, ObtenerKanbanResult, ActualizarEtapaLeadResult, ActionResult } from '../types'; // Ajusta ruta a tus tipos



// --- Tipo de Retorno para obtenerEtapasPipelineCRM ---
interface ObtenerEtapasResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        etapas: PipelineCRM[];
    } | null;
    error?: string;
}

/**
 * Obtiene el ID del CRM asociado a un negocio y todas sus etapas de pipeline.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y la lista de etapas.
 */
export async function obtenerEtapasPipelineCRM(negocioId: string): Promise<ObtenerEtapasResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        // Obtener el crmId y las etapas en una consulta
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true, // ID del CRM
                        Pipeline: { // Etapas asociadas al CRM
                            orderBy: { orden: 'asc' }, // Ordenar por 'orden'
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;
        const etapas = (negocioConCRM?.CRM?.Pipeline ?? []) as PipelineCRM[];

        return {
            success: true,
            data: {
                crmId: crmId,
                etapas: etapas
            }
        };

    } catch (error) {
        console.error(`Error fetching pipeline stages for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener las etapas del pipeline.' };
    }
}

/**
 * Crea una nueva etapa de pipeline para un CRM específico.
 * @param data - Datos de la etapa a crear (crmId, nombre).
 * @returns Objeto con el resultado de la operación y la etapa creada si tuvo éxito.
 */
export async function crearPipelineCRM(
    data: Pick<PipelineCRM, 'crmId' | 'nombre'>
): Promise<{ success: boolean; data?: PipelineCRM; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim()) {
            return { success: false, error: "crmId y nombre son requeridos." };
        }
        // Calcular el siguiente orden
        const ultimoOrden = await prisma.pipelineCRM.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        // Crear etapa
        const newPipeline = await prisma.pipelineCRM.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                orden: nuevoOrden,
                status: 'activo', // Status por defecto
            },
        });
        return { success: true, data: newPipeline as PipelineCRM };
    } catch (error) {
        console.error('Error creating pipeline stage:', error);
        // Manejar error de unicidad (asume índice unique(crmId, nombre))
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etapa '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear etapa." };
    }
}

/**
 * Edita una etapa de pipeline existente (nombre y status).
 * @param id - ID de la etapa a editar.
 * @param data - Datos a actualizar (nombre, status).
 * @returns Objeto con el resultado de la operación y la etapa actualizada si tuvo éxito.
 */
export async function editarPipelineCRM(
    id: string,
    data: Partial<Pick<PipelineCRM, 'nombre' | 'status'>>
): Promise<{ success: boolean; data?: PipelineCRM; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etapa no proporcionado." };

        const dataToUpdate: Prisma.PipelineCRMUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        // Actualizar etapa
        const updatedPipeline = await prisma.pipelineCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedPipeline as PipelineCRM };
    } catch (error) {
        console.error(`Error updating pipeline stage ${id}:`, error);
        // Manejar error de unicidad si se edita el nombre
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if (Array.isArray(error.meta?.target) && (error.meta.target as string[]).includes('nombre')) {
                return { success: false, error: `El nombre de etapa '${data.nombre}' ya existe para este CRM.` };
            }
            return { success: false, error: `Ya existe una etapa con un nombre similar.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar etapa." };
    }
}

/**
 * Elimina una etapa de pipeline por su ID.
 * @param id - ID de la etapa a eliminar.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function eliminarPipelineCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etapa no proporcionado." };

        // Asumiendo onDelete: SetNull en Lead.pipelineId
        await prisma.pipelineCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting pipeline stage ${id}:`, error);
        // Manejar error si hay Leads asociados y la FK no permite SetNull
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar la etapa porque tiene Leads asociados." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar etapa." };
    }
}

/**
 * Actualiza el orden de múltiples etapas de pipeline.
 * @param items - Array de objetos con id y nuevo orden para cada etapa.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function ordenarPipelineCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || !Array.isArray(items)) {
        return { success: false, error: "Datos de ordenamiento inválidos." };
    }
    if (items.length === 0) {
        return { success: true }; // Nada que ordenar
    }
    try {
        const updatePromises = items.map(item => {
            if (!item.id || typeof item.orden !== 'number') {
                throw new Error(`Item de ordenamiento inválido: ${JSON.stringify(item)}`);
            }
            return prisma.pipelineCRM.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        });
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating pipeline order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar etapas." };
    }
}


/**
 * Obtiene los datos necesarios para renderizar el tablero Kanban del Pipeline.
 * Incluye las etapas ordenadas y los leads asociados a cada etapa.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con los datos del tablero o un error.
 */
export async function obtenerDatosPipelineKanban(negocioId: string): Promise<ObtenerKanbanResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        // 1. Encontrar el CRM asociado al negocio
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true, // Necesitamos el crmId
                        // 2. Obtener las etapas del pipeline ordenadas
                        Pipeline: {
                            orderBy: { orden: 'asc' },
                            select: {
                                id: true,
                                nombre: true,
                                orden: true,
                                // 3. Obtener los Leads asociados a cada etapa
                                Lead: {
                                    orderBy: { updatedAt: 'desc' }, // Ordenar leads (ej. por última actualización)
                                    select: {
                                        // Campos necesarios para LeadCardData
                                        id: true,
                                        nombre: true,
                                        createdAt: true,
                                        updatedAt: true,
                                        pipelineId: true,
                                        valorEstimado: true, // Ejemplo de campo extra
                                        // Opcional: Datos del agente asignado
                                        agente: {
                                            select: { id: true, nombre: true }
                                        },
                                        // Opcional: Etiquetas asociadas
                                        Etiquetas: {
                                            select: {
                                                etiqueta: {
                                                    select: { id: true, nombre: true, color: true }
                                                }
                                            }
                                        }
                                        // Añade más campos si los necesitas en la tarjeta
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        if (!negocioConCRM?.CRM) {
            // Es válido que no haya CRM, devolvemos éxito pero con crmId null
            return { success: true, data: { crmId: null, columns: [] } };
        }

        const crmId = negocioConCRM.CRM.id;
        // Mapear los datos al formato KanbanBoardData
        const columns: PipelineColumnData[] = negocioConCRM.CRM.Pipeline.map(etapa => ({
            id: etapa.id,
            nombre: etapa.nombre,
            orden: etapa.orden ?? 0, // Asegurar que orden tenga un valor
            // Mapear los leads de la etapa
            leads: etapa.Lead.map(lead => ({
                id: lead.id,
                nombre: lead.nombre,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                pipelineId: lead.pipelineId,
                valorEstimado: lead.valorEstimado,
                agente: lead.agente,
                // Mapear etiquetas correctamente
                Etiquetas: lead.Etiquetas.map(le => ({ etiqueta: le.etiqueta }))
            })) as LeadCardData[] // Asegurar el tipo
        }));

        return {
            success: true,
            data: {
                crmId: crmId,
                columns: columns
            }
        };

    } catch (error) {
        console.error(`Error fetching kanban data for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los datos del pipeline.' };
    }
}

/**
 * Actualiza la etapa (pipelineId) de un Lead específico.
 * @param leadId - El ID del Lead a actualizar.
 * @param nuevoPipelineId - El ID de la nueva etapa del pipeline a la que mover el Lead.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function actualizarEtapaLead(
    leadId: string,
    nuevoPipelineId: string | null // Permitir null si se saca del pipeline? (Considerar)
): Promise<ActualizarEtapaLeadResult> {
    if (!leadId) {
        return { success: false, error: "ID de Lead no proporcionado." };
    }
    // Podrías añadir validación para nuevoPipelineId si es necesario

    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                pipelineId: nuevoPipelineId,
                // Opcional: Actualizar updatedAt para reflejar el cambio
                updatedAt: new Date()
            },
        });
        return { success: true };
    } catch (error) {
        console.error(`Error updating pipeline stage for lead ${leadId}:`, error);
        // Manejar error P2025 (Registro no encontrado)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `El Lead con ID ${leadId} no fue encontrado.` };
        }
        return { success: false, error: 'No se pudo actualizar la etapa del Lead.' };
    }
}


// Tipo simple para el dropdown
interface PipelineSimple {
    id: string;
    nombre: string;
}

export async function obtenerPipelinesCrmAction(negocioId: string): Promise<ActionResult<PipelineSimple[]>> {
    if (!negocioId) return { success: false, error: "ID de negocio requerido." };
    try {
        // Buscar el CRM asociado al negocio
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });

        // Si no hay CRM, devolver lista vacía
        if (!crm) return { success: true, data: [] };

        // Obtener pipelines activos de ese CRM
        const pipelines = await prisma.pipelineCRM.findMany({
            where: {
                crmId: crm.id,
                status: 'activo' // Solo mostrar pipelines activos en el filtro
            },
            select: { id: true, nombre: true },
            orderBy: { orden: 'asc' } // Ordenar por el campo 'orden'
        });

        return { success: true, data: pipelines };
    } catch (error) {
        console.error("Error obteniendo pipelines:", error);
        return { success: false, error: "Error al obtener etapas del pipeline." };
    }
}
