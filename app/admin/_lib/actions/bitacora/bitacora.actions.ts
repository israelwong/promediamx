'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { obtenerNotasLeadParamsSchema, type NotaBitacora } from './bitacora.schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';



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

export async function agregarNotaLeadAction(params: { leadId: string; descripcion: string; agenteId: string | null; }): Promise<ActionResult<NotaBitacora>> {
    try {
        const nuevaNota = await prisma.bitacora.create({
            data: {
                leadId: params.leadId,
                descripcion: params.descripcion,
                agenteId: params.agenteId,
                tipoAccion: 'NOTA_MANUAL', // <-- Se asegura el tipo correcto
            },
            include: { agente: { select: { nombre: true } } },
        });
        revalidatePath(`/agente/prospectos/${params.leadId}`);
        return { success: true, data: nuevaNota as NotaBitacora };
    } catch {
        return { success: false, error: "No se pudo guardar la nota." };
    }
}


// --- NUEVA ACCIÓN PARA EDITAR NOTAS ---
export async function editarNotaLeadAction(params: { notaId: string; descripcion: string; }): Promise<ActionResult<NotaBitacora>> {
    try {
        const notaActualizada = await prisma.bitacora.update({
            where: { id: params.notaId },
            data: { descripcion: params.descripcion },
            include: { agente: true },
        });
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/.*`); // Revalida la ruta del lead
        return { success: true, data: notaActualizada as NotaBitacora };
    } catch {
        return { success: false, error: "No se pudo actualizar la nota." };
    }
}

// --- NUEVA ACCIÓN PARA ELIMINAR NOTAS ---
export async function eliminarNotaLeadAction(params: { notaId: string; }): Promise<ActionResult<void>> {
    try {
        await prisma.bitacora.delete({
            where: { id: params.notaId },
        });
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/.*`); // Revalida la ruta del lead
        return { success: true };
    } catch {
        return { success: false, error: "No se pudo eliminar la nota." };
    }
}

export async function obtenerHistorialLeadAction(params: { leadId: string; }) {
    try {
        const historial = await prisma.bitacora.findMany({
            where: { leadId: params.leadId },
            orderBy: { createdAt: 'desc' },
            include: {
                agente: { select: { nombre: true } } // Incluimos el nombre del agente
            },
        });
        return { success: true, data: historial };
    } catch {
        return { success: false, error: "No se pudo obtener el historial." };
    }
}

export async function registrarEnBitacora(params: {
    leadId: string;
    tipoAccion: string;
    descripcion: string;
    agenteId?: string | null;
    metadata?: Prisma.JsonObject;
}) {
    const { leadId, tipoAccion, descripcion, agenteId = null, metadata = {} } = params;

    try {
        await prisma.bitacora.create({
            data: {
                leadId,
                tipoAccion,
                descripcion,
                agenteId,
                metadata,
            }
        });
        // Revalidamos la ruta del lead para que el historial se actualice
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/${leadId}`);
        revalidatePath(`/agente/prospectos/${leadId}`);

    } catch (error) {
        // En una función helper como esta, no queremos que un error de log
        // detenga la acción principal. Simplemente lo registramos en la consola del servidor.
        console.error("Error al registrar en la bitácora:", error);
    }
}


// --- NUEVA ACCIÓN PARA EDITAR UNA NOTA MANUAL ---
export async function editarNotaManualAction(params: { notaId: string; nuevaDescripcion: string; }): Promise<ActionResult<void>> {
    try {
        await prisma.bitacora.update({
            where: {
                id: params.notaId,
                // Seguridad: solo permite editar si es una nota manual
                tipoAccion: 'NOTA_MANUAL',
            },
            data: {
                descripcion: params.nuevaDescripcion,
            },
        });
        revalidatePath(`/agente/prospectos/.*`);
        return { success: true };
    } catch {
        return { success: false, error: "No se pudo actualizar la nota." };
    }
}

// --- NUEVA ACCIÓN PARA ELIMINAR UNA NOTA MANUAL ---
export async function eliminarNotaManualAction(params: { notaId: string; }): Promise<ActionResult<void>> {
    try {
        await prisma.bitacora.delete({
            where: {
                id: params.notaId,
                // Seguridad: solo permite eliminar si es una nota manual
                tipoAccion: 'NOTA_MANUAL',
            },
        });
        revalidatePath(`/agente/prospectos/.*`);
        return { success: true };
    } catch {
        return { success: false, error: "No se pudo eliminar la nota." };
    }
}