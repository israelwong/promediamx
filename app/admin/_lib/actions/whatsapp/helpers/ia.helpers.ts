// /helpers/ia.helpers.ts
// Este archivo contiene todos los helpers que interactúan directamente con la IA (Gemini).
// Su responsabilidad es tomar texto de usuario y transformarlo en datos estructurados (JSON).

import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

export async function extraerPalabrasClaveDeFecha(
    textoUsuario: string
): Promise<{ dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string } | null> {

    const prompt = `Tu tarea es analizar un texto para extraer palabras clave de fecha y hora. Ignora el resto del texto conversacional. Sé flexible con typos y variaciones.
Texto: "${textoUsuario}"

Extrae cualquier referencia a:
- Un día de la semana (ej: "lunes", "jueves", "sabado").
- Un día relativo (ej: "hoy", "mañana").
- Un número de día del mes (ej: "el 26", "día 30").
- Una hora (ej: "a las 5pm", "14:30", "12pm").

Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido con el formato:
{"dia_semana": "nombre_dia" | null, "dia_relativo": "relativo" | null, "dia_mes": numero | null, "hora_str": "texto_hora" | null}

Ejemplo 1: "para el sabado 12pm" -> {"dia_semana": "sábado", "dia_relativo": null, "dia_mes": null, "hora_str": "12pm"}
Ejemplo 2: "mañana a las 5" -> {"dia_semana": null, "dia_relativo": "mañana", "dia_mes": null, "hora_str": "a las 5"}
Ejemplo 3: "agenda una cita para el miercoles a las 2pm" -> {"dia_semana": "miércoles", "dia_relativo": null, "dia_mes": null, "hora_str": "a las 2pm"}

Si no encuentras NADA relacionado a una fecha u hora, responde con 'null'.`;

    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;

    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) return JSON.parse(match[0]);
        } catch (e) {
            console.error("Error parseando JSON de palabras clave de fecha:", e);
        }
    }
    return null;
}