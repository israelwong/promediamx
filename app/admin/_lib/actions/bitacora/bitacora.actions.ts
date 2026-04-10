'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { obtenerNotasLeadParamsSchema, type NotaBitacora } from './bitacora.schemas';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { type HistorialItem } from './bitacora.schemas';


const ObtenerHistorialSchema = z.object({
    leadId: z.string(),
});


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
                agente: {
                    select: {
                        id: true,
                        nombre: true
                    }
                },
                agenteId: true, // Incluimos el ID del agente para futuras referencias
            },
            orderBy: { createdAt: 'desc' }, // Las más recientes primero
        });
        return { success: true, data: notas };
    } catch {
        return { success: false, error: "No se pudieron cargar las notas." };
    }
}

const AgregarNotaSchema = z.object({
    leadId: z.string(),
    descripcion: z.string().min(1, "La nota no puede estar vacía."),
    agenteId: z.string().nullable(),
});

export async function agregarNotaLeadAction(
    params: z.infer<typeof AgregarNotaSchema>
): Promise<ActionResult<NotaBitacora>> {
    const validation = AgregarNotaSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }

    const { leadId, descripcion, agenteId } = validation.data;

    try {
        const nuevaNota = await prisma.bitacora.create({
            data: {
                leadId,
                descripcion,
                agenteId,
                tipoAccion: 'NOTA_MANUAL',
                metadata: { autor: 'agente' } // Metadata opcional para más contexto
            },
            include: {
                agente: {
                    select: { nombre: true }
                }
            }
        });

        // Opcional: Revalidar la ruta para asegurar que los datos se refrescan
        // router.refresh() en el cliente ya hace esto, pero es una buena práctica tenerlo.
        revalidatePath(`/agente/leads/${leadId}`);

        return { success: true, data: nuevaNota };

    } catch (error) {
        console.error("Error al agregar nota:", error);
        return { success: false, error: "Ocurrió un error en el servidor." };
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



export async function obtenerHistorialLeadAction(
    params: z.infer<typeof ObtenerHistorialSchema>
): Promise<ActionResult<HistorialItem[]>> {
    const validation = ObtenerHistorialSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de lead inválido." };
    }

    try {
        const historial = await prisma.bitacora.findMany({
            where: {
                leadId: validation.data.leadId,
            },
            // --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ---
            // Seleccionamos explícitamente todos los campos que el componente necesita.
            select: {
                id: true,
                descripcion: true,
                createdAt: true,
                updatedAt: true,
                tipoAccion: true,
                metadata: true,
                leadId: true,
                agenteId: true, // <-- Seleccionamos el ID del agente
                agente: {      // <-- Incluimos la relación para obtener el nombre
                    select: {
                        nombre: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc', // Ordenamos del más reciente al más antiguo
            },
        });

        // Prisma devuelve el tipo correcto, no es necesario un mapeo adicional.
        return { success: true, data: historial };

    } catch (error) {
        console.error("Error al obtener el historial del lead:", error);
        return { success: false, error: "No se pudo cargar el historial." };
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