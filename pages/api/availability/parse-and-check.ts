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
 * Añade un pre-procesamiento para convertir números escritos a dígitos.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    console.log(`[LOG 1] INICIO. Texto original: "${textoFecha}"`);

    let textoProcesado = textoFecha.toLowerCase();

    // ✅ SOLUCIÓN: Convertir números escritos a dígitos antes de analizar.
    const numberWords: { [key: string]: string } = {
        'una': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
        'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
        'once': '11', 'doce': '12'
    };

    for (const word in numberWords) {
        // Usamos una expresión regular con \b para reemplazar solo la palabra completa.
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        textoProcesado = textoProcesado.replace(regex, numberWords[word]);
    }

    if (textoProcesado !== textoFecha.toLowerCase()) {
        console.log(`[LOG 1.1] REEMPLAZO DE NÚMEROS. Texto nuevo: "${textoProcesado}"`);
    }

    // Se realizan los otros reemplazos sobre el texto ya procesado.
    const textoCorregido = textoProcesado
        .replace(/\bde la mañana\b/g, 'am')
        .replace(/\bde la tarde\b/g, 'pm')
        .replace(/\bde la noche\b/g, 'pm')
        .replace(/\blpm\b/g, '1 pm');

    if (textoCorregido !== textoProcesado) {
        console.log(`[LOG 1.2] TEXTO ESTANDARIZADO. Texto final: "${textoCorregido}"`);
    }

    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const resultados = chrono.es.parse(textoCorregido, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        console.log('[LOG 2] ERROR: chrono-node no encontró ninguna fecha.');
        return null;
    }

    console.log('[LOG 2] chrono-node encontró:', JSON.stringify(resultados, null, 2));

    const resultado = resultados[0];
    console.log('[LOG 3] Resultado de Chrono SELECCIONADO (el primero):', JSON.stringify(resultado, null, 2));

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
        const offsetString = formatDateFns(ahoraEnZona, 'xxx', { timeZone });
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

        // ✅ SOLUCIÓN: Se reconstruye el string de fecha para un formato más natural.
        const dateFormatter = new Intl.DateTimeFormat('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: timeZone,
        });
        const timeFormatter = new Intl.DateTimeFormat('es-MX', {
            hour: 'numeric', minute: 'numeric', hour12: true, timeZone: timeZone,
        });
        const fechaFormateada = `${dateFormatter.format(fecha).replace(',', '')} a las ${timeFormatter.format(fecha)}`;

        console.log(`[LOG 9] Mensaje final formateado: "${fechaFormateada}"`);

        const ahoraEnzona = toZonedTime(new Date(), timeZone);
        if (isBefore(fecha, ahoraEnzona)) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, la fecha que buscas (${fechaFormateada}) ya pasó.` });
        }

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

        const fechaYYYYMMDD = formatDateFns(fecha, 'yyyy-MM-dd', { timeZone });
        console.log(`[LOG 11] Buscando excepciones para la fecha: ${fechaYYYYMMDD}`);
        const excepcionDelDia = excepcionesHorario.find(e => e.fecha.toISOString().split('T')[0] === fechaYYYYMMDD);

        if (excepcionDelDia?.esDiaNoLaborable) {
            console.log(`[LOG 12] FALLO: El día ${fechaYYYYMMDD} es una excepción no laborable.`);
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, el día ${formatDateFns(fecha, 'd MMMM', { locale: es })} no estamos disponibles por un evento especial.` });
        }

        const diaSemanaJS = parseInt(formatDateFns(fecha, 'i', { timeZone }));
        const diasSemanaEnum: DiaSemana[] = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
        const diaSemana = diasSemanaEnum[diaSemanaJS - 1];

        const horarioDelDia = horariosAtencion.find(h => h.dia === diaSemana);
        console.log(`[LOG 13] Buscando horario para el día: ${diaSemana}. Encontrado:`, horarioDelDia);

        if (!horarioDelDia) {
            console.log(`[LOG 14] FALLO: No hay horario de atención configurado para ${diaSemana}.`);
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, no atendemos los días ${diaSemana.toLowerCase()}.` });
        }

        const horaSolicitada = new Intl.DateTimeFormat('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timeZone,
        }).format(fecha);
        const { horaInicio, horaFin } = horarioDelDia;
        console.log(`[LOG 15] Comparando hora solicitada (${horaSolicitada}) con horario del negocio (${horaInicio} - ${horaFin}).`);

        if (horaSolicitada < horaInicio || horaSolicitada >= horaFin) {
            console.log(`[LOG 16] FALLO: La hora solicitada está fuera del horario laboral.`);
            return res.status(200).json({ disponible: false, mensaje: `Nuestros horarios para los ${diaSemana.toLowerCase()} son de ${horaInicio} a ${horaFin}. Por favor, elige una hora dentro de ese rango.` });
        }

        console.log('[LOG 17] ÉXITO: La hora está dentro del horario laboral. Procediendo a verificar concurrencia...');

        const startOfDayStr = formatDateFns(fecha, 'yyyy-MM-dd') + 'T00:00:00';
        const endOfDayStr = formatDateFns(fecha, 'yyyy-MM-dd') + 'T23:59:59';
        const startOfDay = toZonedTime(startOfDayStr, timeZone);
        const endOfDay = toZonedTime(endOfDayStr, timeZone);

        console.log(`[LOG 17.1] Rango de búsqueda de citas: de ${startOfDay.toISOString()} a ${endOfDay.toISOString()}`);

        const citasDelDia = await prisma.agenda.findMany({
            where: {
                negocioId,
                status: StatusAgenda.PENDIENTE,
                fecha: {
                    gte: startOfDay,
                    lte: endOfDay,
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
            console.log(`[LOG 18] FALLO: Se excede el límite de concurrencia. Citas solapadas: ${citasSolapadas.length}. Límite: ${tipoCita.limiteConcurrencia}`);
            return res.status(200).json({ disponible: false, mensaje: "Lo siento, ese horario acaba de ser ocupado. Por favor, elige otro." });
        }

        console.log('[LOG 19] ÉXITO: El horario está disponible y no hay conflicto de concurrencia.');

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
