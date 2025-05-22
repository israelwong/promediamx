'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
// import { revalidatePath } from 'next/cache'; // Si es necesario revalidar

import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ActualizarDescripcionTareaFuncionInputSchema,
    // type ActualizarDescripcionTareaFuncionInput,
    type TareaFuncionSimple
} from './tareaFuncion.schemas';

import type { TareaFuncion as TareaFuncionPrisma } from '@prisma/client';


// --- Obtener datos de una TareaFuncion (incluyendo su descripción) ---
export async function obtenerTareaFuncion(
    tareaFuncionId: string
): Promise<ActionResult<TareaFuncionSimple | null>> {
    if (!tareaFuncionId) {
        return { success: false, error: "Se requiere ID de TareaFuncion." };
    }
    try {
        const funcion = await prisma.tareaFuncion.findUnique({
            where: { id: tareaFuncionId },
            select: {
                id: true,
                nombre: true,
                descripcion: true, // Este es el campo que ahora será la descripción para la IA
                // tareaId: true, // Podrías incluirlo si es útil para el contexto
            }
        });

        if (!funcion) {
            return { success: false, error: "Función de tarea no encontrada.", data: null };
        }
        return {
            success: true,
            data: funcion ? { ...funcion, nombre: funcion.nombre ?? '' } : null
        };
    } catch (error: unknown) {
        console.error(`Error al obtener TareaFuncion ${tareaFuncionId}:`, error);
        return { success: false, error: `No se pudo cargar la función. ${(error instanceof Error ? error.message : '')}`, data: null };
    }
}


// --- Actualizar la descripción de una TareaFuncion ---
export async function actualizarDescripcionTareaFuncion(
    args: {
        tareaFuncionId: string;
        descripcion: string | null; // La nueva descripción para la IA
    }
): Promise<ActionResult<TareaFuncionPrisma>> {
    const { tareaFuncionId, descripcion } = args;

    if (!tareaFuncionId) {
        return { success: false, error: "Se requiere ID de TareaFuncion." };
    }

    // Validar solo la descripción con un schema parcial o directamente
    const descValidation = ActualizarDescripcionTareaFuncionInputSchema.safeParse({ descripcion });
    if (!descValidation.success) {
        return {
            success: false,
            error: "Datos de descripción inválidos.",
            validationErrors: descValidation.error.flatten().fieldErrors,
        };
    }

    try {
        const funcionActualizada = await prisma.tareaFuncion.update({
            where: { id: tareaFuncionId },
            data: {
                descripcion: descValidation.data.descripcion, // Guardar la descripción para la IA
            },
        });
        // Considera si necesitas revalidatePath aquí
        // revalidatePath(`/admin/tareas/ruta_donde_se_ve_esto`);
        return { success: true, data: funcionActualizada };
    } catch (error: unknown) {
        console.error(`Error al actualizar descripción de TareaFuncion ${tareaFuncionId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Función de tarea no encontrada para actualizar." };
        }
        return { success: false, error: `No se pudo actualizar la descripción. ${(error instanceof Error ? error.message : '')}` };
    }
}