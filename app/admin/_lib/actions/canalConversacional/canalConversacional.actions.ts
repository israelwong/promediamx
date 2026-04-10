'use server';

import { Prisma }
    from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache'; // Para revalidar rutas en Next.js
// import { z } from 'zod';

// Importar ActionResult global
import type { ActionResult } from '@/app/admin/_lib/types';

// Importar esquemas Zod y tipos inferidos
import {
    CanalConversacionalInputSchema,
    type CanalConversacionalInput, // Tipo inferido de Zod
    OrdenarCanalesInputSchema
} from './canalConversacional.schemas';

// Importar el tipo base de Prisma para el retorno de datos si es necesario
// o usar tipos más específicos si se transforman los datos.
// Tu archivo original usaba: import { CanalConversacional as CanalConversacionalBasePrisma } from '../types';
// Asumiremos que este es el tipo que Prisma devuelve para CanalConversacional.
import type { CanalConversacional as CanalConversacionalPrisma } from '@prisma/client';


// --- Obtener SOLO Canales Conversacionales ACTIVOS ---
export async function obtenerCanalesActivos(): Promise<ActionResult<CanalConversacionalPrisma[]>> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            where: { status: 'activo' },
            orderBy: { orden: 'asc' },
        });
        return { success: true, data: canales };
    } catch (error: unknown) {
        console.error('Error al obtener los canales conversacionales activos:', error);
        return { success: false, error: 'No se pudieron obtener los canales activos.' };
    }
}

// --- Obtener Todos los Canales Conversacionales (Con conteos) ---
// Definimos un tipo específico para el retorno de esta función, incluyendo _count.
export type CanalConversacionalConConteos = CanalConversacionalPrisma & {
    _count: {
        tareasSoportadas: number;
        AsistenteVirtual: number;
    };
};

export async function obtenerCanalesConversacionales(): Promise<ActionResult<CanalConversacionalConConteos[]>> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            orderBy: { orden: 'asc' },
            include: {
                _count: {
                    select: {
                        tareasSoportadas: true,
                        AsistenteVirtual: true,
                    },
                },
            },
        });
        // El tipo 'canales' inferido por Prisma con 'include' es complejo.
        // Hacemos un type assertion seguro si estamos confiados en la estructura.
        return { success: true, data: canales as CanalConversacionalConConteos[] };
    } catch (error: unknown) {
        console.error('Error al obtener los canales conversacionales:', error);
        return { success: false, error: 'No se pudieron obtener los canales conversacionales.' };
    }
}

// --- Crear un nuevo Canal Conversacional ---
export async function crearCanalConversacional(
    input: CanalConversacionalInput // Usar el tipo inferido de Zod
): Promise<ActionResult<CanalConversacionalPrisma>> {
    const validationResult = CanalConversacionalInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error('Error de validación en crearCanalConversacional:', validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .filter(([v]) => Array.isArray(v))
                    .map(([k, v]) => [String(k), v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    try {
        const ultimoCanal = await prisma.canalConversacional.findFirst({
            orderBy: { orden: 'desc' },
            select: { orden: true },
        });
        const nuevoOrden = (ultimoCanal?.orden ?? -1) + 1;

        const newCanal = await prisma.canalConversacional.create({
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion, // Ya es nullable por el schema Zod
                icono: data.icono,         // Ya es nullable por el schema Zod
                status: data.status,       // Tiene default en el schema Zod
                orden: nuevoOrden,
            },
        });
        revalidatePath('/admin/tareas/canales'); // Revalidar para actualizar la lista
        return { success: true, data: newCanal };
    } catch (error: unknown) {
        console.error('Error al crear el canal conversacional:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al crear el canal.") };
    }
}

// --- Editar un Canal Conversacional existente ---
export async function editarCanalConversacional(
    id: string,
    input: CanalConversacionalInput // Usar el tipo inferido de Zod
): Promise<ActionResult<CanalConversacionalPrisma>> {
    if (!id) {
        return { success: false, error: "ID de canal no proporcionado." };
    }
    const validationResult = CanalConversacionalInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error('Error de validación en editarCanalConversacional:', validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: 'Datos de entrada inválidos.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .map(([k, v]) => [String(k), v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    try {
        // El schema Zod ya maneja los valores por defecto y opcionales,
        // por lo que `data` ya contiene solo lo necesario.
        const updatedCanal = await prisma.canalConversacional.update({
            where: { id },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                icono: data.icono,
                status: data.status,
                // 'orden' no se edita aquí
            },
        });
        revalidatePath('/admin/tareas/canales');
        return { success: true, data: updatedCanal };
    } catch (error: unknown) {
        console.error(`Error al actualizar el canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: `Canal con ID ${id} no encontrado.` };
            }
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al editar el canal.") };
    }
}

// --- Eliminar un Canal Conversacional ---
export async function eliminarCanalConversacional(id: string): Promise<ActionResult<null>> {
    try {
        if (!id) {
            return { success: false, error: "ID de canal no proporcionado." };
        }
        // Las validaciones de uso (tareasAsociadasCount, etc.) se mantienen como en tu código original.
        const tareasAsociadasCount = await prisma.tareaCanal.count({ where: { canalConversacionalId: id } });
        const asistentesAsociadosCount = await prisma.asistenteVirtual.count({ where: { canalConversacionalId: id } });

        if (tareasAsociadasCount > 0 || asistentesAsociadosCount > 0) {
            let errorMsg = "No se puede eliminar: el canal está en uso por";
            if (tareasAsociadasCount > 0) errorMsg += ` ${tareasAsociadasCount} tarea(s)`;
            if (asistentesAsociadosCount > 0) errorMsg += `${tareasAsociadasCount > 0 ? ' y' : ''} ${asistentesAsociadosCount} asistente(s)`;
            return { success: false, error: `${errorMsg.trim()}.` };
        }

        await prisma.canalConversacional.delete({ where: { id } });
        revalidatePath('/admin/tareas/canales');
        return { success: true, data: null }; // Data es null en eliminación exitosa
    } catch (error: unknown) {
        // ... (mismo manejo de error que en tu original) ...
        console.error(`Error al eliminar el canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Canal con ID ${id} no encontrado.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : 'Error desconocido al eliminar el canal.') };
    }
}

// --- Actualizar el Orden de los Canales Conversacionales ---
export async function ordenarCanalesConversacionales(
    input: unknown // Se validará con Zod
): Promise<ActionResult<null>> {
    const validationResult = OrdenarCanalesInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error('Error de validación en ordenarCanalesConversacionales:', validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: 'Datos de entrada inválidos para ordenar.',
            validationErrors: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors)
                    .map(([k, v]) => [String(k), v ?? []])
            ) as Record<string, string[]>,
        };
    }
    const items = validationResult.data;

    if (!items || items.length === 0) {
        return { success: true, data: null }; // No hay nada que ordenar.
    }
    try {
        const updatePromises = items.map(item =>
            prisma.canalConversacional.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        revalidatePath('/admin/tareas/canales');
        return { success: true, data: null };
    } catch (error: unknown) {
        // ... (mismo manejo de error que en tu original) ...
        console.error("Error al actualizar el orden de los canales:", error);
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al actualizar el orden.") };
    }
}