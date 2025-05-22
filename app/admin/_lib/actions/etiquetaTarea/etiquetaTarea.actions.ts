'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta ruta
import { revalidatePath } from 'next/cache';

// Importar ActionResult global y tipos/schemas Zod
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    EtiquetaTareaInputSchema,
    type EtiquetaTareaInput,
    OrdenarEtiquetasInputSchema,
    type EtiquetaConOrden // Usaremos este para el tipo de retorno de obtenerEtiquetasTarea
} from './etiquetaTarea.schemas';

// Tipo base de Prisma, si lo necesitas directamente.
import type { EtiquetaTarea as EtiquetaTareaPrisma } from '@prisma/client';


// --- Obtener Etiquetas de Tarea (Ordenadas y con conteo de tareas) ---
export async function obtenerEtiquetasTarea(): Promise<ActionResult<EtiquetaConOrden[]>> {
    try {
        const etiquetasConTareas = await prisma.etiquetaTarea.findMany({
            orderBy: { orden: 'asc' },
            include: {
                _count: { // Incluir el conteo de tareas asociadas
                    select: { tareas: true }, // 'tareas' es el nombre de la relación en TareaEtiqueta hacia EtiquetaTarea
                },
            },
        });

        // Mapear para asegurar que 'orden' no sea null y que la estructura coincida
        const data: EtiquetaConOrden[] = etiquetasConTareas.map((et, index) => ({
            id: et.id,
            nombre: et.nombre,
            descripcion: et.descripcion ?? null,
            orden: et.orden ?? index, // Fallback para orden si es null
            createdAt: et.createdAt,
            updatedAt: et.updatedAt,
            _count: {
                tareas: et._count?.tareas ?? 0,
            },
        }));

        return { success: true, data: data };
    } catch (error: unknown) {
        console.error('Error al obtener las etiquetas de tarea:', error);
        return { success: false, error: 'No se pudieron obtener las etiquetas de tarea.' };
    }
}

// --- Crear Etiqueta de Tarea ---
export async function crearEtiquetaTarea(
    input: EtiquetaTareaInput
): Promise<ActionResult<EtiquetaTareaPrisma>> {
    const validationResult = EtiquetaTareaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([v]) => Array.isArray(v))
                    .map(([k, v]) => [k, v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const { nombre, descripcion } = validationResult.data;

    try {
        const ultimoOrden = await prisma.etiquetaTarea.findFirst({
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoOrden?.orden ?? -1) + 1; // Inicia en 0 si no hay ninguna

        const nuevaEtiqueta = await prisma.etiquetaTarea.create({
            data: {
                nombre: nombre,
                descripcion: descripcion,
                orden: nuevoOrden,
            },
        });
        revalidatePath('/admin/tareas/etiquetas'); // Ajusta la ruta si es necesario
        return { success: true, data: nuevaEtiqueta };
    } catch (error: unknown) {
        console.error('Error al crear la etiqueta de tarea:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${nombre}' ya existe.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al crear etiqueta.") };
    }
}

// --- Editar Etiqueta de Tarea ---
export async function editarEtiquetaTarea(
    id: string,
    input: EtiquetaTareaInput
): Promise<ActionResult<EtiquetaTareaPrisma>> {
    if (!id) {
        return { success: false, error: "ID de etiqueta no proporcionado." };
    }
    const validationResult = EtiquetaTareaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([k, v]) => typeof k === 'string' && Array.isArray(v))
                    .map(([k, v]) => [k, v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const dataToUpdate = validationResult.data;

    try {
        const etiquetaActualizada = await prisma.etiquetaTarea.update({
            where: { id },
            data: dataToUpdate, // Zod schema ya se encarga de que solo lleguen los campos correctos
        });
        revalidatePath('/admin/tareas/etiquetas');
        return { success: true, data: etiquetaActualizada };
    } catch (error: unknown) {
        console.error(`Error al actualizar la etiqueta de tarea ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, error: `El nombre de etiqueta '${dataToUpdate.nombre}' ya existe.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: `Etiqueta con ID ${id} no encontrada.` };
            }
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al actualizar etiqueta.") };
    }
}

// --- Eliminar Etiqueta de Tarea ---
export async function eliminarEtiquetaTarea(id: string): Promise<ActionResult<null>> {
    try {
        if (!id) {
            return { success: false, error: "ID de etiqueta no proporcionado." };
        }
        const tareasAsociadasCount = await prisma.tareaEtiqueta.count({
            where: { etiquetaTareaId: id },
        });
        if (tareasAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: Usada por ${tareasAsociadasCount} tarea(s).` };
        }
        await prisma.etiquetaTarea.delete({ where: { id } });
        revalidatePath('/admin/tareas/etiquetas');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error(`Error al eliminar la etiqueta de tarea ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Etiqueta con ID ${id} no encontrada.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : 'Error desconocido al eliminar etiqueta.') };
    }
}

// --- Actualizar Orden de Etiquetas de Tarea ---
export async function ordenarEtiquetasTarea(
    input: unknown // Validado con Zod
): Promise<ActionResult<null>> {
    const validationResult = OrdenarEtiquetasInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos para ordenar.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([k]) => typeof k === 'string')
                    .map(([k, v]) => [k, v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const items = validationResult.data;

    if (!items || items.length === 0) {
        return { success: true, data: null };
    }
    try {
        const updatePromises = items.map(item =>
            prisma.etiquetaTarea.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        revalidatePath('/admin/tareas/etiquetas');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error('Error al actualizar el orden de las etiquetas de tarea:', error);
        return { success: false, error: (error instanceof Error ? error.message : "Error al actualizar el orden.") };
    }
}