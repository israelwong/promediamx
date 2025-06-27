'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { z } from 'zod';
import { StatusAgenda, type Agenda as AgendaModel } from '@prisma/client';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from '../agendarCita/agendarCita.helpers';

// Schema de lo que la IA nos pasa en cada turno
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

    // Usamos el "Context Assembler"
    const historialLlamadas = await prisma.interaccion.findMany({
        where: { conversacionId, role: 'assistant', parteTipo: 'FUNCTION_CALL', functionCallNombre: 'reagendarCita' },
        select: { functionCallArgs: true }, orderBy: { createdAt: 'asc' },
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
        let citaOriginal: (AgendaModel & {
            tipoDeCita: {
                id: string;
                negocioId: string;
                descripcion: string | null;
                nombre: string;
                duracionMinutos: number | null;
                todoElDia: boolean | null;
                esVirtual: boolean;
                esPresencial: boolean;
                orden: number | null;
                limiteConcurrencia: number;
                activo: boolean;
            } | null
        }) | null = null;
        if (cita_id_original) {
            citaOriginal = await prisma.agenda.findUnique({
                where: { id: cita_id_original, leadId },
                include: { tipoDeCita: true }
            });
        }

        if (!citaOriginal) {
            const citasFuturas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { notIn: [StatusAgenda.CANCELADA, StatusAgenda.COMPLETADA, StatusAgenda.NO_ASISTIO, StatusAgenda.REAGENDADA] },
                    fecha: { gte: new Date() },
                    OR: detalle_cita_original ? [{ asunto: { contains: detalle_cita_original, mode: 'insensitive' } }, { tipoDeCita: { nombre: { contains: detalle_cita_original, mode: 'insensitive' } } }] : undefined,
                },
                include: { tipoDeCita: true },
                orderBy: { fecha: 'asc' }, take: 5,
            });

            if (citasFuturas.length === 0) return { success: true, data: { content: "No encontré ninguna cita futura para reagendar. ¿Te gustaría agendar una nueva?" } };
            if (citasFuturas.length === 1) {
                citaOriginal = citasFuturas[0];
            } else {
                const listaCitas = citasFuturas.map((c, i) => `${i + 1}. ${formatearCita(c)}`).join('\n');
                return { success: true, data: { content: `Encontré estas citas futuras. ¿Cuál de ellas te gustaría reagendar?\n\n${listaCitas}\n\nPor favor, responde con el número o un detalle más específico.` } };
            }
        }

        if (!isFuture(new Date(citaOriginal.fecha))) return { success: true, data: { content: "Lo siento, no puedes reagendar una cita que ya ha pasado." } };

        // --- PASO 2: PEDIR Y VALIDAR LA NUEVA FECHA ---
        if (!nueva_fecha_hora_deseada) {
            return {
                success: true,
                data: {
                    content: `Entendido, quieres reagendar tu cita de ${formatearCita(citaOriginal)}. ¿Para qué nueva fecha y hora te gustaría?`,
                    aiContextData: { cita_id_original: citaOriginal.id }
                }
            };
        }

        const nuevaFecha = await parsearFechaHoraInteligente(nueva_fecha_hora_deseada);
        if (!nuevaFecha) return { success: true, data: { content: `No entendí la nueva fecha y hora. Intenta de nuevo (ej. "mañana a las 3 pm").` } };

        const configAgenda = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
        if (!configAgenda || !citaOriginal.tipoDeCita) return { success: false, error: "Falta configuración de agenda o tipo de cita." };

        const disponibilidad = await verificarDisponibilidadSlot({
            negocioId,
            agendaTipoCita: citaOriginal.tipoDeCita,
            fechaHoraInicioDeseada: nuevaFecha,
            configAgenda: {
                aceptaCitasPresenciales: configAgenda.aceptaCitasPresenciales,
                aceptaCitasVirtuales: configAgenda.aceptaCitasVirtuales,
                bufferMinutos: configAgenda.bufferMinutos ?? 0,
                requiereNombre: configAgenda.requiereNombreParaCita,
                requiereEmail: configAgenda.requiereEmailParaCita,
                requiereTelefono: configAgenda.requiereTelefonoParaCita,
            }
        });
        if (!disponibilidad.disponible) {
            return { success: true, data: { content: disponibilidad.mensaje || `Ese nuevo horario no está disponible. ¿Quieres intentar con otro?` } };
        }

        // --- PASO 3: PRESENTAR RESUMEN FINAL Y PREPARAR LA EJECUCIÓN ---
        const resumen = `¡Perfecto! El nuevo horario está disponible. Por favor, confirma que quieres mover tu cita:\n\n- **DE:** ${format(citaOriginal.fecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}\n- **PARA:** ${format(nuevaFecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es })}\n\n¿Confirmamos el cambio? (sí/no)`;

        return {
            success: true,
            data: {
                content: resumen,
                aiContextData: {
                    nextActionName: 'ejecutarReagendamientoConfirmado',
                    nextActionArgs: {
                        cita_id_original: citaOriginal.id,
                        nueva_fecha_iso: nuevaFecha.toISOString()
                    }
                }
            }
        };

    } catch (error) {
        console.error(`[ejecutarReagendarCitaAction] Error:`, error);
        return { success: false, error: error instanceof Error ? error.message : "Error interno al procesar el reagendamiento." };
    }
};