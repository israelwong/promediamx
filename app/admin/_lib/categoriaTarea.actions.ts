'use server'
import prisma from './prismaClient'
import { CategoriaTarea } from './types'

export interface CategoriaTareaResult extends CategoriaTarea {
    success: boolean;
    error?: string;
}

export async function crearCategoria(categoria: CategoriaTarea) {
    try {
        const nuevaCategoria = await prisma.categoriaTarea.create({
            data: {
                nombre: categoria.nombre ?? '',
                descripcion: categoria.descripcion ?? '',
            }
        })
        return nuevaCategoria
    } catch (error) {
        console.error('Error al crear la categoria:', error)
        throw new Error('Error al crear la categoria')
    }
}

export async function obtenerCategorias() {
    try {
        const categorias = await prisma.categoriaTarea.findMany({
            orderBy: {
                orden: 'asc',
            },
        })
        return categorias
    } catch (error) {
        console.error('Error al obtener todas las categorias:', error)
        throw new Error('Error al obtener todas las categorias')
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

export async function actualizarCategoria(categoriaId: string, categoria: Partial<CategoriaTarea>) {
    try {
        const categoriaActualizada = await prisma.categoriaTarea.update({
            where: {
                id: categoriaId
            },
            data: {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion
            }
        })
        return categoriaActualizada
    } catch (error) {
        console.error('Error al actualizar la categoria:', error)
        throw new Error('Error al actualizar la categoria')
    }
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
