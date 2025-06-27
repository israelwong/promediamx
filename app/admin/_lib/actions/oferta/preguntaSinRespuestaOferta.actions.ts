'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
// import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PreguntaSinRespuestaOfertaListItemSchema, VincularPreguntaInputSchema, MarcarComoNotificadaInputSchema } from './preguntaSinRespuestaOferta.schemas';
import type { PreguntaSinRespuestaOfertaListItemType } from './preguntaSinRespuestaOferta.schemas';

/**
 * Obtiene todas las preguntas sin respuesta para una oferta específica.
 */
export async function obtenerPreguntasSinRespuestaAction(ofertaId: string): Promise<ActionResult<PreguntaSinRespuestaOfertaListItemType[]>> {
    try {
        const preguntas = await prisma.preguntaSinRespuestaOferta.findMany({
            where: { ofertaId },
            select: {
                id: true,
                ofertaId: true,
                preguntaUsuario: true,
                estado: true,
                fechaCreacion: true,
                ofertaDetalleRespuesta: {
                    select: {
                        id: true,
                        tituloDetalle: true,
                    }
                }
            },
            orderBy: {
                fechaCreacion: 'desc'
            }
        });

        const validation = z.array(PreguntaSinRespuestaOfertaListItemSchema).safeParse(preguntas);
        if (!validation.success) {
            console.error("Error Zod en obtenerPreguntasSinRespuestaAction:", validation.error);
            return { success: false, error: "Los datos de las preguntas son inconsistentes." };
        }

        return { success: true, data: validation.data };

    } catch (error) {
        console.error("Error al obtener preguntas sin respuesta:", error);
        return { success: false, error: "No se pudieron cargar las preguntas pendientes." };
    }
}


/**
 * Resuelve una pregunta vinculándola a un detalle de oferta existente.
 */
export async function resolverPreguntaVinculandoDetalleAction(input: z.infer<typeof VincularPreguntaInputSchema>): Promise<ActionResult<null>> {
    const validation = VincularPreguntaInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }

    try {
        await prisma.preguntaSinRespuestaOferta.update({
            where: { id: validation.data.preguntaSinRespuestaId },
            data: {
                estado: 'RESPONDIDA_LISTA_PARA_NOTIFICAR',
                ofertaDetalleRespuestaId: validation.data.ofertaDetalleId,
            }
        });

        // Idealmente, se revalida la ruta del manager que contiene este componente.
        // revalidatePath(...) 

        return { success: true, data: null };
    } catch (error) {
        console.error("Error al vincular pregunta:", error);
        return { success: false, error: "No se pudo vincular la pregunta a la respuesta." };
    }
}


/**
 * Marca una pregunta como resuelta y notificada al usuario.
 */
export async function marcarPreguntaComoNotificadaAction(input: z.infer<typeof MarcarComoNotificadaInputSchema>): Promise<ActionResult<null>> {
    const validation = MarcarComoNotificadaInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }

    try {
        await prisma.preguntaSinRespuestaOferta.update({
            where: { id: validation.data.preguntaSinRespuestaId },
            data: {
                estado: 'RESUELTA_Y_NOTIFICADA', // O 'ARCHIVADA', según tu lógica de estados.
                fechaNotificacionUsuario: new Date(),
            }
        });

        return { success: true, data: null };
    } catch (error) {
        console.error("Error al marcar como notificada:", error);
        return { success: false, error: "No se pudo actualizar el estado de la pregunta." };
    }
}
