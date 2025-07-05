// app/admin/_lib/actions/whatsapp/tasks/esperandoClarificacionCostos.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';

import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarEsperandoClarificacionCostos(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log('[CLARIFICACION COSTOS HANDLER v3.0] Procesando respuesta del usuario.');
    const { conversacionId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;

    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content.toLowerCase();

    await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

    const ofertasActivas = await prisma.oferta.findMany({
        where: { negocioId: asistente.negocio!.id, status: 'ACTIVO' },
        include: { detallesAdicionales: { where: { tipoDetalle: 'COSTOS' } } }
    });

    let mejorCoincidencia: { puntuacion: number; oferta: typeof ofertasActivas[0] | null } = { puntuacion: 0, oferta: null };

    ofertasActivas.forEach(oferta => {
        const nombreLimpio = oferta.nombre.replace('inscripción ciclo 2025 -', '').trim().toLowerCase();
        const palabrasClaveOferta = nombreLimpio.split(' ');
        let puntuacionActual = 0;
        palabrasClaveOferta.forEach(palabra => {
            if (textoUsuario.includes(palabra)) {
                puntuacionActual++;
            }
        });
        if (puntuacionActual > mejorCoincidencia.puntuacion) {
            mejorCoincidencia = { puntuacion: puntuacionActual, oferta: oferta };
        }
    });

    if (mejorCoincidencia.puntuacion > 0 && mejorCoincidencia.oferta) {
        const ofertaEncontrada = mejorCoincidencia.oferta;
        console.log(`[CLARIFICACION COSTOS HANDLER] Mejor coincidencia encontrada: ${ofertaEncontrada.nombre}`);

        // --- Lógica de envío movida aquí directamente ---
        if (ofertaEncontrada.detallesAdicionales.length === 0) {
            throw new Error(`La oferta '${ofertaEncontrada.nombre}' no tiene detalles de costos configurados.`);
        }

        let respuestaConocimiento = ofertaEncontrada.detallesAdicionales[0].contenido;
        const invitacion = "\n\n¿Te gustaría que te ayude a agendar una cita para darte informes más detallados?";
        respuestaConocimiento += invitacion;

        await enviarMensajeAsistente(conversacionId, respuestaConocimiento, usuarioWaId, negocioPhoneNumberId);

        await prisma.tareaEnProgreso.create({
            data: {
                conversacionId: conversacionId,
                nombreTarea: 'seguimientoGenerico',
                estado: EstadoTareaConversacional.INICIADA,
                contexto: {
                    preguntaAnterior: 'invitacion_agendar_cita',
                    contextoOriginal: {
                        colegioSugerido: ofertaEncontrada.nombre.split('-').pop()?.trim()
                    }
                } as Prisma.JsonObject,
            },
        });

    } else {
        console.log(`[CLARIFICACION COSTOS HANDLER] No se encontró coincidencia para: "${textoUsuario}"`);
        await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí cuál de las opciones elegiste. Por favor, intenta de nuevo.", usuarioWaId, negocioPhoneNumberId);
    }

    return { success: true, data: null };
}