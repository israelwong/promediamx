// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
// Importa las funciones necesarias de la librería actualizada
import { toZonedTime, format, zonedTimeToUtc } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

/**
 * VERSIÓN FINAL Y CORREGIDA del "MAESTRO RELOJERO"
 * NOTA: Requiere date-fns-tz@^2.0.0 o superior.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    // La referencia para Chrono debe ser la hora actual en la zona horaria del negocio.
    const ahoraEnZona = toZonedTime(new Date(), timeZone);

    const resultados = chrono.es.parse(textoFecha, ahoraEnZona, { forwardDate: true });

    if (resultados.length === 0) {
        return null;
    }

    // Tomar el ÚLTIMO resultado de Chrono, que es el más completo.
    const resultado = resultados[resultados.length - 1];

    const año = resultado.start.get('year');
    const mes = resultado.start.get('month'); // Chrono devuelve mes 1-12
    const dia = resultado.start.get('day');
    const hora = resultado.start.get('hour');
    const minuto = resultado.start.get('minute');

    if (!año || !mes || !dia || hora === undefined || minuto === undefined) {
        return null;
    }

    try {
        // Usar zonedTimeToUtc para construir la fecha correctamente.
        const fechaComponentes = { year: año, month: mes, day: dia, hour: hora, minute: minuto };
        const fechaFinal = zonedTimeToUtc(fechaComponentes, timeZone);
        return fechaFinal;
    } catch (error) {
        console.error("Error al construir la fecha con zona horaria:", error);
        return null;
    }
}

// Esquema de validación para el cuerpo de la solicitud.
const ParseAndCheckSchema = z.object({
    textoFecha: z.string().min(3, "El texto de la fecha es requerido."),
    tipoDeCitaId: z.string().cuid(),
    negocioId: z.string().cuid(),
});

// Tipo de la respuesta de la API.
type ApiResponse = {
    disponible: boolean;
    mensaje: string;
    fechaISO?: string;
    error?: string;
};

// Controlador principal de la API.
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