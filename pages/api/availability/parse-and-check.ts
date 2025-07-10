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
 * respetando la zona horaria especificada.
 */
function construirFechaEnTimeZone(
    extraccion: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string },
    timeZone: string
): Date | null {
    try {
        const ahoraEnZona = toZonedTime(new Date(), timeZone);
        const fechaTarget = new Date(ahoraEnZona.getFullYear(), ahoraEnZona.getMonth(), ahoraEnZona.getDate());

        // 1. Determinar el día correcto
        if (extraccion.dia_relativo?.toLowerCase() === 'mañana') {
            fechaTarget.setDate(fechaTarget.getDate() + 1);
        } else if (extraccion.dia_semana) {
            const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
            const diaTargetIndex = diasSemana.indexOf(extraccion.dia_semana.toLowerCase());
            if (diaTargetIndex !== -1) {
                let diasAAñadir = diaTargetIndex - fechaTarget.getDay();
                if (diasAAñadir <= 0) { diasAAñadir += 7; }
                fechaTarget.setDate(fechaTarget.getDate() + diasAAñadir);
            }
        } else if (extraccion.dia_mes) {
            fechaTarget.setDate(extraccion.dia_mes);
            if (fechaTarget < ahoraEnZona) { // Si el día del mes ya pasó, asumimos que es del próximo mes
                fechaTarget.setMonth(fechaTarget.getMonth() + 1);
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

                // 3. Construir la fecha final en la zona horaria correcta
                return toZonedTime(new Date(fechaTarget.getFullYear(), fechaTarget.getMonth(), fechaTarget.getDate(), hora, minuto), timeZone);
            }
        }
        return null; // No se pudo construir una fecha y hora completas
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

        if (isBefore(fecha, new Date())) {
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
