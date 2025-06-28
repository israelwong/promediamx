// /helpers/ia.helpers.ts

import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

// --- FUNCIÓN ORIGINAL (SIN CAMBIOS) ---
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
Si no encuentras NADA relacionado a una fecha u hora, responde con 'null'.`;

    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;
    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) return JSON.parse(match[0]);
        } catch (e) { console.error("Error parseando JSON de palabras clave de fecha:", e); }
    }
    return null;
}

// --- NUEVA FUNCIÓN ESPECIALIZADA Y SU TIPO (AHORA EXPORTADOS) ---
// Exportamos el tipo para que pueda ser usado en otros lugares si es necesario.
export type ReagendamientoExtractionResult = {
    original: { texto: string | null; } | null;
    nueva: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string; } | null;
};

// Exportamos la función para que pueda ser importada por el handler.
export async function extraerFechasParaReagendamiento(
    textoUsuario: string
): Promise<ReagendamientoExtractionResult | null> {
    const prompt = `Tu tarea es analizar un texto de un usuario que quiere reagendar una cita y extraer dos conceptos clave: 1) La descripción de la CITA ORIGINAL a mover y 2) La descripción de la NUEVA FECHA Y HORA de destino.
Texto del usuario: "${textoUsuario}"
Analiza y extrae la información en el siguiente formato JSON. Si no encuentras información para un concepto, su valor debe ser 'null'.
- "original.texto": Contiene el fragmento de texto que describe la cita a mover.
- "nueva": Contiene las palabras clave de la nueva fecha de destino.
Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido.
Ejemplo 1: "quiero cambiar mi cita del martes para el viernes a las 4pm" -> { "original": { "texto": "mi cita del martes" }, "nueva": { "dia_semana": "viernes", "dia_relativo": null, "dia_mes": null, "hora_str": "a las 4pm" } }
Ejemplo 2: "mover la cita de mañana por favor" -> { "original": { "texto": "la cita de mañana" }, "nueva": null }
Ejemplo 3: "necesito reagendar para el próximo lunes a las 10am" -> { "original": null, "nueva": { "dia_semana": "lunes", "dia_relativo": null, "dia_mes": null, "hora_str": "a las 10am" } }
Si el texto no contiene ninguna referencia a una cita original ni a una nueva fecha, responde con 'null'.`;

    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;
    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                return JSON.parse(match[0]) as ReagendamientoExtractionResult;
            }
        } catch (e) { console.error("Error parseando JSON de reagendamiento:", e); }
    }
    return null;
}


// =================================================================================
// --- NUEVO SUPER-HELPER PARA AGENDAMIENTO ROBUSTO ---
// =================================================================================

// 1. Definimos la estructura de la respuesta que esperamos.
export type AgendamientoRobustoResult = {
    servicio?: string | null;
    campos_personalizados?: Record<string, string>; // Un diccionario para { "Nombre de Campo": "valor" }
    fecha_hora?: {
        dia_semana?: string;
        dia_relativo?: string;
        dia_mes?: number;
        hora_str?: string;
    } | null;
};

// 2. Creamos la función que interactúa con la IA.
export async function extraerContextoDeAgendamiento(
    textoUsuario: string,
    nombresCamposDisponibles: string[] // Ej: ["Colegio", "Nivel Educativo", "Grado"]
): Promise<AgendamientoRobustoResult | null> {
    const prompt = `Tu tarea es ser un experto en analizar texto para extraer de forma estructurada toda la información relevante para agendar una cita.
Te proporcionaré el texto del usuario y una lista de los NOMBRES DE CAMPOS que debes buscar.

Texto del usuario: "${textoUsuario}"
Lista de campos a buscar: [${nombresCamposDisponibles.join(', ')}]

Analiza el texto y extrae la siguiente información en el formato JSON especificado. Si no encuentras información para un campo, omítelo o déjalo como 'null'.
- "servicio": El servicio que el usuario solicita (ej. "Informes", "Inscripción").
- "campos_personalizados": Un objeto donde las claves son los NOMBRES DE CAMPOS de la lista y los valores son lo que el usuario mencionó.
- "fecha_hora": Un objeto con las palabras clave de la fecha y hora.

Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido.

Ejemplo 1:
Texto: "Quiero informes para mi hijo en primero de primaria en el colegio tecno para el martes a las 4pm"
Campos: ["Colegio", "Nivel Educativo", "Grado"]
Respuesta:
{
  "servicio": "Informes",
  "campos_personalizados": {
    "Colegio": "tecno",
    "Nivel Educativo": "primaria",
    "Grado": "primero"
  },
  "fecha_hora": { "dia_semana": "martes", "hora_str": "a las 4pm" }
}

Ejemplo 2:
Texto: "una cita de informes en el tecno por favor"
Campos: ["Colegio", "Nivel Educativo", "Grado"]
Respuesta:
{
  "servicio": "Informes",
  "campos_personalizados": { "Colegio": "tecno" }
}

Ejemplo 3:
Texto: "para mañana a las 10"
Campos: ["Colegio", "Nivel Educativo", "Grado"]
Respuesta:
{
  "fecha_hora": { "dia_relativo": "mañana", "hora_str": "a las 10" }
}

Si el texto es un saludo o no contiene NINGUNA información relevante, responde con 'null'.`;

    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;

    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                return JSON.parse(match[0]) as AgendamientoRobustoResult;
            }
        } catch (e) {
            console.error("Error parseando JSON de contexto de agendamiento:", e);
        }
    }
    return null;
}