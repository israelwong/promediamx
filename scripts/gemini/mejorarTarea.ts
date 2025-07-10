// /**
//  * SE MEJORA LA FUNCIÓN MEJORAR TAREA CON GEMINI
//  */

// "use server";
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// // --- Configuración API Key ---
// const apiKey = process.env.GEMINI_API_KEY;
// if (!apiKey) {
//   console.error("GEMINI_API_KEY no definida.");
//   throw new Error("GEMINI_API_KEY no definida.");
// }
// const genAI = new GoogleGenerativeAI(apiKey);

// // --- Configuración del Modelo Gemini ---
// const generationConfig = {
//   temperature: 0.4,
//   topP: 0.95,
//   topK: 40,
//   maxOutputTokens: 4096,
//   responseMimeType: "application/json",
// };

// // Opcional: Ajustar configuración de seguridad
// const safetySettings = [
//   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//   { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
//   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
// ];

// // --- Tipado para los parámetros recibidos ---
// interface ParametroInput {
//   nombre: string;
//   tipoDato: string;
//   descripcion?: string | null;
//   esRequerido: boolean;
// }

// // --- Tipado para la respuesta JSON esperada ---
// interface SugerenciasTarea {
//   sugerencia_descripcion: string;
//   sugerencia_rol: string;
//   sugerencia_personalidad: string;
//   sugerencia_instruccion: string;
// }


// // --- Función para formatear parámetros ---
// function formatearParametrosParaPrompt(parametros: ParametroInput[] | undefined | null): string {
//   if (!parametros || !Array.isArray(parametros) || parametros.length === 0) {
//     return "Esta función no requiere parámetros estándar explícitos.";
//   }
//   return parametros
//     .map(
//       (p) =>
//         `- **${p.nombre || "N/A"}**: (${p.tipoDato || "N/A"})${p.esRequerido ? ' [REQUERIDO]' : ''}. ${p.descripcion || 'Sin descripción.'}`
//     )
//     .join("\n    ");
// }

// // --- Función Principal Optimizada ---
// export async function mejorarTareaConGemini(
//   nombre_tarea: string,
//   descripcion_tarea: string | null,
//   nombre_categoria: string | null,
//   rol_asignado: string | null,
//   personalidad_asistente: string | null,
//   nombre_funcion_automatizacion: string | null,
//   parametros: ParametroInput[] | undefined | null,
//   instruccion_a_mejorar: string | null
// ): Promise<SugerenciasTarea | null> {
//   try {
//     const parametrosFormateados = formatearParametrosParaPrompt(parametros);
//     const funcionPresente = nombre_funcion_automatizacion && nombre_funcion_automatizacion.trim() !== '';
//     const instruccionInicialPresente = instruccion_a_mejorar && instruccion_a_mejorar.trim() !== '';

//     // --- Prompt (sin cambios) ---
//     const prompt = `
// Rol: Eres un experto en ingeniería de prompts para asistentes de IA conversacionales (LLMs), especializado en crear instrucciones detalladas y efectivas para tareas que pueden incluir llamadas a funciones (tools).

// Objetivo Principal: Dada la información de una tarea específica, tu meta es generar una versión MEJORADA de la descripción, rol, personalidad y, fundamentalmente, la instrucción paso a paso para el asistente de IA.

// Contexto de la Tarea:
// - Nombre Tarea: ${nombre_tarea || "No especificado"}
// - Descripción Actual: ${descripcion_tarea || "No especificada"}
// - Categoría: ${nombre_categoria || "No especificada"}
// - Rol Asignado al Asistente: ${rol_asignado || "General"}
// - Personalidad Deseada: ${personalidad_asistente || "Neutral y servicial"}
// - Función de Automatización (Tool Name): ${funcionPresente ? nombre_funcion_automatizacion : "Ninguna"}
// - Parámetros Estándar Requeridos por la Función:
//     ${parametrosFormateados}
// - Instrucción Actual (a mejorar o crear):
//     ${instruccionInicialPresente ? instruccion_a_mejorar : "(No hay instrucción inicial. Por favor, crea una desde cero basada en el contexto.)"}

