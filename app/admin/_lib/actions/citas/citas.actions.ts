'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { z } from 'zod';
import { CitaSchema } from './citas.schemas';
import type { CitaType } from './citas.schemas';

/**
 * Obtiene todas las citas de un negocio, ordenadas por fecha.
 * @param negocioId - El ID del negocio para el cual se obtienen las citas.
 * @returns Un ActionResult con la lista de citas o un error.
 */
export async function getCitasPorNegocioAction(negocioId: string): Promise<ActionResult<CitaType[]>> {
    if (!negocioId) {
        return { success: false, error: "El ID del negocio es requerido." };
    }
    try {
        const citas = await prisma.agenda.findMany({
            where: { negocioId },
            select: {
                id: true,
                fecha: true,
                asunto: true,
                status: true,
                lead: {
                    select: {
                        nombre: true,
                        telefono: true,
                    }
                },
                tipoDeCita: {
                    select: {
                        nombre: true,
                        duracionMinutos: true,
                    }
                }
            },
            orderBy: {
                fecha: 'asc', // Ordenar por fecha ascendente
            }
        });

        const validation = z.array(CitaSchema).safeParse(citas);
        if (!validation.success) {
            console.error("Error Zod en getCitasPorNegocioAction:", validation.error.flatten());
            return { success: false, error: "Los datos de las citas son inconsistentes." };
        }

        return { success: true, data: validation.data };
    } catch (error) {
        console.error("Error obteniendo citas:", error);
        return { success: false, error: "No se pudieron cargar las citas." };
    }
}


/**
 * Actualiza el estado de una cita.
 * @param citaId - El ID de la cita a actualizar.
 * @param nuevoEstado - El nuevo estado de la cita.
 * @returns Un ActionResult con la cita actualizada o un error.
 */
import { actualizarEstadoCitaParamsSchema, listarCitasParamsSchema, type CitaListItem } from './citas.schemas';
import { addMinutes } from 'date-fns';
import { revalidatePath } from 'next/cache';

export async function actualizarEstadoCitaAction(
    params: z.infer<typeof actualizarEstadoCitaParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = actualizarEstadoCitaParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }

    const { agendaId, nuevoEstado } = validation.data;

    try {
        const cita = await prisma.agenda.findUnique({
            where: { id: agendaId },
            select: { negocio: { select: { id: true, clienteId: true } } }
        });

        if (!cita?.negocio) return { success: false, error: "Cita o negocio no encontrado." };

        await prisma.agenda.update({
            where: { id: agendaId },
            data: { status: nuevoEstado },
        });

        // Revalidamos la ruta de citas para este negocio en específico
        const path = `/admin/clientes/${cita.negocio.clienteId}/negocios/${cita.negocio.id}/citas`;
        revalidatePath(path);

        return { success: true, data: true };
    } catch (error) {
        console.error("Error en actualizarEstadoCitaAction:", error);
        return { success: false, error: "Error al actualizar el estado de la cita." };
    }
}


import { StatusAgenda } from './citas.schemas';


export async function listarCitasAction(
    params: z.infer<typeof listarCitasParamsSchema>
): Promise<ActionResult<CitaListItem[]>> {
    const validation = listarCitasParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };

    const { negocioId } = validation.data;

    try {
        const citas = await prisma.agenda.findMany({
            where: {
                negocioId,
                // Por ahora traemos las del último mes y las del próximo mes
                fecha: {
                    gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                    lte: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                }
            },
            include: {
                lead: { select: { id: true, nombre: true, telefono: true } },
                tipoDeCita: { select: { nombre: true, duracionMinutos: true } },
            },
            orderBy: { fecha: 'asc' },
        });

        // Mapeamos los datos al formato que espera react-big-calendar y nuestra UI
        const formattedCitas: CitaListItem[] = citas.map(cita => ({
            id: cita.id,
            asunto: cita.asunto,
            start: cita.fecha,
            end: addMinutes(cita.fecha, cita.tipoDeCita?.duracionMinutos || 60), // Calcula la hora de fin
            status: cita.status as StatusAgenda,
            lead: cita.lead,
            tipoDeCita: cita.tipoDeCita ? { nombre: cita.tipoDeCita.nombre } : null,
        }));

        return { success: true, data: formattedCitas };

    } catch (error) {
        console.error("Error en listarCitasAction:", error);
        return { success: false, error: "No se pudieron cargar las citas." };
    }
}