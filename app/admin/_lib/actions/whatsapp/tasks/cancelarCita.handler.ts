// /app/admin/_lib/actions/whatsapp/tasks/cancelarCita.handler.ts

// ==================================================================
// MANEJADOR DE TAREA: cancelarCita
// VERSIÓN: 1.0 - SELLADA
// FECHA DE SELLADO: 4 de Julio de 2025
//
// DESCRIPCIÓN:
// Gestiona el flujo completo para que un usuario cancele una
// cita existente.
// 1. Busca las citas pendientes del usuario.
// 2. Si hay múltiples citas, permite la selección por número o texto.
// 3. Pide una confirmación explícita antes de proceder.
// 4. Actualiza el estado de la cita a CANCELADA y notifica al usuario.
//
// NOTA DE REFACTORIZACIÓN:
// Funcionalidad validada y sellada. Considerar "intocable".
// ==================================================================

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional, StatusAgenda } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, CancelarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';
import { findBestMatchingAppointment } from '../helpers/availability.helpers';
import { enviarEmailCancelacionCita } from '../../email/email.actions';

export async function manejarCancelarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    // ✅ CORRECCIÓN: Añadimos 'asistente' a la desestructuración del contexto.
    const tareaContexto = (tarea.contexto as CancelarCitaContext) || {};
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const textoUsuario = mensaje.type === 'text' ? mensaje.content : '';

    console.log(`[CANCELAR CITA] Estado: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.INICIADA: {
            const citasPendientes = await prisma.agenda.findMany({
                where: { leadId: leadId, status: StatusAgenda.PENDIENTE, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' },
                include: { tipoDeCita: { select: { nombre: true } } }
            });

            if (citasPendientes.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita pendiente para cancelar. ¿Te puedo ayudar en algo más?", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                return { success: true, data: null };
            }

            const listaCitasParaMatch = citasPendientes.map(cita => ({
                id: cita.id,
                asunto: cita.tipoDeCita?.nombre || 'Cita',
                fecha: cita.fecha,
            }));

            const citaEncontrada = findBestMatchingAppointment(textoUsuario, listaCitasParaMatch);

            if (citaEncontrada) {
                tareaContexto.citaIdParaCancelar = citaEncontrada.id;
                const fechaFormateada = new Date(citaEncontrada.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });

                // ✅ CORRECCIÓN: Usamos 'citaEncontrada.asunto' que ya contiene el nombre del servicio.
                const nombreServicio = citaEncontrada.asunto;

                tareaContexto.citaSeleccionadaParaConfirmar = `tu cita de "${nombreServicio}" del ${fechaFormateada}`;

                await enviarMensajeAsistente(conversacionId, `Ok, encontré tu cita. Vamos a cancelar ${tareaContexto.citaSeleccionadaParaConfirmar}. ¿Estás seguro? Responde "sí" para confirmar.`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                return { success: true, data: null };
            }

            if (citasPendientes.length > 1) {
                let mensajeLista = "Encontré estas citas pendientes. ¿Cuál te gustaría cancelar? Por favor, responde con el número o descríbela (ej. 'la del lunes').\n";
                tareaContexto.posiblesCitasParaCancelar = {};
                citasPendientes.forEach((cita, index) => {
                    const numeroOpcion = index + 1;
                    const nombreServicio = cita.tipoDeCita?.nombre || 'Cita';
                    const fechaFormateada = new Date(cita.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });
                    mensajeLista += `\n${numeroOpcion}. **${nombreServicio}** el ${fechaFormateada}`;
                    tareaContexto.posiblesCitasParaCancelar![numeroOpcion] = { id: cita.id, asunto: nombreServicio, fecha: cita.fecha, fechaFormateada };
                });

                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.ESPERANDO_SELECCION_USUARIO } });
                return { success: true, data: null };
            }

            const citaUnica = citasPendientes[0];
            tareaContexto.citaIdParaCancelar = citaUnica.id;
            const fechaFormateadaUnica = new Date(citaUnica.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
            const nombreServicioUnico = citaUnica.tipoDeCita?.nombre || 'Cita';
            tareaContexto.citaSeleccionadaParaConfirmar = `tu cita de "${nombreServicioUnico}" del ${fechaFormateadaUnica}`;
            await enviarMensajeAsistente(conversacionId, `Encontré una cita de "${nombreServicioUnico}" para el ${fechaFormateadaUnica}. ¿Estás seguro de que quieres cancelarla? Responde "sí" para confirmar.`, usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.ESPERANDO_SELECCION_USUARIO: {
            let citaSeleccionada: { id: string; asunto: string; fecha: Date; fechaFormateada: string } | null = null;
            const seleccionNumerica = parseInt(textoUsuario.trim().match(/\d+/)?.[0] || '', 10);

            if (!isNaN(seleccionNumerica) && tareaContexto.posiblesCitasParaCancelar?.[seleccionNumerica]) {
                citaSeleccionada = tareaContexto.posiblesCitasParaCancelar[seleccionNumerica];
            } else {
                const listaCitas = Object.values(tareaContexto.posiblesCitasParaCancelar || {});
                const citaEncontradaPorTexto = findBestMatchingAppointment(textoUsuario, listaCitas);
                if (citaEncontradaPorTexto) {
                    citaSeleccionada = {
                        ...citaEncontradaPorTexto,
                        fechaFormateada: new Date(citaEncontradaPorTexto.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' })
                    };
                }
            }

            if (citaSeleccionada) {
                tareaContexto.citaIdParaCancelar = citaSeleccionada.id;
                tareaContexto.citaSeleccionadaParaConfirmar = `tu cita de "${citaSeleccionada.asunto}" del ${citaSeleccionada.fechaFormateada}`;

                await enviarMensajeAsistente(conversacionId, `Ok, vamos a cancelar ${tareaContexto.citaSeleccionadaParaConfirmar}. ¿Estás seguro? Responde "sí" para confirmar.`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
            } else {
                await enviarMensajeAsistente(conversacionId, "No entendí tu selección. Por favor, responde solo con el número de la cita que quieres cancelar.", usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const keywordsAfirmativos = ['si', 'sí', 'claro', 'ok', 'perfecto', 'de acuerdo', 'correcto'];
            if (keywordsAfirmativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
                if (tareaContexto.citaIdParaCancelar) {
                    const citaCancelada = await prisma.agenda.update({
                        where: { id: tareaContexto.citaIdParaCancelar },
                        data: { status: StatusAgenda.CANCELADA },
                        include: { tipoDeCita: true, lead: true, negocio: { include: { AsistenteVirtual: true } } }
                    });

                    const mensajeConfirmacion = tareaContexto.citaSeleccionadaParaConfirmar
                        ? `¡Listo! Se ha cancelado ${tareaContexto.citaSeleccionadaParaConfirmar}.`
                        : "¡Listo! Tu cita ha sido cancelada.";
                    await enviarMensajeAsistente(conversacionId, mensajeConfirmacion, usuarioWaId, negocioPhoneNumberId);

                    if (citaCancelada.lead.email) {
                        const asistenteActivo = citaCancelada.negocio?.AsistenteVirtual.find(a => a.id === asistente.id);
                        const numeroWhatsappAsistente = asistenteActivo?.whatsappBusiness?.replace(/\D/g, '');

                        if (numeroWhatsappAsistente) {
                            const textoAgendar = "Hola, quiero agendar una cita.";
                            const linkAgendarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoAgendar)}`;

                            await enviarEmailCancelacionCita({
                                emailDestinatario: citaCancelada.lead.email,
                                nombreDestinatario: citaCancelada.lead.nombre,
                                nombreNegocio: citaCancelada.negocio!.nombre,
                                nombreServicio: citaCancelada.tipoDeCita!.nombre,
                                fechaHoraCitaOriginal: new Date(citaCancelada.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' }),
                                linkAgendarNuevaCita: linkAgendarWhatsApp,
                                emailRespuestaNegocio: citaCancelada.negocio!.email || 'contacto@promedia.mx'
                            });
                        }
                    }
                }
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "De acuerdo, no se ha cancelado nada. ¿Te puedo ayudar en algo más?", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        default: {
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: false, error: `Estado no manejado en cancelarCita: ${tarea.estado}` };
        }
    }
}