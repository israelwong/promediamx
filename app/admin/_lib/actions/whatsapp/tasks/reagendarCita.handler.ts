// ==================================================================
// MANEJADOR DE TAREA: reagendarCita
// VERSIÓN: 1.0 - SELLADA
// FECHA DE SELLADO: 4 de Julio de 2025
//
// DESCRIPCIÓN:
// Implementa un flujo conversacional guiado y robusto para
// reagendar una cita. Prioriza la identificación explícita de la
// cita a modificar antes de solicitar la nueva fecha, manejando
// casos de ambigüedad al listar las opciones para el usuario.
//
// NOTA DE REFACTORIZACIÓN:
// La lógica actual es estable y ofrece la mejor experiencia de
// usuario. No se requieren refactorizaciones futuras para el MVP.
// ==================================================================

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional, StatusAgenda } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ReagendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { findBestMatchingAppointment, verificarDisponibilidad } from '../helpers/availability.helpers';
import { extraerPalabrasClaveDeFecha } from '../helpers/ia.helpers';
import { construirFechaDesdePalabrasClave } from '../helpers/date.helpers';
import { ejecutarReagendamientoFinalAction } from '../helpers/actions.helpers';
import { enviarEmailReagendamientoAction } from '../../email/email.actions';
import { sonElMismoDia } from '../helpers/date.helpers';
import { verificarYmanejarEscape } from '../helpers/fsm.helpers'; // Importa el nuevo helper
import { enviarMensajeAsistente } from '../core/orchestrator';


type CitaParaSeleccion = {
    id: string;
    asunto: string;
    fecha: Date;
    tipoDeCitaId: string | null;
};

