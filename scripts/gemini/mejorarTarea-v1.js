"use server";
import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "La variable de entorno GEMINI_API_KEY no está definida. Asegúrate de configurarla correctamente en tu archivo .env o en las variables de entorno del sistema."
  );
  throw new Error(
    "GEMINI_API_KEY is not defined in environment variables. This key is required to authenticate with the Google Generative AI API."
  );
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

export async function mejorarTareaConGemini(
  nombre_activador,
  nombre_tarea,
  descripcion_tarea,
  nombre_categoria,
  rol_asignado,
  personalidad_asistente,
  nombre_funcion_automatizacion,
  parametros, // <-- Recibes el array/objeto aquí
  instruccion_a_mejorar // <-- Corregir typo si aplica
) {
  try {
    console.table({
      nombre_activador,
      nombre_tarea,
      descripcion_tarea,
      nombre_categoria,
      rol_asignado,
      personalidad_asistente,
      nombre_funcion_automatizacion,
      parametros, // <-- Recibes el array/objeto aquí
      instruccion_a_mejorar, // <-- Corregir typo si aplica
    });

    // return null; // O un valor por defecto si no quieres hacer nada

    // **Sugerencia 3 Aplicada:** Formatear los parámetros
    const parametrosFormateados = formatearParametrosParaPrompt(parametros);

    const prompt = `
    Rol: Eres un experto en ingeniería de prompts para asistentes de IA conversacionales avanzados, especializado en crear instrucciones claras, efectivas y robustas para tareas específicas que involucran function calling (tools).
    
    Contexto de la Tarea a Mejorar:
    ${
      nombre_activador
        ? `- Nombre del activador/trigger para ejecutar esta tarea: ${nombre_activador}`
        : ""
    }
    ${nombre_tarea ? `- Nombre Tarea: ${nombre_tarea}` : ""}
    ${descripcion_tarea ? `- Descripción Tarea: ${descripcion_tarea}` : ""}
    ${rol_asignado ? `- Rol Asignado al Asistente: ${rol_asignado}` : ""}
    ${nombre_categoria ? `- Categoría: ${nombre_categoria}` : ""}
    - Personalidad Asistente: ${personalidad_asistente}
    ${
      nombre_funcion_automatizacion
        ? `- Función de Automatización a Llamar (Tool Name): ${nombre_funcion_automatizacion}`
        : "- No hay función de automatización registrada a llamar, no llames a ninguna función."
    }

    ${
      parametrosFormateados.trim() !== "- Ninguno"
        ? `- Parámetros Requeridos por la Función:\n${parametrosFormateados}`
        : ""
    }

    - Instrucción Actual (a mejorar):\n${
      instruccion_a_mejorar && instruccion_a_mejorar.trim()
        ? instruccion_a_mejorar
        : `No se proporcionó una instrucción inicial. Sugiere una instrucción basada en el contexto proporcionado, asegurándote de incluir cómo y cuándo llamar a la función "${nombre_funcion_automatizacion}" si aplica.`
    }
    
    
    Tu Objetivo:
    Revisa y re-escribe la "Instrucción Actual" para hacerla más efectiva. La nueva instrucción debe:
    
    1. Ser clara, concisa y fácil de seguir para un modelo de lenguaje grande.
    2. Guiar al asistente para que adopte consistentemente el Rol y Personalidad definidos.
    3. Detallar los pasos lógicos necesarios para cumplir el objetivo descrito en la "Descripción Tarea".
    4. Incluir manejo básico de posibles respuestas del usuario (ej. sí/no a una pregunta).
    5. Si está una función incluida Indicar explícitamente cuándo y bajo qué condiciones se debe llamar a la "Función de Automatización", asegurándose de mencionar la necesidad de recopilar los parámetros marcados como "Requerido: TRUE".
    6. Mantener las restricciones o guías negativas (ej. "No inventes información") si son apropiadas.
    7. Estar en formato de texto plano, lista para usarse como prompt.
    8. NO incluir la definición del Rol/Personalidad al inicio del texto (el sistema se encarga de eso).
    
    - Nota Importante: Esta Tarea se activa DESPUÉS de que el sistema ya ha identificado una intención específica del usuario, representada por el 'Trigger de Activación' ([Valor del Trigger]). Por lo tanto, la 'Instrucción (Prompt Base)' NO debe incluir lógica para identificar otras intenciones o manejar casos no relacionados con el objetivo principal de esta Tarea ('[Valor de la Descripción]'). Debe asumir que el usuario ya expresó la necesidad cubierta por este trigger.

    Por favor, proporciona únicamente el texto de la instrucción mejorada.
    

    Formato de Salida OBLIGATORIO:
  Debes responder ÚNICAMENTE con un objeto JSON válido. El objeto debe tener EXACTAMENTE las siguientes claves:
  - "sugerencia_descripcion": (STRING con la descripción mejorada)
  - "sugerencia_rol": (STRING con el rol sugerido/mejorado)
  - "sugerencia_personalidad": (STRING con la lista de rasgos de personalidad sugerida/mejorada)
  - "sugerencia_instruccion": (STRING con la instrucción completa mejorada, sin incluir rol/personalidad al inicio)

  Ejemplo de formato JSON esperado:
  {
    "sugerencia_descripcion": "Inicia una consulta con un humano si el usuario lo acepta tras no encontrar la info.",
    "sugerencia_rol": "Gestor de Escalaciones Eficaz",
    "sugerencia_personalidad": "Claro, Servicial, Resolutivo",
    "sugerencia_instruccion": "Contexto: No se encontró la respuesta...\nTu Tarea:\n1. Informa amablemente...\n2. Pregunta explícitamente...\n3. Si ACEPTA: Usa la función "consultarHITL"...\n4. Si RECHAZA: Responde amablemente..."
  }

  IMPORTANTE: Tu respuesta debe ser solo el objeto JSON, sin texto introductorio, explicaciones adicionales ni markdown como "json".
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // O el modelo que elijas
      // model: "gemini-2.0-flash-lite", // O el modelo que elijas
    });

    // **CORRECCIÓN AQUÍ:** Pasamos generationConfig dentro del objeto
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }], // El prompt va dentro de 'contents'
      generationConfig: generationConfig, // Pasamos el objeto de configuración aquí
    });
    const response = result.response;

    const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Respuesta del modelo:", responseText);

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
