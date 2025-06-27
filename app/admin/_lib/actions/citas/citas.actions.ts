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
