// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format as formatDateFns } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import prisma from '@/app/admin/_lib/prismaClient';
import { DiaSemana, StatusAgenda } from '@prisma/client';

/**
 * VERSIÓN FINAL Y FUNCIONAL
 * Esta versión está validada y es la definitiva.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    const textoCorregido = textoFecha
        .toLowerCase()
        .replace(/\bde la mañana\b/g, 'am')
        .replace(/\bde la tarde\b/g, 'pm')
        .replace(/\bde la noche\b/g, 'pm')
        .replace(/\blpm\b/g, '1 pm');

    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const resultados = chrono.es.parse(textoCorregido, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        return null;
    }

    const resultado = resultados[0];

    const año = resultado.start.get('year');
    const mes = resultado.start.get('month');
    const dia = resultado.start.get('day');
    const hora = resultado.start.get('hour');
    const minuto = resultado.start.get('minute');

    if (año == null || mes == null || dia == null || hora == null || minuto == null) {
        return null;
    }

    try {
        const offsetString = formatDateFns(ahoraEnZona, 'xxx', { timeZone });
        const fechaIsoConOffset =
            `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` +
            `T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00` +
            `${offsetString}`;

        return new Date(fechaIsoConOffset);

    } catch (error) {
        console.error("Error al construir la fecha final:", error);
        return null;
    }
}

const ParseAndCheckSchema = z.object({
    textoFecha: z.string().min(3, "El texto de la fecha es requerido."),
    tipoDeCitaId: z.string().cuid(),
    negocioId: z.string().cuid(),
});

type ApiResponse = {
    disponible: boolean;
    mensaje: string;
    fechaISO?: string;
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ disponible: false, mensaje: `Método ${req.method} no permitido` });
    }

    try {
        const validation = ParseAndCheckSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ disponible: false, mensaje: "Datos de entrada inválidos.", error: JSON.stringify(validation.error.flatten()) });
        }

        const { textoFecha, negocioId, tipoDeCitaId } = validation.data;
        const timeZone = 'America/Mexico_City';

        const fecha = parsearFechaConPrecision(textoFecha, timeZone);

        if (!fecha) {
            return res.status(200).json({ disponible: false, mensaje: "No pude entender la fecha y hora que mencionaste. ¿Podrías ser más específico?" });
        }

        // ✅ SOLUCIÓN: Usar la API nativa Intl.DateTimeFormat para un formateo robusto.
        const formatter = new Intl.DateTimeFormat('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZone: timeZone,
        });
        const fechaFormateada = formatter.format(fecha)
            .replace(/ de /g, ' ') // Limpieza para un formato más natural
            .replace(/,/, ' a las');

        const ahoraEnzona = toZonedTime(new Date(), timeZone);
        if (isBefore(fecha, ahoraEnzona)) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, la fecha que buscas (${fechaFormateada}) ya pasó.` });
        }

        // --- LÓGICA DE VALIDACIÓN UNIFICADA ---
        const [negocioConHorarios, tipoCita] = await Promise.all([
            prisma.negocio.findUnique({
                where: { id: negocioId },
                include: { horariosAtencion: true, excepcionesHorario: true },
            }),
            prisma.agendaTipoCita.findUnique({ where: { id: tipoDeCitaId } })
        ]);

        if (!negocioConHorarios) return res.status(404).json({ disponible: false, mensaje: "Negocio no encontrado." });
        if (!tipoCita) return res.status(404).json({ disponible: false, mensaje: "Tipo de cita no encontrado." });

        const { horariosAtencion, excepcionesHorario } = negocioConHorarios;

        const fechaYYYYMMDD = formatDateFns(fecha, 'yyyy-MM-dd', { timeZone });
        const excepcionDelDia = excepcionesHorario.find(e => e.fecha.toISOString().split('T')[0] === fechaYYYYMMDD);

        if (excepcionDelDia?.esDiaNoLaborable) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, el día ${formatDateFns(fecha, 'd MMMM', { locale: es })} no estamos disponibles por un evento especial.` });
        }

        const diaSemanaJS = parseInt(formatDateFns(fecha, 'i', { timeZone }));
        const diasSemanaEnum: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
        const diaSemana = diasSemanaEnum[diaSemanaJS - 1];

        const horarioDelDia = horariosAtencion.find(h => h.dia === diaSemana);
        if (!horarioDelDia) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, no atendemos los días ${diaSemana.toLowerCase()}.` });
        }

        const horaSolicitada = formatDateFns(fecha, 'HH:mm', { timeZone });
        const { horaInicio, horaFin } = horarioDelDia;
        if (horaSolicitada < horaInicio || horaSolicitada >= horaFin) {
            return res.status(200).json({ disponible: false, mensaje: `Nuestros horarios para los ${diaSemana.toLowerCase()} son de ${horaInicio} a ${horaFin}. Por favor, elige una hora dentro de ese rango.` });
        }

        const citasDelDia = await prisma.agenda.findMany({
            where: {
                negocioId,
                status: StatusAgenda.PENDIENTE,
                fecha: {
                    gte: toZonedTime(new Date(fecha).setHours(0, 0, 0, 0), timeZone),
                    lt: toZonedTime(new Date(fecha).setHours(23, 59, 59, 999), timeZone),
                },
            }
        });

        const duracionMinutos = tipoCita.duracionMinutos || 30;
        const finCitaDeseada = new Date(fecha.getTime() + duracionMinutos * 60000);
        const citasSolapadas = citasDelDia.filter(citaExistente => {
            const finCitaExistente = new Date(citaExistente.fecha.getTime() + duracionMinutos * 60000);
            return fecha < finCitaExistente && finCitaDeseada > citaExistente.fecha;
        });

        if (citasSolapadas.length >= tipoCita.limiteConcurrencia) {
            return res.status(200).json({ disponible: false, mensaje: "Lo siento, ese horario acaba de ser ocupado. Por favor, elige otro." });
        }

        return res.status(200).json({
            disponible: true,
            mensaje: `¡Perfecto! El horario del ${fechaFormateada} está disponible.`,
            fechaISO: fecha.toISOString()
        });

    } catch (error) {
        console.error("Error en API de parse-and-check:", error);
        return res.status(500).json({ disponible: false, mensaje: 'Error interno del servidor.', error: (error as Error).message });
    }
}
