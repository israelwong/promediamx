// Ruta: app/admin/_lib/funciones/citas/cancelarCita/cancelarCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { StatusAgenda, Prisma } from '@prisma/client';
import type { Agenda as AgendaModel } from '@prisma/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente } from '../agendarCita/agendarCita.helpers';

// Schema para los argumentos que la IA puede extraer en el primer intento.
const BuscarArgsSchema = z.object({
    detalle_cita_para_cancelar: z.string().min(1).max(200).nullable().optional(),
});

// Función auxiliar para formatear la cita de manera legible.
function formatearCita(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): string {
    const asunto = cita.asunto || cita.tipoDeCita?.nombre || "Cita";
    return `"${asunto}" para el ${format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}`;
}

// --- FUNCIÓN RECOLECTORA PRINCIPAL ---
export const ejecutarCancelarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId } = context;

    // Se valida la entrada del turno actual.
    const validation = BuscarArgsSchema.safeParse(argsFromIA);
    const { detalle_cita_para_cancelar } = validation.data || {};

    try {
        // Se construye la consulta de búsqueda dinámicamente.
        const whereClause: Prisma.AgendaWhereInput = {
            leadId: leadId,
            status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] }, // Búsqueda corregida.
            fecha: { gte: new Date() },
        };

        if (detalle_cita_para_cancelar) {
            const fechaPotencial = await parsearFechaHoraInteligente(detalle_cita_para_cancelar, { permitirSoloFecha: true });

            const orConditions: Prisma.AgendaWhereInput[] = [
                { asunto: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } },
                { tipoDeCita: { nombre: { contains: detalle_cita_para_cancelar, mode: 'insensitive' } } }
            ];

            if (fechaPotencial) {
                orConditions.push({
                    fecha: {
                        gte: startOfDay(fechaPotencial),
                        lt: endOfDay(fechaPotencial)
                    }
                });
            }
            whereClause.OR = orConditions;
        }

        // Se ejecuta la búsqueda en la base de datos.
        const citasFuturas = await prisma.agenda.findMany({
            where: whereClause,
            include: { tipoDeCita: true },
            orderBy: { fecha: 'asc' },
            take: 5,
        });

        // Se manejan los diferentes escenarios de resultados.
        if (citasFuturas.length === 0) {
            return { success: true, data: { content: "No encontré ninguna cita futura agendada. ¿Puedo ayudarte en algo más?" } };
        }

        if (citasFuturas.length === 1) {
            const cita = citasFuturas[0];
            // PASE DE ESTAFETA: Se prepara la siguiente acción sin ambigüedades.
            return {
                success: true,
                data: {
                    content: `Encontré esta cita: ${formatearCita(cita)}. ¿Es esta la que deseas cancelar?`,
                    aiContextData: {
                        nextActionName: 'confirmarCancelacionCita',
                        nextActionArgs: {
                            cita_id: cita.id,
                        }
                    }
                }
            };
        }

        const listaCitas = citasFuturas.map((c, i) => `${i + 1}. ${formatearCita(c)}`).join('\n');
        return { success: true, data: { content: `Encontré estas citas futuras. ¿Cuál de ellas deseas cancelar?\n\n${listaCitas}\n\nPor favor, responde con el número o un detalle más específico.` } };

    } catch (error) {
        console.error(`[ejecutarCancelarCitaAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno al buscar la cita." };
    }
};