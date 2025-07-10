'use server';

import prisma from '../../../prismaClient';
import { StatusAgenda, ActionType, ChangedByType } from '@prisma/client';
import { enviarEmailConfirmacionCita } from '../../../actions/email/email.actions';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { ConfirmarCitaArgsSchema } from './confirmarCita.schemas';
import { parseISO } from 'date-fns';

export const ejecutarConfirmarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = ConfirmarCitaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        return { success: true, data: { content: "Parece que faltan datos para la confirmación. Por favor, empecemos de nuevo." } };
    }
    const args = validationResult.data;
    const fechaHora = parseISO(
        typeof args.fecha_hora_deseada === 'string'
            ? args.fecha_hora_deseada
            : args.fecha_hora_deseada.toISOString()
    );

    const tipoCita = await prisma.agendaTipoCita.findFirst({
        where: { nombre: { equals: args.servicio_nombre, mode: 'insensitive' }, negocioId: context.negocioId, activo: true }
    });

    if (!tipoCita) {
        return { success: true, data: { content: `Hubo un problema al confirmar el servicio "${args.servicio_nombre}".` } };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.lead.update({
                where: { id: context.leadId },
                data: {
                    nombre: args.nombre_contacto ?? '',
                    email: args.email_contacto,
                    telefono: args.telefono_contacto
                }
            });

            const nuevaAgenda = await tx.agenda.create({
                data: {
                    negocioId: context.negocioId,
                    leadId: context.leadId,
                    tipoDeCitaId: tipoCita.id,
                    fecha: fechaHora,
                    asunto: tipoCita.nombre,
                    descripcion: args.motivo_de_reunion,
                    modalidad: tipoCita.esVirtual ? 'virtual' : 'presencial',
                    status: StatusAgenda.PENDIENTE,
                    asistenteId: context.asistenteId,
                    tipo: 'DEFAULT',
                }
            });

            await tx.agendaHistorial.create({
                data: {
                    agendaId: nuevaAgenda.id,
                    actionType: ActionType.CREATED,
                    changedByType: ChangedByType.ASSISTANT,
                    changedById: context.asistenteId,
                    reason: "Cita creada por asistente."
                }
            });

            // =========================================================================
            // PASO FINAL: Cerramos la tarea en progreso en nuestro gestor de estado.
            // =========================================================================
            await tx.tareaEnProgreso.updateMany({
                where: { conversacionId: context.conversacionId },
                data: { estado: 'COMPLETADA' }
            });

            return nuevaAgenda;
        });

        // Envía el correo de confirmación (efecto secundario post-éxito)
        if (args.email_contacto) {
            const negocio = await prisma.negocio.findUnique({
                where: { id: context.negocioId },
                select: { nombre: true, logo: true, email: true, direccion: true }
            });
            if (negocio?.email) {
                enviarEmailConfirmacionCita({
                    emailDestinatario: args.email_contacto,
                    nombreDestinatario: args.nombre_contacto ?? '',
                    nombreNegocio: negocio.nombre,
                    logoNegocioUrl: negocio.logo ?? undefined,
                    emailRespuestaNegocio: negocio.email,
                    nombreServicio: tipoCita.nombre,
                    fechaHoraCita: fechaHora,
                    modalidadCita: tipoCita.esVirtual ? 'virtual' : 'presencial',
                }).catch(err => console.error("[Confirmar Cita] Error al enviar email (no bloqueante):", err));
            }
        }

        return {
            success: true,
            data: {
                content: `¡Listo! Tu cita para "${tipoCita.nombre}" ha sido confirmada. Te hemos enviado los detalles a tu correo. ¿Hay algo más en lo que pueda ayudarte?`,
                aiContextData: {
                    status: 'CITA_CREADA',
                    cleanedForNextTurn: true
                }
            }
        };
    } catch (error) {
        console.error("[Confirmar Cita] Error en la transacción:", error);
        return { success: true, data: { content: "Lo siento, tuve un problema interno al confirmar tu cita. ¿Podrías intentar agendar de nuevo, por favor?" } };
    }
};