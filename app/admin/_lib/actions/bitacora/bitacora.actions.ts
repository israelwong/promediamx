'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { obtenerNotasLeadParamsSchema, agregarNotaLeadParamsSchema, type NotaBitacora } from './bitacora.schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';


export async function obtenerNotasLeadAction(
    params: z.infer<typeof obtenerNotasLeadParamsSchema>
): Promise<ActionResult<NotaBitacora[]>> {
    const validation = obtenerNotasLeadParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "ID de lead inválido." };

    try {
        const notas = await prisma.bitacora.findMany({
            where: {
                leadId: validation.data.leadId,
                tipoAccion: 'nota', // Filtramos solo por las notas
            },
            select: {
                id: true,
                descripcion: true,
                createdAt: true,
                agente: { select: { nombre: true } },
            },
            orderBy: { createdAt: 'desc' }, // Las más recientes primero
        });
        return { success: true, data: notas };
    } catch {
        return { success: false, error: "No se pudieron cargar las notas." };
    }
}

export async function agregarNotaLeadAction(
    params: z.infer<typeof agregarNotaLeadParamsSchema>
): Promise<ActionResult<NotaBitacora>> {

    console.log("\n--- SERVER ACTION: agregarNotaLeadAction INVOCADA ---");
    console.log("SERVER LOG 1. Parámetros recibidos:", params);

    const validation = agregarNotaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        console.error("SERVER LOG 2. Falló la validación de Zod:", validation.error.flatten());
        return { success: false, error: "Datos de nota inválidos." };
    }
    // console.log("SERVER LOG 2. Validación de Zod exitosa.");

    try {
        const { leadId, agenteId, descripcion } = validation.data;
        const dataToCreate = {
            leadId,
            agenteId, // Puede ser null
            descripcion,
            tipoAccion: 'nota' as const, // Forzamos el tipo
        };
        // console.log("SERVER LOG 3. Intentando crear en la base de datos con:", dataToCreate);

        const nuevaNota = await prisma.bitacora.create({
            data: dataToCreate,
            select: {
                id: true,
                descripcion: true,
                createdAt: true,
                agente: { select: { nombre: true } },
            }
        });

        // console.log("SERVER LOG 4. Creación en base de datos EXITOSA. Nueva nota:", nuevaNota);
        revalidatePath('/admin/clientes', 'layout');
        // console.log("SERVER LOG 5. Ruta revalidada.");

        return { success: true, data: nuevaNota };

    } catch (error) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2003') {
                return { success: false, error: "Error de clave foránea: El leadId o agenteId no existen." };
            }
        }
        return { success: false, error: "No se pudo guardar la nota en la base de datos." };
    }
}
