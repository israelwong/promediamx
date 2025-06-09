// app/admin/_lib/funciones/citas/cancelarCita/cancelarCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { StatusAgenda, type Agenda as AgendaModel } from '@prisma/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente } from '../agendarCita/agendarCita.helpers';

const BuscarArgsSchema = z.object({
    detalle_cita_para_cancelar: z.string().min(1).max(200).nullable().optional(),
});

function formatearCita(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): string {
    return `"${cita.asunto || cita.tipoDeCita?.nombre}" para el ${format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}`;
}

export const ejecutarCancelarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId } = context;
    const validation = BuscarArgsSchema.safeParse(argsFromIA);
    const { detalle_cita_para_cancelar } = validation.data || {};

    try {
        type WhereClauseType = {
            leadId: typeof leadId;
            status: { notIn: StatusAgenda[] };
            fecha: { gte: Date };
            AND?: Array<{ fecha: { gte?: Date; lt?: Date } }>;
            OR?: Array<
                | { asunto: { contains: string; mode: 'insensitive' } }
                | { tipoDeCita: { nombre: { contains: string; mode: 'insensitive' } } }
            >;
        };

        const whereClause: WhereClauseType = {
            leadId: leadId,
            status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.NO_ASISTIO] },
            fecha: { gte: new Date() },
        };

        if (detalle_cita_para_cancelar) {
            const fechaPotencial = await parsearFechaHoraInteligente(detalle_cita_para_cancelar, { permitirSoloFecha: true });
            if (fechaPotencial) {
                whereClause.AND = [
                    { fecha: { gte: startOfDay(fechaPotencial) } },
                    { fecha: { lt: endOfDay(fechaPotencial) } }
                ];
            }
            whereClause.OR = [
                { asunto: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } },
                { tipoDeCita: { nombre: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } } }
            ];
        }

        const citasFuturas = await prisma.agenda.findMany({
            where: whereClause,
            include: { tipoDeCita: { select: { nombre: true } } },
            orderBy: { fecha: 'asc' }, take: 5,
        });

        if (citasFuturas.length === 0) {
            return { success: true, data: { content: "No encontré ninguna cita futura agendada con tu número. ¿Es posible que la hayas agendado con otro contacto?" } };
        }

        if (citasFuturas.length === 1) {
            const cita = citasFuturas[0];
            return {
                success: true,
                data: {
                    content: `Encontré esta cita: ${formatearCita(cita)}. ¿Es esta la que deseas cancelar (sí/no)?`,
                    aiContextData: {
                        nextActionName: 'ejecutarCancelacionConfirmada',
                        nextActionArgs: { cita_id: cita.id }
                    }
                }
            };
        }

        const listaCitas = citasFuturas.map((c, i) => `${i + 1}. ${formatearCita(c)}`).join('\n');
        return { success: true, data: { content: `Encontré estas citas futuras. ¿Cuál de ellas deseas cancelar?\n\n${listaCitas}\n\nPor favor, responde con el número o un detalle más específico.` } };

    } catch (error) {
        console.error(`[buscarCitaParaCancelarAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno al buscar la cita." };
    }
};