export async function manejarReagendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const tareaContexto = (tarea.contexto as ReagendarCitaContext) || {};
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const textoUsuario = mensaje.type === 'text' ? mensaje.content : '';

    // ✅ INICIO DEL PROTOCOLO DE ESCAPE UNIVERSAL
    const escapeManejado = await verificarYmanejarEscape(tarea, mensaje, contexto);
    if (escapeManejado) {
        return { success: true, data: null }; // Si se manejó un escape, la función termina aquí.
    }
    // ✅ FIN DEL PROTOCOLO

    console.log(`[REAGENDAR CITA v7.0] Estado: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.INICIADA: {
            const citasPendientes = await prisma.agenda.findMany({
                where: { leadId: leadId, status: StatusAgenda.PENDIENTE, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' },
                include: { tipoDeCita: { select: { id: true, nombre: true } } }
            });

            if (citasPendientes.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita futura para reagendar.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                return { success: true, data: null };
            }

            const listaCitasParaMatch: CitaParaSeleccion[] = citasPendientes.map(c => ({
                id: c.id,
                asunto: c.tipoDeCita?.nombre || 'Cita',
                fecha: c.fecha,
                tipoDeCitaId: c.tipoDeCitaId ?? null
            }));

            const citaEncontrada = findBestMatchingAppointment(textoUsuario, listaCitasParaMatch);

            if (citaEncontrada) {
                // ✅ LÓGICA MEJORADA: En lugar de pedir la nueva fecha, pedimos confirmación.
                tareaContexto.citaOriginalId = citaEncontrada.id;
                const fechaFormateada = new Date(citaEncontrada.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Claro. Encontré tu cita de "${citaEncontrada.asunto}" para el ${fechaFormateada}. ¿Es esta la cita que quieres reagendar?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.CONFIRMANDO_CITA_ORIGINAL } });
                return { success: true, data: null };
            }

            // ✅ INICIO: LÓGICA MEJORADA PARA MANEJO DE AMBIGÜEDAD
            const extraccionDia = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (extraccionDia) {
                const { fecha: fechaMencionada } = construirFechaDesdePalabrasClave(extraccionDia, new Date());
                if (fechaMencionada) {
                    const citasEncontradasEnDia = listaCitasParaMatch.filter(c => sonElMismoDia(c.fecha, fechaMencionada));
                    if (citasEncontradasEnDia.length > 1) {
                        let mensajeLista = "Encontré estas citas pendientes. ¿Cuál quieres reagendar?\n";
                        tareaContexto.citasEncontradas = citasEncontradasEnDia;
                        citasEncontradasEnDia.forEach((cita, index) => {
                            const fechaFormateada = new Date(cita.fecha).toLocaleString('es-MX', { timeStyle: 'short', timeZone: 'America/Mexico_City' });
                            mensajeLista += `\n${index + 1}. **${cita.asunto}** a las ${fechaFormateada}`;
                        });
                        mensajeLista += `\n\nPor favor, responde con el número.`;
                        await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
                        await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.ESPERANDO_SELECCION_USUARIO } });
                        return { success: true, data: null };
                    }
                }
            }
            // ✅ FIN: LÓGICA MEJORADA

            // Si todo lo demás falla, mostramos la lista completa.
            let mensajeLista = "Encontré estas citas pendientes. ¿Cuál quieres reagendar? Por favor, responde con el número o descríbela.\n";
            tareaContexto.citasEncontradas = listaCitasParaMatch;
            listaCitasParaMatch.forEach((cita, index) => {
                const fechaFormateada = new Date(cita.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                mensajeLista += `\n${index + 1}. **${cita.asunto}** el ${fechaFormateada}`;
            });
            await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.ESPERANDO_SELECCION_USUARIO } });
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.ESPERANDO_SELECCION_USUARIO: {
            const citasEncontradas: CitaParaSeleccion[] = tareaContexto.citasEncontradas || [];
            let citaSeleccionada: CitaParaSeleccion | null = null;
            const seleccionNumerica = parseInt(textoUsuario.trim().match(/\d+/)?.[0] || '', 10);

            if (!isNaN(seleccionNumerica) && citasEncontradas[seleccionNumerica - 1]) {
                citaSeleccionada = citasEncontradas[seleccionNumerica - 1];
            } else {
                // Si el usuario no responde con un número, intentamos entender el texto
                const match = findBestMatchingAppointment(textoUsuario, citasEncontradas);
                citaSeleccionada = match
                    ? { ...match, tipoDeCitaId: match.tipoDeCitaId ?? null }
                    : null;
            }
            if (citaSeleccionada) {
                // ✅ LÓGICA MEJORADA: También pedimos confirmación después de la selección.
                tareaContexto.citaOriginalId = citaSeleccionada.id;
                const fechaFormateada = new Date(citaSeleccionada.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Ok, la cita de "${citaSeleccionada.asunto}" del ${fechaFormateada}. ¿Es correcto?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.CONFIRMANDO_CITA_ORIGINAL } });
            } else {
                await enviarMensajeAsistente(conversacionId, "No entendí tu selección. Por favor, intenta de nuevo con el número o más detalles.", usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.CONFIRMANDO_CITA_ORIGINAL: {
            const keywordsAfirmativos = ['si', 'sí', 'claro', 'ok', 'perfecto', 'de acuerdo', 'correcto'];
            if (keywordsAfirmativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
                await enviarMensajeAsistente(conversacionId, `Perfecto. ¿Para qué nueva fecha y hora te gustaría moverla?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.ESPERANDO_NUEVA_FECHA } });
            } else {
                await enviarMensajeAsistente(conversacionId, "Entendido. No haremos ningún cambio por ahora. ¿Puedo ayudarte en algo más?", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.ESPERANDO_NUEVA_FECHA: {
            const extraccion = await extraerPalabrasClaveDeFecha(textoUsuario);
            let fecha: Date | null = null;
            let hora: { hora: number; minuto: number } | null = null;

            if (textoUsuario.toLowerCase().includes('misma hora') || textoUsuario.toLowerCase().includes('mismo horario')) {
                const citaOriginal = await prisma.agenda.findUnique({ where: { id: tareaContexto.citaOriginalId } });
                if (citaOriginal && extraccion) {
                    const { fecha: fechaCalculada } = construirFechaDesdePalabrasClave(extraccion, new Date());
                    fecha = fechaCalculada;
                    const horaOriginal = new Date(citaOriginal.fecha);
                    hora = { hora: horaOriginal.getUTCHours(), minuto: horaOriginal.getUTCMinutes() };
                }
            } else if (extraccion) {
                const resultado = construirFechaDesdePalabrasClave(extraccion, new Date());
                fecha = resultado.fecha;
                hora = resultado.hora;
            }

            if (fecha && hora) {
                fecha.setHours(hora.hora, hora.minuto, 0, 0);
                tareaContexto.nuevaFechaHora = fecha.toISOString();
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                return manejarReagendarCita(tareaActualizada, mensaje, contexto);
            } else {
                await enviarMensajeAsistente(conversacionId, "No pude construir una fecha y hora completas. ¿Podrías ser más específico? (ej. 'mañana a las 4pm')", usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD: {
            const citaOriginal = await prisma.agenda.findUniqueOrThrow({ where: { id: tareaContexto.citaOriginalId } });
            const resultadoDisponibilidad = await verificarDisponibilidad({
                negocioId: asistente.negocio!.id,
                tipoDeCitaId: citaOriginal.tipoDeCitaId!,
                fechaDeseada: new Date(tareaContexto.nuevaFechaHora!),
                leadId: leadId,
                citaOriginalId: tareaContexto.citaOriginalId,
            });

            if (resultadoDisponibilidad.disponible) {
                const fechaOriginalLegible = new Date(citaOriginal.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' });
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' });

                await enviarMensajeAsistente(conversacionId, `¡Perfecto! El horario está disponible. ¿Confirmas que movemos tu cita del **${fechaOriginalLegible}** para el **${nuevaFechaLegible}**?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
            } else {
                await enviarMensajeAsistente(conversacionId, resultadoDisponibilidad.mensaje || "Lo siento, ese horario no está disponible. Por favor, elige otro.", usuarioWaId, negocioPhoneNumberId);
                delete tareaContexto.nuevaFechaHora;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.ESPERANDO_NUEVA_FECHA } });
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const keywordsAfirmativos = ['si', 'sí', 'claro', 'ok', 'perfecto', 'de acuerdo', 'correcto'];
            if (keywordsAfirmativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
                const resultado = await ejecutarReagendamientoFinalAction(tareaContexto, contexto);
                if (resultado.success) {
                    const nuevaCita = resultado.data!.nuevaCita;
                    const nuevaFechaLegible = new Date(nuevaCita.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                    await enviarMensajeAsistente(conversacionId, `¡Listo! Tu cita ha sido reagendada con éxito para el ${nuevaFechaLegible}.`, usuarioWaId, negocioPhoneNumberId);

                    try {
                        const [leadInfo, tipoCitaInfo, negocioInfo, citaOriginalInfo] = await prisma.$transaction([
                            prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { email: true, nombre: true } }),
                            prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: nuevaCita.tipoDeCitaId! } }),
                            prisma.negocio.findUniqueOrThrow({ where: { id: asistente.negocio!.id }, include: { AsistenteVirtual: true } }),
                            prisma.agenda.findFirstOrThrow({ where: { id: tareaContexto.citaOriginalId!, status: StatusAgenda.REAGENDADA } })
                        ]);

                        if (leadInfo.email && leadInfo.nombre) {
                            const asistenteActivo = negocioInfo.AsistenteVirtual && negocioInfo.AsistenteVirtual.id === asistente.id
                                ? negocioInfo.AsistenteVirtual
                                : undefined;
                            const numeroWhatsappAsistente = asistenteActivo?.whatsappBusiness?.replace(/\D/g, '');
                            let linkCancelarWhatsApp: string | undefined, linkReagendarWhatsApp: string | undefined;

                            if (numeroWhatsappAsistente) {
                                const textoCancelar = `Quiero "cancelar" mi cita de "${tipoCitaInfo.nombre}" del ${nuevaFechaLegible}.`;
                                const textoReagendar = `Quiero "reagendar" mi cita de "${tipoCitaInfo.nombre}" del ${nuevaFechaLegible}.`;
                                linkCancelarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoCancelar)}`;
                                linkReagendarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoReagendar)}`;
                            }

                            await enviarEmailReagendamientoAction({
                                emailDestinatario: leadInfo.email,
                                nombreDestinatario: leadInfo.nombre,
                                nombreNegocio: negocioInfo.nombre,
                                nombreServicio: tipoCitaInfo.nombre,
                                fechaHoraOriginal: citaOriginalInfo.fecha,
                                fechaHoraNueva: nuevaCita.fecha,
                                emailRespuestaNegocio: negocioInfo.email || 'contacto@promedia.mx',
                                linkCancelar: linkCancelarWhatsApp,
                                linkReagendar: linkReagendarWhatsApp,
                            });
                        }
                    } catch (emailError) {
                        console.error("[REAGENDAR] Fallo el envío del correo de reagendamiento.", emailError);
                    }
                } else {
                    await enviarMensajeAsistente(conversacionId, `Hubo un problema al reagendar tu cita.`, usuarioWaId, negocioPhoneNumberId);
                }
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "De acuerdo, no hemos hecho ningún cambio. Tu cita original sigue en pie.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        default: {
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: false, error: `Estado no manejado en reagendarCita: ${tarea.estado}` };
        }
    }
}