// Instrucciones para Ti (Experto en Prompts):
// 1.  **Revisa y Mejora la Descripción:** Basándote en el nombre y el contexto, sugiere una descripción concisa y clara que explique el propósito de la tarea (máx. 1-2 frases).
// 2.  **Revisa y Sugiere Rol:** Basado en la tarea, sugiere un Rol específico y descriptivo para el asistente (ej: 'Especialista en Reservas', 'Asesor de Productos'). Si ya hay uno, mejóralo si es posible.
// 3.  **Revisa y Sugiere Personalidad:** Sugiere 3-5 adjetivos clave que definan la personalidad ideal para esta tarea, alineados con el rol y la descripción. Si ya hay rasgos, mejóralos o confírmalos.
// 4.  **Re-escribe/Crea la Instrucción Detallada:** Este es el punto más importante. La nueva instrucción debe:
//     * Ser una guía paso a paso clara y lógica para que el LLM complete la tarea.
//     * Asumir que la intención del usuario ya ha sido identificada (la tarea ya se activó). No incluyas lógica para identificar otras intenciones.
//     * Reflejar implícitamente el Rol y Personalidad sugeridos en el tono y lenguaje.
//     * Si hay una Función de Automatización (${funcionPresente ? `'${nombre_funcion_automatizacion}'` : 'Ninguna'}):
//         * Indicar CLARAMENTE en qué paso(s) y bajo qué condiciones se debe llamar a la función.
//         * Especificar qué parámetros (de la lista de Parámetros Requeridos marcados como [REQUERIDO]) deben ser recopilados del usuario ANTES de llamar a la función.
//         * Mencionar cómo se debe confirmar la información con el usuario antes de ejecutar la función (si aplica).
//         * Describir cómo manejar la respuesta de la función (informar éxito, error, datos).
//     * Si NO hay Función de Automatización: La instrucción debe enfocarse en cómo responder usando el contexto disponible o indicando limitaciones.
//     * Incluir manejo básico de interacciones (ej: qué hacer si el usuario no proporciona un parámetro requerido).
//     * Ser autocontenida y lista para usarse como prompt principal para el LLM. NO incluyas el Rol o Personalidad explícitamente al inicio de la instrucción.

// Formato de Salida OBLIGATORIO:
// Responde ÚNICAMENTE con un objeto JSON válido, sin texto introductorio, explicaciones ni markdown. El objeto debe contener EXACTAMENTE estas claves con valores de tipo STRING:
// - "sugerencia_descripcion"
// - "sugerencia_rol"
// - "sugerencia_personalidad"
// - "sugerencia_instruccion"

// Ejemplo de JSON esperado:
// {
//   "sugerencia_descripcion": "Verifica la disponibilidad de un producto específico en el inventario.",
//   "sugerencia_rol": "Consultor de Inventario",
//   "sugerencia_personalidad": "Preciso, Rápido, Claro",
//   "sugerencia_instruccion": "1. Pregunta al usuario el nombre o SKU del producto.\\n2. Una vez obtenido, llama a la función 'verificar_stock' con el parámetro 'nombre_producto' o 'sku_producto'.\\n3. Informa el resultado: 'Disponible', 'Agotado' o 'No encontrado'."
// }
// `;

//     // --- Llamada a Gemini ---
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash",
//       generationConfig: generationConfig,
//       safetySettings: safetySettings,
//     });

//     console.log("Enviando prompt a Gemini...");

//     const result = await model.generateContent({
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//     });

//     const response = result.response;
//     const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

//     console.log("Respuesta cruda de Gemini:", responseText);

//     if (!responseText) {
//       const finishReason = response?.candidates?.[0]?.finishReason;
//       const safetyRatings = response?.candidates?.[0]?.safetyRatings;
//       console.error("Respuesta vacía o inválida de Gemini.");
//       console.error("Finish Reason:", finishReason);
//       console.error("Safety Ratings:", safetyRatings);
//       throw new Error(`Respuesta vacía del modelo. Razón: ${finishReason || 'Desconocida'}`);
//     }

//     // --- Parseo JSON y Post-procesamiento ---
//     let parsedResponse: SugerenciasTarea;
//     try {
//       parsedResponse = JSON.parse(responseText);
//       console.log('Sugerencias parseadas:', parsedResponse);

