'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import {
    CitaSchema,
    actualizarEstadoCitaParamsSchema,
    CitaParaCalendario
} from './citas.schemas';

import type {
    CitaType,
    EtapaPipelineSimple
} from './citas.schemas';
import { type ListarCitasResult, listarCitasParamsSchema } from './citas.schemas';
import { Prisma } from '@prisma/client';


import { revalidatePath } from 'next/cache';
import { z } from 'zod';


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


export async function listarCitasAction(
    params: z.infer<typeof listarCitasParamsSchema>
): Promise<ActionResult<ListarCitasResult>> {
    const validation = listarCitasParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }
    const { negocioId, page, pageSize } = validation.data;
    const skip = (page - 1) * pageSize;

    try {
        const whereClause: Prisma.AgendaWhereInput = {
            negocioId: negocioId,
            status: 'PENDIENTE',
        };

        const [citas, totalCount] = await prisma.$transaction([
            prisma.agenda.findMany({
                where: whereClause,
                select: {
                    id: true,
                    fecha: true,
                    lead: {
                        select: {
                            id: true,
                            nombre: true,
                            telefono: true,
                            Pipeline: { select: { nombre: true } },
                        },
                    },
                },
                orderBy: { fecha: 'asc' },
                skip,
                take: pageSize,
            }),
            prisma.agenda.count({ where: whereClause }),
        ]);

        const citasAplanadas = citas
            .filter(c => c.lead)
            .map((cita) => ({
                id: cita.id,
                fecha: cita.fecha,
                leadId: cita.lead!.id,
                leadNombre: cita.lead!.nombre,
                leadTelefono: cita.lead!.telefono,
                pipelineNombre: cita.lead!.Pipeline?.nombre || 'Sin Etapa',
            }));

        return {
            success: true,
            data: {
                citas: citasAplanadas,
                totalCount,
                startIndex: skip,
            }
        };

    } catch (error) {
        console.error("Error en listarCitasAction:", error);
        return { success: false, error: "No se pudieron cargar las citas." };
    }
}




// Dedicada exclusivamente a obtener los datos para el calendario.
export async function listarCitasParaCalendarioAction(
    params: { negocioId: string }
): Promise<ActionResult<CitaParaCalendario[]>> {
    try {
        const citas = await prisma.agenda.findMany({
            where: {
                negocioId: params.negocioId,
                status: 'PENDIENTE',
            },
            select: {
                id: true,
                asunto: true,
                fecha: true, // Se obtiene como 'fecha'
                lead: {
                    select: { id: true, nombre: true },
                },
                tipoDeCita: {
                    select: { nombre: true, duracionMinutos: true }, // Se obtiene la duración
                },
            },
        });

        // Mapeamos los datos al esquema que el calendario necesita
        const citasParaCalendario: CitaParaCalendario[] = citas
            .filter(c => c.lead)
            .map(cita => ({
                id: cita.id,
                asunto: cita.asunto,
                start: cita.fecha, // Se renombra 'fecha' a 'start'
                lead: cita.lead!,
                tipoDeCita: cita.tipoDeCita,
            }));

        return { success: true, data: citasParaCalendario };

    } catch (error) {
        console.error("Error en listarCitasParaCalendarioAction:", error);
        return { success: false, error: "No se pudieron cargar los datos del calendario." };
    }
}


// ✅ Para poblar el dropdown de filtro de etapas
export async function obtenerEtapasPipelineParaFiltroAction(
    negocioId: string
): Promise<ActionResult<EtapaPipelineSimple[]>> {
    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { Pipeline: { select: { id: true, nombre: true }, orderBy: { orden: 'asc' } } }
        });

        if (!crm) {
            return { success: true, data: [] };
        }

        return { success: true, data: crm.Pipeline };
    } catch (error) {
        console.error("Error en obtenerEtapasPipelineParaFiltroAction:", error);
        return { success: false, error: "No se pudieron cargar las etapas del pipeline." };
    }
}