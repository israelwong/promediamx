// /pages/api/availability/check.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers';
import { isBefore } from 'date-fns';

// ✅ CORRECCIÓN: Usamos z.coerce.date() para una validación más robusta.
// Esto intenta convertir el string que llega de ManyChat en un objeto Date válido.
const CheckAvailabilitySchema = z.object({
    fechaDeseada: z.coerce.date({
        errorMap: () => ({ message: "El formato de la fecha es inválido." }),
    }),
    tipoDeCitaId: z.string().cuid({ message: "El ID del tipo de cita es inválido." }),
    negocioId: z.string().cuid({ message: "El ID del negocio es inválido." }),
});

type ApiResponse = {
    disponible: boolean;
    mensaje?: string;
    error?: string;
    details?: z.inferFlattenedErrors<typeof CheckAvailabilitySchema>;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ disponible: false, mensaje: `Método ${req.method} no permitido` });
    }

    try {
        const validation = CheckAvailabilitySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                disponible: false,
                error: "Datos de entrada inválidos.",
                details: validation.error.flatten(),
            });
        }

        // Ahora 'fechaDeseada' ya es un objeto Date, no necesitamos convertirlo.
        const { fechaDeseada, negocioId, tipoDeCitaId } = validation.data;

        if (isBefore(fechaDeseada, new Date())) {
            return res.status(400).json({
                disponible: false,
                error: "Fecha inválida.",
                mensaje: "No se puede agendar una cita en una fecha que ya pasó."
            });
        }

        const resultado = await verificarDisponibilidad({
            negocioId,
            tipoDeCitaId,
            fechaDeseada: fechaDeseada, // Pasamos el objeto Date directamente
            leadId: 'LEAD_DESDE_MANYCHAT',
        });

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
