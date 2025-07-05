// app/admin/_lib/actions/whatsapp/tasks/manejarCostos.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';

import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarCostos(
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log('[COSTOS HANDLER] v4.1 (Agnóstico y Corregido) - Iniciando gestión de solicitud de costos.');
    const { conversacionId, asistente, usuarioWaId, negocioPhoneNumberId, mensaje } = contexto;

    if (mensaje.type !== 'text') return { success: true, data: null };

    const textoUsuario = mensaje.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    try {
        const ofertasActivas = await prisma.oferta.findMany({
            where: { negocioId: asistente.negocio!.id, status: 'ACTIVO' },
            include: { detallesAdicionales: { where: { tipoDetalle: 'COSTOS' } } }
        });

        if (ofertasActivas.length === 0) {
            throw new Error("No hay ofertas de costos activas para este negocio.");
        }

        const ofertasCoincidentes = ofertasActivas.filter(oferta =>
            textoUsuario.split(' ').some(palabra =>
                palabra.length > 3 && oferta.nombre.toLowerCase().includes(palabra)
            )
        );

        const ofertaSeleccionada = ofertasCoincidentes.length === 1 ? ofertasCoincidentes[0] : null;

        if (ofertaSeleccionada) {
            console.log(`[COSTOS HANDLER] Coincidencia única encontrada: ${ofertaSeleccionada.nombre}`);

            if (ofertaSeleccionada.detallesAdicionales.length === 0) {
                throw new Error(`La oferta '${ofertaSeleccionada.nombre}' no tiene detalles de costos configurados.`);
            }

            // --- Lógica de envío movida aquí directamente ---
            let respuestaConocimiento = ofertaSeleccionada.detallesAdicionales[0].contenido;
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
                            colegioSugerido: ofertaSeleccionada.nombre.split('-').pop()?.trim()
                        }
                    } as Prisma.JsonObject,
                },
            });

        } else {
            console.log(`[COSTOS HANDLER] Pregunta ambigua. Encontradas ${ofertasCoincidentes.length} coincidencias. Presentando opciones.`);

            const conocimientoGeneral = await prisma.negocioConocimientoItem.findFirst({
                where: { negocioId: asistente.negocio!.id, categoria: 'COSTOS', estado: 'RESPONDIDA' }
            });

            let pregunta = "Para darte la información correcta, por favor dime sobre cuál de nuestras opciones te interesa saber más:\n";
            pregunta += ofertasActivas.map(o => `- ${o.nombre.replace('Inscripción Ciclo 2025 -', '').trim()}`).join('\n');

            if (conocimientoGeneral?.respuesta) {
                pregunta = conocimientoGeneral.respuesta + "\n\n" + pregunta;
            }

            await enviarMensajeAsistente(conversacionId, pregunta, usuarioWaId, negocioPhoneNumberId);

            await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId: conversacionId,
                    nombreTarea: 'esperandoClarificacionCostos',
                    estado: EstadoTareaConversacional.INICIADA,
                    contexto: {}
                },
            });
        }

        return { success: true, data: null };

    } catch (error) {
        console.error("[COSTOS HANDLER] Error:", error);
        await enviarMensajeAsistente(contexto.conversacionId, "Tuve un problema para encontrar la información de costos en este momento.", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
        return { success: false, error: "Error interno en el handler de costos." };
    }
}