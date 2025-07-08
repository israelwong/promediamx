// /helpers/ia.helpers.ts

import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';
import type { CRMCampoPersonalizado } from '@prisma/client';
import type { AgendaTipoCita } from '@prisma/client';

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

// Esta función reemplaza a la anterior "extraerFechasParaReagendamiento"
export async function extraerParametrosDeReagendamiento(
    textoUsuario: string
): Promise<{ original: string; nueva: string } | null> {
    const prompt = `
Tu tarea es analizar una frase de un usuario que quiere reagendar una cita y separar la descripción de la CITA ORIGINAL de la descripción de la NUEVA FECHA.

Analiza la siguiente frase:
"${textoUsuario}"

Responde con un objeto JSON con la siguiente estructura: { "original": "...", "nueva": "..." }.
- En "original", pon la parte de la frase que describe la cita a cambiar.
- En "nueva", pon la parte de la frase que describe el nuevo horario.
- Si no puedes identificar claramente AMBAS partes, responde con 'null'.

--- EJEMPLOS ---
Frase: "reagenda la cita del martes 12pm para el miércoles 11am" -> { "original": "la cita del martes 12pm", "nueva": "miércoles a las 11am" }
Frase: "quiero mover mi junta de mañana para el viernes" -> { "original": "mi junta de mañana", "nueva": "el viernes" }
Frase: "cambia la de soporte de hoy a las 3 para el lunes a las 9" -> { "original": "la de soporte de hoy a las 3", "nueva": "lunes a las 9" }
Frase: "quiero reagendar mi cita" -> null
Frase: "para el martes a las 11am" -> null
`;

    const resultadoIA = await generarRespuestaAsistente({
        historialConversacion: [],
        mensajeUsuarioActual: prompt,
        contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" },
        tareasDisponibles: [],
    });

    const respuestaJson = resultadoIA.data?.respuestaTextual;
    if (respuestaJson && respuestaJson.toLowerCase().trim() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                // Aseguramos que ambas claves existan
                if (parsed.original && parsed.nueva) {
                    return { original: parsed.original, nueva: parsed.nueva };
                }
            }
        } catch (e) {
            console.error("Error parseando JSON de extracción de reagendamiento:", e);
            return null;
        }
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
    serviciosDisponibles: Pick<AgendaTipoCita, 'nombre'>[],
    camposRequeridos: CRMCampoPersonalizado[]
): Promise<AgendamientoRobustoResult | null> {

    const nombresServicios = serviciosDisponibles.map(s => s.nombre);
    const nombresCampos = camposRequeridos.map(c => c.nombre);

    // 1. Instrucciones base del prompt
    let prompt = `Tu tarea es ser un experto en extraer datos estructurados de una solicitud de cita. Te proporcionaré el texto del usuario y listas de referencia.

Texto del usuario: "${textoUsuario}"

Listas de Referencia:
- Servicios Disponibles: [${nombresServicios.join(', ')}]
- Otros Datos a Buscar: [${nombresCampos.join(', ')}]

Analiza el texto y extrae la siguiente información en formato JSON:
1.  **servicio**: Debe ser UNO de los valores de la lista "Servicios Disponibles".
2.  **campos_personalizados**: Un objeto con los valores para los "Otros Datos a Buscar".

Si una frase contiene múltiples valores, desglósala y asigna cada parte al campo correcto. Responde ÚNICA Y EXCLUSIVAMENTE con el objeto JSON.`;

    // 2. Generación dinámica de la sección de ejemplo
    let ejemploDinamico = '';
    const camposConOpciones = camposRequeridos.filter(c => {
        const meta = c.metadata as CampoMetadata;
        return meta?.opciones && meta.opciones.length > 0;
    });

    if (camposConOpciones.length > 0) {
        const ordenPreferido = ["Grado", "Nivel Educativo", "Colegio", "Tipo de Tratamiento", "Doctor"];
        const camposOrdenados = [...camposConOpciones].sort((a, b) => {
            const indexA = ordenPreferido.indexOf(a.nombre);
            const indexB = ordenPreferido.indexOf(b.nombre);
            return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        const camposParaEjemplo = camposOrdenados.slice(0, 3);
        const servicioEjemplo = nombresServicios.length > 0 ? nombresServicios[0] : 'citas';

        const partesTexto = camposParaEjemplo.map(c => (c.metadata as CampoMetadata).opciones![0]);
        const ejemploTexto = `Quiero una cita de ${servicioEjemplo} para ${partesTexto.join(' ')}`;

        const camposJson = camposParaEjemplo.map(c => {
            const meta = c.metadata as CampoMetadata;
            return `"${c.nombre}": "${meta.opciones![0]}"`;
        }).join(',\n    ');

        const ejemploJsonRespuesta = `{
  "servicio": "${servicioEjemplo}",
  "campos_personalizados": {
    ${camposJson}
  }
}`;

        ejemploDinamico = `
--- EJEMPLO DINÁMICO ---
Texto: "${ejemploTexto}"
Respuesta:
${ejemploJsonRespuesta}`;
    }

    prompt += `${ejemploDinamico}\n\nSi el texto no contiene información relevante, responde con 'null'.`;

    // 3. Llamada a la IA y procesamiento de la respuesta
    const resultadoIA = await generarRespuestaAsistente({
        historialConversacion: [],
        mensajeUsuarioActual: prompt,
        contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" },
        tareasDisponibles: [],
    });

    const respuestaJson = resultadoIA.data?.respuestaTextual;

    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase().trim() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const result: AgendamientoRobustoResult = {
                    servicio: parsed.servicio || null,
                    campos_personalizados: parsed.campos_personalizados || {},
                };
                return result;
            }
        } catch (e) {
            console.error("Error parseando JSON de contexto de agendamiento:", e);
        }
    }

    return null;
}


