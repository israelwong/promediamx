// /pages/api/validate/email.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Schema para validar la entrada. Acepta un string o null.
const ValidateEmailSchema = z.object({
    email: z.string().trim().nullable().optional(),
});

// Tipo para la respuesta de la API
type ApiResponse = {
    valid: boolean;
    status: 'VALID' | 'INVALID' | 'SKIPPED'; // Estado claro para ManyChat
    message: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, status: 'INVALID', message: `Método ${req.method} no permitido` });
    }

    const validation = ValidateEmailSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ valid: false, status: 'INVALID', message: "Formato de solicitud incorrecto." });
    }

    const email = validation.data.email;

    // Caso 1: El usuario omitió el correo (ManyChat envía null o un string vacío)
    if (!email) {
        return res.status(200).json({
            valid: true, // Es válido continuar sin correo
            status: 'SKIPPED',
            message: 'Entendido, continuaremos sin el correo electrónico.'
        });
    }

    // Caso 2: El usuario proporcionó un correo, lo validamos con Zod.
    const emailFormatValidation = z.string().email("El formato del correo electrónico no es válido. Por favor, revísalo.").safeParse(email);

    if (!emailFormatValidation.success) {
        return res.status(200).json({
            valid: false,
            status: 'INVALID',
            message: emailFormatValidation.error.issues[0].message
        });
    }

    // Caso 3: El correo es válido.
    return res.status(200).json({
        valid: true,
        status: 'VALID',
        message: '¡Correo electrónico válido! Gracias.'
    });
}
