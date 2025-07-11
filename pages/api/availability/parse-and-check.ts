// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
// ✅ IMPORTANTE: Asumimos que generarRespuestaAsistente está en ia.actions
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

/**
 * ✅ NUEVO SUPER-HELPER CON IA
 * Su única misión es convertir texto en lenguaje natural a una fecha estructurada.
 */
async function parsearFechaConIA(textoFecha: string, timeZone: string): Promise<Date | null> {
    const ahoraEnZona = toZonedTime(new Date(), timeZone);
    const fechaActualParaContexto = format(ahoraEnZona, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es, timeZone });

    const prompt = `
Tu tarea es ser un experto en interpretar fechas y horas en lenguaje natural.
La fecha y hora actual para tu referencia es: ${fechaActualParaContexto}.
Analiza la siguiente frase del usuario: "${textoFecha}"

Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON con la estructura: 
{ "año": AAAA, "mes": MM, "dia": DD, "hora": HH, "minuto": mm }
- El mes debe ser un número de 1 a 12.
- La hora debe estar en formato de 24 horas (0-23).

--- EJEMPLOS ---
- Frase: "mañana a las 2pm" -> { "año": ${ahoraEnZona.getFullYear()}, "mes": ${ahoraEnZona.getMonth() + 1}, "dia": ${ahoraEnZona.getDate() + 1}, "hora": 14, "minuto": 0 }
- Frase: "el viernes a las 11am" -> (Calcula el próximo viernes y devuelve los componentes)
- Frase: "hoy a las 8 de la noche" -> { "año": ${ahoraEnZona.getFullYear()}, "mes": ${ahoraEnZona.getMonth() + 1}, "dia": ${ahoraEnZona.getDate()}, "hora": 20, "minuto": 0 }

Si no puedes determinar una fecha y hora completas, responde con 'null'.`;

    try {
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: [],
            mensajeUsuarioActual: prompt,
            contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" },
            tareasDisponibles: [],
        });

        const respuestaJson = resultadoIA.data?.respuestaTextual;
        if (respuestaJson && respuestaJson.toLowerCase().trim() !== 'null') {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.año && parsed.mes && parsed.dia && parsed.hora !== undefined && parsed.minuto !== undefined) {
                    const fechaLocalString = `${parsed.año}-${String(parsed.mes).padStart(2, '0')}-${String(parsed.dia).padStart(2, '0')}T${String(parsed.hora).padStart(2, '0')}:${String(parsed.minuto).padStart(2, '0')}:00`;
                    return toZonedTime(fechaLocalString, timeZone);
                }
            }
        }
    } catch (error) {
        console.error("Error en parsearFechaConIA:", error);
    }
    return null;
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

        // ✅ Usamos nuestro nuevo y potente helper de IA
        const fecha = await parsearFechaConIA(textoFecha, timeZone);

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
