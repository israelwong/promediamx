// @/app/admin/_lib/actions/catalogo/negocioEtiqueta.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, NegocioEtiqueta as PrismaNegocioEtiqueta } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
    CrearNegocioEtiquetaDataSchema,
    type CrearNegocioEtiquetaData,
    ActualizarNegocioEtiquetaDataSchema,
    type ActualizarNegocioEtiquetaData,
    ActualizarOrdenEtiquetasDataSchema,
    type ActualizarOrdenEtiquetasData,
    // NegocioEtiquetaSchema // Para validar salida si fuera necesario
} from './negocioEtiqueta.schemas';

// Helper para la ruta de revalidación
const getPathToEtiquetas = (clienteId: string, negocioId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/etiquetas`;
};

export async function obtenerNegocioEtiquetas(negocioId: string): Promise<PrismaNegocioEtiqueta[]> {
    if (!negocioId) return [];
    try {
        const etiquetas = await prisma.negocioEtiqueta.findMany({
            where: { negocioId: negocioId },
            orderBy: {
                orden: 'asc',
            },
        });
        return etiquetas; // Devuelve el tipo Prisma directamente
    } catch (error) {
        console.error(`Error al obtener etiquetas para el negocio ${negocioId}:`, error);
        // El componente actual maneja el error si se lanza, o un array vacío.
        // Devolver un array vacío en caso de error es más simple para el componente actual.
        return [];
        // throw new Error("Error al obtener las etiquetas del negocio."); // Alternativa
    }
}

export async function crearNegocioEtiqueta(
    negocioId: string,
    clienteId: string, // Para revalidatePath
    data: CrearNegocioEtiquetaData
): Promise<ActionResult<PrismaNegocioEtiqueta>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = CrearNegocioEtiquetaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, descripcion } = validationResult.data;

    try {
        const ultimoOrden = await prisma.negocioEtiqueta.aggregate({
            _max: { orden: true }, where: { negocioId: negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaEtiqueta = await prisma.negocioEtiqueta.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombre: nombre,
                descripcion: descripcion,
                orden: nuevoOrden,
                status: 'activo', // O el status por defecto que prefieras
            },
        });

        revalidatePath(getPathToEtiquetas(clienteId, negocioId));
        return { success: true, data: nuevaEtiqueta };
    } catch (error) {
        console.error("Error al crear etiqueta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo que tienes un índice unique en (negocioId, nombre)
            return { success: false, error: `La etiqueta "${nombre}" ya existe para este negocio.` };
        }
        return { success: false, error: "Error al crear la etiqueta." };
    }
}

export async function actualizarNegocioEtiqueta(
    etiquetaId: string,
    negocioId: string, // Para revalidatePath
    clienteId: string, // Para revalidatePath
    data: ActualizarNegocioEtiquetaData
): Promise<ActionResult<PrismaNegocioEtiqueta>> {
    if (!etiquetaId) return { success: false, error: "ID de etiqueta no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = ActualizarNegocioEtiquetaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }

    const dataToUpdate = validationResult.data;
    if (Object.keys(dataToUpdate).length === 0) {
        // Si no hay datos para actualizar, simplemente devuelve la etiqueta actual o un mensaje.
        // Opcionalmente, podrías buscar y devolver la etiqueta actual.
        return { success: true, error: "No hay datos para actualizar." }; // O success:true y data:etiquetaActual
    }

    try {
        const etiquetaActualizada = await prisma.negocioEtiqueta.update({
            where: { id: etiquetaId, negocioId: negocioId }, // Asegurar que la etiqueta pertenece al negocio
            data: dataToUpdate,
        });

        revalidatePath(getPathToEtiquetas(clienteId, negocioId));
        return { success: true, data: etiquetaActualizada };
    } catch (error) {
        console.error("Error al actualizar etiqueta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && dataToUpdate.nombre) {
                return { success: false, error: `La etiqueta "${dataToUpdate.nombre}" ya existe para este negocio.` };
            }
            if (error.code === 'P2025') { // "Record to update not found."
                return { success: false, error: "Etiqueta no encontrada para actualizar." };
            }
        }
        return { success: false, error: "Error al actualizar la etiqueta." };
    }
}

export async function eliminarNegocioEtiqueta(
    etiquetaId: string,
    negocioId: string, // Para revalidatePath
    clienteId: string // Para revalidatePath
): Promise<ActionResult<void>> {
    if (!etiquetaId) return { success: false, error: "ID de etiqueta no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    try {
        // Verificar que la etiqueta pertenece al negocio antes de eliminar
        const etiqueta = await prisma.negocioEtiqueta.findFirst({
            where: { id: etiquetaId, negocioId: negocioId }
        });

        if (!etiqueta) {
            // Considerar si esto es un error o un éxito silencioso si ya no existe
            return { success: false, error: "Etiqueta no encontrada o no pertenece a este negocio." };
        }

        await prisma.negocioEtiqueta.delete({
            where: { id: etiquetaId },
        });

        revalidatePath(getPathToEtiquetas(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar etiqueta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "La etiqueta ya había sido eliminada." }; // O simplemente success: true
        }
        return { success: false, error: "Error al eliminar la etiqueta." };
    }
}

export async function actualizarOrdenNegocioEtiquetas(
    negocioId: string, // Para revalidatePath y scope de la query
    clienteId: string, // Para revalidatePath
    data: ActualizarOrdenEtiquetasData
): Promise<ActionResult<void>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = ActualizarOrdenEtiquetasDataSchema.safeParse(data);
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
                prisma.negocioEtiqueta.update({
                    where: { id: item.id, negocioId: negocioId }, // Asegurar que la etiqueta pertenece al negocio
                    data: { orden: item.orden },
                })
            )
        );
        revalidatePath(getPathToEtiquetas(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de etiquetas:", error);
        // P2025 puede ocurrir si un ID en ordenesValidadas no existe o no pertenece al negocioId
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Una o más etiquetas no se encontraron para actualizar el orden." };
        }
        return { success: false, error: "Error al actualizar el orden de las etiquetas." };
    }
}