//       // Validación básica
//       if (!parsedResponse || typeof parsedResponse !== 'object' ||
//         typeof parsedResponse.sugerencia_descripcion !== 'string' ||
//         typeof parsedResponse.sugerencia_rol !== 'string' ||
//         typeof parsedResponse.sugerencia_personalidad !== 'string' ||
//         typeof parsedResponse.sugerencia_instruccion !== 'string') {
//         console.error("El JSON parseado no tiene la estructura esperada:", parsedResponse);
//         throw new Error("La respuesta JSON no tiene la estructura esperada.");
//       }

//       // --- *** INICIO: Post-procesamiento de la Instrucción *** ---
//       const instruccionOriginal = parsedResponse.sugerencia_instruccion;
//       let instruccionFormateada = instruccionOriginal;

//       // Intentar detectar patrones como "1. texto 2. texto" y añadir \n
//       // Esta regex busca un espacio, seguido de uno o más dígitos, un punto y un espacio.
//       // Lo reemplaza con un salto de línea (\n) seguido del mismo número, punto y espacio.
//       // El modificador 'g' asegura que se reemplacen todas las ocurrencias.
//       const stepPattern = / (\d+\.) /g;
//       if (stepPattern.test(instruccionOriginal)) {
//         console.log("Detectado patrón de pasos numerados. Aplicando formato \\n...");
//         // Usamos $1 para referenciar el grupo capturado (el número y el punto)
//         instruccionFormateada = instruccionOriginal.replace(stepPattern, '\n$1 ');
//         // Quitar el posible \n inicial si el primer paso estaba al inicio
//         if (instruccionFormateada.startsWith('\n')) {
//           instruccionFormateada = instruccionFormateada.substring(1);
//         }
//         console.log("Instrucción después de formateo:", JSON.stringify(instruccionFormateada));
//       } else {
//         console.log("No se detectó patrón de pasos numerados estándar para formatear con \\n.");
//         // Considerar otros patrones si Gemini usa formatos diferentes (ej: -, *)
//       }

//       // Actualizar el objeto con la instrucción formateada
//       parsedResponse.sugerencia_instruccion = instruccionFormateada;
//       // --- *** FIN: Post-procesamiento de la Instrucción *** ---


//       return parsedResponse; // Devolver el objeto modificado

//     } catch (parseError) {
//       console.error("Error al parsear respuesta JSON de Gemini:", parseError);
//       // Intentar limpiar y parsear como fallback (menos probable con application/json)
//       const cleanedText = responseText.replace(/```(json|text)?\n?/g, "").replace(/```/g, "").trim();
//       try {
//         const fallbackParsed: SugerenciasTarea = JSON.parse(cleanedText);
//         console.log('Sugerencias parseadas (fallback):', fallbackParsed);
//         if (!fallbackParsed || typeof fallbackParsed !== 'object' || /* ... validaciones ... */ !fallbackParsed.sugerencia_instruccion) {
//           throw new Error("La respuesta JSON (fallback) no tiene la estructura esperada.");
//         }
//         // *** APLICAR POST-PROCESAMIENTO TAMBIÉN AL FALLBACK ***
//         const instruccionOriginalFallback = fallbackParsed.sugerencia_instruccion;
//         let instruccionFormateadaFallback = instruccionOriginalFallback;
//         const stepPatternFallback = / (\d+\.) /g;
//         if (stepPatternFallback.test(instruccionOriginalFallback)) {
//           instruccionFormateadaFallback = instruccionOriginalFallback.replace(stepPatternFallback, '\n$1 ');
//           if (instruccionFormateadaFallback.startsWith('\n')) {
//             instruccionFormateadaFallback = instruccionFormateadaFallback.substring(1);
//           }
//         }
//         fallbackParsed.sugerencia_instruccion = instruccionFormateadaFallback;
//         // *** FIN POST-PROCESAMIENTO FALLBACK ***
//         return fallbackParsed;
//       } catch (fallbackError) {
//         console.error("Error al parsear respuesta JSON (incluso con fallback):", fallbackError);
//         console.error("Respuesta original recibida:", responseText);
//         throw new Error("La respuesta de mejora no tuvo un formato JSON válido, incluso después de limpiar.");
//       }
//     }

//   } catch (error: unknown) {
//     console.error('Error general en mejorarTareaConGemini:', error);
//     return null;
//   }
// }
