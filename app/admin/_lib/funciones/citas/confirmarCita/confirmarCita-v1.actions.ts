// Ruta: app/admin/_lib/funciones/citas/confirmarCita/confirmarCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import { Prisma, StatusAgenda } from '@prisma/client';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { ConfirmarCitaArgsSchema } from './confirmarCita.schemas';
import { enviarEmailConfirmacionCitaAction } from '../../../actions/email/email.actions';
import { parseISO } from 'date-fns';

/**
 * Función final que ejecuta la creación de la cita en la base de datos.
 * Se llama únicamente DESPUÉS de que el usuario ha confirmado todos los datos.
 */
export const ejecutarConfirmarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = ConfirmarCitaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.error("[Confirmar Cita] Validación fallida con argumentos:", argsFromIA, validationResult.error);
        return { success: true, data: { content: "Parece que faltan datos para la confirmación final. Por favor, empecemos de nuevo el proceso." } };
    }
    const args = validationResult.data;

    const fechaHora = parseISO(args.fecha_hora_deseada);
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: args.servicio_nombre, mode: 'insensitive' }, negocioId: context.negocioId, activo: true } });

    if (!tipoCita) {
        return { success: true, data: { content: `Hubo un problema confirmando el servicio "${args.servicio_nombre}".` } };
    }

    try {
        const agendaCreada = await prisma.$transaction(async (tx) => {
            const datosLead: Prisma.LeadUpdateInput = { nombre: args.nombre_contacto, email: args.email_contacto, telefono: args.telefono_contacto.replace(/\D/g, '') };
            await tx.lead.update({ where: { id: context.leadId }, data: datosLead });

            const dataAgenda: Prisma.AgendaCreateInput = {
                negocio: { connect: { id: context.negocioId } }, lead: { connect: { id: context.leadId } },
                tipoDeCita: { connect: { id: tipoCita.id } }, fecha: fechaHora,
                asunto: args.motivo_de_reunion || tipoCita.nombre, modalidad: tipoCita.esVirtual ? 'virtual' : 'presencial',
                status: StatusAgenda.PENDIENTE, tipo: 'DEFAULT', asistente: { connect: { id: context.asistenteId } },
            };
            const nuevaAgenda = await tx.agenda.create({ data: dataAgenda });

            await tx.agendaHistorial.create({ data: { agendaId: nuevaAgenda.id, actionType: 'CREATED', changedByType: 'ASSISTANT', changedById: context.asistenteId, reason: "Cita creada por asistente." } });
            return nuevaAgenda;
        });

        if (args.email_contacto) {
            const negocio = await prisma.negocio.findUnique({ where: { id: context.negocioId }, select: { nombre: true, logo: true, email: true, direccion: true } });
            if (negocio?.email) {
                enviarEmailConfirmacionCitaAction({
                    emailDestinatario: args.email_contacto, nombreDestinatario: args.nombre_contacto,
                    nombreNegocio: negocio.nombre, logoNegocioUrl: negocio.logo, emailRespuestaNegocio: negocio.email,
                    nombreServicio: tipoCita.nombre, fechaHoraCita: fechaHora, modalidadCita: tipoCita.esVirtual ? 'virtual' : 'presencial',
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
                    agendaId: agendaCreada.id
                }
            }
        };
    } catch (error) {
        console.error("[Confirmar Cita] Error en la transacción:", error);
        return { success: false, error: `Error en BD al confirmar cita: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
};