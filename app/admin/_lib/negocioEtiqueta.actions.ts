'use server'
import prisma from './prismaClient'
import { NegocioEtiqueta } from './types'

export interface NegocioEtiquetaConOrden extends NegocioEtiqueta {
    orden: number;
}

export async function obtenerNegocioEtiquetas(negocioId: string): Promise<NegocioEtiquetaConOrden[]> {
    if (!negocioId) return [];
    try {
        const etiquetas = await prisma.negocioEtiqueta.findMany({
            where: { negocioId: negocioId },
            orderBy: {
                orden: 'asc', // Ordenar por el campo 'orden'
            },
        });
        return etiquetas as NegocioEtiquetaConOrden[];
    } catch (error) {
        console.error(`Error al obtener etiquetas para el negocio ${negocioId}:`, error);
        throw new Error("Error al obtener las etiquetas del negocio.");
    }
}

interface ItemEtiqueta {
    itemCatalogo: string; // Replace with the actual type of itemCatalogo
    [key: string]: unknown; // Use 'unknown' instead of 'any' for other properties
}

export async function crearNegocioEtiqueta(data: Omit<NegocioEtiqueta, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'negocio'> & { itemEtiquetas?: Array<ItemEtiqueta> }): Promise<NegocioEtiqueta> {
    try {
        const nuevaEtiqueta = await prisma.negocioEtiqueta.create({
            data: {
                ...data,
                status: 'active', // Asignar un valor por defecto
                orden: 0, // Asignar un valor por defecto
                itemEtiquetas: data.itemEtiquetas
                    ? {
                        create: data.itemEtiquetas.map(item => ({
                            ...item,
                            itemCatalogo: { connect: { id: item.itemCatalogo } }, // Transform itemCatalogo to the expected nested input type
                        })),
                    }
                    : undefined, // Transformar itemEtiquetas al formato esperado
            },
        });
        return nuevaEtiqueta;
    } catch (error) {
        console.error("Error al crear etiqueta:", error);
        throw new Error("Error al crear la etiqueta.");
    }
}
export async function actualizarNegocioEtiqueta(id: string, etiqueta: Partial<NegocioEtiqueta>) {
    const etiquetaActualizada = await prisma.negocioEtiqueta.update({
        where: {
            id: id
        },
        data: {
            ...Object.fromEntries(Object.entries(etiqueta).filter(([value]) => value !== undefined))
        }
    })
    return etiquetaActualizada
}

export async function eliminarNegocioEtiqueta(id: string) {
    const etiquetaEliminada = await prisma.negocioEtiqueta.delete({
        where: {
            id: id
        }
    })
    return etiquetaEliminada
}

export async function actualizarOrdenNegocioEtiquetas(etiquetasOrdenadas: { id: string; orden: number }[]) {
    if (!etiquetasOrdenadas || etiquetasOrdenadas.length === 0) {
        console.warn("actualizarOrdenNegocioEtiquetas llamado sin datos.");
        return; // No hay nada que actualizar
    }
    try {
        // Usar una transacción para actualizar todas las etiquetas de forma atómica
        const updatePromises = etiquetasOrdenadas.map(etiqueta =>
            prisma.negocioEtiqueta.update({
                where: { id: etiqueta.id },
                data: { orden: etiqueta.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        console.log(`Orden actualizado para ${etiquetasOrdenadas.length} etiquetas.`);
    } catch (error) {
        console.error("Error en actualizarOrdenNegocioEtiquetas:", error);
        throw new Error("Error al actualizar el orden de las etiquetas.");
    }
}
