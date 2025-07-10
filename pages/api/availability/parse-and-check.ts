// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
// ✅ CORRECCIÓN: Importamos 'toZonedTime', que es el nombre correcto de la función.
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { extraerPalabrasClaveDeFecha } from '@/app/admin/_lib/actions/whatsapp/helpers/ia.helpers';

// Helper interno para construir la fecha de forma segura
function construirFechaEnTimeZone(
    extraccion: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string },
    timeZone: string
): Date | null {
    const ahora = new Date(); // La hora actual del servidor, usualmente en UTC

    // ✅ CORRECCIÓN: Usamos 'toZonedTime' para obtener un objeto Date que representa la hora actual en la zona horaria de destino.
    const fechaTarget = toZonedTime(ahora, timeZone);

    // Lógica para determinar el día
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
    }

    // Lógica para determinar la hora
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

            fechaTarget.setHours(hora, minuto, 0, 0);
            return fechaTarget;
        }
    }

    return null; // Si no se pudo construir una fecha y hora completas
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
        const timeZone = 'America/Mexico_City'; // Definimos nuestra zona horaria de negocio

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
