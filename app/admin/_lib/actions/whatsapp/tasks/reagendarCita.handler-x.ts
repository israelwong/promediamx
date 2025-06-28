// /tasks/reagendarCita.handler.ts
// Este handler contiene la compleja lógica para la tarea de reagendar una cita.
// Es el más robusto, manejando identificación, extracción de datos parciales y completos, y validación.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Tipos y Enums de Prisma
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { StatusAgenda, EstadoTareaConversacional } from '@prisma/client';

// Tipos personalizados y Schemas
import type { ActionResult } from '../../../types';
import type { FsmContext, ReagendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Helpers
import { construirFechaDesdePalabrasClave, sonElMismoDia } from '../helpers/date.helpers-x';
import { extraerPalabrasClaveDeFecha } from '../helpers/ia.helpers-x';
import { verificarDisponibilidad, findBestMatchingAppointment } from '../helpers/availability.helpers-x';
import { ejecutarReagendamientoFinalCitaAction } from '../helpers/actions.helpers-x';

// Core
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarReagendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, usuarioWaId, negocioPhoneNumberId, leadId, asistente } = contexto;

    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    const tareaContexto = (tarea.contexto as ReagendarCitaContext) || {};

    console.log(`[FSM-REAGENDAR] Iniciando. Estado: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            const citasActivas = await prisma.agenda.findMany({
                where: { leadId, status: StatusAgenda.PENDIENTE, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' }, take: 10, select: { id: true, asunto: true, fecha: true, tipoDeCitaId: true }
            });

            if (citasActivas.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita futura para reagendar.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                return { success: true, data: null };
            }

            // --- ¡LÓGICA DE CIRUGÍA LÁSER! ---
            let textoCitaOriginal = textoUsuario;
            const separadores = [' para el ', ' para la ', ' al ', ' a las '];
            for (const sep of separadores) {
                if (textoUsuario.toLowerCase().includes(sep)) {
                    textoCitaOriginal = textoUsuario.split(new RegExp(sep, 'i'))[0];
                    break;
                }
            }

            const citaIdentificada = findBestMatchingAppointment(textoCitaOriginal, citasActivas);

            if (citaIdentificada) {
                tareaContexto.citaOriginalId = citaIdentificada.id;
                tareaContexto.citaOriginalAsunto = citaIdentificada.asunto;
                const fechaOriginal = new Date(citaIdentificada.fecha);
                tareaContexto.citaOriginalFecha = fechaOriginal;
                tareaContexto.citaOriginalTipoDeCitaId = citaIdentificada.tipoDeCitaId;

                const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
                if (palabrasClave) {

                    const resultadoCalculo = construirFechaDesdePalabrasClave(palabrasClave, new Date(), fechaOriginal);
                    let fechaCalculada = resultadoCalculo.fecha;
                    const horaCalculada = resultadoCalculo.hora;


                    if (fechaCalculada && sonElMismoDia(fechaCalculada, fechaOriginal) && !horaCalculada) {
                        fechaCalculada = null;
                    }

                    if (fechaCalculada && horaCalculada) {
                        console.log("[FSM-HÍBRIDO] Se calculó cita, fecha y hora. Saltando a VALIDAR.");
                        fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                        tareaContexto.nuevaFechaHora = fechaCalculada.toISOString();
                        const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                        return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                    } else if (fechaCalculada) {
                        console.log("[FSM-HÍBRIDO] Se calculó cita y fecha. Saltando a PEDIR HORA.");
                        tareaContexto.nuevaFechaParcial = { año: fechaCalculada.getFullYear(), mes: fechaCalculada.getMonth() + 1, dia: fechaCalculada.getDate() };
                        await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                        await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                        return { success: true, data: null };
                    }
                }

                const fechaLegibleOriginal = fechaOriginal.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Ok, vamos a reagendar tu cita del ${fechaLegibleOriginal}. ¿Para qué nueva fecha y hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA } });

            } else {
                let mensajeLista = "Encontré estas citas a tu nombre. Por favor, dime cuál quieres mover y para qué nueva fecha y hora te gustaría:\n";
                citasActivas.forEach((cita, index) => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
                });
                tareaContexto.citasEncontradas = citasActivas.map(c => ({ ...c, fecha: new Date(c.fecha) }));
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);

            if (palabrasClave) {
                const { fecha: fechaCalculada, hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());

                // Caso A: El usuario dio fecha y hora completas.
                if (fechaCalculada && horaCalculada) {
                    fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                    tareaContexto.nuevaFechaHora = fechaCalculada.toISOString();
                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                }
                // Caso B: El usuario solo dio una fecha válida.
                else if (fechaCalculada) {
                    tareaContexto.nuevaFechaParcial = { año: fechaCalculada.getFullYear(), mes: fechaCalculada.getMonth() + 1, dia: fechaCalculada.getDate() };
                    await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                    await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                    return { success: true, data: null };
                }
            }

            // --- ESTA ES LA SOLUCIÓN ---
            // Caso C (El "catch-all"): Si no se encontraron palabras clave, o si no pudimos construir una fecha válida con ellas.
            // En cualquier caso de no entender, pedimos que lo intente de nuevo.
            await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo? Por ejemplo: 'para el próximo martes a las 3pm'.", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (palabrasClave && palabrasClave.hora_str && tareaContexto.nuevaFechaParcial) {
                const { hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());
                if (horaCalculada) {
                    const { año, mes, dia } = tareaContexto.nuevaFechaParcial;
                    const fechaCompleta = new Date(año, mes - 1, dia);
                    fechaCompleta.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);

                    tareaContexto.nuevaFechaHora = fechaCompleta.toISOString();
                    delete tareaContexto.nuevaFechaParcial;

                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                }
            }
            await enviarMensajeAsistente(conversacionId, "No entendí la hora, ¿puedes repetirla? Por ejemplo: 'a las 5pm' o 'a las 14:30'.", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD: {
            const estaDisponible = await verificarDisponibilidad({
                negocioId: asistente.negocio!.id,
                tipoDeCitaId: tareaContexto.citaOriginalTipoDeCitaId!,
                fechaDeseada: new Date(tareaContexto.nuevaFechaHora!),
                leadId: leadId,
                citaOriginalId: tareaContexto.citaOriginalId
            });

            if (estaDisponible) {
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                const fechaOriginalLegible = new Date(tareaContexto.citaOriginalFecha!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Perfecto. Solo para confirmar, ¿cambiamos tu "${tareaContexto.citaOriginalAsunto}" de ${fechaOriginalLegible} a la nueva fecha ${nuevaFechaLegible}? ¿Los datos son correctos?`, usuarioWaId, negocioPhoneNumberId);
            } else {
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Lo siento, el horario de ${nuevaFechaLegible} no está disponible. Por favor, elige otro día y hora.`, usuarioWaId, negocioPhoneNumberId);
                delete tareaContexto.nuevaFechaHora;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA } });
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const respuestaUsuarioConfirmacion = textoUsuario.toLowerCase();
            const afirmaciones = ['si', 'sí', 'afirmativo', 'correcto', 'claro', 'adelante'];
            const negaciones = ['no', 'nel', 'cancelar', 'está mal'];

            if (afirmaciones.some(kw => respuestaUsuarioConfirmacion.includes(kw))) {
                const resultado = await ejecutarReagendamientoFinalCitaAction(tareaContexto, contexto);
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, resultado.success ? `¡Listo! Tu cita ha sido reagendada con éxito para el ${nuevaFechaLegible}.` : "Hubo un problema al reagendar tu cita.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else if (negaciones.some(kw => respuestaUsuarioConfirmacion.includes(kw))) {
                await enviarMensajeAsistente(conversacionId, "Entendido, he cancelado el proceso. Tu cita original sigue en pie.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí tu respuesta. Para confirmar el cambio, puedes decir 'sí' o 'correcto'. Si algo está mal, solo di 'no' para cancelar el proceso.", usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        // El caso PENDIENTE_CONFIRMACION_FECHA_AMBIGUA lo podemos eliminar si el calculador de fecha es robusto.
        // Si se mantiene, su lógica no cambia.

        default: {
            console.warn(`[FSM ADVERTENCIA] Tarea 'reagendarCita' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        }
    }
    return { success: true, data: null };
}
