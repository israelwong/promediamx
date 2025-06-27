'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { StatusAgenda, ActionType, ChangedByType } from '@prisma/client';
import { parseISO } from 'date-fns';
import { enviarEmailConfirmacionCitaAction } from '../../../actions/email/email.actions';
import { ConfirmarCitaArgsSchema } from './confirmarCita.schemas';

/**
 * ===================================================================================
 * FUNCIÓN EJECUTORA: confirmarCita (VERSIÓN FINAL COMPLETA)
 * ===================================================================================
 * Propósito: Crea la cita en la base de datos de forma irreversible.
 * Se activa únicamente por el "Pase de Estafeta" desde agendarCita.
 * Cierra el ciclo de la tarea enviando un `aiContextData` de finalización.
 * ===================================================================================
 */
export const ejecutarConfirmarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = ConfirmarCitaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.error("[Confirmar Cita] Validación de argumentos fallida:", validationResult.error.flatten().fieldErrors);
        return { success: true, data: { content: "Parece que faltan datos para la confirmación. Por favor, empecemos de nuevo el proceso de agendamiento." } };
    }
    const args = validationResult.data;
    const fechaHora = parseISO(typeof args.fecha_hora_deseada === 'string' ? args.fecha_hora_deseada : args.fecha_hora_deseada.toISOString());

    const tipoCita = await prisma.agendaTipoCita.findFirst({
        where: {
            nombre: { equals: args.servicio_nombre, mode: 'insensitive' },
            negocioId: context.negocioId,
            activo: true
        }
    });

    if (!tipoCita) {
        return { success: true, data: { content: `Hubo un problema al intentar confirmar el servicio "${args.servicio_nombre}". Por favor, iniciemos de nuevo.` } };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Actualiza el Lead con la información más reciente que se tenga
            await tx.lead.update({
                where: { id: context.leadId },
                data: {
                    nombre: args.nombre_contacto ?? '',
                    email: args.email_contacto,
                    telefono: args.telefono_contacto
                }
            });

            // Crea la nueva cita en la agenda
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

            // Crea el registro en el historial para auditoría
            await tx.agendaHistorial.create({
                data: {
                    agendaId: nuevaAgenda.id,
                    actionType: ActionType.CREATED,
                    changedByType: ChangedByType.ASSISTANT,
                    changedById: context.asistenteId,
                    reason: "Cita creada por asistente."
                }
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
                enviarEmailConfirmacionCitaAction({
                    emailDestinatario: args.email_contacto,
                    nombreDestinatario: args.nombre_contacto,
                    nombreNegocio: negocio.nombre,
                    logoNegocioUrl: negocio.logo,
                    emailRespuestaNegocio: negocio.email,
                    nombreServicio: tipoCita.nombre,
                    fechaHoraCita: fechaHora,
                    modalidadCita: tipoCita.esVirtual ? 'virtual' : 'presencial',
                    direccionNegocio: negocio.direccion,
                }).catch(err => console.error("[Confirmar Cita] Error al enviar email (no bloqueante):", err));
            }
        }

        // Finaliza el ciclo con un mensaje de éxito y un contexto limpio para la IA
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
        return { success: true, data: { content: "Lo siento, tuve un problema interno al confirmar tu cita y no pude completarla. ¿Podrías intentar agendar de nuevo, por favor?" } };
    }
};