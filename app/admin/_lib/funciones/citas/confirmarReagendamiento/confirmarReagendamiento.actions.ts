'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { ActionType, ChangedByType, StatusAgenda } from '@prisma/client';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { enviarEmailReagendamientoAction } from '../../../actions/email/email.actions';

const ReagendarConfirmadoArgsSchema = z.object({
    cita_id_original: z.string().cuid("El ID de la cita a reagendar es inválido."),
    nueva_fecha_iso: z.string().datetime("La nueva fecha debe estar en formato ISO."),
});

export const ejecutarReagendamientoConfirmadoAction: FunctionExecutor = async (argsFromIA, context) => {
    const validation = ReagendarConfirmadoArgsSchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Faltan datos o son incorrectos para confirmar el reagendamiento." };
    }

    const { cita_id_original, nueva_fecha_iso } = validation.data;
    const { leadId, asistenteId, negocioId } = context;
    const nuevaFecha = parseISO(nueva_fecha_iso);

    try {
        const citaOriginal = await prisma.agenda.findUnique({ where: { id: cita_id_original, leadId: leadId } });
        if (!citaOriginal) return { success: true, data: { content: "Lo siento, no pude encontrar la cita original para reagendarla." } };

        const citaActualizada = await prisma.$transaction(async (tx) => {
            const updatedAgenda = await tx.agenda.update({
                where: { id: citaOriginal.id },
                data: { fecha: nuevaFecha, status: StatusAgenda.REAGENDADA, updatedAt: new Date() },
            });
            await tx.agendaHistorial.create({
                data: {
                    agendaId: citaOriginal.id,
                    actionType: ActionType.RESCHEDULED,
                    changedByType: ChangedByType.ASSISTANT,
                    changedById: asistenteId,
                    reason: `Reagendada de ${format(citaOriginal.fecha, 'Pp', { locale: es })} a ${format(nuevaFecha, 'Pp', { locale: es })}`
                },
            });
            return updatedAgenda;
        });

        const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true, nombre: true } });
        if (lead?.email) {
            const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, email: true } });
            if (negocio?.email) {
                await enviarEmailReagendamientoAction({
                    emailDestinatario: lead.email,
                    nombreDestinatario: lead.nombre,
                    nombreNegocio: negocio.nombre,
                    nombreServicio: citaOriginal.asunto,
                    fechaHoraOriginal: citaOriginal.fecha,
                    fechaHoraNueva: nuevaFecha
                });
            }
        }

        // CUMPLIENDO LA REGLA DE ORO: AÑADIMOS EL CIERRE DE TAREA
        return {
            success: true,
            data: {
                content: `¡Listo! Tu cita ha sido reagendada para el ${format(nuevaFecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}. Te hemos enviado un correo con los nuevos detalles.`,
                aiContextData: {
                    status: 'CITA_REAGENDADA',
                    agendaId: citaActualizada.id
                }
            }
        };
    } catch (error) {
        console.error(`[ejecutarReagendamientoConfirmadoAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error al guardar el reagendamiento." };
    }
};