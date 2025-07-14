// ==================================================================
// MANEJADOR DE TAREA: responderPreguntaGeneral
// VERSIÓN: FINAL - HÍBRIDA (REGLAS + IA)
// ==================================================================

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput } from '../whatsapp.schemas';
import { getEmbeddingForText } from '@/app/admin/_lib/ia/ia.actions';
import { enviarMensajeAsistente } from '../core/orchestrator';

type ResultadoBusquedaSemantica = {
    id: string;
    nombre: string;
    descripcion: string;
    similitud: number;
}

export async function buscarMejoresRespuestas(texto: string, negocioId: string, umbral: number): Promise<ResultadoBusquedaSemantica[]> {
    const textoVector = await getEmbeddingForText(texto);
    if (!textoVector) return [];

    const resultados = await prisma.$queryRaw<ResultadoBusquedaSemantica[]>`
        SELECT 
            id, 
            "preguntaFormulada" as nombre, 
            respuesta as descripcion, 
            1 - ("embeddingPregunta" <=> ${textoVector}::vector) as similitud
        FROM "NegocioConocimientoItem"
        WHERE "negocioId" = ${negocioId} AND "embeddingPregunta" IS NOT NULL
        ORDER BY similitud DESC
        LIMIT 5;
    `;
    return resultados.filter(r => r.similitud > umbral);
}

export async function responderPreguntaGeneral(contexto: FsmContext): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const textoUsuario = contexto.mensaje.type === 'text' ? contexto.mensaje.content : '';
    const { conversacionId, usuarioWaId, negocioPhoneNumberId, asistente } = contexto;

    if (!textoUsuario) return { success: true, data: null };

    // --- PASO 1: TRIAJE INTELIGENTE POR REGLAS ---
    const textoNormalizado = textoUsuario.toLowerCase().trim();
    const keywordsCostos = ['costos', 'precios', 'colegiaturas', 'inscripción', 'inscripciones'];

    if (keywordsCostos.some(kw => textoNormalizado === kw)) {
        console.log("[TRIAJE] Pregunta genérica de costos detectada. Buscando respuesta maestra.");
        const respuestaMaestra = await prisma.negocioConocimientoItem.findFirst({
            where: { negocioId: asistente.negocio!.id, categoria: 'COSTOS_GENERALES' }
        });

        if (respuestaMaestra?.respuesta) {
            await enviarMensajeAsistente(conversacionId, respuestaMaestra.respuesta, usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }
    }

    // --- PASO 2: BÚSQUEDA SEMÁNTICA (SI EL TRIAJE NO ENCUENTRA NADA) ---
    console.log("[RAG] Pregunta específica. Iniciando búsqueda semántica...");
    const umbralDeConfianza = asistente.umbralSimilitud ?? 0.72;
    const mejoresRespuestas = await buscarMejoresRespuestas(textoUsuario, asistente.negocio!.id, umbralDeConfianza);

    if (mejoresRespuestas.length > 0) {
        // Para el MVP, si hay ambigüedad, damos la mejor respuesta. Podemos refinar después.
        const mejorRespuesta = mejoresRespuestas[0];
        await enviarMensajeAsistente(conversacionId, mejorRespuesta.descripcion, usuarioWaId, negocioPhoneNumberId);

        const algunaOfertaConCita = await prisma.oferta.findFirst({
            where: { negocioId: asistente.negocio!.id, status: 'ACTIVO', objetivos: { has: 'CITA' } }
        });
        if (algunaOfertaConCita) {
            const preguntaDeCierre = 'Además de esta información, ¿te gustaría agendar una cita para resolver todas tus dudas?';
            await enviarMensajeAsistente(conversacionId, preguntaDeCierre, usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId,
                    nombreTarea: 'seguimientoGenerico',
                    contexto: { siguienteTarea: 'agendarCita' } as Prisma.JsonObject
                }
            });
        }
    } else {
        // Knowledge Gap
        await prisma.preguntaSinRespuestaGeneral.create({
            data: { negocioId: asistente.negocio!.id, preguntaUsuario: textoUsuario, conversacionId }
        });
        await enviarMensajeAsistente(conversacionId, "Esa es una excelente pregunta. En este momento no tengo la información, pero he notificado a un asesor para que te ayude a la brevedad.", usuarioWaId, negocioPhoneNumberId);
    }

    return { success: true, data: null };
}