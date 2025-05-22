// app/admin/_lib/funciones/reagendarCita.actions.ts
'use server';

import prisma from '../prismaClient';
import { Prisma } from '@prisma/client'; // Asegúrate de tener Prisma importado
import { ActionResult } from '../types';
import { ConfiguracionAgendaDelNegocio } from './agendarCita.schemas'; // Reutilizamos
import {
    ReagendarCitaArgs,
    ReagendarCitaData,
    CitaOriginalDetalles,
    // ActorInfo // Asegúrate que este tipo esté disponible
} from './reagendarCita.schemas'

import {
    parsearFechaHoraInteligente,
    verificarDisponibilidadSlot,
} from './agendarCita.actions'; // Reutilizamos funciones

import { Agenda as AgendaModel, ActionType, ChangedByType, StatusAgenda, Lead } from '@prisma/client';
import { format, isFuture, startOfDay, addDays, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Función auxiliar para actualizar TareaEjecutada
async function actualizarTareaEjecutadaReagendar(tareaEjecutadaId: string, exito: boolean, detalle: Record<string, unknown> | string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                fechaEjecutada: new Date(), // Siempre actualizamos fecha de ejecución
                metadata: JSON.stringify({ resultadoEjecucion: exito, detalleProceso: detalle, timestamp: new Date().toISOString() })
            }
        });
    } catch (error) {
        console.error(`[reagendarCitaAction] Error al actualizar TareaEjecutada ${tareaEjecutadaId}:`, error);
    }
}

// Función auxiliar para formatear detalles de la cita original
function formatearCitaOriginal(
    cita: AgendaModel & { tipoDeCita?: { nombre: string, duracionMinutos?: number | null } | null, lead?: Lead | null }
): CitaOriginalDetalles {
    return {
        id: cita.id,
        fechaHoraOriginal: format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es }),
        asuntoOriginal: cita.asunto || cita.tipoDeCita?.nombre || "Cita",
        modalidadOriginal: cita.modalidad,
        nombreContactoOriginal: cita.lead?.nombre,
        emailContactoOriginal: cita.lead?.email,
        telefonoContactoOriginal: cita.lead?.telefono,
        fechaOriginalObj: new Date(cita.fecha),
        tipoDeCitaIdOriginal: cita.tipoDeCitaId || undefined,
        duracionMinutosOriginal: cita.tipoDeCita?.duracionMinutos ?? undefined,
    };
}

