// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
// ✅ IMPORTANTE: Asumimos que instalarás esta librería: npm install chrono-node
import * as chrono from 'chrono-node';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

/**
 * ✅ NUEVO HELPER "MAESTRO RELOJERO"
 * Usa Chrono para desglosar el texto y date-fns-tz para ensamblar la fecha
 * de forma segura en la zona horaria correcta.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    const ahoraEnZona = toZonedTime(new Date(), timeZone);

    // 1. Usamos Chrono para extraer los componentes
    const resultados = chrono.es.parse(textoFecha, ahoraEnZona, { forwardDate: true });

    if (results.length === 0) {
        return null;
    }

    const resultado = resultados[0];

    // 2. Extraemos cada pieza del resultado
    const año = resultado.start.get('year') ?? ahoraEnZona.getFullYear();
    const mes = resultado.start.get('month') ?? ahoraEnZona.getMonth() + 1; // Chrono devuelve 1-12
    const dia = resultado.start.get('day') ?? ahoraEnZona.getDate();
    const hora = resultado.start.get('hour') ?? 0;
    const minuto = resultado.start.get('minute') ?? 0;

    // 3. Construimos un string de fecha local y lo convertimos a la zona horaria correcta
    // Esto asegura que "12:00" se interprete como "12:00 en México", no "12:00 en UTC".
    const fechaLocalString = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;

    try {
        return toZonedTime(fechaLocalString, timeZone);
    } catch (error) {
        console.error("Error al convertir fecha con timezone:", error);
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

        // ✅ Usamos nuestro nuevo y robusto helper
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
            leadId: 'LEAD_DESDE_MANYCHAT_PARSE',
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
