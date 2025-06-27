'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { StatusAgenda, type Agenda as AgendaModel } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CancelarArgsSchema = z.object({
    detalle_cita_para_cancelar: z.string().min(1).max(200).nullable().optional(),
});

function formatearCita(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): string {
    return `"${cita.asunto || cita.tipoDeCita?.nombre}" para el ${format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}`;
}

export const ejecutarCancelarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId } = context;

    const validation = CancelarArgsSchema.safeParse(argsFromIA);
    const { detalle_cita_para_cancelar } = validation.data || {};

    try {
        const citasFuturas = await prisma.agenda.findMany({
            where: {
                leadId: leadId,
                status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                fecha: { gte: new Date() },
                OR: detalle_cita_para_cancelar ? [{ asunto: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } }, { tipoDeCita: { nombre: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } } }] : undefined,
            },
            include: { tipoDeCita: true },
            orderBy: { fecha: 'asc' },
            take: 5,
        });

        if (citasFuturas.length === 0) {
            return { success: true, data: { content: "No encontré ninguna cita futura agendada con tu número. ¿Es posible que la hayas agendado con otro contacto?" } };
        }

        if (citasFuturas.length === 1) {
            const cita = citasFuturas[0];
            return {
                success: true,
                data: {
                    content: `Encontré una cita para ${formatearCita(cita)}. ¿Es esta la que deseas cancelar?`,
                    aiContextData: {
                        nextActionName: 'confirmarCancelacionCita',
                        nextActionArgs: { cita_id: cita.id }
                    }
                }
            };
        }

        const listaCitas = citasFuturas.map((c, i) => `${i + 1}. ${formatearCita(c)}`).join('\n');
        return { success: true, data: { content: `Encontré estas citas a tu nombre. ¿Cuál de ellas quieres cancelar?\n\n${listaCitas}` } };

    } catch (error) {
        console.error(`[ejecutarCancelarCitaAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno al buscar la cita." };
    }
};
