// RUTA: app/admin/_lib/funciones/citas/confirmarCita/confirmarCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { StatusAgenda, ActionType, ChangedByType } from '@prisma/client';
import { parseISO } from 'date-fns';
import { enviarEmailConfirmacionCitaAction } from '../../../actions/email/email.actions';
import { ConfirmarCitaArgsSchema } from './confirmarCita.schemas';

export const ejecutarConfirmarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = ConfirmarCitaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        // Esta validación ahora recibirá los datos con los nombres correctos desde agendarCita
        console.error("[Confirmar Cita] Validación de argumentos fallida:", validationResult.error.flatten().fieldErrors);
        return { success: true, data: { content: "Parece que faltan datos para la confirmación. Por favor, empecemos de nuevo el proceso de agendamiento." } };
    }
    const args = validationResult.data;
    const fechaHora = parseISO(args.fecha_hora_deseada);

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
        const agendaCreada = await prisma.$transaction(async (tx) => {
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
                    asunto: args.motivo_de_reunion || tipoCita.nombre, // <-- AJUSTADO: Usa el motivo si existe, si no, el nombre del servicio.
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

            return nuevaAgenda;
        });

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
                });
            }
        }

        return {
            success: true,
            data: {
                content: `¡Listo! Tu cita para "${tipoCita.nombre}" ha sido confirmada. Te hemos enviado los detalles a: **${args.email_contacto}**.`,
                aiContextData: {
                    status: 'CITA_CREADA',
                    agendaId: agendaCreada.id,
                    cleanedForNextTurn: true // Señal de que la tarea terminó.
                }
            }
        };
    } catch (error) {
        console.error("[Confirmar Cita] Error en la transacción:", error);
        return { success: true, data: { content: "Lo siento, tuve un problema interno al confirmar tu cita. ¿Podrías intentar agendar de nuevo, por favor?" } };
    }
};