import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("La variable de entorno GEMINI_API_KEY no está definida.");
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
  temperature: 0.5, // <-- Considera si 1 es ideal o si <1 da resultados más consistentes
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// **Sugerencia 3: Función para formatear parámetros**
function formatearParametrosParaPrompt(parametros) {
  if (!parametros || !Array.isArray(parametros) || parametros.length === 0) {
    return "- Ninguno"; // O un string vacío, según prefieras
  }
  // Asume que `parametros` es un array de objetos como { nombre: '...', tipo: '...', descripcion: '...', esRequerido: true/false }
  return parametros
    .map(
      (p) =>
        `- Nombre: ${p.nombre || "N/A"}, Tipo: ${
          p.tipo || "N/A"
        }, Descripción: ${p.descripcion || "N/A"}, Requerido: ${
          p.esRequerido ? "TRUE" : "FALSE"
        }`
    )
    .join("\n    "); // Indentación para el prompt
}

export async function mejorarInstruccionTarea(
  nombre_tarea,
  descripcion_tarea,
  rol_asignado,
  personalidad_asistente,
  trigger_activacion,
  nombre_funcion_automatizacion,
  parametros, // <-- Recibes el array/objeto aquí
  instruccion_a_mejorar // <-- Corregir typo si aplica
) {
  try {
    // **Sugerencia 3 Aplicada:** Formatear los parámetros
    const parametrosFormateados = formatearParametrosParaPrompt(parametros);

    const prompt = `
    Rol: Eres un experto en ingeniería de prompts para asistentes de IA conversacionales avanzados, especializado en crear instrucciones claras, efectivas y robustas para tareas específicas que involucran function calling (tools).
    Contexto de la Tarea a Mejorar:
    ${nombre_tarea ? `- Nombre Tarea: ${nombre_tarea}` : ""}
    ${descripcion_tarea ? `- Descripción Tarea: ${descripcion_tarea}` : ""}
    ${rol_asignado ? `- Rol Asignado al Asistente: ${rol_asignado}` : ""}
    ${
      personalidad_asistente
        ? `- Personalidad Asistente: ${personalidad_asistente}`
        : ""
    }
    ${
      trigger_activacion ? `- Trigger de Activación: ${trigger_activacion}` : ""
    }
    ${
      nombre_funcion_automatizacion
        ? `- Función de Automatización a Llamar (Tool Name): ${nombre_funcion_automatizacion}`
        : ""
    }

    ${
      parametrosFormateados.trim() !== "- Ninguno"
        ? `- Parámetros Requeridos por la Función:\n${parametrosFormateados}`
        : ""
    }

    ${
      instruccion_a_mejorar
        ? `- Instrucción Actual (a mejorar):\n${instruccion_a_mejorar}`
        : ""
    }

    Tu Objetivo:
    Revisa y re-escribe la "Instrucción Actual" para hacerla más efectiva. La nueva instrucción debe:

    1. Ser clara, concisa y fácil de seguir para un modelo de lenguaje grande.
    2. Guiar al asistente para que adopte consistentemente el Rol y Personalidad definidos.
    3. Detallar los pasos lógicos necesarios para cumplir el objetivo descrito en la "Descripción Tarea".
    4. Incluir manejo básico de posibles respuestas del usuario (ej. sí/no a una pregunta).
    5. Indicar explícitamente cuándo y bajo qué condiciones se debe llamar a la "Función de Automatización", asegurándose de mencionar la necesidad de recopilar los parámetros marcados como "Requerido: TRUE".
    6. Mantener las restricciones o guías negativas (ej. "No inventes información") si son apropiadas.
    7. Estar en formato de texto plano, lista para usarse como prompt.
    8. NO incluir la definición del Rol/Personalidad al inicio del texto (el sistema se encarga de eso).
    Por favor, proporciona únicamente el texto de la instrucción mejorada.
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite", // O el modelo que elijas
    });

    // **CORRECCIÓN AQUÍ:** Pasamos generationConfig dentro del objeto
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }], // El prompt va dentro de 'contents'
      generationConfig: generationConfig, // Pasamos el objeto de configuración aquí
    });
    const response = result.response;

    const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Respuesta vacía del modelo.");
      return null;
    }

    return responseText
      .replace(/```(json|text)?\n?/g, "")
      .replace(/```/g, "")
      .trim();
  } catch (error) {
    console.error("Error al obtener instrucción mejorada:", error);
    // **Sugerencia 5: Propagar el error o devolver null**
    // throw error; // Propaga el error para que el handler lo capture y devuelva 500
    return null; // O devuelve null para indicar fallo al handler
  }
}