export async function validarRelevanciaDeRespuesta(
    preguntaHecha: string,
    respuestaUsuario: string
): Promise<{ es_relevante: boolean; valor_corregido: string | null }> {
    const prompt = `Tu tarea es ser un experto en analizar y normalizar datos. Debes determinar si la 'respuesta del usuario' es una respuesta directa y relevante a la 'pregunta del asistente'.
- Si es relevante, DEBES EXTRAER el valor específico y limpio, ignorando texto de relleno como "para el", "lo quiero de", "por favor", etc.
- Si no es relevante (es otra pregunta, un saludo, información no relacionada), indícalo.

Pregunta del asistente: "${preguntaHecha}"
Respuesta del usuario: "${respuestaUsuario}"

Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido con el formato:
{"es_relevante": boolean, "valor_corregido": "valor extraído y limpio" | null}

--- EJEMPLOS ---
Ejemplo 1:
Pregunta: "Por favor, indícame: Grado"
Respuesta: "lo quiero para primero de primaria"
Respuesta JSON: {"es_relevante": true, "valor_corregido": "primero"}

Ejemplo 2:
Pregunta: "Por favor, indícame: Colegio"
Respuesta: "en el tecno por favor"
Respuesta JSON: {"es_relevante": true, "valor_corregido": "tecno"}

Ejemplo 3:
Pregunta: "Indícame el Nivel Educativo"
Respuesta: "primaria"
Respuesta JSON: {"es_relevante": true, "valor_corregido": "primaria"}

Ejemplo 4:
Pregunta: "Por favor, indícame: Grado"
Respuesta: "y qué costo tiene la inscripción?"
Respuesta JSON: {"es_relevante": false, "valor_corregido": null}

Ejemplo 5:
Pregunta: "Indícame tu correo electrónico"
Respuesta: "mi correo es ejemplo@mail.com"
Respuesta JSON: {"es_relevante": true, "valor_corregido": "ejemplo@mail.com"}
`;

    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;

    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) {
                return JSON.parse(match[0]);
            }
        } catch (e) {
            console.error("Error parseando JSON de validación de relevancia:", e);
        }
    }
    // Fallback seguro: si la IA falla, asumimos que la respuesta es relevante para no bloquear al usuario.
    return { es_relevante: true, valor_corregido: respuestaUsuario };
}

interface CampoMetadata {
    opciones?: string[];
}

