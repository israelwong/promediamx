// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
// Usaremos las funciones más básicas y compatibles
import { toZonedTime, format, getTimezoneOffset } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

/**
 * VERSIÓN FINAL Y DEFINITIVA
 * Usa un método manual y robusto para evitar conflictos de entorno/librería.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    const textoNormalizado = textoFecha
        .toLowerCase()
        .replace(/ de la tarde/g, 'pm')
        .replace(/ de la noche/g, 'pm')
        .replace(/ de la mañana/g, 'am');

    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const resultados = chrono.es.parse(textoNormalizado, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        return null;
    }

    const resultado = resultados[0];
    const año = resultado.start.get('year');
    const mes = resultado.start.get('month');
    const dia = resultado.start.get('day');
    const hora = resultado.start.get('hour');
    const minuto = resultado.start.get('minute');

    if (!año || !mes || !dia || hora === undefined || minuto === undefined) {
        return null;
    }

    try {
        // --- LÓGICA MANUAL Y A PRUEBA DE FALLOS ---
        // 1. Obtenemos el offset de la zona horaria en milisegundos.
        const offsetMs = getTimezoneOffset(timeZone);

        // 2. Convertimos el offset a formato de string (+HH:mm o -HH:mm).
        // La librería devuelve un valor positivo para zonas detrás de UTC (ej. Américas),
        // por lo que el signo debe invertirse para el formato ISO 8601.
        const offsetSign = offsetMs > 0 ? '-' : '+';
        const offsetHours = Math.floor(Math.abs(offsetMs) / 3600000);
        const offsetMinutes = Math.floor((Math.abs(offsetMs) / 60000) % 60);
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

        // 3. Construimos el string ISO 8601 completo.
        // Ejemplo: "2025-07-11T15:00:00-06:00"
        const fechaIsoConOffset =
            `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` +
            `T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00` +
            `${offsetString}`;

        // 4. Creamos la fecha final a partir de este string inequívoco.
        const fechaFinal = new Date(fechaIsoConOffset);
        return fechaFinal;

    } catch (error) {
        console.error("Error al construir la fecha con zona horaria (Método Manual):", error);
        return null;
    }
}


// --- EL RESTO DEL ARCHIVO NO CAMBIA ---

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
            return res.status(200).json({ disponible: false, mensaje: "No pude entender la fecha y hora que mencionaste. ¿Podrías ser más específico? (ej: 'mañana a las 4pm')" });
        }

        const fechaFormateada = format(fecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es, timeZone });

        const ahoraEnZona = toZonedTime(new Date(), timeZone);
        if (isBefore(fecha, ahoraEnZona)) {
            return res.status(200).json({ disponible: false, mensaje: `Lo sentimos, la fecha que buscas (${fechaFormateada}) ya pasó.` });
        }

        const resultado = await verificarDisponibilidad({
            negocioId,
            tipoDeCitaId,
            fechaDeseada: fecha,
            leadId: 'LEAD_FROM_MANYCHAT_PARSE_CHECK',
        });

        if (resultado.disponible) {
            return res.status(200).json({
                disponible: true,
                mensaje: `¡Perfecto! El horario del ${fechaFormateada} está disponible.`,
                fechaISO: fecha.toISOString()
            });
        } else {
            return res.status(200).json({
                disponible: false,
                mensaje: resultado.mensaje || `Lo sentimos, el horario del ${fechaFormateada} ya se encuentra ocupado. Por favor, elige otro.`
            });
        }

    } catch (error) {
        console.error("Error en API de parse-and-check:", error);
        return res.status(500).json({ disponible: false, mensaje: 'Error interno del servidor.', error: (error as Error).message });
    }
}