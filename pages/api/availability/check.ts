// /pages/api/availability/check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { isBefore } from 'date-fns'; // Importamos el helper para comparar fechas

// 1. Definimos el schema que espera recibir de ManyChat
const CheckAvailabilitySchema = z.object({
    fechaDeseada: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "La fecha debe ser un string de fecha válido.",
    }),
    tipoDeCitaId: z.string().cuid({ message: "El ID del tipo de cita es inválido." }),
    negocioId: z.string().cuid({ message: "El ID del negocio es inválido." }),
});

// 2. Definimos el tipo de respuesta que enviaremos de vuelta
type ApiResponse = {
    disponible: boolean;
    mensaje?: string;
    error?: string;
    details?: z.typeToFlattenedError<{ fechaDeseada: string; tipoDeCitaId: string; negocioId: string; }, string>;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    // Solo aceptamos solicitudes POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ disponible: false, mensaje: `Método ${req.method} no permitido` });
    }

    try {
        // 3. Validamos los datos que llegan de ManyChat
        const validation = CheckAvailabilitySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                disponible: false,
                error: "Datos de entrada inválidos.",
                details: validation.error.flatten(),
            });
        }

        const { fechaDeseada, negocioId, tipoDeCitaId } = validation.data;

        const fechaDeseadaObj = new Date(fechaDeseada);

        // ✅ NUEVA VALIDACIÓN: Revisamos si la fecha es en el pasado.
        if (isBefore(fechaDeseadaObj, new Date())) {
            return res.status(400).json({
                disponible: false,
                error: "Fecha inválida.",
                mensaje: "Fuera de horario."
            });
        }

        // 4. Reutilizamos nuestro helper de disponibilidad, que es el "cerebro" de la operación
        const resultado = await verificarDisponibilidad({
            negocioId,
            tipoDeCitaId,
            fechaDeseada: fechaDeseadaObj,
            // Pasamos un leadId genérico, ya que en esta etapa no conocemos al usuario.
            leadId: 'LEAD_DESDE_MANYCHAT',
        });

        // 5. Devolvemos una respuesta clara a ManyChat
        if (resultado.disponible) {
            return res.status(200).json({ disponible: true, mensaje: "Horario disponible." });
        } else {
            return res.status(200).json({
                disponible: false,
                mensaje: resultado.mensaje || "Horario no disponible."
            });
        }

    } catch (error) {
        console.error("Error en API de disponibilidad:", error);
        return res.status(500).json({ disponible: false, error: 'Error interno del servidor.' });
    }
}
