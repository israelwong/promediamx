// /pages/api/availability/check.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verificarDisponibilidad } from '@/app/admin/_lib/actions/whatsapp/helpers/availability.helpers'; // Ajusta la ruta a tu helper

const schema = z.object({
    fechaDeseada: z.string().datetime(),
    negocioId: z.string().cuid(),
    tipoDeCitaId: z.string().cuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const validation = schema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Datos inválidos.", details: validation.error.flatten() });
        }

        const { fechaDeseada, negocioId, tipoDeCitaId } = validation.data;

        // Reutilizamos nuestro helper de disponibilidad. Pasamos un leadId genérico porque no lo conocemos aún.
        const resultado = await verificarDisponibilidad({
            negocioId,
            tipoDeCitaId,
            fechaDeseada: new Date(fechaDeseada),
            leadId: 'FORMULARIO_WEB_LEAD',
        });

        return res.status(200).json({ disponible: resultado.disponible, mensaje: resultado.mensaje });

    } catch (error) {
        console.error("Error en API de disponibilidad:", error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}