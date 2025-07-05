'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import {
    CreateConocimientoItemInputSchema,
    UpdateConocimientoItemInputSchema,
    ConocimientoItemParaEditarSchema
} from './conocimiento.schemas';
import type {
    CreateConocimientoItemInputType,
    UpdateConocimientoItemInputType,
    ConocimientoItemParaEditarType
} from './conocimiento.schemas';

import { z } from 'zod';

/**
 * Obtiene todos los ítems de conocimiento para un negocio específico.
 */
export async function getConocimientoItemsByNegocio(negocioId: string): Promise<ActionResult<ConocimientoItemParaEditarType[]>> {
    try {
        const items = await prisma.negocioConocimientoItem.findMany({
            where: { negocioId },
            // --- CAMPOS ACTUALIZADOS ---
            select: {
                id: true,
                preguntaFormulada: true,
                respuesta: true,
                categoria: true,
                estado: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        const validation = z.array(ConocimientoItemParaEditarSchema).safeParse(items);
        if (!validation.success) {
            console.error("Error Zod en getConocimientoItemsByNegocio:", validation.error);
            return { success: false, error: "Los datos son inconsistentes." };
        }
        return { success: true, data: validation.data };

    } catch {
        return { success: false, error: "No se pudieron cargar los ítems de conocimiento." };
    }
}

/**
 * Obtiene un único ítem de conocimiento por su ID para edición.
 */
export async function getConocimientoItemById(itemId: string): Promise<ActionResult<ConocimientoItemParaEditarType>> {
    try {
        const item = await prisma.negocioConocimientoItem.findUnique({
            where: { id: itemId },
        });
        if (!item) return { success: false, error: "Ítem no encontrado." };

        const validation = ConocimientoItemParaEditarSchema.safeParse(item);
        if (!validation.success) {
            return { success: false, error: "Los datos del ítem son inconsistentes." };
        }

        return { success: true, data: validation.data };
    } catch {
        return { success: false, error: "Error al cargar el ítem." };
    }
}

/**
 * Crea un nuevo ítem en la base de conocimiento.
 */
export async function createConocimientoItem(input: CreateConocimientoItemInputType): Promise<ActionResult<ConocimientoItemParaEditarType>> {
    const validation = CreateConocimientoItemInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    try {
        const newItem = await prisma.negocioConocimientoItem.create({
            data: validation.data
        });
        revalidatePath(`/admin/`);
        // Ensure respuesta is never null
        return {
            success: true,
            data: {
                ...newItem,
                respuesta: newItem.respuesta ?? "",
                estado: newItem.estado as "PENDIENTE_RESPUESTA" | "RESPONDIDA" | "EN_REVISION" | "OBSOLETA" | "ARCHIVADA"
            }
        };
    } catch {
        return { success: false, error: "No se pudo crear el nuevo ítem." };
    }
}

/**
 * Actualiza un ítem de conocimiento existente.
 */
export async function updateConocimientoItem(itemId: string, input: UpdateConocimientoItemInputType): Promise<ActionResult<ConocimientoItemParaEditarType>> {
    const validation = UpdateConocimientoItemInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    try {
        const updatedItem = await prisma.negocioConocimientoItem.update({
            where: { id: itemId },
            data: validation.data
        });
        revalidatePath(`/admin/`);
        return {
            success: true,
            data: {
                ...updatedItem,
                respuesta: updatedItem.respuesta ?? "",
                estado: updatedItem.estado as "PENDIENTE_RESPUESTA" | "RESPONDIDA" | "EN_REVISION" | "OBSOLETA" | "ARCHIVADA"
            }
        };
    } catch {
        return { success: false, error: "No se pudo actualizar el ítem." };
    }
}

/**
 * Elimina un ítem de conocimiento.
 */
export async function deleteConocimientoItem(itemId: string): Promise<ActionResult<null>> {
    try {
        await prisma.negocioConocimientoItem.delete({
            where: { id: itemId }
        });
        revalidatePath(`/admin/`);
        return { success: true, data: null };
    } catch {
        return { success: false, error: "No se pudo eliminar el ítem." };
    }
}