export async function ejecutarReagendarCitaAction(
    args: ReagendarCitaArgs,
    tareaEjecutadaId: string,
    // Pasaremos la configuración del negocio para la verificación de disponibilidad
    configAgenda: ConfiguracionAgendaDelNegocio,
    actor: { type: ChangedByType; id: string | null }
): Promise<ActionResult<ReagendarCitaData>> {
    console.log(`[ejecutarReagendarCitaAction] Iniciando TareaID: ${tareaEjecutadaId}`);
    console.log("[ejecutarReagendarCitaAction] Argumentos recibidos:", JSON.stringify(args));
    console.log("[ejecutarReagendarCitaAction] ConfigAgenda:", JSON.stringify(configAgenda));

    const {
        cita_id_original,
        detalle_cita_original_para_reagendar,
        nueva_fecha_hora_deseada,
        confirmacion_usuario_reagendar,
        nombre_contacto, // Para actualizar Lead
        email_contacto,  // Para actualizar Lead
        telefono_contacto, // Para actualizar Lead
        leadId,
        // asistenteVirtualId // Usado en 'actor'
    } = args;

    if (!leadId) {
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, false, "Falta ID del Lead.");
        return { success: false, error: "Error interno: No se pudo identificar al usuario.", data: { mensajeParaUsuario: "Lo siento, necesito identificarte para reagendar tu cita.", reagendamientoRealizado: false } };
    }

    // --- PASO 0: Actualizar datos del Lead si se proporcionaron ---
    try {
        const leadActual = await prisma.lead.findUnique({ where: { id: leadId } });

        // Usar el tipo específico de Prisma para actualizaciones
        const datosLeadParaActualizar: Prisma.LeadUpdateInput = {};

        if (nombre_contacto && nombre_contacto.trim() !== "" && nombre_contacto !== leadActual?.nombre) {
            datosLeadParaActualizar.nombre = nombre_contacto;
        }

        // Validar y limpiar email antes de asignar
        const emailLimpio = email_contacto?.trim();
        if (emailLimpio && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio) && emailLimpio !== leadActual?.email) {
            datosLeadParaActualizar.email = emailLimpio;
        } else if (email_contacto && email_contacto.trim() !== "" && emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
            console.warn(`[ejecutarReagendarCitaAction] Email proporcionado ("${email_contacto}") para Lead ${leadId} no es válido. No se actualizará.`);
            // Podrías incluso devolver un mensaje al usuario si el email es inválido pero intentó cambiarlo.
        }

        const telefonoLimpio = telefono_contacto?.replace(/\D/g, '');
        if (telefonoLimpio && telefonoLimpio.length >= 10 && telefonoLimpio !== leadActual?.telefono?.replace(/\D/g, '')) { // Asumiendo min 10 dígitos para un teléfono
            datosLeadParaActualizar.telefono = telefonoLimpio;
        } else if (telefono_contacto && telefono_contacto.trim() !== "" && (telefonoLimpio?.length ?? 0) < 10) {
            console.warn(`[ejecutarReagendarCitaAction] Teléfono proporcionado ("${telefono_contacto}") para Lead ${leadId} no parece válido. No se actualizará.`);
        }

        if (Object.keys(datosLeadParaActualizar).length > 0) {
            await prisma.lead.update({
                where: { id: leadId },
                data: datosLeadParaActualizar // Ahora 'data' es del tipo correcto
            });
            console.log(`[ejecutarReagendarCitaAction] Datos del Lead ${leadId} actualizados:`, datosLeadParaActualizar);
        }
    } catch (error) {
        console.error(`[ejecutarReagendarCitaAction] Error al actualizar datos del Lead ${leadId}:`, error);
        // No es un error fatal para el flujo principal de reagendamiento, pero se loguea.
    }


    // --- PASO 1: IDENTIFICAR LA CITA ORIGINAL ---
    let citaOriginalEncontrada: (AgendaModel & { tipoDeCita?: { nombre: string, duracionMinutos?: number | null } | null, lead?: Lead | null }) | null = null;

    if (cita_id_original) {
        citaOriginalEncontrada = await prisma.agenda.findUnique({
            where: { id: cita_id_original, leadId: leadId },
            include: { tipoDeCita: { select: { nombre: true, duracionMinutos: true } }, lead: true }
        });
        if (!citaOriginalEncontrada) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Cita original con ID ${cita_id_original} no encontrada para el lead.`);
            return { success: true, data: { mensajeParaUsuario: `No encontré ninguna cita con el ID "${cita_id_original}". ¿El ID es correcto?`, reagendamientoRealizado: false, requiereIdentificarCitaOriginal: true } };
        }
    } else if (detalle_cita_original_para_reagendar) {
        // Lógica de búsqueda por detalle (similar a cancelarCita)
        const ahora = new Date();
        const fechaParseada = await parsearFechaHoraInteligente(detalle_cita_original_para_reagendar, { permitirSoloFecha: true });

        const whereConditionsDetalle: Prisma.AgendaWhereInput = {
            leadId: leadId,
            status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.REAGENDADA] },
            fecha: { gte: ahora },
        };
        if (fechaParseada) {
            whereConditionsDetalle.AND = [
                ...(Array.isArray(whereConditionsDetalle.AND) ? whereConditionsDetalle.AND : []),
                { fecha: { gte: startOfDay(fechaParseada) } },
                { fecha: { lt: addDays(startOfDay(fechaParseada), 1) } }
            ];
        } else {
            whereConditionsDetalle.OR = [
                { asunto: { contains: detalle_cita_original_para_reagendar, mode: 'insensitive' } },
                { tipoDeCita: { nombre: { contains: detalle_cita_original_para_reagendar, mode: 'insensitive' } } }
            ];
        }
        const posiblesCitas = await prisma.agenda.findMany({
            where: whereConditionsDetalle,
            include: { tipoDeCita: { select: { nombre: true, duracionMinutos: true } }, lead: true },
            orderBy: { fecha: 'asc' },
            take: 5
        });

        if (posiblesCitas.length === 0) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "No se encontraron citas originales con el detalle.");
            return { success: true, data: { mensajeParaUsuario: `No encontré citas que coincidan con "${detalle_cita_original_para_reagendar}" para reagendar. ¿Puedes darme más detalles o el ID?`, reagendamientoRealizado: false, requiereIdentificarCitaOriginal: true } };
        }
        if (posiblesCitas.length === 1) {
            citaOriginalEncontrada = posiblesCitas[0];
            // No pedir confirmación de la original aquí si solo hay una, pedir nueva fecha directamente
        } else {
            const listaCitas = posiblesCitas.map(formatearCitaOriginal);
            let mensajeLista = "Encontré estas citas. ¿Cuál de ellas te gustaría reagendar? Por favor, responde con el número o el ID completo:\n";
            listaCitas.forEach((c, index) => {
                mensajeLista += `${index + 1}. "${c.asuntoOriginal}" - ${c.fechaHoraOriginal} (ID: ${c.id.substring(0, 6)}...)\n`;
            });
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Múltiples citas originales encontradas (${listaCitas.length}).`);
            return { success: true, data: { mensajeParaUsuario: mensajeLista, reagendamientoRealizado: false, listaCitasOriginalesParaElegir: listaCitas, requiereIdentificarCitaOriginal: true } };
        }
    } else if (!confirmacion_usuario_reagendar) { // Si no hay ID, ni detalle, y no estamos confirmando nada
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "No se proporcionó identificador de cita original.");
        return { success: true, data: { mensajeParaUsuario: "¿Qué cita te gustaría reagendar? Puedes darme su ID o detalles como el servicio y la fecha actual.", reagendamientoRealizado: false, requiereIdentificarCitaOriginal: true } };
    }

    // Si llegamos aquí y no tenemos citaOriginalEncontrada PERO SÍ TENEMOS confirmacion_usuario_reagendar=true,
    // la IA debería haber reenviado el cita_id_original. Si no lo hizo, es un fallo de la IA.
    // Pero el dispatcher debería haberlo pasado. Si no está en args, es el problema que vimos antes.
    if (!citaOriginalEncontrada && confirmacion_usuario_reagendar) {
        console.error(`[ejecutarReagendarCitaAction] Se esperaba cita_id_original con confirmacion_usuario_reagendar=true pero no llegó.`);
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, false, "Faltó cita_id_original en la confirmación del reagendamiento.");
        return { success: true, data: { mensajeParaUsuario: "Hubo un pequeño problema, ¿podrías decirme nuevamente el ID de la cita que confirmas reagendar?", reagendamientoRealizado: false, requiereIdentificarCitaOriginal: true } };
    }

    // Si no tenemos cita original aún (y no estamos confirmando un reagendamiento final)
    if (!citaOriginalEncontrada) {
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "No se identificó cita original aún.");
        // Este caso no debería darse si la lógica anterior de pedir ID/detalle funciona.
        return { success: true, data: { mensajeParaUsuario: "Primero necesito saber qué cita quieres reagendar. ¿Puedes darme el ID o detalles?", reagendamientoRealizado: false, requiereIdentificarCitaOriginal: true } };
    }

    // Verificar si la cita original ya pasó o está cancelada
    if (citaOriginalEncontrada.status === StatusAgenda.CANCELADA || citaOriginalEncontrada.status === StatusAgenda.REAGENDADA) {
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Cita original ${citaOriginalEncontrada.id} ya está ${citaOriginalEncontrada.status}.`);
        return { success: true, data: { mensajeParaUsuario: `La cita para "${citaOriginalEncontrada.asunto || 'Servicio'}" del ${format(new Date(citaOriginalEncontrada.fecha), "dd/MM/yyyy 'a las' HH:mm")} ya fue ${citaOriginalEncontrada.status === StatusAgenda.CANCELADA ? 'cancelada' : 'reagendada'}. No se puede modificar.`, reagendamientoRealizado: false } };
    }
    if (!isFuture(new Date(citaOriginalEncontrada.fecha))) {
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Cita original ${citaOriginalEncontrada.id} ya pasó.`);
        return { success: true, data: { mensajeParaUsuario: "Lo siento, no puedes reagendar una cita que ya ha pasado.", reagendamientoRealizado: false } };
    }

    const detallesCitaOriginalFormateada = formatearCitaOriginal(citaOriginalEncontrada);


    // --- PASO 2: OBTENER NUEVA FECHA/HORA ---
    if (!nueva_fecha_hora_deseada && !confirmacion_usuario_reagendar) {
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "Cita original identificada. Solicitando nueva fecha/hora.");

        // Construir el mensaje con todos los detalles relevantes de la cita original
        const mensajeConfirmacionOriginal =
            `Entendido. Quieres reagendar tu cita de "${detallesCitaOriginalFormateada.asuntoOriginal}" ` +
            `programada para el ${detallesCitaOriginalFormateada.fechaHoraOriginal}. ` +
            `Esta cita está a nombre de: ${detallesCitaOriginalFormateada.nombreContactoOriginal || 'No especificado'}, ` +
            `con teléfono: ${detallesCitaOriginalFormateada.telefonoContactoOriginal || 'No especificado'} ` +
            `y correo: ${detallesCitaOriginalFormateada.emailContactoOriginal || 'No especificado'}. ` +
            `¿Es esta la cita correcta? Y si es así, ¿para qué nueva fecha y hora te gustaría cambiarla?`;

        return {
            success: true, data: {
                mensajeParaUsuario: mensajeConfirmacionOriginal, // <--- MENSAJE MEJORADO
                reagendamientoRealizado: false,
                requiereNuevaFechaHora: true,
                // Podrías renombrar citaOriginalParaConfirmar a algo como 'contextoCitaOriginal'
                // si su propósito principal aquí es solo mantener el contexto para la IA.
                // O, si la pregunta "¿Es esta la cita correcta?" es explícita, entonces requiereConfirmarCitaOriginal = true
                citaOriginalParaConfirmar: detallesCitaOriginalFormateada,
                // Si quieres que la IA espere un "sí" antes de pedir la nueva fecha,
                // podrías añadir un flag aquí: requiereConfirmarCitaOriginalIdentificada: true
            }
        };
    }

    // Si estamos en el paso de confirmación final, nueva_fecha_hora_deseada ya debería haber sido procesada antes
    // y la IA solo envía la confirmación. Necesitamos el ID de la cita original y la nueva fecha que se estaba confirmando.
    // Esto es un poco más complejo porque la acción no tiene estado entre llamadas.
    // La IA debe reenviar cita_id_original Y nueva_fecha_hora_deseada junto con confirmacion_usuario_reagendar = true.

    if (!nueva_fecha_hora_deseada && confirmacion_usuario_reagendar) {
        console.error(`[ejecutarReagendarCitaAction] Se esperaba nueva_fecha_hora_deseada con confirmacion_usuario_reagendar=true pero no llegó.`);
        await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, false, "Faltó nueva_fecha_hora_deseada en la confirmación del reagendamiento.");
        return { success: true, data: { mensajeParaUsuario: "Hubo un pequeño problema, ¿podrías decirme nuevamente la nueva fecha y hora para tu cita de \"" + (detallesCitaOriginalFormateada.asuntoOriginal) + "\"?", reagendamientoRealizado: false, requiereNuevaFechaHora: true, citaOriginalParaConfirmar: detallesCitaOriginalFormateada } };
    }

    // Si tenemos nueva_fecha_hora_deseada, la parseamos (incluso si es para confirmación, para revalidar)
    let fechaHoraNuevaParseada: Date | null = null;
    if (nueva_fecha_hora_deseada) {
        fechaHoraNuevaParseada = await parsearFechaHoraInteligente(nueva_fecha_hora_deseada);
        if (!fechaHoraNuevaParseada) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Nueva fecha/hora inválida: ${nueva_fecha_hora_deseada}`);
            return { success: true, data: { mensajeParaUsuario: `La nueva fecha y hora que mencionaste ('${nueva_fecha_hora_deseada}') no parece válida o ya pasó. ¿Podrías intentarlo de nuevo? (Ej: "mañana a las 3 pm")`, reagendamientoRealizado: false, requiereNuevaFechaHora: true, citaOriginalParaConfirmar: detallesCitaOriginalFormateada } };
        }
    }


    // --- PASO 3: VERIFICAR DISPONIBILIDAD Y CONFIRMAR (SI CORRESPONDE) ---
    if (citaOriginalEncontrada && fechaHoraNuevaParseada) {
        // Necesitamos el AgendaTipoCita de la cita original para la duración
        const tipoCitaOriginal = await prisma.agendaTipoCita.findUnique({
            where: { id: citaOriginalEncontrada.tipoDeCitaId! } // tipoDeCitaId no debería ser null aquí
        });
        if (!tipoCitaOriginal) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, false, `No se encontró el tipo de cita original (ID: ${citaOriginalEncontrada.tipoDeCitaId})`);
            return { success: false, error: "Error interno al obtener detalles del servicio original.", data: { mensajeParaUsuario: "Lo siento, no pude obtener los detalles del servicio original para verificar la disponibilidad.", reagendamientoRealizado: false } };
        }

        const disponibilidadNuevoSlot = await verificarDisponibilidadSlot({
            negocioId: configAgenda.negocioId,
            agendaTipoCita: tipoCitaOriginal, // Usar el tipo de cita original para la duración y concurrencia
            fechaHoraInicioDeseada: fechaHoraNuevaParseada,
            configAgenda: configAgenda
        });

        if (!disponibilidadNuevoSlot.disponible) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Nuevo slot no disponible: ${formatISO(fechaHoraNuevaParseada)}`);
            return { success: true, data: { mensajeParaUsuario: disponibilidadNuevoSlot.mensaje || `Lo siento, el horario de las ${format(fechaHoraNuevaParseada, "h:mm aa", { locale: es })} del ${format(fechaHoraNuevaParseada, "EEEE d 'de' MMMM", { locale: es })} no está disponible para tu cita de "${detallesCitaOriginalFormateada.asuntoOriginal}". ¿Te gustaría intentar con otro horario o día?`, reagendamientoRealizado: false, requiereNuevaFechaHora: true, citaOriginalParaConfirmar: detallesCitaOriginalFormateada } };
        }

        // Si el nuevo slot está disponible Y se proporcionó confirmacion_usuario_reagendar === true
        if (confirmacion_usuario_reagendar === true) {
            // Proceder con el reagendamiento
            await prisma.$transaction(async (tx) => {
                await tx.agenda.update({
                    where: { id: citaOriginalEncontrada!.id },
                    data: {
                        fecha: fechaHoraNuevaParseada!,
                        status: StatusAgenda.PENDIENTE, // O el estado que corresponda
                        updatedAt: new Date(),
                    },
                });
                await tx.agendaHistorial.create({
                    data: {
                        agendaId: citaOriginalEncontrada!.id,
                        actionType: ActionType.RESCHEDULED,
                        changedByType: actor.type,
                        changedById: actor.id,
                        reason: `Reagendada de ${format(new Date(citaOriginalEncontrada!.fecha), 'Pp', { locale: es })} a ${format(fechaHoraNuevaParseada!, 'Pp', { locale: es })}`,
                        // detallesAnteriores: JSON.stringify({ fecha: citaOriginalEncontrada.fecha }),
                        // detallesNuevos: JSON.stringify({ fecha: fechaHoraNuevaParseada }),
                    }
                });
            });
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Cita ${citaOriginalEncontrada.id} reagendada a ${formatISO(fechaHoraNuevaParseada)}.`);
            const datosCitaFinal = {
                ...detallesCitaOriginalFormateada, // Mantiene datos del lead y asunto
                fechaHoraOriginal: format(fechaHoraNuevaParseada!, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es }), // Actualiza con nueva fecha/hora
            };
            return {
                success: true, data: {
                    mensajeParaUsuario: `¡Perfecto! Tu cita de "${datosCitaFinal.asuntoOriginal}" ha sido reagendada para el ${datosCitaFinal.fechaHoraOriginal}. Detalles: A nombre de ${datosCitaFinal.nombreContactoOriginal || 'N/A'}, correo ${datosCitaFinal.emailContactoOriginal || 'N/A'}, teléfono ${datosCitaFinal.telefonoContactoOriginal || 'N/A'}.`,
                    reagendamientoRealizado: true,
                    citaReagendadaId: citaOriginalEncontrada.id
                }
            };
        } else if (confirmacion_usuario_reagendar === false) {
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "Usuario no confirmó reagendamiento al nuevo slot.");
            return { success: true, data: { mensajeParaUsuario: "Entendido, no hemos reagendado la cita. La cita original para el " + (detallesCitaOriginalFormateada.fechaHoraOriginal) + " sigue vigente. ¿Hay algo más?", reagendamientoRealizado: false } };
        } else {
            // El slot está disponible, pero necesitamos confirmación final del usuario.
            await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, `Nuevo slot disponible ${formatISO(fechaHoraNuevaParseada)}. Solicitando confirmación final.`);
            const datosConfirmacion = {
                fechaHoraNueva: format(fechaHoraNuevaParseada!, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es }),
                id: detallesCitaOriginalFormateada.id,
                asunto: detallesCitaOriginalFormateada.asuntoOriginal,
                modalidad: detallesCitaOriginalFormateada.modalidadOriginal,
                nombreContacto: detallesCitaOriginalFormateada.nombreContactoOriginal,
                emailContacto: detallesCitaOriginalFormateada.emailContactoOriginal,
                telefonoContacto: detallesCitaOriginalFormateada.telefonoContactoOriginal,
            };
            return {
                success: true, data: {
                    mensajeParaUsuario: `¡Buenas noticias! Podemos reagendar tu cita de "${datosConfirmacion.asunto}" del <span class="math-inline">\{detallesCitaOriginalFormateada\.fechaHoraOriginal\} para el \*\*</span>{datosConfirmacion.fechaHoraNueva}**. Los detalles serían: A nombre de ${datosConfirmacion.nombreContacto || 'N/A'}, correo ${datosConfirmacion.emailContacto || 'N/A'}, teléfono ${datosConfirmacion.telefonoContacto || 'N/A'}. ¿Confirmas el cambio (sí/no)?`,
                    reagendamientoRealizado: false,
                    requiereConfirmarNuevoSlot: true,
                    nuevoSlotPropuesto: datosConfirmacion,
                    citaOriginalParaConfirmar: detallesCitaOriginalFormateada // Enviar de nuevo para referencia si es necesario
                }
            };
        }
    }

    // Si llegamos aquí, es probable que falte información o estemos en un estado intermedio no manejado
    // Esto podría ser si solo se tiene la cita original pero no nueva_fecha_hora_deseada Y confirmacion_reagendamiento no es true/false
    // (ya cubierto arriba para pedir nueva_fecha_hora_deseada)
    console.warn("[ejecutarReagendarCitaAction] Se llegó a un estado inesperado del flujo.");
    await actualizarTareaEjecutadaReagendar(tareaEjecutadaId, true, "Flujo inesperado o falta de parámetros claros para proceder.");
    return {
        success: true, data: {
            mensajeParaUsuario: "Necesito un poco más de información para reagendar. ¿Podrías recordarme la cita original y la nueva fecha y hora que deseas?",
            reagendamientoRealizado: false,
            requiereIdentificarCitaOriginal: !citaOriginalEncontrada,
            requiereNuevaFechaHora: !!citaOriginalEncontrada && !nueva_fecha_hora_deseada
        }
    };

} 
