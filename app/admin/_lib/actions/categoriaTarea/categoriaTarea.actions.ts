// En: app/admin/_lib/actions/categoriaTarea/categoriaTarea.actions.ts
'use server';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Importar Prisma para manejar errores específicos
import {
    CategoriaTareaInputSchema,
    type CategoriaTareaInput,
    OrdenarCategoriasInputSchema,
    type CategoriaConOrden,
    type CategoriaTareaData,
    categoriaTareaDataSchema,

} from './categoriaTarea.schemas';
export async function obtenerCategoriasAction(): Promise<ActionResult<CategoriaTareaData[]>> {
    try {
        const categoriasPrisma = await prisma.categoriaTarea.findMany({
            orderBy: { orden: 'asc' },
            select: { id: true, nombre: true, descripcion: true, orden: true, color: true }
        });

        const validation = z.array(categoriaTareaDataSchema).safeParse(categoriasPrisma);
        if (!validation.success) {
            console.error("Error de validación Zod en obtenerCategoriasAction:", validation.error.flatten());
            return { success: false, error: "Datos de categorías con formato inesperado." };
        }
        return { success: true, data: validation.data };
    } catch (error) {
        console.error('Error en obtenerCategoriasAction:', error);
        return { success: false, error: "No se pudieron obtener las categorías." };
    }
}


// Usaremos el tipo generado por Prisma para las entidades devueltas directamente
import type { CategoriaTarea as CategoriaTareaPrisma } from '@prisma/client';

// --- Obtener Todas las Categorías de Tareas (Ordenadas y con conteo de Tareas) ---
export async function obtenerCategorias(): Promise<ActionResult<CategoriaConOrden[]>> {
    try {
        const categoriasDb = await prisma.categoriaTarea.findMany({
            orderBy: { orden: 'asc' },
            include: {
                _count: {
                    select: { Tarea: true }, // Tarea es el nombre de la relación en CategoriaTarea hacia Tarea
                },
            },
        });

        const data: CategoriaConOrden[] = categoriasDb.map((cat, index) => ({
            id: cat.id,
            nombre: cat.nombre,
            descripcion: cat.descripcion ?? null,
            orden: cat.orden ?? index, // Fallback para orden
            color: cat.color ?? null,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt,
            _count: {
                Tarea: cat._count?.Tarea ?? 0,
            },
        }));

        return { success: true, data: data };
    } catch (error: unknown) {
        console.error('Error al obtener todas las categorías:', error);
        return { success: false, error: 'No se pudieron obtener las categorías.' };
    }
}

// --- Crear una Nueva Categoría de Tarea ---
export async function crearCategoria(
    input: CategoriaTareaInput
): Promise<ActionResult<CategoriaTareaPrisma>> {
    const validationResult = CategoriaTareaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([key]) => isNaN(Number(key))) // keep only string keys
                    .map(([key, value]) => [key, value ?? []])
            ) as Record<string, string[]>,
        };
    }
    const { nombre, descripcion, color } = validationResult.data;

    try {
        const ultimoRegistro = await prisma.categoriaTarea.findFirst({
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoRegistro?.orden ?? -1) + 1;

        const nuevaCategoria = await prisma.categoriaTarea.create({
            data: {
                nombre: nombre,
                descripcion: descripcion,
                color: color,
                orden: nuevoOrden,
            },
        });
        revalidatePath('/admin/tareas/categorias'); // Ajusta la ruta según necesidad
        return { success: true, data: nuevaCategoria };
    } catch (error: unknown) {
        console.error("Error al crear categoría:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `La categoría '${nombre}' ya existe.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al crear la categoría.") };
    }
}

// --- Actualizar una Categoría de Tarea Existente ---
export async function actualizarCategoria(
    id: string,
    input: CategoriaTareaInput
): Promise<ActionResult<CategoriaTareaPrisma>> {
    if (!id) {
        return { success: false, error: "ID de categoría no proporcionado." };
    }
    const validationResult = CategoriaTareaInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([key]) => isNaN(Number(key))) // keep only string keys
                    .map(([key, value]) => [key, value ?? []])
            ) as Record<string, string[]>,
        };
    }
    const dataToUpdate = validationResult.data;

    try {
        const categoriaActualizada = await prisma.categoriaTarea.update({
            where: { id },
            data: dataToUpdate,
        });
        revalidatePath('/admin/tareas/categorias');
        return { success: true, data: categoriaActualizada };
    } catch (error: unknown) {
        console.error(`Error al actualizar categoría ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, error: `La categoría '${dataToUpdate.nombre}' ya existe.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: `Categoría con ID ${id} no encontrada.` };
            }
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al actualizar la categoría.") };
    }
}

// --- Eliminar una Categoría de Tarea ---
export async function eliminarCategoria(id: string): Promise<ActionResult<null>> {
    try {
        if (!id) {
            return { success: false, error: "ID de categoría no proporcionado." };
        }
        const tareasAsociadasCount = await prisma.tarea.count({
            where: { categoriaTareaId: id }
        });

        if (tareasAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: Usada por ${tareasAsociadasCount} tarea(s).` };
        }
        await prisma.categoriaTarea.delete({ where: { id } });
        revalidatePath('/admin/tareas/categorias');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error(`Error al eliminar la categoría ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Categoría con ID ${id} no encontrada.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : 'Error desconocido al eliminar la categoría.') };
    }
}

// --- Actualizar el Orden de las Categorías de Tarea ---
export async function actualizarOrdenCategorias(
    input: unknown // Validado con Zod
): Promise<ActionResult<null>> {
    const validationResult = OrdenarCategoriasInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos para ordenar.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([key]) => isNaN(Number(key))) // keep only string keys
                    .map(([key, value]) => [key, value ?? []])
            ) as Record<string, string[]>,
        };
    }
    const items = validationResult.data;

    if (!items || items.length === 0) {
        return { success: true, data: null };
    }
    try {
        const updatePromises = items.map(item =>
            prisma.categoriaTarea.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        revalidatePath('/admin/tareas/categorias');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error('Error al actualizar el orden de las categorías:', error);
        return { success: false, error: (error instanceof Error ? error.message : "Error al actualizar el orden.") };
    }
}