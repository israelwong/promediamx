// /tasks/cancelarCita.handler.ts
// Este handler contiene la lógica para la tarea de cancelar una cita.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { StatusAgenda, EstadoTareaConversacional } from '@prisma/client';

import type { ActionResult } from '@/app/admin/_lib/types';
import type { FsmContext, CancelarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { findBestMatchingAppointment } from '../helpers/availability.helpers';
import { ejecutarCancelacionFinalCitaAction } from '../helpers/actions.helpers';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarCancelarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, usuarioWaId, negocioPhoneNumberId } = contexto;
    const tareaContexto = (tarea.contexto as CancelarCitaContext) || {};

    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    console.log(`[Paso 3.2 - CANCELAR] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            // 1. Buscamos TODAS las citas activas del usuario, incluyendo las reagendadas.
            const citasActivas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { in: [StatusAgenda.PENDIENTE] },
                    fecha: { gte: new Date() }
                },
                orderBy: { fecha: 'asc' },
                take: 10
            });

            if (citasActivas.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita futura para cancelar.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                return { success: true, data: null };
            }

            // 2. Lógica Oportunista: Intentamos identificar la cita desde el primer mensaje.
            const citaIdentificada = findBestMatchingAppointment(textoUsuario, citasActivas);

            if (citaIdentificada) {
                // ¡Éxito! Encontramos una cita. Saltamos directo a la confirmación.
                tareaContexto.citaIdParaCancelar = citaIdentificada.id;
                await prisma.tareaEnProgreso.update({
                    where: { id: tarea.id },
                    data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO }
                });

                const fechaLegible = new Date(citaIdentificada.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Entendido. Solo para confirmar, ¿cancelamos la cita para "${citaIdentificada.asunto}" del ${fechaLegible}?`, usuarioWaId, negocioPhoneNumberId);

            } else {
                // No hay coincidencia clara, listamos las opciones para que el usuario elija.
                let mensajeLista = "Encontré estas citas futuras a tu nombre. ¿Cuál de ellas te gustaría cancelar?\n";
                citasActivas.forEach((cita, index) => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
                });

                tareaContexto.citasEncontradas = citasActivas;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const respuestaUsuario = textoUsuario.toLowerCase();

            if (['si', 'sí', 'afirmativo', 'correcto'].some(kw => respuestaUsuario.includes(kw))) {
                if (tareaContexto.citaIdParaCancelar) {
                    await ejecutarCancelacionFinalCitaAction(tareaContexto.citaIdParaCancelar);
                    await enviarMensajeAsistente(conversacionId, "Listo. Tu cita ha sido cancelada exitosamente.", usuarioWaId, negocioPhoneNumberId);
                }
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "Entendido, no he cancelado nada. Si necesitas algo más, aquí estoy.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        default:
            console.warn(`[FSM ADVERTENCIA] Tarea '${tarea.nombreTarea}' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: true, data: null };
    }
}