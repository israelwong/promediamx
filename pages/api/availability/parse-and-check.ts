// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import * as chrono from 'chrono-node';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';

/**
 * ✅ HELPER "MAESTRO RELOJERO" CON LOGS DE DIAGNÓSTICO
 * Esta versión incluye logs para depurar el comportamiento en Vercel.
 */
function parsearFechaConPrecision(textoFecha: string, timeZone: string): Date | null {
    console.log(`[LOG VERCEL] 1. Inicia parseo. textoFecha: "${textoFecha}", timeZone: "${timeZone}"`);

    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    console.log(`[LOG VERCEL] 2. 'Ahora' en la zona horaria del negocio es: ${ahoraEnZona.toISOString()}`);

    // Usamos Chrono para extraer los componentes
    const resultados = chrono.es.parse(textoFecha, ahoraEnZona, { forwardDate: true });

    // 🕵️‍♂️ LOG MÁS IMPORTANTE: Vemos qué extrajo Chrono
    console.log(`[LOG VERCEL] 3. Resultado completo de Chrono:`, JSON.stringify(resultados, null, 2));

    if (resultados.length === 0) {
        console.log(`[LOG VERCEL] 4. Chrono no encontró ninguna fecha válida.`);
        return null;
    }

    const resultado = resultados[0];

    const año = resultado.start.get('year') ?? ahoraEnZona.getFullYear();
    const mes = resultado.start.get('month') ?? ahoraEnZona.getMonth() + 1;
    const dia = resultado.start.get('day') ?? ahoraEnZona.getDate();
    const hora = resultado.start.get('hour') ?? 0;
    const minuto = resultado.start.get('minute') ?? 0;

    console.log(`[LOG VERCEL] 4. Componentes extraídos: Año=${año}, Mes=${mes}, Día=${dia}, Hora=${hora}, Minuto=${minuto}`);

    const fechaLocalString = `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`;
    console.log(`[LOG VERCEL] 5. String de fecha construido: "${fechaLocalString}"`);

    try {
        const fechaFinal = toZonedTime(fechaLocalString, timeZone);
        console.log(`[LOG VERCEL] 6. Objeto Date final (en UTC para sistema): ${fechaFinal.toISOString()}`);
        return fechaFinal;
    } catch (error) {
        console.error("[LOG VERCEL] Error final al convertir fecha con timezone:", error);
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
        // Forzamos la zona horaria correcta para asegurar consistencia
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

        // Usamos un ID de lead genérico ya que este flujo no tiene un lead real aún
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