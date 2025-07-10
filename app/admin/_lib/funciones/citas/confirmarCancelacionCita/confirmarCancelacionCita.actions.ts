'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { ActionType, ChangedByType, StatusAgenda, Prisma } from '@prisma/client';
import { enviarEmailCancelacionCita } from '../../../actions/email/email.actions';

const ConfirmarCancelacionArgsSchema = z.object({
    cita_id: z.string().cuid("ID de cita inválido."),
});

async function registrarEnHistorialCancelacion(agendaId: string, actorType: ChangedByType, actorId: string, tx: Prisma.TransactionClient) {
    await tx.agendaHistorial.create({
        data: { agendaId, actionType: ActionType.CANCELED, changedByType: actorType, changedById: actorId, reason: "Cita cancelada por asistente." },
    });
}

export const ejecutarConfirmarCancelacionCita: FunctionExecutor = async (argsFromIA, context) => {
    const validation = ConfirmarCancelacionArgsSchema.safeParse(argsFromIA);
    if (!validation.success) return { success: false, error: "Faltan datos para confirmar la cancelación." };

    const { cita_id } = validation.data;
    const { leadId, asistenteId, negocioId } = context;

    const cita = await prisma.agenda.findUnique({ where: { id: cita_id, leadId } });
    if (!cita) return { success: true, data: { content: "Lo siento, no pude encontrar la cita para completar la cancelación." } };
    if (cita.status === StatusAgenda.CANCELADA) return { success: true, data: { content: `Esa cita ya había sido cancelada. ¿Puedo ayudarte en algo más?` } };

    await prisma.$transaction(async (tx) => {
        await tx.agenda.update({ where: { id: cita.id }, data: { status: StatusAgenda.CANCELADA } });
        await registrarEnHistorialCancelacion(cita.id, ChangedByType.ASSISTANT, asistenteId, tx);
    });

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true, nombre: true } });
    const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, email: true } });

    if (lead?.email && negocio?.email) {
        await enviarEmailCancelacionCita({
            emailDestinatario: lead.email,
            nombreDestinatario: lead.nombre,
            nombreNegocio: negocio.nombre,
            nombreServicio: cita.asunto,
            fechaHoraCitaOriginal: cita.fecha.toISOString(),
            linkAgendarNuevaCita: 'https://promedia.mx/agendar', // Reemplaza con el link correcto si es necesario
            emailRespuestaNegocio: negocio.email,
        });
    }

    return {
        success: true,
        data: {
            content: `¡Listo! Tu cita ha sido cancelada exitosamente.`,
            aiContextData: { status: 'CITA_CANCELADA', agendaId: cita.id }
        }
    };
};