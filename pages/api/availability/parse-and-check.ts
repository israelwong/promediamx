// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import prisma from '@/app/admin/_lib/prismaClient';
import { DiaSemana, StatusAgenda } from '@prisma/client';

/**
 * VERSIÓN FINAL CON VALIDACIÓN DE HORARIOS
 * Añade la lógica para cotejar la hora solicitada con los horarios de atención del negocio.
 * Incluye logs para depuración.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    console.log(`[LOG 1] INICIO. Texto original: "${textoFecha}"`);

    const textoCorregido = textoFecha
        .toLowerCase()
        .replace(/\blpm\b/g, '1 pm');

    if (textoCorregido !== textoFecha.toLowerCase()) {
        console.log(`[LOG 1.1] TYPO CORREGIDO. Texto nuevo: "${textoCorregido}"`);
    }

    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const resultados = chrono.es.parse(textoCorregido, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        console.log('[LOG 2] ERROR: chrono-node no encontró ninguna fecha.');
        return null;
    }

    console.log('[LOG 2] chrono-node encontró:', JSON.stringify(resultados, null, 2));

    const componentes: chrono.Component[] = ['year', 'month', 'day', 'hour', 'minute', 'meridiem', 'weekday'];
    const resultado = resultados.reduce((mejor, actual) => {
        const scoreMejor = componentes.filter(c => mejor.start.isCertain(c)).length;
        const scoreActual = componentes.filter(c => actual.start.isCertain(c)).length;
        return scoreActual > scoreMejor ? actual : mejor;
    });

    console.log('[LOG 3] Resultado de Chrono SELECCIONADO (el más específico):', JSON.stringify(resultado, null, 2));

    const año = resultado.start.get('year');
    const mes = resultado.start.get('month');
    const dia = resultado.start.get('day');
    const hora = resultado.start.get('hour');
    const minuto = resultado.start.get('minute');

    console.log(`[LOG 4] Componentes extraídos del resultado: Año=${año}, Mes=${mes}, Día=${dia}, Hora=${hora}, Minuto=${minuto}`);

    if (año == null || mes == null || dia == null || hora == null || minuto == null) {
        console.log('[LOG 4.1] ERROR: Faltan componentes de fecha esenciales.');
        return null;
    }

    try {
        const offsetString = format(ahoraEnZona, 'xxx', { timeZone });
        console.log(`[LOG 5] Offset de zona horaria calculado: ${offsetString}`);

        const fechaIsoConOffset =
            `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` +
            `T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00` +
            `${offsetString}`;

        console.log(`[LOG 6] String ISO final para crear la fecha: "${fechaIsoConOffset}"`);

        const fechaFinal = new Date(fechaIsoConOffset);
        console.log(`[LOG 7] Objeto Date final (en UTC): ${fechaFinal.toISOString()}`);
        return fechaFinal;

    } catch (error) {
        console.error("[LOG 8] ERROR al construir la fecha final:", error);
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

        const fechaFormateada = format(fecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es, timeZone });
        console.log(`[LOG 9] Mensaje final formateado: "${fechaFormateada}"`);

        const ahoraEnzona = toZonedTime(new Date(), timeZone);
        if (isBefore(fecha, ahoraEnzona)) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, la fecha que buscas (${fechaFormateada}) ya pasó.` });
        }

        // --- LÓGICA DE VALIDACIÓN UNIFICADA ---

        console.log('[LOG 10] Iniciando validación de horario laboral...');
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

        // 1. Validar excepciones
        const fechaYYYYMMDD = format(fecha, 'yyyy-MM-dd', { timeZone });
        console.log(`[LOG 10.1] Buscando excepciones para la fecha: ${fechaYYYYMMDD}`);

        // ✅ CORRECCIÓN: Comparamos las fechas ignorando la parte de la hora.
        const excepcionDelDia = excepcionesHorario.find(e => {
            // Convertimos la fecha de la BD (que es UTC) a un string YYYY-MM-DD
            const exceptionDateString = e.fecha.toISOString().split('T')[0];

            console.log(`[LOG 10.2] Comparando (string vs string): ${exceptionDateString} === ${fechaYYYYMMDD}`);

            return exceptionDateString === fechaYYYYMMDD;
        });


        if (excepcionDelDia?.esDiaNoLaborable) {
            console.log(`[LOG 11] FALLO: El día ${fechaYYYYMMDD} es una excepción no laborable.`);
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, el día ${format(fecha, 'd MMMM', { locale: es })} no estamos disponibles por un evento especial.` });
        }

        // 2. Validar día y hora de la semana
        const diaSemanaJS = parseInt(format(fecha, 'i', { timeZone }));
        const diasSemanaEnum: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
        const diaSemana = diasSemanaEnum[diaSemanaJS - 1];

        const horarioDelDia = horariosAtencion.find(h => h.dia === diaSemana);
        console.log(`[LOG 12] Buscando horario para el día: ${diaSemana}. Encontrado:`, horarioDelDia);

        if (!horarioDelDia) {
            console.log(`[LOG 13] FALLO: No hay horario de atención configurado para ${diaSemana}.`);
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, no atendemos los días ${diaSemana.toLowerCase()}.` });
        }

        const horaSolicitada = format(fecha, 'HH:mm', { timeZone });
        const { horaInicio, horaFin } = horarioDelDia;
        console.log(`[LOG 14] Comparando hora solicitada (${horaSolicitada}) con horario del negocio (${horaInicio} - ${horaFin}).`);

        if (horaSolicitada < horaInicio || horaSolicitada >= horaFin) {
            console.log(`[LOG 15] FALLO: La hora solicitada está fuera del horario laboral.`);
            return res.status(200).json({ disponible: false, mensaje: `Nuestros horarios para los ${diaSemana.toLowerCase()} son de ${horaInicio} a ${horaFin}. Por favor, elige una hora dentro de ese rango.` });
        }

        console.log('[LOG 16] ÉXITO: La hora está dentro del horario laboral. Procediendo a verificar concurrencia...');

        // 3. Validar concurrencia (lógica movida desde el helper)
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
            console.log(`[LOG 17] FALLO: Se excede el límite de concurrencia.`);
            return res.status(200).json({ disponible: false, mensaje: "Lo siento, ese horario acaba de ser ocupado. Por favor, elige otro." });
        }

        console.log('[LOG 18] ÉXITO: El horario está disponible y no hay conflicto de concurrencia.');
        // --- FIN DE LA LÓGICA DE VALIDACIÓN UNIFICADA ---

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
