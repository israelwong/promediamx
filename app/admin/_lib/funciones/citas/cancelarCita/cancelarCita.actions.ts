// app/admin/_lib/funciones/cancelarCita.actions.ts
'use server';

import prisma from '../../prismaClient';
import { ActionResult } from '../../types';
import {
    CancelarCitaArgs,
    CancelarCitaData,
    CitaDetalleParaCancelar,
    ActorInfo
} from '../agendarCita/cancelarCita.schemas';
import { Agenda as AgendaModel, ActionType, ChangedByType, StatusAgenda } from '@prisma/client';
import { format, isValid, isFuture, startOfDay, endOfDay, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Prisma } from '@prisma/client';
import { parsearFechaHoraInteligente } from './agendarCita/agendarCita.actions'; // Reutilizamos el parseador si es necesario para 'detalle_cita_para_cancelar'

// --- Función auxiliar para registrar en AgendaHistorial ---
async function registrarEnHistorialCancelacion(
    agendaId: string,
    actor: ActorInfo,
    motivo?: string | null,
    tx?: Prisma.TransactionClient
) {
    const db = tx || prisma;
    await db.agendaHistorial.create({
        data: {
            agendaId: agendaId,
            actionType: ActionType.CANCELED, // Asumiendo que tienes ActionType.CANCELED
            changedByType: actor.type,
            changedById: actor.id,
            reason: motivo || "Cita cancelada por el usuario/asistente.",
        },
    });
}

// --- Función auxiliar para actualizar TareaEjecutada (simplificada) ---
async function actualizarTareaEjecutada(tareaEjecutadaId: string, exito: boolean, resultado: string | object | null) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                // Aquí podrías decidir qué guardar en metadata
                // Por simplicidad, solo actualizamos la fecha de ejecución si no se hizo antes
                fechaEjecutada: new Date(),
                metadata: JSON.stringify({
                    resultadoEjecucion: exito,
                    detalle: resultado,
                    timestamp: new Date().toISOString()
                })
            }
        });
    } catch (error) {
        console.error(`[cancelarCitaAction] Error al actualizar TareaEjecutada ${tareaEjecutadaId}:`, error);
    }
}


function formatearCitaParaUsuario(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): CitaDetalleParaCancelar {
    return {
        id: cita.id,
        fechaHora: format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es }),
        asunto: cita.asunto || cita.tipoDeCita?.nombre || "Cita",
        modalidad: cita.modalidad,
    };
}


