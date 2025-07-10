// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { extraerPalabrasClaveDeFecha } from '@/app/admin/_lib/actions/whatsapp/helpers/ia.helpers';

/**
 * Helper robusto para construir un objeto Date a partir de texto,
 * respetando la zona horaria especificada para evitar errores de UTC.
 */
function construirFechaEnTimeZone(
    extraccion: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string },
    timeZone: string
): Date | null {
    try {
        const ahoraEnZona = toZonedTime(new Date(), timeZone);
        const fechaBase = new Date(ahoraEnZona.getFullYear(), ahoraEnZona.getMonth(), ahoraEnZona.getDate());

        // 1. Determinar el día correcto
        if (extraccion.dia_relativo?.toLowerCase() === 'mañana') {
            fechaBase.setDate(fechaBase.getDate() + 1);
        } else if (extraccion.dia_semana) {
            const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
            const diaTargetIndex = diasSemana.indexOf(extraccion.dia_semana.toLowerCase());
            if (diaTargetIndex !== -1) {
                let diasAAñadir = diaTargetIndex - fechaBase.getDay();
                if (diasAAñadir < 0) { diasAAñadir += 7; } // Siempre ir al próximo día de la semana
                fechaBase.setDate(fechaBase.getDate() + diasAAñadir);
            }
        } else if (extraccion.dia_mes) {
            fechaBase.setDate(extraccion.dia_mes);
            // Si el día del mes ya pasó este año, asumimos que es del próximo mes/año
            if (fechaBase < toZonedTime(new Date(), timeZone)) {
                fechaBase.setMonth(fechaBase.getMonth() + 1);
            }
        }

        // 2. Determinar la hora correcta
        if (extraccion.hora_str) {
            const matchHora = extraccion.hora_str.match(/(\d{1,2}):?(\d{2})?/);
            if (matchHora) {
                let hora = parseInt(matchHora[1], 10);
                const minuto = matchHora[2] ? parseInt(matchHora[2], 10) : 0;

                if (extraccion.hora_str.toLowerCase().includes('pm') && hora < 12) {
                    hora += 12;
                }
                if (extraccion.hora_str.toLowerCase().includes('am') && hora === 12) {
                    hora = 0; // Medianoche
                }

                // 3. Construimos un string de fecha local y lo convertimos a la zona horaria correcta
                const año = fechaBase.getFullYear();
                const mes = String(fechaBase.getMonth() + 1).padStart(2, '0');
                const dia = String(fechaBase.getDate()).padStart(2, '0');
                const horaStr = String(hora).padStart(2, '0');
                const minStr = String(minuto).padStart(2, '0');

                const fechaLocalString = `${año}-${mes}-${dia}T${horaStr}:${minStr}:00`;

                return toZonedTime(fechaLocalString, timeZone);
            }
        }
        return null;
    } catch (error) {
        console.error("Error construyendo fecha en timezone:", error);
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

        const extraccion = await extraerPalabrasClaveDeFecha(textoFecha);
        if (!extraccion) {
            return res.status(200).json({ disponible: false, mensaje: "No entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo?" });
        }

        const fecha = construirFechaEnTimeZone(extraccion, timeZone);

        if (!fecha) {
            return res.status(200).json({ disponible: false, mensaje: "No pude construir una fecha y hora completas. ¿Podrías ser más específico?" });
        }

        const fechaFormateada = format(fecha, "EEEE d 'de' MMMM 'a las' h:mm aa", { locale: es, timeZone });

        // ✅ CORRECCIÓN: Comparamos la fecha deseada con la hora actual EN LA MISMA ZONA HORARIA
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
