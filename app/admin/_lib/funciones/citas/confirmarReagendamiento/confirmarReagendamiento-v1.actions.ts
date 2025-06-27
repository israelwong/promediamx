'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { ActionType, ChangedByType, StatusAgenda } from '@prisma/client';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { enviarEmailReagendamientoAction } from '../../../actions/email/email.actions';

const ReagendarConfirmadoArgsSchema = z.object({
    cita_id_original: z.string().cuid(),
    nueva_fecha_iso: z.string().datetime(),
});

export const ejecutarReagendamientoConfirmadoAction: FunctionExecutor = async (argsFromIA, context) => {
    const validation = ReagendarConfirmadoArgsSchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Faltan datos para confirmar el reagendamiento." };
    }

    const { cita_id_original, nueva_fecha_iso } = validation.data;
    const { leadId, asistenteId, negocioId } = context;
    const nuevaFecha = parseISO(nueva_fecha_iso);

    try {
        const citaOriginal = await prisma.agenda.findUnique({ where: { id: cita_id_original, leadId: leadId } });
        if (!citaOriginal) return { success: true, data: { content: "No encontré la cita original para reagendarla." } };

        await prisma.$transaction(async (tx) => {
            await tx.agenda.update({
                where: { id: citaOriginal.id },
                data: { fecha: nuevaFecha, status: StatusAgenda.REAGENDADA, updatedAt: new Date() }, // Marcarla como REAGENDADA
            });
            await tx.agendaHistorial.create({
                data: { agendaId: citaOriginal.id, actionType: ActionType.RESCHEDULED, changedByType: ChangedByType.ASSISTANT, changedById: asistenteId, reason: `Reagendada de ${format(citaOriginal.fecha, 'Pp', { locale: es })} a ${format(nuevaFecha, 'Pp', { locale: es })}` },
            });
        });

        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true, nombre: true } });
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true } });

        if (lead?.email && negocio) {
            await enviarEmailReagendamientoAction({
                emailDestinatario: lead.email,
                nombreDestinatario: lead.nombre,
                nombreNegocio: negocio.nombre,
                nombreServicio: citaOriginal.asunto,
                fechaHoraOriginal: citaOriginal.fecha,
                fechaHoraNueva: nuevaFecha,
            });
        }

        return { success: true, data: { content: `¡Listo! Tu cita ha sido reagendada para el ${format(nuevaFecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}. Te hemos enviado un correo con los nuevos detalles.` } };

    } catch (error) {
        console.error(`[ejecutarReagendamientoConfirmadoAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error al guardar el reagendamiento." };
    }
};