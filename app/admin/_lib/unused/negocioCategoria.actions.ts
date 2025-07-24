'use server'
import prisma from '../prismaClient'
import { NegocioCategoria } from '../types'

export interface NegocioCategoriaConOrden extends NegocioCategoria {
    orden: number;
}

export async function obtenerNegocioCategorias(negocioId: string): Promise<NegocioCategoriaConOrden[]> {
    if (!negocioId) return [];
    try {
        const categorias = await prisma.negocioCategoria.findMany({
            where: { negocioId: negocioId },
            orderBy: {
                orden: 'asc', // Ordenar por el campo 'orden'
            },
        });
        return categorias as NegocioCategoriaConOrden[];
    } catch (error) {
        console.error(`Error al obtener categorías para el negocio ${negocioId}:`, error);
        throw new Error("Error al obtener las categorías del negocio.");
    }
}

export async function crearNegocioCategoria(data: Omit<NegocioCategoria, 'id' | 'createdAt' | 'updatedAt'>): Promise<NegocioCategoria> {
    try {
        // Asegúrate que 'data' incluya 'negocioId' y 'orden'
        const nuevaCategoria = await prisma.negocioCategoria.create({
            data: {
                negocioId: data.negocioId,
                nombre: data.nombre,
                descripcion: data.descripcion ?? null,
                orden: data.orden, // Asegúrate de que 'orden' esté incluido en 'data'
            },
        });
        return nuevaCategoria;
    } catch (error) {
        console.error("Error al crear categoría:", error);
        throw new Error("Error al crear la categoría.");
    }
}

export async function actualizarNegocioCategoria(id: string, data: Partial<Omit<NegocioCategoria, 'id' | 'negocioId' | 'createdAt' | 'updatedAt' | 'orden' | 'ItemCatalogo'>>) {
    try {
        const categoriaActualizada = await prisma.negocioCategoria.update({
            where: { id: id },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
            },
        });
        return categoriaActualizada;
    } catch (error) {
        console.error(`Error al actualizar categoría ${id}:`, error);
        throw new Error("Error al actualizar la categoría.");
    }
}

export async function eliminarNegocioCategoria(id: string) {
    try {
        // Considerar qué hacer con los ItemCatalogo asociados (¿poner categoriaId a null? ¿impedir borrado si hay items?)
        // Ejemplo: Poner categoriaId a null en items asociados (requiere relación configurada)
        // await prisma.itemCatalogo.updateMany({
        //     where: { categoriaId: id },
        //     data: { categoriaId: null },
        // });

        // Luego eliminar la categoría
        await prisma.negocioCategoria.delete({
            where: { id: id },
        });
    } catch (error) {
        console.error(`Error al eliminar categoría ${id}:`, error);
        // Podrías verificar errores específicos, como P2014 (violación de restricción) si hay items asociados y no los manejaste
        throw new Error("Error al eliminar la categoría.");
    }
}
export async function actualizarOrdenNegocioCategorias(categoriasOrdenadas: { id: string; orden: number }[]) {
    if (!categoriasOrdenadas || categoriasOrdenadas.length === 0) {
        console.warn("actualizarOrdenNegocioCategorias llamado sin datos.");
        return;
    }
    try {
        const updatePromises = categoriasOrdenadas.map(categoria =>
            prisma.negocioCategoria.update({
                where: { id: categoria.id },
                data: { orden: categoria.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        console.log(`Orden actualizado para ${categoriasOrdenadas.length} categorías.`);
    } catch (error) {
        console.error("Error en actualizarOrdenNegocioCategorias:", error);
        throw new Error("Error al actualizar el orden de las categorías.");
    }
}