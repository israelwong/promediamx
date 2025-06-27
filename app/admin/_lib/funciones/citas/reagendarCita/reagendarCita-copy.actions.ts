'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { StatusAgenda, type Agenda as AgendaModel, type AgendaTipoCita } from '@prisma/client';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from '../agendarCita/agendarCita.helpers';
import { ConfiguracionAgendaDelNegocio } from '../agendarCita/agendarCita.schemas';
import { z } from 'zod';

// Esquema actualizado para incluir el detalle de la cita original
const ReagendarArgsSchema = z.object({
    cita_id_original: z.string().cuid().nullable().optional(),
    detalle_cita_original: z.string().min(1).max(200).nullable().optional(),
    nueva_fecha_hora_deseada: z.string().min(1).max(200).nullable().optional(),
});

function formatearCita(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): string {
    return `"${cita.asunto || cita.tipoDeCita?.nombre}" para el ${format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}`;
}

export const ejecutarReagendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId, negocioId, conversacionId } = context;

    // El ensamblador de contexto sigue siendo importante para manejar la conversación paso a paso
    const historialLlamadas = await prisma.interaccion.findMany({
        where: { conversacionId, role: 'assistant', parteTipo: 'FUNCTION_CALL', functionCallNombre: 'reagendarCita' },
        select: { functionCallArgs: true, createdAt: true }, orderBy: { createdAt: 'asc' },
    });
    let contextoAgregado = {};
    for (const llamada of historialLlamadas) {
        contextoAgregado = { ...contextoAgregado, ...(llamada.functionCallArgs as object) };
    }
    const args = { ...contextoAgregado, ...argsFromIA };

    const validation = ReagendarArgsSchema.safeParse(args);
    const { cita_id_original, detalle_cita_original, nueva_fecha_hora_deseada } = validation.data || {};

    try {
        // --- PASO 1: IDENTIFICAR LA CITA ORIGINAL ---
        let citaOriginal: (AgendaModel & { tipoDeCita: AgendaTipoCita | null }) | null = null;

        if (cita_id_original) {
            citaOriginal = await prisma.agenda.findUnique({ where: { id: cita_id_original, leadId }, include: { tipoDeCita: true } });
        } else {
            const citasFuturas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                    fecha: { gte: new Date() },
                    // Si el usuario da un detalle, lo usamos para afinar la búsqueda
                    OR: detalle_cita_original ? [{ asunto: { contains: detalle_cita_original, mode: 'insensitive' } }, { tipoDeCita: { nombre: { contains: detalle_cita_original, mode: 'insensitive' } } }] : undefined,
                },
                include: { tipoDeCita: true },
                orderBy: { fecha: 'asc' }, take: 5,
            });

            if (citasFuturas.length === 0) return { success: true, data: { content: "No encontré ninguna cita activa para reagendar." } };
            if (citasFuturas.length === 1) {
                citaOriginal = citasFuturas[0];
            } else {
                const listaCitas = citasFuturas.map((c, i) => `${i + 1}. ${formatearCita(c)}`).join('\n');
                return { success: true, data: { content: `Encontré estas citas. ¿Cuál de ellas quieres reagendar?\n\n${listaCitas}` } };
            }
        }

        if (!citaOriginal) return { success: true, data: { content: "No pude identificar la cita que quieres reagendar." } };
        if (!isFuture(new Date(citaOriginal.fecha))) return { success: true, data: { content: "No puedes reagendar una cita que ya ha pasado." } };
        if (!citaOriginal.tipoDeCita) return { success: false, error: `La cita ${citaOriginal.id} no tiene un tipo de servicio asociado.` };

        // --- PASO 2: VERIFICAR SI YA TENEMOS UNA NUEVA FECHA ---
        // Esta es la nueva lógica clave. Si el usuario ya nos dio una nueva fecha, saltamos la pregunta.
        if (!nueva_fecha_hora_deseada) {
            return {
                success: true,
                data: {
                    content: `Entendido, quieres reagendar tu cita de ${formatearCita(citaOriginal)}. ¿Para qué nueva fecha y hora te gustaría?`,
                    aiContextData: { cita_id_original: citaOriginal.id }
                }
            };
        }

        // --- PASO 3: VALIDAR LA NUEVA FECHA Y PRESENTAR CONFIRMACIÓN FINAL ---
        const nuevaFecha = await parsearFechaHoraInteligente(nueva_fecha_hora_deseada);
        if (!nuevaFecha) return { success: true, data: { content: `No entendí la nueva fecha y hora. Intenta de nuevo (ej. "el viernes a las 4pm").` } };

        const configAgendaDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
        if (!configAgendaDb) return { success: false, error: "Falta configuración de agenda." };
        const configParaHelper: ConfiguracionAgendaDelNegocio = {
            requiereNombre: configAgendaDb.requiereNombreParaCita,
            requiereEmail: configAgendaDb.requiereEmailParaCita,
            requiereTelefono: configAgendaDb.requiereTelefonoParaCita,
            bufferMinutos: configAgendaDb.bufferMinutos ?? 0,
            aceptaCitasVirtuales: configAgendaDb.aceptaCitasVirtuales,
            aceptaCitasPresenciales: configAgendaDb.aceptaCitasPresenciales,
        };

        const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: citaOriginal.tipoDeCita, fechaHoraInicioDeseada: nuevaFecha, configAgenda: configParaHelper });
        if (!disponibilidad.disponible) {
            return { success: true, data: { content: disponibilidad.mensaje || `Ese nuevo horario no está disponible. ¿Probamos con otro?` } };
        }

        const resumen = `¡Perfecto! El nuevo horario está disponible. Por favor, confirma que movemos tu cita:\n\n- **DE:** ${format(citaOriginal.fecha, "EEEE d 'a las' h:mm aa", { locale: es })}\n- **PARA:** ${format(nuevaFecha, "EEEE d 'a las' h:mm aa", { locale: es })}\n\n¿Confirmamos el cambio?`;

        return {
            success: true,
            data: {
                content: resumen,
                aiContextData: {
                    nextActionName: 'ejecutarReagendamientoConfirmado',
                    nextActionArgs: { cita_id_original: citaOriginal.id, nueva_fecha_iso: nuevaFecha.toISOString() }
                }
            }
        };

    } catch (error) {
        console.error(`[ejecutarReagendarCitaAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno." };
    }
};
