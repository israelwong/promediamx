'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { PipelineCRM } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener TODAS las etapas del pipeline para un CRM, ordenadas ---
export async function obtenerEtapasPipelineCRM(crmId: string): Promise<PipelineCRM[]> {
    if (!crmId) return [];
    try {
        const etapas = await prisma.pipelineCRM.findMany({
            where: { crmId: crmId },
            orderBy: { orden: 'asc' }, // Ordenar por el campo 'orden'
        });
        // Asegurar que el tipo devuelto coincida con PipelineCRM
        return etapas as PipelineCRM[];
    } catch (error) {
        console.error(`Error fetching pipeline stages for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener las etapas del pipeline.');
    }
}

// --- Crear una nueva etapa (asignar orden al final) ---
export async function crearPipelineCRM(
    data: Pick<PipelineCRM, 'crmId' | 'nombre'> // Solo necesitamos crmId y nombre para crear
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etapa '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear etapa." };
    }
}

// --- Editar una etapa (solo nombre y status quizás?) ---
export async function editarPipelineCRM(
    id: string,
    data: Partial<Pick<PipelineCRM, 'nombre' | 'status'>> // Permitir editar nombre y status
): Promise<{ success: boolean; data?: PipelineCRM; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etapa no proporcionado." };

        const dataToUpdate: Prisma.PipelineCRMUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        const updatedPipeline = await prisma.pipelineCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedPipeline as PipelineCRM };
    } catch (error) {
        console.error(`Error updating pipeline stage ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etapa '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar etapa." };
    }
}

// --- Eliminar una etapa (Considerar qué pasa con los Leads) ---
export async function eliminarPipelineCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etapa no proporcionado." };

        // **IMPORTANTE**: ¿Qué hacer con los Leads en esta etapa?
        // Opción 1: Poner pipelineId a null (requiere que sea opcional en Lead)
        // await prisma.lead.updateMany({ where: { pipelineId: id }, data: { pipelineId: null } });
        // Opción 2: Impedir borrado si hay leads (Prisma podría fallar por restricción FK si no hay onDelete)
        // Opción 3: Mover leads a otra etapa (ej: 'perdido' o 'nuevo') - Más complejo

        // Asumiendo Opción 1 o que no hay restricción fuerte:
        await prisma.pipelineCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting pipeline stage ${id}:`, error);
        // Manejar error si hay leads asociados y no se pueden desvincular/borrar (ej: P2014 o P2003)
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar la etapa porque tiene Leads asociados." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar etapa." };
    }
}

// --- Ordenar Etapas (Función parece correcta) ---
export async function ordenarPipelineCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) {
        return { success: true }; // No hay nada que ordenar
    }
    try {
        // Usar transacción para actualizar todo o nada
        const updatePromises = items.map(item =>
            prisma.pipelineCRM.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating pipeline order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar etapas." };
    }
}

// --- Tipo PipelineCRM (Asegúrate que coincida con tu schema) ---
/*
export interface PipelineCRM {
    id: string;
    crmId: string;
    crm?: CRM | null;
    orden?: number | null;
    nombre: string;
    status: string; // Asegúrate que este campo exista y sea manejado
    createdAt: Date;
    updatedAt: Date;
    Lead?: Lead[];
}
*/