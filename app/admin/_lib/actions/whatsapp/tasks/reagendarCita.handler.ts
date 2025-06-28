// /tasks/reagendarCita.handler.ts
// VERSION FINAL, COMPLETA Y REFACTORIZADA (27 de junio de 2025)
// Utiliza un helper de IA especializado para la extracción inicial y mantiene flujos robustos como fallback.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Tipos y Enums de Prisma
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { StatusAgenda, EstadoTareaConversacional } from '@prisma/client';

// Tipos personalizados y Schemas
import type { ActionResult } from '../../../types';
import type { FsmContext, ReagendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Helpers
import { construirFechaDesdePalabrasClave } from '../helpers/date.helpers';
import { extraerFechasParaReagendamiento, extraerPalabrasClaveDeFecha } from '../helpers/ia.helpers';
import { verificarDisponibilidad, findBestMatchingAppointment } from '../helpers/availability.helpers';
import { ejecutarReagendamientoFinalCitaAction } from '../helpers/actions.helpers';

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

    console.log(`[FSM-REAGENDAR-V2] Iniciando. Estado: ${tarea.estado}. Contexto:`, tareaContexto);

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

            // 1. Llamamos a nuestro nuevo helper de IA especializado.
            const extraccion = await extraerFechasParaReagendamiento(textoUsuario);

            // 2. Analizamos el resultado para decidir el camino a seguir.
            if (extraccion?.original?.texto && extraccion.nueva) {
                // CASO A: ¡Éxito! El usuario dio toda la info. Intentamos el "camino rápido".
                console.log('[FSM-REAGENDAR-V2] Detectado intento de "camino rápido".', extraccion);

                const citaIdentificada = findBestMatchingAppointment(extraccion.original.texto, citasActivas);
                const { fecha: nuevaFecha, hora: nuevaHora } = construirFechaDesdePalabrasClave(extraccion.nueva, new Date());

                if (citaIdentificada && nuevaFecha && nuevaHora) {
                    // Si tenemos todo, saltamos directo a la validación.
                    tareaContexto.citaOriginalId = citaIdentificada.id;
                    tareaContexto.citaOriginalAsunto = citaIdentificada.asunto;
                    tareaContexto.citaOriginalFecha = citaIdentificada.fecha;
                    tareaContexto.citaOriginalTipoDeCitaId = citaIdentificada.tipoDeCitaId;

                    nuevaFecha.setHours(nuevaHora.hora, nuevaHora.minuto, 0, 0);
                    tareaContexto.nuevaFechaHora = nuevaFecha.toISOString();

                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto); // Re-llamada para entrar al estado de validación
                }
            }

            // CASO B: El usuario fue genérico o la IA no pudo extraer todo. Seguimos el camino seguro paso a paso.
            // Primero, intentamos identificar la cita a mover.
            const citaIdentificada = findBestMatchingAppointment(textoUsuario, citasActivas);
            if (citaIdentificada) {
                // Si encontramos la cita, la guardamos y pedimos la nueva fecha.
                tareaContexto.citaOriginalId = citaIdentificada.id;
                tareaContexto.citaOriginalAsunto = citaIdentificada.asunto;
                tareaContexto.citaOriginalFecha = citaIdentificada.fecha;
                tareaContexto.citaOriginalTipoDeCitaId = citaIdentificada.tipoDeCitaId;

                await prisma.tareaEnProgreso.update({
                    where: { id: tarea.id },
                    data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA }
                });

                const fechaLegibleOriginal = new Date(citaIdentificada.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Ok, vamos a reagendar tu cita para "${citaIdentificada.asunto}" del ${fechaLegibleOriginal}. ¿Para qué nueva fecha y hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);

            } else {
                // CASO C: No se pudo identificar una cita. Mostramos la lista para que el usuario elija.
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

                if (fechaCalculada && horaCalculada) {
                    fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                    tareaContexto.nuevaFechaHora = fechaCalculada.toISOString();
                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                } else if (fechaCalculada) {
                    tareaContexto.nuevaFechaParcial = { año: fechaCalculada.getFullYear(), mes: fechaCalculada.getMonth() + 1, dia: fechaCalculada.getDate() };
                    await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                    await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                } else {
                    await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo? Por ejemplo: 'para el próximo martes a las 3pm'.", usuarioWaId, negocioPhoneNumberId);
                }
            } else {
                await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo? Por ejemplo: 'para el próximo martes a las 3pm'.", usuarioWaId, negocioPhoneNumberId);
            }
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
            // Este bloque no requiere cambios, su lógica es sólida.
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
            // Este bloque no requiere cambios, su lógica es sólida.
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

        default: {
            console.warn(`[FSM ADVERTENCIA] Tarea 'reagendarCita' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: true, data: null };
        }
    }
}