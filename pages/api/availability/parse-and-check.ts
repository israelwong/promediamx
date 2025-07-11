// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
// Usaremos getTimezoneOffset que es más compatible
import { toZonedTime, format, getTimezoneOffset } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

/**
 * PLAN B: Versión a prueba de fallos que no usa zonedTimeToUtc.
 * Construye un string ISO 8601 completo con offset para evitar ambigüedades.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const resultados = chrono.es.parse(textoFecha, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        return null;
    }

    const resultado = resultados[resultados.length - 1];

    const año = resultado.start.get('year');
    const mes = resultado.start.get('month');
    const dia = resultado.start.get('day');
    const hora = resultado.start.get('hour');
    const minuto = resultado.start.get('minute');

    if (!año || !mes || !dia || hora === undefined || minuto === undefined) {
        return null;
    }

    try {
        // --- LÓGICA ALTERNATIVA ---
        // 1. Obtenemos el offset de la zona horaria en milisegundos.
        const offsetMs = getTimezoneOffset(timeZone);

        // 2. Convertimos el offset a formato de string (+HH:mm o -HH:mm).
        const offsetHours = Math.abs(offsetMs / 3600000);
        const offsetSign = offsetMs > 0 ? '-' : '+'; // getTimezoneOffset invierte el signo.
        const offsetString = `${offsetSign}${String(Math.floor(offsetHours)).padStart(2, '0')}:00`;

        // 3. Construimos el string ISO 8601 completo.
        const fechaIsoConOffset =
            `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` +
            `T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00` +
            `${offsetString}`;

        // 4. Creamos la fecha a partir de este string. Es el método más robusto.
        const fechaFinal = new Date(fechaIsoConOffset);
        return fechaFinal;

    } catch (error) {
        console.error("Error al construir la fecha con zona horaria (Plan B):", error);
        return null;
    }
}

// --- EL RESTO DEL ARCHIVO PERMANECE IGUAL ---

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