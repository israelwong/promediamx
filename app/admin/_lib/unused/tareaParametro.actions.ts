// Ruta: src/app/admin/_lib/parametrosTareas.actions.ts
'use server';

import prisma from '../prismaClient'; // Ajusta ruta según tu estructura
import {
    ParametroRequerido,
    CrearParametroRequeridoInput,
    EditarParametroRequeridoInput
} from './tareaParametro.type'; // Ajusta ruta según tu estructura
import { Prisma } from '@prisma/client';

const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^a-z0-9_]+/g, '_') // Reemplazar no alfanuméricos (excepto _) con _
        .replace(/^_+|_+$/g, '') // Quitar _ al inicio/final
        .replace(/_{2,}/g, '_'); // Reemplazar múltiples _ con uno solo
};


// --- Obtener todos los Parámetros Estándar (con conteo de uso) ---
// Ordenados por el campo 'orden'
export async function obtenerParametrosRequeridos(): Promise<(ParametroRequerido & { _count?: { funciones?: number } })[]> {
    try {
        const parametros = await prisma.parametroRequerido.findMany({
            orderBy: {
                orden: 'asc', // Ordenar por el campo 'orden'
            },
            include: {
                _count: {
                    select: { funciones: true }
                }
            }
        });
        return parametros as (ParametroRequerido & { _count?: { funciones?: number } })[];
    } catch (error) {
        console.error('Error fetching standard parameters:', error);
        throw new Error('No se pudieron obtener los parámetros estándar.');
    }
}

// --- Crear un nuevo Parámetro Estándar ---
export async function crearParametroRequerido(
    data: CrearParametroRequeridoInput
): Promise<{ success: boolean; data?: ParametroRequerido; error?: string }> {
    try {
        // Validaciones
        if (!data.nombreVisible?.trim()) {
            return { success: false, error: "El nombre visible del parámetro es obligatorio." };
        }
        if (!data.tipoDato) {
            return { success: false, error: "El tipo de dato es obligatorio." };
        }

        // Generar nombre interno
        const nombreInterno = generarNombreInterno(data.nombreVisible);
        if (!nombreInterno) {
            return { success: false, error: "No se pudo generar un nombre interno válido a partir del nombre visible." };
        }
        // Validar formato nombre interno (por si acaso)
        if (!/^[a-z0-9_]+$/.test(nombreInterno)) {
            return { success: false, error: "Nombre interno generado inválido (solo minúsculas, números, guion bajo)." };
        }

        // Calcular el siguiente 'orden'
        const ultimoParametro = await prisma.parametroRequerido.findFirst({
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoParametro?.orden ?? -1) + 1; // Si no hay ninguno, empieza en 0

        const nuevoParametro = await prisma.parametroRequerido.create({
            data: {
                nombreVisible: data.nombreVisible.trim(),
                nombreInterno: nombreInterno, // Usar el generado
                tipoDato: data.tipoDato,
                descripcion: data.descripcion?.trim() || null,
                orden: nuevoOrden // Asignar el nuevo orden calculado
            },
        });
        return { success: true, data: nuevoParametro as ParametroRequerido };
    } catch (error) {
        console.error('Error creating standard parameter:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Error de restricción única (probablemente el 'nombreInterno')
            return { success: false, error: `El nombre interno '${generarNombreInterno(data.nombreVisible || '')}' ya existe o el nombre visible ya está en uso (si también es unique).` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear el parámetro." };
    }
}

// --- Editar un Parámetro Estándar existente ---
// Solo permite editar nombreVisible, tipoDato, descripcion
export async function editarParametroRequerido(
    id: string,
    data: EditarParametroRequeridoInput
): Promise<{ success: boolean; data?: ParametroRequerido; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de parámetro no proporcionado." };

        // Validaciones
        if (!data.nombreVisible?.trim()) {
            return { success: false, error: "El nombre visible no puede estar vacío." };
        }
        if (!data.tipoDato) {
            return { success: false, error: "El tipo de dato es obligatorio." };
        }

        // No se permite editar nombreInterno ni orden aquí
        const parametroActualizado = await prisma.parametroRequerido.update({
            where: { id },
            data: {
                nombreVisible: data.nombreVisible.trim(),
                tipoDato: data.tipoDato,
                descripcion: data.descripcion?.trim() || null,
                // 'orden' no se modifica aquí, se hace con la acción de reordenar
            },
        });
        return { success: true, data: parametroActualizado as ParametroRequerido };
    } catch (error) {
        console.error(`Error updating standard parameter ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: `Parámetro con ID ${id} no encontrado.` };
            }
            // Podría haber un P2002 si nombreVisible tiene restricción unique y ya existe
            if (error.code === 'P2002') {
                return { success: false, error: `El nombre visible '${data.nombreVisible}' ya está en uso por otro parámetro.` };
            }
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar el parámetro." };
    }
}

// --- Eliminar un Parámetro Estándar ---
// (Sin cambios respecto a la versión anterior, ya validaba el uso)
export async function eliminarParametroRequerido(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de parámetro no proporcionado." };

        const funcionesAsociadasCount = await prisma.tareaFuncionParametroRequerido.count({
            where: { parametroRequeridoId: id },
        });

        if (funcionesAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: ${funcionesAsociadasCount} función(es) usan este parámetro.` };
        }

        await prisma.parametroRequerido.delete({
            where: { id },
        });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting standard parameter ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Parámetro con ID ${id} no encontrado.` };
        }
        return { success: false, error: (error as Error).message || 'Error desconocido al eliminar el parámetro.' };
    }
}


// --- NUEVA ACCIÓN: Actualizar Orden de los Parámetros ---
export async function actualizarOrdenParametros(
    parametrosOrdenados: { id: string; orden: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!parametrosOrdenados || parametrosOrdenados.length === 0) {
            // No hay nada que actualizar, retornar éxito silencioso o un mensaje específico
            return { success: true };
            // o return { success: false, error: "No se proporcionaron parámetros para ordenar." };
        }

        // Usar una transacción para actualizar todos los órdenes
        await prisma.$transaction(
            parametrosOrdenados.map((param, index) =>
                prisma.parametroRequerido.update({
                    where: { id: param.id },
                    data: { orden: index }, // Asignar el índice del array como nuevo orden
                })
            )
        );

        return { success: true };
    } catch (error) {
        console.error('Error updating parameter order:', error);
        return { success: false, error: (error as Error).message || 'Error desconocido al actualizar el orden.' };
    }
}
