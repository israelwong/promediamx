// /tasks/agendarCita.handler.ts
// Este handler contiene toda la lógica para la tarea de agendar una nueva cita.
// Utiliza el sistema híbrido de IA + Lógica para una extracción de datos robusta.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Importamos los 'tipos' y 'valores' (Enums) de Prisma por separado.
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';

import type { ActionResult } from '../../../types';
import type { FsmContext, AgendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Importando nuestros nuevos helpers modulares
import { construirFechaDesdePalabrasClave } from '../helpers/date.helpers';
import { extraerPalabrasClaveDeFecha } from '../helpers/ia.helpers';
import { ejecutarConfirmacionFinalCitaAction } from '../helpers/actions.helpers';
import { ejecutarListarServiciosDeCitasAction } from '../../../funciones/citas/listarServiciosDeCitas/listarServiciosDeCitas.actions';
import { findBestMatchingService } from '../helpers/availability.helpers';

import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarAgendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const tareaContexto = (tarea.contexto as AgendarCitaContext) || {};

    console.log(`[Paso 3.2 - AGENDAR] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            if (mensaje.type !== 'text') return { success: true, data: null };
            const textoUsuario = mensaje.content;

            // --- LÓGICA DE EXTRACCIÓN OPORTUNISTA ---

            // 1. Intentamos extraer el SERVICIO si aún no lo tenemos en el contexto.
            if (!tareaContexto.servicioId) {
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });

                // --- LÍNEA ACTUALIZADA ---
                // Usamos nuestro nuevo y más inteligente helper en lugar de .find()
                const servicioEncontrado = findBestMatchingService(textoUsuario, serviciosDisponibles);

                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                }
            }

            // 2. Intentamos extraer FECHA y HORA si aún no tenemos la fecha completa.
            if (!tareaContexto.fechaHora) {
                const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
                if (palabrasClave) {
                    // Usamos nuestro helper mejorado que nos dice qué encontró
                    const { fecha, hora, fechaEncontrada, horaEncontrada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());

                    if (fechaEncontrada && horaEncontrada) {
                        // Caso 1: Encontramos todo. Guardamos la fecha completa.
                        fecha!.setHours(hora!.hora, hora!.minuto, 0, 0);
                        tareaContexto.fechaHora = fecha!.toISOString();
                        // Si había una fecha parcial guardada, la limpiamos.
                        if (tareaContexto.fechaParcial) delete tareaContexto.fechaParcial;

                    } else if (fechaEncontrada) {
                        // Caso 2: Solo encontramos la fecha. La guardamos parcialmente para "recordarla".
                        tareaContexto.fechaParcial = fecha!.toISOString();

                    } else if (horaEncontrada && tareaContexto.fechaParcial) {
                        // Caso 3: Ya teníamos una fecha parcial y ahora el usuario nos dio la hora.
                        const fechaCompleta = new Date(tareaContexto.fechaParcial);
                        fechaCompleta.setHours(hora!.hora, hora!.minuto, 0, 0);
                        tareaContexto.fechaHora = fechaCompleta.toISOString();
                        delete tareaContexto.fechaParcial; // Limpiamos la fecha parcial del contexto
                    }
                }
            }

            // 3. Actualizamos la TareaEnProgreso en la BD con CUALQUIER información nueva que hayamos recolectado.
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });

            // --- LÓGICA DE DECISIÓN MEJORADA ---
            // Basado en el contexto actualizado, decidimos qué preguntar.

            if (!tareaContexto.servicioId) {
                // Si sigue faltando el servicio, lo pedimos.
                console.log('[Paso 3.3.1] FALTA SERVICIO. Listando servicios.');
                const resListar = await ejecutarListarServiciosDeCitasAction({}, { conversacionId, leadId, asistenteId: asistente.id, negocioId: asistente.negocio!.id, canalNombre: 'WhatsApp', tareaEjecutadaId: '' });
                if (resListar.success && resListar.data?.content) {
                    await enviarMensajeAsistente(conversacionId, resListar.data.content, usuarioWaId, negocioPhoneNumberId);
                }
            } else if (tareaContexto.fechaParcial && !tareaContexto.fechaHora) {
                // ¡NUEVA LÓGICA! Si tenemos una fecha parcial pero no la hora completa, pedimos la hora.
                const fechaParcialDate = new Date(tareaContexto.fechaParcial);
                await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaParcialDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);

            } else if (!tareaContexto.fechaHora) {
                // Si tenemos el servicio pero aún falta cualquier dato de la fecha.
                await enviarMensajeAsistente(conversacionId, `Perfecto, servicio: "${tareaContexto.servicioNombre}". Ahora, ¿para qué fecha y hora te gustaría tu cita?`, usuarioWaId, negocioPhoneNumberId);

            } else {
                // Si ya tenemos todo (servicio y fechaHora completa), avanzamos al estado de confirmación.
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                const fechaLegible = new Date(tareaContexto.fechaHora).toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Mexico_City' });
                await enviarMensajeAsistente(conversacionId, `¡Listo! Solo para confirmar: cita para "${tareaContexto.servicioNombre}" el ${fechaLegible}. ¿Es correcto?`, usuarioWaId, negocioPhoneNumberId);
            }

            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            if (mensaje.type !== 'text') return { success: true, data: null };
            const respuestaUsuario = mensaje.content.toLowerCase();

            if (['si', 'sí', 'simon', 'afirmativo', 'confirmo', 'correcto'].some(kw => respuestaUsuario.includes(kw))) {
                const resultadoAgendado = await ejecutarConfirmacionFinalCitaAction(tareaContexto, contexto);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                await enviarMensajeAsistente(conversacionId, resultadoAgendado.success ? resultadoAgendado.data!.mensajeAdicional! : `Hubo un problema al agendar tu cita: ${resultadoAgendado.error}`, usuarioWaId, negocioPhoneNumberId);
            } else {
                await enviarMensajeAsistente(conversacionId, "Entendido, he cancelado el proceso. Si quieres intentar de nuevo, solo dímelo.", usuarioWaId, negocioPhoneNumberId);
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