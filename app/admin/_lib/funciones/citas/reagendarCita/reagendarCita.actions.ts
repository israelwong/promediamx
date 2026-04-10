'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { StatusAgenda, type Agenda as AgendaModel, type AgendaTipoCita } from '@prisma/client';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from '../agendarCita/agendarCita.helpers';
import { ConfiguracionAgendaDelNegocio } from '../agendarCita/agendarCita.schemas';
import { z } from 'zod';

// Schema de lo que la IA nos pasa. Ahora es mucho más simple.
const ReagendarArgsSchema = z.object({
    cita_id_original: z.string().cuid().nullable().optional(),
    nueva_fecha_hora_deseada: z.string().min(1).max(200).nullable().optional(),
});

function formatearCita(cita: AgendaModel & { tipoDeCita?: { nombre: string } | null }): string {
    return `"${cita.asunto || cita.tipoDeCita?.nombre}" para el ${format(new Date(cita.fecha), "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}`;
}

// NUEVA VERSIÓN: Sigue estrictamente los principios de diseño.
export const ejecutarReagendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId, negocioId, conversacionId } = context;

    // El ensamblador de contexto ahora es simple: solo recuerda el ID de la cita que estamos procesando.
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
    const { cita_id_original, nueva_fecha_hora_deseada } = validation.data || {};

    try {
        // --- PASO 1: IDENTIFICAR LA CITA ORIGINAL (Si aún no la tenemos) ---
        let citaOriginal: (AgendaModel & { tipoDeCita: AgendaTipoCita | null }) | null = null;

        if (cita_id_original) {
            citaOriginal = await prisma.agenda.findUnique({ where: { id: cita_id_original, leadId }, include: { tipoDeCita: true } });
        } else {
            // Búsqueda Proactiva: El asistente hace el trabajo pesado.
            const citasFuturas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                    fecha: { gte: new Date() },
                },
                include: { tipoDeCita: true },
                orderBy: { fecha: 'asc' }, take: 1, // Tomamos solo la más próxima por simplicidad
            });
            if (citasFuturas.length === 0) return { success: true, data: { content: "No encontré ninguna cita activa para reagendar." } };
            citaOriginal = citasFuturas[0];
        }

        if (!citaOriginal) return { success: true, data: { content: "No pude identificar la cita que quieres reagendar." } };
        if (!isFuture(new Date(citaOriginal.fecha))) return { success: true, data: { content: "No puedes reagendar una cita que ya ha pasado." } };
        if (!citaOriginal.tipoDeCita) return { success: false, error: `La cita ${citaOriginal.id} no tiene un tipo de servicio asociado.` };

        // --- PASO 2: PEDIR LA NUEVA FECHA (Si aún no la tenemos) ---
        if (!nueva_fecha_hora_deseada) {
            return {
                success: true,
                data: {
                    content: `Entendido, para reagendar tu cita de ${formatearCita(citaOriginal)}, ¿qué nueva fecha y hora te gustaría?`,
                    // Pase de Estafeta: Guardamos el ID en el contexto para el siguiente turno.
                    aiContextData: { cita_id_original: citaOriginal.id }
                }
            };
        }

        // --- PASO 3: VALIDAR LA NUEVA FECHA Y PRESENTAR LA CONFIRMACIÓN FINAL ---
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
                // Pase de Estafeta Final: Le damos a la IA la orden y los datos exactos para la función ejecutora.
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
