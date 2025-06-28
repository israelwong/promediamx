// /tasks/agendarCita.handler.ts
// VERSION REFACTORIZADA Y SELLADA
// Actualización Importante: Se refactorizó la recolección de fecha/hora para que sea un proceso de dos pasos (fecha y luego hora),
// haciéndolo más robusto y congruente con el resto de los handlers. Se añadió el estado RECOLECTANDO_NUEVA_HORA.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Importamos los 'tipos' y 'valores' (Enums) de Prisma por separado.
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, AgendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Importando nuestros helpers modulares
import { construirFechaDesdePalabrasClave } from '../helpers/date.helpers';
import { extraerPalabrasClaveDeFecha } from '../helpers/ia.helpers';
import { ejecutarConfirmacionFinalCitaAction } from '../helpers/actions.helpers';
import { ejecutarListarServiciosDeCitasAction } from '../../../funciones/citas/listarServiciosDeCitas/listarServiciosDeCitas.actions';
import { findBestMatchingService } from '../helpers/availability.helpers';
import { enviarMensajeAsistente } from '../core/orchestrator';

// Pequeño tipo helper para la metadata
type CampoMetadata = {
    dependeDe?: string;
    opcionesCondicionales?: { [valorPadre: string]: string[] };
    opciones?: string[];
};

export async function manejarAgendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const tareaContexto = (tarea.contexto as AgendarCitaContext) || {};

    console.log(`[AGENDAR-V2] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);
    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            // Esta lógica es la "joya de la corona", se mantiene intacta.
            if (!tareaContexto.camposPersonalizados) {
                tareaContexto.camposPersonalizados = {};
            }

            const camposRequeridos = await prisma.cRMCampoPersonalizado.findMany({
                where: { crmId: asistente.negocio!.CRM!.id, requerido: true },
                orderBy: { orden: 'asc' }
            });

            const ultimoCampoPedidoId = tareaContexto.ultimoCampoPedidoId;
            if (ultimoCampoPedidoId) {
                const campoRespondido = camposRequeridos.find(c => c.id === ultimoCampoPedidoId);
                if (campoRespondido) {
                    tareaContexto.camposPersonalizados[ultimoCampoPedidoId] = textoUsuario;
                    delete tareaContexto.ultimoCampoPedidoId;
                }
            }

            if (!tareaContexto.servicioId) {
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });
                const servicioEncontrado = findBestMatchingService(textoUsuario, serviciosDisponibles);
                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                }
            }

            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });

            if (!tareaContexto.servicioId) {
                const resListar = await ejecutarListarServiciosDeCitasAction({}, { conversacionId, leadId, asistenteId: asistente.id, negocioId: asistente.negocio!.id, canalNombre: 'WhatsApp', tareaEjecutadaId: '' });
                if (resListar.success) await enviarMensajeAsistente(conversacionId, resListar.data!.content ?? '', usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }

            const proximoCampoAPreguntar = camposRequeridos.find(campo => !tareaContexto.camposPersonalizados![campo.id]);
            if (proximoCampoAPreguntar) {
                tareaContexto.ultimoCampoPedidoId = proximoCampoAPreguntar.id;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });

                const metadata = proximoCampoAPreguntar.metadata as CampoMetadata | null;
                let pregunta = `Entendido. Ahora, por favor, indícame: ${proximoCampoAPreguntar.nombre}`;

                let opciones: string[] | undefined;
                if (metadata?.dependeDe && metadata.opcionesCondicionales) {
                    const valorPadre = tareaContexto.camposPersonalizados[metadata.dependeDe];
                    if (valorPadre) opciones = metadata.opcionesCondicionales[valorPadre];
                } else if (metadata?.opciones) {
                    opciones = metadata.opciones;
                }

                if (opciones && opciones.length > 0) {
                    pregunta += `\n(Opciones: ${opciones.join(', ')})`;
                }

                await enviarMensajeAsistente(conversacionId, pregunta, usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }

            if (!tareaContexto.fechaHora) {
                await enviarMensajeAsistente(conversacionId, `¡Perfecto! Ya casi terminamos. Ahora, ¿para qué fecha y hora te gustaría tu cita?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA } });
                return { success: true, data: null };
            }

            const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
            return manejarAgendarCita(tareaActualizada, mensaje, contexto);
        }

        // =================================================================================
        // --- BLOQUE REFACTORIZADO PARA RECOLECCIÓN DE FECHA/HORA ---
        // =================================================================================
        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (palabrasClave) {
                const { fecha: fechaCalculada, hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());

                if (fechaCalculada && horaCalculada) {
                    // Caso A: El usuario dio fecha y hora completas.
                    fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                    tareaContexto.fechaHora = fechaCalculada.toISOString();
                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                    return manejarAgendarCita(tareaActualizada, mensaje, contexto);
                } else if (fechaCalculada) {
                    // Caso B: El usuario solo dio la fecha. Guardamos la fecha parcial y pedimos la hora.
                    tareaContexto.fechaParcial = fechaCalculada.toISOString();
                    await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                    await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                    return { success: true, data: null };
                }
            }
            // Caso C: No se entendió la fecha.
            await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha y hora. Por favor, intenta de nuevo (ej. 'mañana a las 2pm').", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        // --- NUEVO ESTADO AÑADIDO PARA MAYOR ROBUSTEZ ---
        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (palabrasClave && palabrasClave.hora_str && tareaContexto.fechaParcial) {
                const { hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());
                if (horaCalculada) {
                    const fechaCompleta = new Date(tareaContexto.fechaParcial);
                    fechaCompleta.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);

                    tareaContexto.fechaHora = fechaCompleta.toISOString();
                    delete tareaContexto.fechaParcial; // Limpiamos el contexto

                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                    return manejarAgendarCita(tareaActualizada, mensaje, contexto);
                }
            }
            await enviarMensajeAsistente(conversacionId, "No entendí la hora, ¿puedes repetirla? Por ejemplo: 'a las 5pm' o 'a las 14:30'.", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        // Los estados finales no necesitan cambios, ya eran sólidos.
        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            let resumen = `¡Listo! Solo para confirmar:\n- Servicio: "${tareaContexto.servicioNombre}"`;
            const camposRequeridos = await prisma.cRMCampoPersonalizado.findMany({ where: { crmId: asistente.negocio!.CRM!.id, requerido: true }, orderBy: { orden: 'asc' } });
            for (const campo of camposRequeridos) {
                if (tareaContexto.camposPersonalizados?.[campo.id]) {
                    resumen += `\n- ${campo.nombre}: ${tareaContexto.camposPersonalizados[campo.id]}`;
                }
            }
            const fechaLegible = new Date(tareaContexto.fechaHora!).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });
            resumen += `\n- Fecha: ${fechaLegible}\n\n¿Es correcto?`;
            await enviarMensajeAsistente(conversacionId, resumen, usuarioWaId, negocioPhoneNumberId);

            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.EJECUTANDO_ACCION_FINAL } });
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.EJECUTANDO_ACCION_FINAL: {
            if (['si', 'sí', 'afirmativo', 'correcto'].some(kw => textoUsuario.toLowerCase().includes(kw))) {
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