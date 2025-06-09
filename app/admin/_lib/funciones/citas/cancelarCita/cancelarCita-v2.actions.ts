// app/admin/_lib/funciones/citas/cancelarCita/cancelarCita.actions.ts

'use server';

import prisma from '../../../prismaClient';
// import type { ActionResult } from '../../../types';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { CancelarCitaArgsFromAISchema, type CitaDetalleParaCancelar } from './cancelarCita.schemas';
import { ActionType, ChangedByType, StatusAgenda, type Agenda as AgendaModel, type Prisma } from '@prisma/client';
import { format, isFuture, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente } from '../agendarCita/agendarCita.helpers';
import { enviarEmailCancelacionCitaAction } from '../../../actions/email/email.actions';

// --- FUNCIONES AUXILIARES (Sin cambios) ---
async function registrarEnHistorialCancelacion(agendaId: string, actorType: ChangedByType, actorId: string, motivo: string | null | undefined, tx: Prisma.TransactionClient) {
    await tx.agendaHistorial.create({
        data: { agendaId, actionType: ActionType.CANCELED, changedByType: actorType, changedById: actorId, reason: motivo || "Cita cancelada por el usuario/asistente." },
    });
}
function formatearCitaParaUsuario(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): CitaDetalleParaCancelar {
    return { id: cita.id, fechaHora: format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es }), asunto: cita.asunto || cita.tipoDeCita?.nombre || "Cita", modalidad: cita.modalidad };
}

// --- FUNCIÓN PRINCIPAL COMPLETA Y CORREGIDA ---
export const ejecutarCancelarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const { leadId, asistenteId, tareaEjecutadaId, negocioId } = context;

    const validationResult = CancelarCitaArgsFromAISchema.safeParse(argsFromIA);
    if (!validationResult.success) { }
    const { cita_id_cancelar, detalle_cita_para_cancelar, confirmacion_usuario_cancelar, motivo_cancelacion } = validationResult.data || {};

    try {
        // --- RUTA 1: EJECUCIÓN FINAL DE LA CANCELACIÓN ---
        if (confirmacion_usuario_cancelar === true && cita_id_cancelar) {
            const cita = await prisma.agenda.findUnique({ where: { id: cita_id_cancelar, leadId: leadId }, include: { tipoDeCita: true } });
            if (!cita) return { success: true, data: { content: "Lo siento, no pude encontrar la cita para confirmar la cancelación. empecemos de nuevo." } };

            await prisma.$transaction(async (tx) => {
                await tx.agenda.update({ where: { id: cita.id }, data: { status: StatusAgenda.CANCELADA } });
                await registrarEnHistorialCancelacion(cita.id, ChangedByType.ASSISTANT, asistenteId, motivo_cancelacion, tx);
            });

            // --- INICIO: SECCIÓN AÑADIDA PARA ENVIAR EMAIL ---
            const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true, nombre: true } });
            const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, email: true } });

            if (lead?.email && negocio) {
                await enviarEmailCancelacionCitaAction({
                    emailDestinatario: lead.email,
                    nombreDestinatario: lead.nombre,
                    nombreNegocio: negocio.nombre,
                    nombreServicio: cita.asunto,
                    fechaHoraCita: cita.fecha,
                    fechaHoraCitaOriginal: cita.fecha.toISOString(),
                    emailRespuestaNegocio: negocio.email ?? ""
                });
            }
            // --- FIN: SECCIÓN AÑADIDA ---

            return { success: true, data: { content: `¡Listo! Tu cita ha sido cancelada exitosamente.` } };
        }

        // --- RUTA 2: BÚSQUEDA PROACTIVA ---
        if (!cita_id_cancelar && !detalle_cita_para_cancelar) {
            const citasFuturas = await prisma.agenda.findMany({ where: { leadId: leadId, status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.NO_ASISTIO] }, fecha: { gte: new Date() } }, include: { tipoDeCita: { select: { nombre: true } } }, orderBy: { fecha: 'asc' }, take: 5 });
            if (citasFuturas.length === 0) return { success: true, data: { content: "No encontré ninguna cita futura agendada con este número de teléfono. ¿Es posible que la hayas agendado con otro contacto?" } };
            if (citasFuturas.length === 1) {
                const citaUnica = formatearCitaParaUsuario(citasFuturas[0]);
                return { success: true, data: { content: `Encontré esta cita: "${citaUnica.asunto}" para el ${citaUnica.fechaHora}. ¿Es esta la que deseas cancelar (sí/no)?`, aiContextData: { cita_id_para_cancelar: citasFuturas[0].id } } };
            }
            const listaCitas = citasFuturas.map((c, i) => `${i + 1}. "${c.asunto || c.tipoDeCita?.nombre}" - ${format(c.fecha, "EEEE d 'a las' h:mm aa", { locale: es })} (ID: ...${c.id.slice(-4)})`).join('\n');
            return { success: true, data: { content: `Encontré estas citas futuras agendadas con tu número. ¿Cuál de ellas te gustaría cancelar?\n\n${listaCitas}\n\nPor favor, responde con el número o el ID.` } };
        }

        // --- RUTA 3: BÚSQUEDA POR DETALLES O ID ---
        let citaParaConfirmar: (AgendaModel & { tipoDeCita: { nombre: string } | null }) | null = null;
        if (cita_id_cancelar) {
            citaParaConfirmar = await prisma.agenda.findUnique({ where: { id: cita_id_cancelar, leadId: leadId }, include: { tipoDeCita: { select: { nombre: true } } } });
        } else if (detalle_cita_para_cancelar) {
            const fechaPotencial = await parsearFechaHoraInteligente(detalle_cita_para_cancelar, { permitirSoloFecha: true });
            const posiblesCitas = await prisma.agenda.findMany({ where: { leadId: leadId, status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.NO_ASISTIO] }, fecha: { gte: new Date() }, AND: fechaPotencial ? [{ fecha: { gte: startOfDay(fechaPotencial) } }, { fecha: { lt: endOfDay(fechaPotencial) } }] : undefined, OR: [{ asunto: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } }, { tipoDeCita: { nombre: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } } }] }, include: { tipoDeCita: { select: { nombre: true } } }, orderBy: { fecha: 'asc' }, take: 1 });
            if (posiblesCitas.length === 1) citaParaConfirmar = posiblesCitas[0];
        }

        if (citaParaConfirmar) {
            if (!isFuture(new Date(citaParaConfirmar.fecha))) return { success: true, data: { content: "Lo siento, no puedes cancelar una cita que ya ha pasado." } };
            const citaDetalle = formatearCitaParaUsuario(citaParaConfirmar);
            return { success: true, data: { content: `Encontré esta cita: "${citaDetalle.asunto}" para el ${citaDetalle.fechaHora}. ¿Confirmas que deseas cancelarla (sí/no)?`, aiContextData: { cita_id_para_cancelar: citaParaConfirmar.id } } };
        }

        return { success: true, data: { content: `No pude identificar una cita específica con "${detalle_cita_para_cancelar}". ¿Puedes ser un poco más específico con la fecha o el servicio?` } };

    } catch (error) {
        console.error(`[ejecutarCancelarCitaAction] Error en TareaID ${tareaEjecutadaId}:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno al procesar la cancelación." };
    }
}