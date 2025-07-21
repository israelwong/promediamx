// /pages/api/validate/name.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Schema para validar la entrada que llega desde ManyChat
const ValidateNameSchema = z.object({
    nombre: z.string().trim(),
});

// Tipo para la respuesta de la API, diseñado para que ManyChat lo entienda fácilmente
type ApiResponse = {
    valid: boolean;
    message: string;
    cleaned_name?: string; // Opcional: devolvemos el nombre limpio para que lo guardes en una variable
};

/**
 * Limpia un string de caracteres no deseados como emojis.
 * @param name El nombre original del usuario.
 * @returns El nombre limpio.
 */
function cleanName(name: string): string {
    // Elimina emojis y la mayoría de los símbolos, conservando letras, acentos y espacios.
    const cleaned = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    // Reemplaza múltiples espacios con uno solo y recorta los extremos.
    return cleaned.replace(/\s+/g, ' ').trim();
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, message: `Método ${req.method} no permitido` });
    }

    const validation = ValidateNameSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ valid: false, message: "El formato de la solicitud es incorrecto. Se esperaba un objeto con la propiedad 'nombre'." });
    }

    const nombreOriginal = validation.data.nombre;
    const nombreLimpio = cleanName(nombreOriginal);

    // Validación 1: El nombre limpio no puede estar vacío.
    if (nombreLimpio.length === 0) {
        return res.status(200).json({ valid: false, message: "Por favor ingresa tu nombre completo, no son permitidos caracteres especiales o emojis." });
    }

    // Validación 2: El nombre debe tener al menos 3 caracteres.
    if (nombreLimpio.length < 3) {
        return res.status(200).json({ valid: false, message: "Por favor, ingresa tu nombre y por lo menos un apellido para poder continuar con tu agendamiento." });
    }

    // ✅ NUEVA VALIDACIÓN: Contar las palabras del nombre.
    const nameParts = nombreLimpio.split(' ');
    if (nameParts.length < 2) {
        return res.status(200).json({
            valid: false,
            message: "Por favor, ingresa tu nombre y al menos un apellido para continuar con tu agendamiento."
        });
    }


    // Si todas las validaciones pasan, el nombre es válido.
    return res.status(200).json({
        valid: true,
        message: `¡Perfecto, ${nombreLimpio}! Gracias.`,
        cleaned_name: nombreLimpio
    });
}
