'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from '../agendarCita/agendarCita.helpers';
import { z } from 'zod';
import type { AgendaTipoCita } from '@prisma/client';

const VerificarDisponibilidadArgsSchema = z.object({
    fecha_hora_consulta: z.string(),
    servicio_nombre: z.string().optional().nullable(),
});

export const ejecutarVerificarDisponibilidadHorarioAction: FunctionExecutor = async (argsFromIA, context) => {
    const { negocioId } = context;

    const validation = VerificarDisponibilidadArgsSchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Argumentos inválidos para verificar disponibilidad." };
    }
    const { fecha_hora_consulta, servicio_nombre } = validation.data;

    const fechaHora = await parsearFechaHoraInteligente(fecha_hora_consulta);
    if (!fechaHora) {
        return { success: true, data: { content: `No entendí bien la fecha y hora que mencionaste. ¿Podrías intentarlo de nuevo?` } };
    }

    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) return { success: false, error: `Configuración de agenda no encontrada.` };

    // --- Caso 1: El usuario especificó un servicio. (Esta lógica se mantiene) ---
    if (servicio_nombre) {
        const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
        if (!tipoCita) {
            return { success: true, data: { content: `No encontré el servicio "${servicio_nombre}".` } };
        }
        const disponibilidad = await verificarDisponibilidadSlot({
            negocioId,
            agendaTipoCita: tipoCita,
            fechaHoraInicioDeseada: fechaHora,
            configAgenda: {
                aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
                aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
                bufferMinutos: configDb.bufferMinutos ?? 0,
                requiereNombre: configDb.requiereNombreParaCita,
                requiereEmail: configDb.requiereEmailParaCita,
                requiereTelefono: configDb.requiereTelefonoParaCita,
            }
        });
        if (disponibilidad.disponible) {
            return { success: true, data: { content: `¡Sí! El horario de las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })} está disponible para "${servicio_nombre}". ¿Te gustaría agendarlo?` } };
        } else {
            return { success: true, data: { content: `Lo siento, ese horario no está disponible para "${servicio_nombre}". ${disponibilidad.mensaje || '¿Quieres intentar con otro?'}` } };
        }
    }

    // =========================================================================
    // --- Caso 2: El usuario NO especificó un servicio (TU LÓGICA MEJORADA) ---
    // =========================================================================
    // Ahora, en lugar de solo pedir el servicio, lo pedimos Y presentamos la lista.
    const servicios: Pick<AgendaTipoCita, 'nombre' | 'descripcion'>[] = await prisma.agendaTipoCita.findMany({
        where: { negocioId, activo: true },
        select: { nombre: true, descripcion: true },
        orderBy: { orden: 'asc' }
    });

    if (servicios.length === 0) {
        return { success: true, data: { content: `¡Claro! Veo que preguntas por las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })}. Para revisar la disponibilidad, necesito saber para qué servicio. Sin embargo, parece que no hay servicios configurados para agendar en este momento.` } };
    }

    let textoRespuesta = `Para poder confirmarte la disponibilidad para las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })}, primero necesito saber para qué servicio sería la cita, ya que la duración de cada uno puede variar. \n\nEstos son los servicios que ofrecemos:\n`;

    const listaServicios = servicios.map(s => {
        let item = `\n- **${s.nombre}**`;
        if (s.descripcion) item += `: ${s.descripcion}`;
        return item;
    }).join('');

    textoRespuesta += `${listaServicios}\n\n¿Cuál te interesa?`;

    // Devolvemos el contexto de la fecha/hora para que la IA lo recuerde.
    return {
        success: true,
        data: {
            content: textoRespuesta,
            aiContextData: {
                nextActionSuggestion: 'agendarCita',
                prefilledArgs: {
                    fecha_hora_deseada: fecha_hora_consulta
                }
            }
        }
    };
};