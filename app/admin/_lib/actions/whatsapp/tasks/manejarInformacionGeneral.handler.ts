// app/admin/_lib/actions/whatsapp/tasks/manejarInformacionGeneral.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';

// Tipos y Helpers
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';
import { getEmbeddingForText } from '../../../ia/ia.actions';

/**
 * Handler para responder preguntas generales usando la base de conocimiento del negocio (RAG).
 * Utiliza búsqueda por vectores semánticos para encontrar la respuesta más relevante.
 */
export async function manejarInformacionGeneral(
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log('[INFO HANDLER] Iniciando búsqueda en base de conocimiento general.');
    const { conversacionId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;

    if (contexto.mensaje.type !== 'text') {
        return { success: true, data: null };
    }
    const preguntaUsuario = contexto.mensaje.content;

    try {
        const preguntaVector = await getEmbeddingForText(preguntaUsuario);

        if (!preguntaVector) {
            throw new Error("No se pudo generar el vector para la pregunta del usuario.");
        }

        const resultadosBusqueda = await prisma.$queryRaw<Array<{ id: string; respuesta: string; similitud: number }>>`
            SELECT id, respuesta, 1 - ("embeddingPregunta" <=> ${preguntaVector}::vector) as similitud
            FROM "NegocioConocimientoItem"
            WHERE "negocioId" = ${asistente.negocio!.id} AND estado = 'RESPONDIDA'
            ORDER BY similitud DESC
            LIMIT 1;
        `;

        let respuestaFinal: string;
        const SIMILARITY_THRESHOLD = 0.70;

        if (resultadosBusqueda.length > 0 && resultadosBusqueda[0].similitud > SIMILARITY_THRESHOLD) {
            console.log(`[INFO HANDLER] Respuesta encontrada con similitud: ${resultadosBusqueda[0].similitud}`);
            respuestaFinal = resultadosBusqueda[0].respuesta;

            respuestaFinal += "\n\n¿Puedo ayudarte con algo más o te gustaría agendar una cita para recibir atención personalizada?";

            await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId: conversacionId,
                    nombreTarea: 'seguimientoGenerico',
                    estado: EstadoTareaConversacional.INICIADA,
                    contexto: {
                        preguntaAnterior: 'invitacion_agendar_cita_desde_info',
                    } as Prisma.JsonObject,
                },
            });

        } else {
            // --- LÓGICA CORREGIDA PARA GESTIONAR PREGUNTAS SIN RESPUESTA ---
            console.log('[INFO HANDLER] No se encontró respuesta con suficiente similitud. Registrando pregunta...');
            respuestaFinal = "Esa es una excelente pregunta. Permíteme consultarlo con un asesor para darte la información más precisa. Mientras tanto, ¿hay algo más en lo que pueda ayudarte?";

            // Usamos el nuevo modelo dedicado para registrar la pregunta.
            await prisma.preguntaSinRespuestaGeneral.create({
                data: {
                    negocioId: asistente.negocio!.id,
                    conversacionId: conversacionId,
                    preguntaUsuario: preguntaUsuario,
                    estado: 'PENDIENTE_REVISION'
                }
            });
            console.log('[INFO HANDLER] Pregunta sin respuesta registrada en la nueva tabla.');
        }

        await enviarMensajeAsistente(conversacionId, respuestaFinal, usuarioWaId, negocioPhoneNumberId);
        return { success: true, data: null };

    } catch (error) {
        console.error("[INFO HANDLER] Error al procesar la pregunta general:", error);
        const mensajeError = "Tuve un problema para procesar tu pregunta. Por favor, intenta reformularla.";
        await enviarMensajeAsistente(conversacionId, mensajeError, usuarioWaId, negocioPhoneNumberId);
        return { success: false, error: "Error interno en el handler de información general." };
    }
}