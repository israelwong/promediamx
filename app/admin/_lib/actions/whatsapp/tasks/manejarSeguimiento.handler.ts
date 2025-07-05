// app/admin/_lib/actions/whatsapp/tasks/manejarSeguimiento.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';

// Tipos y Helpers
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

// Importamos el handler de agendamiento para poder llamarlo
import { manejarAgendarCita } from './agendarCita.handler';

/**
 * Handler para gestionar la respuesta del usuario después de una invitación proactiva del bot.
 * Decide si iniciar una nueva tarea (como agendar cita) o finalizar la interacción.
 */
export async function manejarSeguimiento(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log('[SEGUIMIENTO HANDLER] Procesando respuesta a invitación.');
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }

    const textoUsuario = mensaje.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const tareaContexto = tarea.contexto as { preguntaAnterior?: string; contextoOriginal?: { colegioSugerido?: string } };

    const keywordsAfirmativos = ['si', 'claro', 'ok', 'perfecto', 'de acuerdo', 'me gustaria', 'dale', 'proceder', 'adelante'];
    const keywordsNegativos = ['no', 'no gracias', 'en otro momento', 'despues'];

    // Verificamos si la respuesta es afirmativa
    if (keywordsAfirmativos.some(kw => textoUsuario.includes(kw))) {

        // El usuario quiere continuar, eliminamos la tarea de seguimiento actual.
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

        // Verificamos si la invitación era para agendar una cita
        if (tareaContexto.preguntaAnterior === 'invitacion_agendar_cita' || tareaContexto.preguntaAnterior === 'invitacion_agendar_cita_desde_info') {

            console.log('[SEGUIMIENTO HANDLER] Respuesta afirmativa. Iniciando tarea de agendamiento.');


            // --- LÓGICA DE CONTEXTO CORREGIDA ---
            let camposPersonalizadosIniciales = {};
            if (tareaContexto.contextoOriginal?.colegioSugerido) {
                // Buscamos el ID del campo personalizado "Colegio"
                const campoColegio = await prisma.cRMCampoPersonalizado.findFirst({
                    where: { crmId: contexto.asistente.negocio!.CRM!.id, nombre: 'Colegio' }
                });
                if (campoColegio) {
                    // Usamos el ID del campo como clave, no el nombre.
                    camposPersonalizadosIniciales = { [campoColegio.id]: tareaContexto.contextoOriginal.colegioSugerido };
                }
            }

            const nuevaTareaAgendar = await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId: conversacionId,
                    nombreTarea: 'agendarCita',
                    estado: EstadoTareaConversacional.INICIADA,
                    contexto: {
                        camposPersonalizados: camposPersonalizadosIniciales
                    } as Prisma.JsonObject,
                },
            });

            return manejarAgendarCita(nuevaTareaAgendar, mensaje, contexto);
        }

    } else if (keywordsNegativos.some(kw => textoUsuario.includes(kw))) {
        // El usuario no quiere continuar.
        console.log('[SEGUIMIENTO HANDLER] Respuesta negativa. Finalizando flujo.');
        await enviarMensajeAsistente(conversacionId, "Entendido. Si necesitas algo más, no dudes en preguntar.", usuarioWaId, negocioPhoneNumberId);
        // Eliminamos la tarea de seguimiento para limpiar el estado.
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        return { success: true, data: null };

    } else {
        // Respuesta ambigua
        console.log('[SEGUIMIENTO HANDLER] Respuesta ambigua.');
        await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí tu respuesta. ¿Te gustaría agendar una cita?", usuarioWaId, negocioPhoneNumberId);
        return { success: true, data: null };
    }

    // Si por alguna razón no se entra en ninguna de las lógicas anteriores
    return { success: true, data: null };
}