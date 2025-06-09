// app/admin/_lib/funciones/citas/confirmarCancelacionCita/confirmarCancelacionCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { ActionType, ChangedByType, StatusAgenda } from '@prisma/client';
import { enviarEmailCancelacionCitaAction } from '../../../actions/email/email.actions';

const ConfirmarCancelacionArgsSchema = z.object({
    cita_id: z.string().cuid("ID de cita inválido."),
    motivo: z.string().nullable().optional(),
});

// Renombrada a ejecutarConfirmarCancelacionCitaAction
export const ejecutarConfirmarCancelacionCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const validation = ConfirmarCancelacionArgsSchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Faltan datos para confirmar la cancelación." };
    }
    const { cita_id, motivo } = validation.data;
    const { leadId, asistenteId, negocioId } = context;

    const cita = await prisma.agenda.findUnique({ where: { id: cita_id, leadId: leadId } });
    if (!cita) return { success: true, data: { content: "Lo siento, no pude encontrar la cita para cancelar." } };

    await prisma.$transaction(async (tx) => {
        await tx.agenda.update({ where: { id: cita.id }, data: { status: StatusAgenda.CANCELADA } });
        await tx.agendaHistorial.create({
            data: { agendaId: cita.id, actionType: ActionType.CANCELED, changedByType: ChangedByType.ASSISTANT, changedById: asistenteId, reason: motivo || "Cita cancelada por asistente." },
        });
    });

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

    return { success: true, data: { content: `¡Listo! Tu cita ha sido cancelada exitosamente.` } };
};