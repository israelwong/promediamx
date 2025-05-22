'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
// import { revalidatePath } from 'next/cache'; // Asumiendo que quieres revalidar alguna ruta

import type { ActionResult } from '@/app/admin/_lib/types';
import {
    TareaFuncionParametroInputSchema,
    type TareaFuncionParametroInput,
    OrdenarParametrosInputSchema,
    type ParametroParaUILista // Para el tipo de retorno de obtener
} from './tareaFuncionParametro.schemas';

import type { TareaFuncionParametro as TareaFuncionParametroPrisma } from '@prisma/client';

// --- Obtener Parámetros por TareaFuncion ID ---
export async function obtenerParametrosPorFuncionId(
    tareaFuncionId: string
): Promise<ActionResult<ParametroParaUILista[]>> {
    if (!tareaFuncionId) {
        return { success: false, error: "Se requiere ID de la función de tarea." };
    }
    try {
        const parametros = await prisma.tareaFuncionParametro.findMany({
            where: { tareaFuncionId: tareaFuncionId },
            orderBy: { orden: 'asc' },
        });

        // Mapear para incluir un 'nombreVisibleParaUI' (podría ser igual a 'nombre' si no se almacena por separado)
        // o podrías necesitar una lógica para "des-snake_case" el 'nombre' para la UI si es necesario.
        // Por ahora, asumimos que 'nombreVisibleParaUI' se reconstruye o es igual a 'nombre' para la lista.
        // Idealmente, el 'nombre' (snake_case) es el identificador principal.
        const dataParaUI: ParametroParaUILista[] = parametros.map((p, index) => ({
            ...p,
            orden: p.orden ?? index,
            // Si no guardamos 'nombreVisibleParaUI' en DB, lo derivamos o usamos el 'nombre'
            nombreVisibleParaUI: p.nombre, // Placeholder: Deberías tener una forma de generar esto si es diferente
        }));

        return { success: true, data: dataParaUI };
    } catch (error: unknown) {
        console.error('Error al obtener parámetros por función ID:', error);
        return { success: false, error: 'No se pudieron obtener los parámetros.' };
    }
}

// --- Crear un Nuevo Parámetro para una Función ---
export async function crearParametroParaFuncion(
    tareaFuncionId: string,
    input: TareaFuncionParametroInput
): Promise<ActionResult<TareaFuncionParametroPrisma>> {
    if (!tareaFuncionId) {
        return { success: false, error: "Se requiere ID de la función de tarea para crear el parámetro." };
    }
    const validationResult = TareaFuncionParametroInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos para el parámetro.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).map(([key, value]) => [String(key), value ?? []])
            ) as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    try {
        const ultimoParametro = await prisma.tareaFuncionParametro.findFirst({
            where: { tareaFuncionId: tareaFuncionId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoParametro?.orden ?? -1) + 1;

        const nuevoParametro = await prisma.tareaFuncionParametro.create({
            data: {
                ...data, // nombre (snake_case), descripcionParaIA, tipoDato, etc.
                tareaFuncionId: tareaFuncionId,
                orden: nuevoOrden,
            },
        });
        // Considera revalidar la ruta de edición de la Tarea o de la TareaFuncion
        // revalidatePath(`/admin/tareas/funciones/${tareaFuncionId}`); 
        // revalidatePath(`/admin/tareas/[tareaId]`); // Si este componente está en la edición de tarea
        return { success: true, data: nuevoParametro };
    } catch (error: unknown) {
        console.error('Error al crear el parámetro de función:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // El error P2002 ocurrirá por la restricción @@unique([tareaFuncionId, nombre])
            return { success: false, error: `El parámetro con nombre '${data.nombre}' ya existe para esta función.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al crear el parámetro.") };
    }
}

// --- Editar un Parámetro de Función Existente ---
export async function editarParametroDeFuncion(
    parametroId: string,
    input: TareaFuncionParametroInput // No se debería poder cambiar tareaFuncionId aquí
): Promise<ActionResult<TareaFuncionParametroPrisma>> {
    if (!parametroId) {
        return { success: false, error: "ID de parámetro no proporcionado." };
    }
    const validationResult = TareaFuncionParametroInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos para el parámetro.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).map(
                    ([key, value]) => [String(key), value ?? []]
                )
            ) as Record<string, string[]>,
        };
    }
    const dataToUpdate = validationResult.data;

    try {
        const parametroActualizado = await prisma.tareaFuncionParametro.update({
            where: { id: parametroId },
            data: dataToUpdate, // nombre (snake_case), descripcionParaIA, tipoDato, etc.
        });
        // Revalidar
        return { success: true, data: parametroActualizado };
    } catch (error: unknown) {
        console.error(`Error al actualizar el parámetro de función ${parametroId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') { // Conflicto de unicidad (nombre dentro de la misma tareaFuncionId)
                return { success: false, error: `El parámetro con nombre '${dataToUpdate.nombre}' ya existe para esta función.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: `Parámetro con ID ${parametroId} no encontrado.` };
            }
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al actualizar el parámetro.") };
    }
}

// --- Eliminar un Parámetro de Función ---
export async function eliminarParametroDeFuncion(parametroId: string): Promise<ActionResult<null>> {
    try {
        if (!parametroId) {
            return { success: false, error: "ID de parámetro no proporcionado." };
        }
        // Aquí no hay validación de uso, ya que los parámetros son específicos de la función.
        // Si se borra, se borra.
        await prisma.tareaFuncionParametro.delete({ where: { id: parametroId } });
        // Revalidar
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error(`Error al eliminar el parámetro de función ${parametroId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Parámetro con ID ${parametroId} no encontrado.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : 'Error desconocido al eliminar el parámetro.') };
    }
}

// --- Actualizar Orden de Parámetros de una Función ---
export async function ordenarParametrosDeFuncion(
    tareaFuncionId: string, // Necesario para revalidar la ruta correcta si es específica
    input: unknown // Validado con Zod
): Promise<ActionResult<null>> {
    if (!tareaFuncionId) {
        return { success: false, error: "Se requiere ID de la función de tarea para ordenar sus parámetros." };
    }
    const validationResult = OrdenarParametrosInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: 'Datos de entrada inválidos para ordenar parámetros.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).map(
                    ([key, value]) => [String(key), value ?? []]
                )
            ) as Record<string, string[]>,
        };
    }
    const items = validationResult.data;

    if (!items || items.length === 0) {
        return { success: true, data: null }; // No hay nada que ordenar.
    }
    try {
        const updatePromises = items.map(item =>
            prisma.tareaFuncionParametro.update({
                where: { id: item.id }, // Asumimos que el ID es suficiente si es globalmente único
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        // Revalidar
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error('Error al actualizar el orden de los parámetros:', error);
        return { success: false, error: (error instanceof Error ? error.message : "Error al actualizar el orden.") };
    }
}

export async function obtenerTareaFuncionId(tareaId: string) {
    const tareaFuncion = await prisma.tareaFuncion.findFirst({
        where: { tareaId },
        select: {
            id: true,
            nombre: true,
        }
    });
    return tareaFuncion
}