export async function ejecutarCancelarCitaAction(
    args: CancelarCitaArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<CancelarCitaData>> {

    console.log(`[ejecutarCancelarCitaAction] Iniciando para TareaID: ${tareaEjecutadaId}`);
    console.log("[ejecutarCancelarCitaAction] Argumentos recibidos:", JSON.stringify(args));

    const {
        cita_id_cancelar,
        detalle_cita_para_cancelar,
        confirmacion_usuario_cancelar,
        motivo_cancelacion,
        leadId,
        asistenteVirtualId,
    } = args;

    const actor: ActorInfo = { type: ChangedByType.ASSISTANT, id: asistenteVirtualId }; // Por defecto, el asistente media

    if (!leadId) {
        await actualizarTareaEjecutada(tareaEjecutadaId, false, "Falta ID del Lead para buscar citas.");
        return { success: false, error: "Error interno: No se pudo identificar al usuario.", data: { mensajeParaUsuario: "Lo siento, no puedo encontrar tus citas sin identificarte.", cancelacionRealizada: false } };
    }

    try {
        // Prioridad 1: Usuario proporciona cita_id
        if (cita_id_cancelar) {
            const cita = await prisma.agenda.findUnique({
                where: { id: cita_id_cancelar, leadId: leadId }, // Asegurar que la cita pertenece al lead
                include: { tipoDeCita: { select: { nombre: true } } }
            });

            if (!cita) {
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Cita con ID ${cita_id_cancelar} no encontrada para el lead.`);
                return { success: true, data: { mensajeParaUsuario: `No encontré ninguna cita con el ID "${cita_id_cancelar}". ¿Quizás el ID es incorrecto o ya fue cancelada?`, cancelacionRealizada: false } };
            }

            if (cita.status === StatusAgenda.CANCELADA) {
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Cita ${cita_id_cancelar} ya estaba cancelada.`);
                return { success: true, data: { mensajeParaUsuario: `La cita para "${cita.asunto || 'Servicio'}" del ${format(new Date(cita.fecha), "dd/MM/yyyy 'a las' HH:mm", { locale: es })} ya se encuentra cancelada.`, cancelacionRealizada: true, citaCanceladaId: cita.id } };
            }
            if (!isFuture(new Date(cita.fecha))) {
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Cita ${cita_id_cancelar} ya pasó.`);
                return { success: true, data: { mensajeParaUsuario: "Lo siento, no puedes cancelar una cita que ya ha pasado.", cancelacionRealizada: false } };
            }


            if (confirmacion_usuario_cancelar === true) {
                // Proceder a cancelar
                await prisma.$transaction(async (tx) => {
                    await tx.agenda.update({
                        where: { id: cita.id },
                        data: { status: StatusAgenda.CANCELADA }, // Asumiendo que tienes este estado
                    });
                    await registrarEnHistorialCancelacion(cita.id, actor, motivo_cancelacion, tx);
                });
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Cita ${cita.id} cancelada exitosamente.`);
                const citaFormateada = formatearCitaParaUsuario(cita);
                return { success: true, data: { mensajeParaUsuario: `¡Listo! Tu cita para "${citaFormateada.asunto}" del ${citaFormateada.fechaHora} ha sido cancelada.`, cancelacionRealizada: true, citaCanceladaId: cita.id } };
            } else if (confirmacion_usuario_cancelar === false) {
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Usuario no confirmó cancelación de cita ${cita_id_cancelar}.`);
                return { success: true, data: { mensajeParaUsuario: "Entendido, no hemos cancelado la cita. ¿Hay algo más en lo que pueda ayudarte?", cancelacionRealizada: false } };
            } else {
                // Pedir confirmación
                const citaDetalle = formatearCitaParaUsuario(cita);
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Se encontró cita ${cita_id_cancelar}. Solicitando confirmación.`);
                return {
                    success: true,
                    data: {
                        mensajeParaUsuario: `Encontré esta cita: "${citaDetalle.asunto}" para el ${citaDetalle.fechaHora}. ¿Confirmas que deseas cancelarla (sí/no)?`,
                        cancelacionRealizada: false,
                        requiereConfirmacion: true,
                        citaParaConfirmar: citaDetalle,
                    }
                };
            }
        }

        // Prioridad 2: Usuario proporciona detalle_cita_para_cancelar
        if (detalle_cita_para_cancelar) {
            console.log(`[ejecutarCancelarCitaAction] Buscando por detalle: "${detalle_cita_para_cancelar}" para Lead ${leadId}`);
            // Lógica de búsqueda (simplificada, se puede mejorar con parseo de fechas, etc.)
            const ahora = new Date();
            let fechaParseada: Date | null = null;

            // Intentar parsear fechas como "mañana", "próximo jueves", etc.
            const fechaPotencial = await parsearFechaHoraInteligente(detalle_cita_para_cancelar, { permitirSoloFecha: true });
            if (fechaPotencial && isValid(fechaPotencial)) {
                fechaParseada = fechaPotencial;
                console.log(`[ejecutarCancelarCitaAction] Fecha parseada del detalle: ${formatISO(fechaParseada)}`);
            }


            const posiblesCitas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA] }, // Buscar solo activas o pendientes
                    fecha: { gte: ahora }, // Solo citas futuras
                    AND: fechaParseada ? [ // Si se parseó una fecha, filtrar por ese día
                        { fecha: { gte: startOfDay(fechaParseada) } },
                        { fecha: { lt: endOfDay(fechaParseada) } }
                    ] : undefined,
                    OR: [ // Buscar por coincidencia en el asunto o descripción del tipo de cita
                        { asunto: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } },
                        { tipoDeCita: { nombre: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } } }
                    ],
                },
                include: { tipoDeCita: { select: { nombre: true } } },
                orderBy: { fecha: 'asc' },
                take: 5, // Limitar resultados para no abrumar
            });

            if (posiblesCitas.length === 0) {
                await actualizarTareaEjecutada(tareaEjecutadaId, true, "No se encontraron citas con el detalle proporcionado.");
                return { success: true, data: { mensajeParaUsuario: `No encontré citas futuras que coincidan con "${detalle_cita_para_cancelar}". ¿Podrías darme más detalles, como el ID de la cita, el servicio, la fecha o la hora exacta?`, cancelacionRealizada: false } };
            }

            if (posiblesCitas.length === 1) {
                const citaUnica = formatearCitaParaUsuario(posiblesCitas[0]);
                await actualizarTareaEjecutada(tareaEjecutadaId, true, `Se encontró una cita (${posiblesCitas[0].id}) por detalle. Solicitando confirmación.`);
                return {
                    success: true,
                    data: {
                        mensajeParaUsuario: `Encontré esta cita: "${citaUnica.asunto}" para el ${citaUnica.fechaHora}. ¿Es esta la que deseas cancelar (sí/no)?`,
                        cancelacionRealizada: false,
                        requiereConfirmacion: true,
                        citaParaConfirmar: citaUnica,
                    }
                };
            }

            // Múltiples citas encontradas
            const listaCitas = posiblesCitas.map(formatearCitaParaUsuario);
            await actualizarTareaEjecutada(tareaEjecutadaId, true, `Se encontraron ${listaCitas.length} citas. Solicitando elección.`);
            let mensajeLista = "Encontré estas citas futuras. ¿Cuál de ellas te gustaría cancelar? Por favor, responde con el número o el ID completo:\n";
            listaCitas.forEach((c, index) => {
                mensajeLista += `${index + 1}. "${c.asunto}" - ${c.fechaHora} (ID: ${c.id.substring(0, 6)}...)\n`;
            });
            return {
                success: true,
                data: {
                    mensajeParaUsuario: mensajeLista,
                    cancelacionRealizada: false,
                    listaCitasParaElegir: listaCitas,
                }
            };
        }

        // Si no se proporciona cita_id ni detalle_cita_para_cancelar
        // (y confirmacion_usuario no es relevante sin una cita identificada previamente)
        await actualizarTareaEjecutada(tareaEjecutadaId, true, "No se proporcionó ID ni detalle para cancelar.");
        return { success: true, data: { mensajeParaUsuario: "¿Qué cita te gustaría cancelar? Puedes decirme su ID, o detalles como la fecha, hora o el tipo de servicio.", cancelacionRealizada: false } };

    } catch (error) {
        console.error("[ejecutarCancelarCitaAction] Error:", error);
        await actualizarTareaEjecutada(tareaEjecutadaId, false, error instanceof Error ? error.message : "Error desconocido");
        return { success: false, error: error instanceof Error ? error.message : "Error interno al procesar la cancelación.", data: { mensajeParaUsuario: "Lo siento, ocurrió un error al intentar procesar tu solicitud de cancelación. Por favor, intenta de nuevo más tarde.", cancelacionRealizada: false } };
    }
}