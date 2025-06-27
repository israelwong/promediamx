'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { StatusAgenda } from '@prisma/client';

export const ejecutarReagendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId } = context;

    try {
        const citaOriginal = await prisma.agenda.findFirst({
            where: {
                leadId: leadId,
                status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                fecha: { gte: new Date() },
            },
            include: { tipoDeCita: true },
            orderBy: { fecha: 'asc' },
        });

        if (!citaOriginal || !citaOriginal.tipoDeCita) {
            return { success: true, data: { content: "No encontré ninguna cita activa para reagendar. ¿Te gustaría agendar una desde cero?" } };
        }

        await prisma.agenda.update({
            where: { id: citaOriginal.id },
            data: { status: StatusAgenda.CANCELADA }
        });

        return {
            success: true,
            data: {
                content: `De acuerdo, he cancelado tu cita anterior de "${citaOriginal.asunto}". Ahora, por favor, dime la **nueva fecha y hora** para tu cita de "${citaOriginal.tipoDeCita.nombre}".`,
                aiContextData: {
                    nextActionName: 'agendarCita',
                    nextActionArgs: {
                        servicio_nombre: citaOriginal.tipoDeCita.nombre,
                        iniciar_nuevo_flujo: true
                    }
                }
            }
        };
    } catch (error) {
        console.error(`[ejecutarReagendarCitaAction] Error:`, error);
        return { success: false, error: "Error interno al procesar el reagendamiento." };
    }
};
