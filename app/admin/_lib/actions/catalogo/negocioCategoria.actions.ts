// @/app/admin/_lib/actions/catalogo/negocioCategoria.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, NegocioCategoria as PrismaNegocioCategoria } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
    CrearNegocioCategoriaDataSchema,
    type CrearNegocioCategoriaData,
    ActualizarNegocioCategoriaDataSchema,
    type ActualizarNegocioCategoriaData,
    ActualizarOrdenCategoriasDataSchema,
    type ActualizarOrdenCategoriasData,
    // NegocioCategoriaSchema // Para validar salida si fuera necesario
} from './negocioCategoria.schemas';

// Helper para la ruta de revalidación
const getPathToCategorias = (clienteId: string, negocioId: string) => {
    // Ruta de la página donde se listan/gestionan las categorías
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/categorias`;
};

export async function obtenerNegocioCategorias(negocioId: string): Promise<PrismaNegocioCategoria[]> {
    if (!negocioId) return [];
    try {
        const categorias = await prisma.negocioCategoria.findMany({
            where: { negocioId: negocioId },
            orderBy: {
                orden: 'asc',
            },
        });
        return categorias;
    } catch (error) {
        console.error(`Error al obtener categorías para el negocio ${negocioId}:`, error);
        return []; // Devolver array vacío para que el componente no falle
    }
}

export async function crearNegocioCategoria(
    negocioId: string,
    clienteId: string, // Para revalidatePath
    data: CrearNegocioCategoriaData
): Promise<ActionResult<PrismaNegocioCategoria>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = CrearNegocioCategoriaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, descripcion } = validationResult.data;

    try {
        const ultimoOrden = await prisma.negocioCategoria.aggregate({
            _max: { orden: true }, where: { negocioId: negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaCategoria = await prisma.negocioCategoria.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombre: nombre,
                descripcion: descripcion, // Zod ya manejó si es null
                orden: nuevoOrden,
                status: 'activo', // Default status
            },
        });

        revalidatePath(getPathToCategorias(clienteId, negocioId));
        return { success: true, data: nuevaCategoria };
    } catch (error) {
        console.error("Error al crear categoría:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo unique constraint en (negocioId, nombre)
            return { success: false, error: `La categoría "${nombre}" ya existe para este negocio.` };
        }
        return { success: false, error: "Error al crear la categoría." };
    }
}

export async function actualizarNegocioCategoria(
    categoriaId: string,
    negocioId: string, // Para revalidatePath y scope
    clienteId: string, // Para revalidatePath
    data: ActualizarNegocioCategoriaData
): Promise<ActionResult<PrismaNegocioCategoria>> {
    if (!categoriaId) return { success: false, error: "ID de categoría no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = ActualizarNegocioCategoriaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }

    const dataToUpdate = validationResult.data;
    if (Object.keys(dataToUpdate).length === 0) {
        // Si no hay datos para actualizar, devuelve la categoría actual o un mensaje.
        // Para consistencia, podrías buscar y devolver la categoría actual.
        try {
            const categoriaActual = await prisma.negocioCategoria.findUnique({ where: { id: categoriaId, negocioId: negocioId } });
            if (!categoriaActual) return { success: false, error: "Categoría no encontrada." };
            return { success: true, data: categoriaActual, error: "No hay datos para actualizar." };
        } catch {
            return { success: false, error: "Error al verificar categoría." }
        }
    }

    try {
        const categoriaActualizada = await prisma.negocioCategoria.update({
            where: { id: categoriaId, negocioId: negocioId }, // Asegurar que la categoría pertenece al negocio
            data: dataToUpdate, // Zod ya validó los campos
        });

        revalidatePath(getPathToCategorias(clienteId, negocioId));
        return { success: true, data: categoriaActualizada };
    } catch (error) {
        console.error("Error al actualizar categoría:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && dataToUpdate.nombre) {
                return { success: false, error: `La categoría "${dataToUpdate.nombre}" ya existe para este negocio.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: "Categoría no encontrada para actualizar." };
            }
        }
        return { success: false, error: "Error al actualizar la categoría." };
    }
}

export async function eliminarNegocioCategoria(
    categoriaId: string,
    negocioId: string, // Para revalidatePath y scope
    clienteId: string // Para revalidatePath
): Promise<ActionResult<void>> {
    if (!categoriaId) return { success: false, error: "ID de categoría no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    try {
        // Antes de eliminar, podrías querer manejar los ItemCatalogo asociados.
        // Por ejemplo, poner su categoriaId a null. Esto depende de tu lógica de negocio
        // y de cómo esté configurada la relación en Prisma (onDelete).
        // Si la relación es Restrict y hay items, la eliminación fallará.
        // Ejemplo de desasociar items (si la relación lo permite):
        // await prisma.itemCatalogo.updateMany({
        //     where: { categoriaId: categoriaId, negocioId: negocioId },
        //     data: { categoriaId: null },
        // });

        await prisma.negocioCategoria.delete({
            where: { id: categoriaId, negocioId: negocioId }, // Asegurar que la categoría pertenece al negocio
        });

        revalidatePath(getPathToCategorias(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar categoría:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // Record to delete not found.
                return { success: true, error: "La categoría ya había sido eliminada." };
            }
            // P2003: Foreign key constraint failed on the field: `...`
            // Esto puede ocurrir si hay ItemCatalogo que aún referencian esta categoría y la FK es restrictiva.
            if (error.code === 'P2003') {
                return { success: false, error: "No se puede eliminar la categoría porque tiene ítems asociados. Desasócielos primero." };
            }
        }
        return { success: false, error: "Error al eliminar la categoría." };
    }
}

export async function actualizarOrdenNegocioCategorias(
    negocioId: string, // Para revalidatePath y scope
    clienteId: string, // Para revalidatePath
    data: ActualizarOrdenCategoriasData
): Promise<ActionResult<void>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = ActualizarOrdenCategoriasDataSchema.safeParse(data);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).filter(([value]) => value !== undefined)
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validationResult.data;

    if (ordenesValidadas.length === 0) {
        return { success: true }; // Nada que actualizar
    }

    try {
        await prisma.$transaction(
            ordenesValidadas.map((item) =>
                prisma.negocioCategoria.update({
                    where: { id: item.id, negocioId: negocioId }, // Asegurar que la categoría pertenece al negocio
                    data: { orden: item.orden },
                })
            )
        );
        revalidatePath(getPathToCategorias(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de categorías:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Una o más categorías no se encontraron para actualizar el orden." };
        }
        return { success: false, error: "Error al actualizar el orden de las categorías." };
    }
}
