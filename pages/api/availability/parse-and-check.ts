// /pages/api/availability/parse-and-check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { isBefore } from 'date-fns';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { extraerPalabrasClaveDeFecha } from '@/app/admin/_lib/actions/whatsapp/helpers/ia.helpers';
import { construirFechaDesdePalabrasClave } from '@/app/admin/_lib/actions/whatsapp/helpers/date.helpers';

// 1. Definimos el schema que espera recibir de ManyChat
const ParseAndCheckSchema = z.object({
    textoFecha: z.string().min(3, "El texto de la fecha es requerido."),
    tipoDeCitaId: z.string().cuid(),
    negocioId: z.string().cuid(),
});

// 2. Definimos la respuesta que enviaremos a ManyChat
type ApiResponse = {
    disponible: boolean;
    mensaje: string;
    // Si la fecha es válida y está disponible, devolvemos el formato ISO para usarlo después
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

        // 3. Reutilizamos nuestros helpers de IA para entender el texto
        const extraccion = await extraerPalabrasClaveDeFecha(textoFecha);
        if (!extraccion) {
            return res.status(200).json({ disponible: false, mensaje: "No entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo?" });
        }

        // 4. Reutilizamos nuestro helper para construir el objeto Date
        const { fecha, hora } = construirFechaDesdePalabrasClave(extraccion, new Date());
        if (!fecha || !hora) {
            return res.status(200).json({ disponible: false, mensaje: "No pude construir una fecha y hora completas. ¿Podrías ser más específico?" });
        }
        fecha.setHours(hora.hora, hora.minuto, 0, 0);

        // 5. Validamos que no sea en el pasado
        if (isBefore(fecha, new Date())) {
            return res.status(200).json({ disponible: false, mensaje: "Esa fecha ya pasó. Por favor, elige una fecha y hora futuras." });
        }

        // 6. Reutilizamos nuestro helper de disponibilidad
        const resultado = await verificarDisponibilidad({
            negocioId,
            tipoDeCitaId,
            fechaDeseada: fecha,
            leadId: 'LEAD_DESDE_MANYCHAT_PARSE',
        });

        // 7. Devolvemos una respuesta estructurada a ManyChat
        if (resultado.disponible) {
            return res.status(200).json({
                disponible: true,
                mensaje: "¡Horario disponible!",
                // Devolvemos la fecha en formato ISO para que ManyChat la guarde y la use en el siguiente paso
                fechaISO: fecha.toISOString()
            });
        } else {
            return res.status(200).json({
                disponible: false,
                mensaje: resultado.mensaje || "Lo siento, ese horario no está disponible. Por favor, elige otro."
            });
        }

    } catch (error) {
        console.error("Error en API de parse-and-check:", error);
        return res.status(500).json({ disponible: false, mensaje: 'Error interno del servidor.', error: (error as Error).message });
    }
}