export function construirPromptDeExtraccionDinamico(
    textoUsuario: string,
    serviciosDisponibles: Pick<AgendaTipoCita, 'nombre'>[],
    camposRequeridos: CRMCampoPersonalizado[]
): string {
    const nombresServicios = serviciosDisponibles.map(s => s.nombre);
    const nombresCampos = camposRequeridos.map(c => c.nombre);

    let prompt = `Tu tarea es ser un experto en extraer datos estructurados de una solicitud de cita. Te proporcionaré el texto del usuario y dos listas de referencia: "Servicios Disponibles" y "Otros Datos a Buscar".

Texto del usuario: "${textoUsuario}"

Listas de Referencia:
- Servicios Disponibles: [${nombresServicios.join(', ')}]
- Otros Datos a Buscar: [${nombresCampos.join(', ')}]

Analiza el texto y extrae la siguiente información en formato JSON:
1.  **servicio**: Debe ser UNO de los valores de la lista "Servicios Disponibles".
2.  **campos_personalizados**: Un objeto con los valores para los "Otros Datos a Buscar".

Si una frase contiene múltiples valores, desglósala y asigna cada parte al campo correcto. Responde ÚNICA Y EXCLUSIVAMENTE con el objeto JSON.
`;

    let ejemploDinamico = '';
    const camposConOpciones = camposRequeridos.filter(c => {
        // ✅ PASO 2: Usamos nuestra nueva interface para un casteo seguro.
        const meta = c.metadata as CampoMetadata;
        return meta?.opciones && meta.opciones.length > 0;
    });

    if (camposConOpciones.length > 0) {
        const ordenPreferido = ["Grado", "Nivel Educativo", "Colegio", "Tipo de Tratamiento", "Doctor"];
        const camposOrdenados = [...camposConOpciones].sort((a, b) => {
            const indexA = ordenPreferido.indexOf(a.nombre);
            const indexB = ordenPreferido.indexOf(b.nombre);
            return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

        const camposParaEjemplo = camposOrdenados.slice(0, 3);
        const servicioEjemplo = nombresServicios.length > 0 ? nombresServicios[0] : 'citas';

        const partesTexto = camposParaEjemplo.map(c => {
            // ✅ PASO 2 (cont.): Usamos el casteo seguro aquí también.
            const meta = c.metadata as CampoMetadata;
            return meta.opciones![0];
        });
        const ejemploTexto = `Quiero una cita de ${servicioEjemplo} para ${partesTexto.join(' ')}`;

        const camposJson = camposParaEjemplo.map(c => {
            // ✅ PASO 2 (cont.): Y aquí también.
            const meta = c.metadata as CampoMetadata;
            return `"${c.nombre}": "${meta.opciones![0]}"`;
        }).join(',\n    ');

        const ejemploJsonRespuesta = `{
  "servicio": "${servicioEjemplo}",
  "campos_personalizados": {
    ${camposJson}
  }
}`;

        ejemploDinamico = `
--- EJEMPLO DINÁMICO ---
Texto: "${ejemploTexto}"
Servicios Disponibles: [${nombresServicios.join(', ')}]
Otros Datos a Buscar: [${nombresCampos.join(', ')}]
Respuesta:
${ejemploJsonRespuesta}`;
    }

    prompt += `${ejemploDinamico}\n\nSi el texto no contiene información relevante, responde con 'null'.`;

    return prompt;
}


export async function validarConfirmacionConIA(
    textoUsuario: string
): Promise<boolean> {
    const prompt = `Tu tarea es determinar si la respuesta de un usuario es una confirmación afirmativa. Analiza la intención del texto, ignorando typos. Responde únicamente con la palabra "SI" o "NO".

Respuesta del usuario: "${textoUsuario}"

--- EJEMPLOS ---
- "si está bien" -> SI
- "todo perfecto, gracias" -> SI
- "así es, es correcto" -> SI
- "adelante" -> SI
- "confirmo" -> SI
- "no, la fecha está mal" -> NO
- "espera, el nombre no es ese" -> NO
- "cuánto cuesta?" -> NO
`;

    try {
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: [],
            mensajeUsuarioActual: prompt,
            contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" },
            tareasDisponibles: [],
        });

        const respuesta = resultadoIA.data?.respuestaTextual?.trim().toUpperCase();
        return respuesta === 'SI';

    } catch (error) {
        console.error("Error en validarConfirmacionConIA:", error);
        // Como fallback seguro, si la IA falla, asumimos que no es una confirmación.
        return false;
    }
}