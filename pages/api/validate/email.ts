// /pages/api/validate/email.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Schema para validar la entrada que llega desde ManyChat
const ValidateEmailSchema = z.object({
    // Se espera que ManyChat envíe un campo 'email'
    email: z.string().trim().nullable().optional(),
});

// Tipo para la respuesta de la API, diseñado para ManyChat
type ApiResponse = {
    valid: boolean;
    status: 'VALID' | 'INVALID' | 'SKIPPED';
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
        return res.status(400).json({ valid: false, status: 'INVALID', message: "Formato de solicitud incorrecto. Se esperaba un objeto con la propiedad 'email'." });
    }

    const email = validation.data.email;

    // Caso 1: El usuario omitió el correo (ManyChat envía null, un string vacío, o no envía el campo)
    if (!email) {
        return res.status(200).json({
            valid: true, // Es válido continuar sin correo, la lógica de negocio lo permite.
            status: 'SKIPPED',
            message: 'Entendido, continuaremos sin el correo electrónico.'
        });
    }

    // Caso 2: El usuario proporcionó un correo. Lo validamos con Zod.
    // Zod's .email() es robusto y valida correctamente formatos como 'ing.israel.wong@gmail.com'.
    const emailFormatValidation = z.string().email("El formato del correo electrónico no es válido. Por favor, revísalo e intenta de nuevo.").safeParse(email);

    if (!emailFormatValidation.success) {
        // Si la validación de Zod falla, devolvemos el mensaje de error específico.
        return res.status(200).json({
            valid: false,
            status: 'INVALID',
            message: emailFormatValidation.error.issues[0].message
        });
    }

    // Caso 3: El correo tiene un formato válido.
    return res.status(200).json({
        valid: true,
        status: 'VALID',
        message: '¡Correo electrónico válido! Gracias.'
    });
}
