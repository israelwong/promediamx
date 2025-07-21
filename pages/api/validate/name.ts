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
 * Limpia un string de frases conversacionales y caracteres no deseados.
 * @param name El nombre original del usuario.
 * @returns El nombre limpio y extraído.
 */
function extractAndCleanName(name: string): string {
    let processedName = name;

    // ✅ SOLUCIÓN: Lista de frases introductorias a eliminar, ahora más robusta.
    const fillerPhrases = [
        // Variaciones con "mi nombre es"
        'si, claro, mi nombre es',
        'si claro, mi nombre es',
        'si, claro mi nombre es',
        'si claro mi nombre es',
        'claro, mi nombre es',
        'claro mi nombre es',
        'ok mi nombre es',
        'bueno mi nombre es',
        'mi nombre es',

        // Variaciones con "me llamo"
        'si, claro, yo me llamo',
        'si claro, yo me llamo',
        'si, claro me llamo',
        'si claro me llamo',
        'claro, me llamo',
        'claro me llamo',
        'ok me llamo',
        'me llamo',

        // Variaciones con "soy"
        'si, claro, yo soy',
        'si claro, yo soy',
        'si, claro soy',
        'si claro soy',
        'claro, soy',
        'claro soy',
        'ok soy',
        'soy',

        // Variaciones con "es"
        'claro, es',
        'claro es',
        'ok es',
        'es',
    ];

    // Se busca y reemplaza cada frase introductoria (insensible a mayúsculas/minúsculas)
    for (const phrase of fillerPhrases) {
        const regex = new RegExp(`^\\s*${phrase}\\s+`, 'i');
        if (regex.test(processedName)) {
            processedName = processedName.replace(regex, '');
            break; // Se detiene después de encontrar la primera coincidencia
        }
    }

    // Se aplica la limpieza de emojis y caracteres especiales
    const cleaned = processedName.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

    // Se reemplazan múltiples espacios con uno solo y se recortan los extremos.
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
    // Se usa la nueva función de extracción y limpieza
    const nombreLimpio = extractAndCleanName(nombreOriginal);

    // Validación 1: El nombre limpio no puede estar vacío.
    if (nombreLimpio.length === 0) {
        return res.status(200).json({ valid: false, message: "No pude identificar un nombre en tu respuesta. Por favor, inténtalo de nuevo." });
    }

    // Validación 2: El nombre debe tener al menos 3 caracteres.
    if (nombreLimpio.length < 3) {
        return res.status(200).json({ valid: false, message: "Por favor, ingresa un nombre y al menos un apellido para continuar con tu agendamiento." });
    }

    // Validación 3: Contar las palabras del nombre.
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
