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

    console.log(`[Paso 3.2 - AGENDAR] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);
    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
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
                    // Aquí podríamos añadir una validación más compleja en el futuro
                    tareaContexto.camposPersonalizados[ultimoCampoPedidoId] = textoUsuario;
                    delete tareaContexto.ultimoCampoPedidoId;
                }
            }

            // Lógica oportunista para extraer el servicio de la frase
            if (!tareaContexto.servicioId) {
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });
                const servicioEncontrado = findBestMatchingService(textoUsuario, serviciosDisponibles);
                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                }
            }

            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });

            // --- LÓGICA DE DECISIÓN SECUENCIAL ---
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

            // Si tenemos todo, avanzamos a la confirmación
            const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
            return manejarAgendarCita(tareaActualizada, mensaje, contexto);
        }

        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (palabrasClave) {
                const { fecha, hora, fechaEncontrada, horaEncontrada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());
                if (fechaEncontrada && horaEncontrada) {
                    fecha!.setHours(hora!.hora, hora!.minuto, 0, 0);
                    tareaContexto.fechaHora = fecha!.toISOString();
                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                    return manejarAgendarCita(tareaActualizada, mensaje, contexto);
                }
            }
            await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha y hora. Por favor, intenta de nuevo (ej. 'mañana a las 2pm').", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

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