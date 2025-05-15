// Ruta: app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import {
    NegocioPaqueteCategoriaListItem,
    UpsertNegocioPaqueteCategoriaData,
    UpsertNegocioPaqueteCategoriaSchema,
    ReordenarCategoriasPaqueteData,
    ReordenarCategoriasPaqueteSchema
} from './negocioPaqueteCategoria.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';

// Helper para construir la ruta a revalidar
const getPathToRevalidate = (clienteId: string, negocioId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/categoria`;


export async function obtenerCategoriasPaqueteAction(
    negocioId: string
): Promise<ActionResult<NegocioPaqueteCategoriaListItem[]>> {
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };
    try {
        const categorias = await prisma.negocioPaqueteCategoria.findMany({
            where: { negocioId: negocioId }, // Ahora con negocioId en el modelo
            orderBy: { orden: 'asc' },
            select: { id: true, nombre: true, orden: true, status: true }
        });
        return { success: true, data: categorias };
    } catch (error) {
        console.error("Error obtenerCategoriasPaqueteAction:", error);
        return { success: false, error: "No se pudieron obtener las categorías." };
    }
}

export async function crearCategoriaPaqueteAction(
    negocioId: string,
    clienteId: string, // Para revalidatePath
    data: UpsertNegocioPaqueteCategoriaData
): Promise<ActionResult<NegocioPaqueteCategoriaListItem>> {
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };

    const validation = UpsertNegocioPaqueteCategoriaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }

    try {
        // Calcular el siguiente 'orden'
        const lastCategory = await prisma.negocioPaqueteCategoria.findFirst({
            where: { negocioId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nextOrder = (lastCategory?.orden ?? -1) + 1;

        const nuevaCategoria = await prisma.negocioPaqueteCategoria.create({
            data: {
                ...validation.data,
                negocioId: negocioId,
                orden: nextOrder,
                // status: 'activo' // Ya tiene default en el schema Prisma
            },
            select: { id: true, nombre: true, orden: true, status: true }
        });
        revalidatePath(getPathToRevalidate(clienteId, negocioId));
        return { success: true, data: nuevaCategoria };
    } catch (error: unknown) {
        console.error("Error crearCategoriaPaqueteAction:", error);
        if ((error as { code: string; meta?: { target?: string[] } }).code === 'P2002' && (error as { code: string; meta?: { target?: string[] } }).meta?.target?.includes('nombre')) {
            return { success: false, error: "Ya existe una categoría con este nombre para este negocio." };
        }
        return { success: false, error: "No se pudo crear la categoría." };
    }
}

export async function actualizarCategoriaPaqueteAction(
    id: string,
    negocioId: string, // Para asegurar que se edita la correcta y para revalidate
    clienteId: string, // Para revalidatePath
    data: UpsertNegocioPaqueteCategoriaData
): Promise<ActionResult<NegocioPaqueteCategoriaListItem>> {
    const validation = UpsertNegocioPaqueteCategoriaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }

    try {
        const categoriaActualizada = await prisma.negocioPaqueteCategoria.update({
            where: { id: id, negocioId: negocioId }, // Asegurar que pertenece al negocio
            data: validation.data, // Solo actualiza 'nombre'
            select: { id: true, nombre: true, orden: true, status: true }
        });
        revalidatePath(getPathToRevalidate(clienteId, negocioId));
        return { success: true, data: categoriaActualizada };
    } catch (error: unknown) {
        console.error("Error actualizarCategoriaPaqueteAction:", error);
        if ((error as { code: string; meta?: { target?: string[] } }).code === 'P2002' && (error as { code: string; meta?: { target?: string[] } }).meta?.target?.includes('nombre')) {
            return { success: false, error: "Ya existe otra categoría con este nombre para este negocio." };
        }
        if ((error as { code: string }).code === 'P2025') { // Record not found
            return { success: false, error: "Categoría no encontrada." };
        }
        return { success: false, error: "No se pudo actualizar la categoría." };
    }
}

export async function actualizarOrdenCategoriasPaqueteAction(
    negocioId: string,
    clienteId: string, // Para revalidatePath
    ordenes: ReordenarCategoriasPaqueteData
): Promise<ActionResult<void>> {
    const validation = ReordenarCategoriasPaqueteSchema.safeParse(ordenes);
    if (!validation.success) {
        return { success: false, error: "Datos de orden inválidos." };
    }
    try {
        await prisma.$transaction(
            validation.data.map(cat =>
                prisma.negocioPaqueteCategoria.update({
                    where: { id: cat.id, negocioId: negocioId }, // Asegurar que pertenece al negocio
                    data: { orden: cat.orden },
                })
            )
        );
        revalidatePath(getPathToRevalidate(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error("Error actualizarOrdenCategoriasPaqueteAction:", error);
        return { success: false, error: "No se pudo actualizar el orden de las categorías." };
    }
}

export async function eliminarCategoriaPaqueteAction(
    id: string,
    negocioId: string,
    clienteId: string
): Promise<ActionResult<void>> {
    try {
        // onDelete: SetNull en NegocioPaquete.negocioPaqueteCategoriaId se encargará de desvincular
        await prisma.negocioPaqueteCategoria.delete({
            where: { id: id, negocioId: negocioId },
        });
        revalidatePath(getPathToRevalidate(clienteId, negocioId));
        return { success: true };
    } catch (error: unknown) {
        console.error("Error eliminarCategoriaPaqueteAction:", error);
        if ((error as { code?: string }).code === 'P2025') { // Record not found
            return { success: false, error: "Categoría no encontrada." };
        }
        return { success: false, error: "No se pudo eliminar la categoría." };
    }
}
