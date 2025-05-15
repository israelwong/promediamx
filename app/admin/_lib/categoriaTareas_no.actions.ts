'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client'
import { CategoriaTarea } from './types'
import { revalidatePath } from 'next/cache';


export interface CategoriaTareaResult extends CategoriaTarea {
    success: boolean;
    error?: string;
}

// --- Crear Categoría (Añadir campo color) ---
export async function crearCategoria(
    data: Pick<CategoriaTarea, 'nombre' | 'descripcion' | 'color'> // Añadir color
): Promise<CategoriaTarea | { error: string }> {
    try {
        if (!data.nombre?.trim()) {
            return { error: "El nombre es obligatorio." };
        }
        const nuevaCategoria = await prisma.categoriaTarea.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                color: data.color || null, // Guardar color o null
                // Orden se manejará por separado o al final
            },
        });
        revalidatePath('/admin/tareas'); // Revalidar donde se muestre
        return nuevaCategoria;
    } catch (error) {
        // ... manejo de error P2002 para nombre único ...
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
            return { error: `La categoría '${data.nombre}' ya existe.` };
        }
        console.error("Error al crear categoría:", error);
        return { error: "No se pudo crear la categoría." };
    }
}

// --- Actualizar Categoría (Añadir campo color) ---
export async function actualizarCategoria(
    id: string,
    data: Partial<Pick<CategoriaTarea, 'nombre' | 'descripcion' | 'color'>> // Añadir color
): Promise<CategoriaTarea | { error: string }> {
    try {
        if (!id) return { error: "ID no proporcionado." };
        if (data.nombre !== undefined && !data.nombre?.trim()) {
            return { error: "El nombre no puede estar vacío." };
        }

        const dataToUpdate: Prisma.CategoriaTareaUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.color !== undefined) dataToUpdate.color = data.color || null; // Actualizar color

        const categoriaActualizada = await prisma.categoriaTarea.update({
            where: { id },
            data: dataToUpdate,
        });
        revalidatePath('/admin/tareas');
        return categoriaActualizada;
    } catch (error) {
        // ... manejo de error P2002 para nombre único ...
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { error: `La categoría '${data.nombre}' ya existe.` };
        }
        console.error("Error al actualizar categoría:", error);
        return { error: "No se pudo actualizar la categoría." };
    }
}

// En categoriaTarea.actions.ts
export async function obtenerCategorias(): Promise<CategoriaTarea[]> {
    try {
        const categorias = await prisma.categoriaTarea.findMany({
            orderBy: { orden: 'asc' },
            // Asegúrate de seleccionar el nuevo campo color
            select: { id: true, nombre: true, descripcion: true, orden: true, color: true } // <-- INCLUIR COLOR
        });
        return categorias as CategoriaTarea[]; // Castear si es necesario
    } catch (error) {
        console.error('Error al obtener todas las categorías:', error);
        return []; // Retornar un array vacío en caso de error
    }
}


export async function obtenerCategoriaPorId(categoriaId: string) {
    const categoriasTareas = await prisma.categoriaTarea.findMany({
        where: {
            id: categoriaId
        }
    })

    return categoriasTareas
}

export async function eliminarCategoria(categoriaId: string) {
    try {
        const tareasAsociadas = await prisma.tarea.findMany({
            where: {
                categoriaTareaId: categoriaId
            }
        })

        if (tareasAsociadas.length > 0) {
            throw new Error('No se puede eliminar la categoría porque tiene tareas asociadas')
        }

        const categoriaEliminada = await prisma.categoriaTarea.delete({
            where: {
                id: categoriaId
            }
        })
        return categoriaEliminada
    } catch (error) {
        console.error('Error al eliminar la categoria: Existen tareas asociadas a esta categoría', error)
        throw new Error('Error al eliminar la categoria')
    }
}

export async function actualizarOrdenCategorias(ordenCategorias: { id: string; orden: number }[]) {
    try {
        const actualizaciones = ordenCategorias.map(({ id, orden }) =>
            prisma.categoriaTarea.update({
                where: { id },
                data: { orden },
            })
        )
        await Promise.all(actualizaciones)
        return { mensaje: 'Orden de categorías actualizado correctamente' }
    } catch (error) {
        console.error('Error al actualizar el orden de las categorías:', error)
        throw new Error('Error al actualizar el orden de las categorías')
    }
}
