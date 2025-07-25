// Ruta: app/admin/_lib/ia/ia.actions.ts
'use server';

import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerationConfig,
    FinishReason,
    Tool,
    FunctionDeclaration,
    SchemaType,
    Schema, // Tipo genérico para propiedades de parámetros
    // Content,
    // FunctionCall, 
    // FunctionResponse, // No se usa directamente aquí si el historial ya está formateado
    // Part, // No se usa directamente aquí si el historial ya está formateado
} from "@google/generative-ai";

import {
    // Asumimos que GenerarRespuestaAsistenteConHerramientasInput ahora espera Content[]
    type GenerarRespuestaAsistenteConHerramientasInput,
    type RespuestaAsistenteConHerramientas,
    type TareaCapacidadIA,
    type ParametroParaIA,
    type HistorialTurnoParaGemini
} from '@/app/admin/_lib/ia/ia.schemas'; // Asegúrate que este path es correcto

import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';

// Interfaz HistorialTurnoEstructurado (ya no se usa DENTRO de generarRespuestaAsistente,
// pero se mantiene aquí como referencia de lo que las actions que llaman deben construir y luego transformar a Content[])
// La transformación a Content[] debe ocurrir ANTES de llamar a generarRespuestaAsistente.
export interface HistorialTurnoEstructurado {
    role: string;
    parteTipo?: 'TEXT' | 'FUNCTION_CALL' | 'FUNCTION_RESPONSE' | null;
    mensajeTexto?: string | null;
    functionCallNombre?: string | null;
    functionCallArgs?: Record<string, unknown> | null;
    functionResponseNombre?: string | null;
    functionResponseData?: Record<string, unknown> | null;
}


const generationConfig: GenerationConfig = {
    temperature: 0.1,
    maxOutputTokens: 2048,
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function mapTipoParametroToSchemaType(tipoDatoOriginal: string): SchemaType {
    if (!tipoDatoOriginal) {
        // console.warn(`[IA Actions mapTipo] tipoDato nulo/undefined. Usando STRING.`);
        return SchemaType.STRING;
    }
    const tipo = tipoDatoOriginal.toLowerCase().trim();
    switch (tipo) {
        case 'string': return SchemaType.STRING;
        case 'number': return SchemaType.NUMBER;
        case 'integer': return SchemaType.INTEGER;
        case 'boolean': return SchemaType.BOOLEAN;
        case 'array': return SchemaType.ARRAY; // Para ArraySchema, necesitarías definir 'items'
        default:
            // console.warn(`[IA Actions mapTipo] Tipo NO MAPEADO: '${tipoDatoOriginal}'. Usando STRING.`);
            return SchemaType.STRING;
    }
}

function construirHerramientasParaGemini(tareas: TareaCapacidadIA[]): Tool[] | undefined {
    const functionDeclarations: FunctionDeclaration[] = tareas
        .filter(tarea => tarea.funcionHerramienta && tarea.funcionHerramienta.nombre)
        .map(tarea => {
            const funcion = tarea.funcionHerramienta!;
            // El tipo para properties es Record<string, Schema>
            // Schema es una unión de StringSchema, NumberSchema, ObjectSchema, etc.
            const properties: Record<string, Schema> = {};

            funcion.parametros.forEach(param => {
                if (param.nombre) {
                    // Para tipos simples, la estructura { type: ..., description: ... } es válida
                    // ya que StringSchema, NumberSchema, etc., tienen estas propiedades.
                    properties[param.nombre] = {
                        type: mapTipoParametroToSchemaType(param.tipo),
                        description: param.descripcion || `Parámetro ${param.nombre}`,
                        // Si mapTipoParametroToSchemaType devuelve SchemaType.ARRAY, necesitarías
                        // añadir un campo 'items' aquí, ej: items: { type: SchemaType.STRING }
                        // Si devuelve SchemaType.OBJECT, necesitarías un campo 'properties' anidado.
                        // Por ahora, asumimos tipos simples.
                    } as Schema; // Hacemos un cast a Schema para satisfacer a TypeScript
                }
            });

            if (tarea.camposPersonalizadosRequeridos) {
                tarea.camposPersonalizadosRequeridos.forEach(param => {
                    if (param.nombre && !properties[param.nombre]) {
                        properties[param.nombre] = {
                            type: mapTipoParametroToSchemaType(param.tipo),
                            description: param.descripcion || `Campo personalizado ${param.nombre}`,
                        } as Schema;
                    }
                });
            }

            return {
                name: funcion.nombre,
                description: funcion.descripcion || `Ejecuta la acción ${funcion.nombre}`,
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: properties, // Esto ahora es Record<string, Schema>
                    required: []
                },
            };
        });

    if (functionDeclarations.length === 0) {
        // console.log("[IA Action construirHerramientas] No se generaron declaraciones de función.");
        return undefined;
    }
    return [{ functionDeclarations }];
}


export async function generarRespuestaAsistente(
    input: GenerarRespuestaAsistenteConHerramientasInput
): Promise<ActionResult<RespuestaAsistenteConHerramientas>> {
    // console.log("[IA Action V2] Iniciando generación de respuesta...");
    // console.log("[IA Action V2] Mensaje Usuario Actual:", input.mensajeUsuarioActual);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[IA Action V2] Error: GEMINI_API_KEY no está configurada.");
        return { success: false, error: "Configuración de IA incompleta en el servidor." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // =========================================================================
        // PROMPT DEL SISTEMA REFORZADO
        // =========================================================================
        const systemInstructionTextBase = `
    Eres ${input.contextoAsistente.nombreAsistente}, un asistente virtual para ${input.contextoAsistente.nombreNegocio}. Tu comportamiento se rige por la siguiente jerarquía de prioridades. Evalúa cada consulta del usuario estrictamente en este orden:

    **PRIORIDAD 0: MANTENER LA TAREA ACTIVA (REGLA MAESTRA)**
    - Si estás en medio de un flujo de varios pasos para una tarea (como 'agendarCita'), DEBES continuar con esa misma tarea hasta que se complete. La respuesta del backend te guiará.
    - NO cambies a otra tarea a menos que el usuario lo pida de forma explícita e inequívoca.

    **PRIORIDAD 1: REGLA DE CONFIRMACIÓN (DISPARADOR)**
    - Si el \`functionResponse\` más reciente en el historial contiene \`aiContextData\` con un \`nextActionName\`, Y la respuesta actual del usuario es afirmativa (ej. 'sí', 'confirmo'), tu ÚNICA acción posible es llamar a la función en \`nextActionName\` con los argumentos de \`nextActionArg\`. Esta regla tiene precedencia absoluta.

    **PRIORIDAD 2: ENTREGAR RESPUESTA DE FUNCIÓN (MENSAJERO FIEL)**
    - Si las prioridades anteriores no aplican y una herramienta de backend acaba de ejecutarse (resultando en un \`functionResponse\`), tu ÚNICA Y OBLIGATORIA acción es entregar el mensaje que la función generó al usuario. Debes entregarlo **PALABRA POR PALABRA, sin añadir, omitir, adornar o reformular absolutamente nada.** Actúa como un simple mensajero y espera la respuesta.

    **PRIORIDAD 3: USAR UNA HERRAMIENTA (NUEVA SOLICITUD)**
    - Si ninguna de las prioridades anteriores aplica, evalúa la consulta para usar una herramienta por primera vez, siguiendo las instrucciones específicas de cada una.

    **PRIORIDAD 4: CONVERSACIÓN GENERAL**
    - Si ninguna prioridad aplica, responde de manera conversacional y amable.
    
    **REGLA DE FINALIZACIÓN:**
    - Una vez que una tarea final (como 'confirmarCita') se completa, considera la tarea TERMINADA. Si el usuario da las gracias, responde amablemente y espera una nueva solicitud. No intentes iniciar otra tarea.
    `;
        // =========================================================================


        let systemInstructionFinal = systemInstructionTextBase;
        const chatHistory: HistorialTurnoParaGemini[] = input.historialConversacion; // Directamente
        console.log("[IA Action V2] Historial de conversación:", JSON.stringify(chatHistory, null, 2));


        // NUEVA LÓGICA CORREGIDA para encontrar la última función ejecutada
        if (chatHistory.length > 0) {
            let nombreUltimaFuncionEjecutada: string | undefined = undefined;

            // Empezamos a buscar desde el penúltimo mensaje si el último es del usuario,
            // o desde el último si no lo es. El objetivo es encontrar el 'functionResponse' más reciente.
            let indiceInicioBusqueda = chatHistory.length - 1;
            if (chatHistory[indiceInicioBusqueda]?.role === 'user' && chatHistory.length > 1) {
                indiceInicioBusqueda = chatHistory.length - 2; // Empezar desde el mensaje anterior al del usuario
            }

            for (let i = indiceInicioBusqueda; i >= 0; i--) {
                const turno = chatHistory[i];
                if (turno.role === 'function' && turno.parts[0]?.functionResponse?.name) {
                    nombreUltimaFuncionEjecutada = turno.parts[0].functionResponse.name;
                    // Encontramos la última función que respondió, ahora verificamos que el turno
                    // inmediatamente posterior a este 'function' (si existe) fuera del 'model'.
                    // Y que el turno actual sea una continuación del usuario.
                    // Esto asegura que estamos en un contexto de "respuesta del usuario a un resultado de función".
                    if (chatHistory[i + 1]?.role === 'model' && chatHistory[chatHistory.length - 1]?.role === 'user') {
                        // Se cumple: function -> model -> user (actual)
                    } else {
                        // No es el patrón exacto para inyectar una instrucción de tarea de seguimiento post-función,
                        // podría ser un user -> user, o function -> user directo.
                        // Podrías decidir no inyectar la instrucción en estos casos si es muy específico.
                        // Por ahora, si encontramos una función, intentaremos usar su instrucción.
                    }
                    break; // Encontramos la más reciente functionResponse
                }
                // Si llegamos a un turno de usuario anterior sin encontrar una functionResponse relevante, paramos.
                // Esto evita buscar demasiado atrás si hubo muchos intercambios de texto después de una función.
                // if (turno.role === 'user' && i < indiceInicioBusqueda) break; // Opcional: limitar la "ventana" de relevancia
            }

            if (nombreUltimaFuncionEjecutada) {
                const tareaCorrespondiente = input.tareasDisponibles.find(
                    t => t.funcionHerramienta?.nombre === nombreUltimaFuncionEjecutada
                );
                if (tareaCorrespondiente?.instruccionParaIA && tareaCorrespondiente.instruccionParaIA.trim() !== '') {
                    console.log(`[IA Action V2 DEBUG] Inyectando instruccionParaIA de la tarea: ${nombreUltimaFuncionEjecutada}`);
                    systemInstructionFinal += `\n\n**Instrucciones Adicionales para tu Respuesta Actual (basado en la función '${nombreUltimaFuncionEjecutada}' que acaba de completarse y cuya respuesta ya ha sido mostrada al usuario):**\n${tareaCorrespondiente.instruccionParaIA}\nConsidera esta instrucción al formular tu respuesta de texto actual al usuario.`;
                } else {
                    // console.log(`[IA Action V2 DEBUG] No se encontró instruccionParaIA para la tarea: ${nombreUltimaFuncionEjecutada}`);
                }
            }
        }
        // --- FIN DE LA NUEVA LÓGICA ---

        const tools = construirHerramientasParaGemini(input.tareasDisponibles);
        console.log("[IA Action V2] Herramientas para Gemini:", JSON.stringify(tools, null, 2));
        //! console.log("[IA Action V2] System Instruction Final:", systemInstructionFinal);


        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest", // O el modelo que estés usando
            systemInstruction: { role: "system", parts: [{ text: systemInstructionFinal }] },
            generationConfig, safetySettings, tools,
        });

        // console.log("[IA Action V2] Historial para Gemini (últimos 10):", JSON.stringify(chatHistory.slice(-10), null, 2));

        const chatSession = model.startChat({ history: chatHistory });
        const result = await chatSession.sendMessage(input.mensajeUsuarioActual);
        const response = result.response;
        const candidate = response.candidates?.[0];

        // console.log("[IA Action V2] Respuesta completa de Gemini:", JSON.stringify(response, null, 2));

        let respuestaTextual: string | null = null;
        let llamadaFuncion: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;
        const functionCallPart = candidate?.content?.parts?.find(part => part.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            // console.log("[IA Action V2] Gemini solicitó llamada a función ESTRUCTURADA.");
            const fc = functionCallPart.functionCall;
            llamadaFuncion = {
                nombreFuncion: fc.name,
                argumentos: (fc.args || {}) as Record<string, unknown>,
            };
            // Es importante obtener el texto también, incluso si hay una llamada a función,
            // ya que Gemini a veces añade texto introductorio o de confirmación.
            // Sin embargo, tu prompt pide NO incluir texto explicativo.
            // Si Gemini sigue las reglas estrictas, response.text() podría ser vacío o nulo.
            respuestaTextual = response.text()?.trim() || null;
            //! comentada para no enviar mensajes intermedios al usuario
            // if (!respuestaTextual && llamadaFuncion) { // Si no hay texto pero sí llamada, crear uno genérico
            //     respuestaTextual = `Entendido, voy a procesar la acción: ${llamadaFuncion.nombreFuncion}.`;
            // }
        } else {
            // console.log("[IA Action V2] No se encontró functionCall ESTRUCTURADO. Verificando texto y workaround...");
            respuestaTextual = response.text()?.trim() || null;
            // Lógica de Workaround (se mantiene igual)
            if (respuestaTextual && typeof respuestaTextual === 'string' && !llamadaFuncion) {
                const jsonMatch = respuestaTextual.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    // ... (tu lógica de workaround como la tenías)
                    try {
                        const parsedJson = JSON.parse(jsonMatch[1]);
                        if (parsedJson && parsedJson.functionCall && typeof parsedJson.functionCall.name === 'string' && typeof parsedJson.functionCall.args === 'object' && parsedJson.functionCall.args !== null) {
                            console.warn("[IA Action V2] Workaround: Función recuperada desde JSON en texto.");
                            llamadaFuncion = { nombreFuncion: parsedJson.functionCall.name, argumentos: parsedJson.functionCall.args as Record<string, unknown> };
                            //! comentada para no enviar mensajes intermedios al usuario
                            //! respuestaTextual = `Entendido. Procesando tu solicitud para: ${llamadaFuncion.nombreFuncion}.`; // Sobrescribir el texto original
                        } else { console.warn("[IA Action V2] Workaround: JSON parseado no tiene estructura esperada."); }
                    } catch (parseError) { console.warn("[IA Action V2] Workaround: Error al parsear JSON en texto.", parseError); }
                }
            }

            if (!llamadaFuncion) { // Si después de todo no hay llamada a función
                if (candidate?.finishReason === FinishReason.STOP || candidate?.finishReason === FinishReason.MAX_TOKENS) {
                    // console.log("[IA Action V2] Generación finalizada con texto.");
                    if (!respuestaTextual) { // Si es STOP pero no hay texto (raro)
                        // console.warn("[IA Action V2] Respuesta de texto vacía con FinishReason.STOP/MAX_TOKENS.");
                        // respuestaTextual = "No he podido generar una respuesta en este momento."; // Fallback
                        // O devolver error si se considera que siempre debe haber texto
                        return { success: false, error: "La IA generó una respuesta vacía." };
                    }
                } else if (candidate?.finishReason === FinishReason.SAFETY) {
                    console.error("[IA Action V2] Respuesta bloqueada por seguridad.");
                    return { success: false, error: "La respuesta fue bloqueada por razones de seguridad." };
                } else {
                    console.warn(`[IA Action V2] Razón de finalización inesperada: ${candidate?.finishReason}. Texto: ${respuestaTextual}`);
                    if (!respuestaTextual) { // Si no hay texto Y la razón es otra (ej. OTHER, UNKNOWN)
                        return { success: false, error: `La IA no generó una respuesta válida (Razón: ${candidate?.finishReason || 'Desconocida'}).` };
                    }
                }
            }
        }

        const data: RespuestaAsistenteConHerramientas = {
            respuestaTextual: respuestaTextual, // Ya está trimeado o es null
            llamadaFuncion: llamadaFuncion,
        };

        // console.log("[IA Action V2] Resultado procesado final:", data);
        return { success: true, data };

    } catch (error) {
        console.error("[IA Action V2] Error al interactuar con Gemini SDK:", error);
        let errorMessage = "Error al comunicarse con el servicio de IA.";
        if (error instanceof Error) { errorMessage = error.message; }
        return { success: false, error: errorMessage };
    }
}

export async function obtenerTareasCapacidadParaAsistente(
    asistenteId: string,
    tx: Prisma.TransactionClient
): Promise<TareaCapacidadIA[]> {
    const suscripcionesTareas = await tx.asistenteTareaSuscripcion.findMany({
        where: {
            asistenteVirtualId: asistenteId,
            status: 'activo',
            tarea: { status: 'activo' },
        },
        include: {
            tarea: {
                include: {
                    tareaFuncion: {
                        include: {
                            parametros: true,
                        }
                    },
                    camposPersonalizadosRequeridos: {
                        include: { crmCampoPersonalizado: true },
                    },
                },
            },
        },
    });

    const tareasCapacidad: TareaCapacidadIA[] = [];
    for (const suscripcion of suscripcionesTareas) {
        const tareaDb = suscripcion.tarea;
        if (!tareaDb) continue;
        let funcionHerramienta: TareaCapacidadIA['funcionHerramienta'] = null;
        if (tareaDb.tareaFuncion) {
            const tf = tareaDb.tareaFuncion;
            const parametrosFuncion: ParametroParaIA[] = tf.parametros.map(p => ({
                nombre: p.nombre,
                tipo: p.tipoDato,
                descripcion: p.descripcionParaIA,
                esObligatorio: p.esObligatorio,
            }));
            funcionHerramienta = {
                nombre: tf.nombre ?? '',
                descripcion: tf.descripcion,
                parametros: parametrosFuncion,
            };
        }
        const camposPersonalizadosTarea: ParametroParaIA[] = tareaDb.camposPersonalizadosRequeridos
            .filter(cp => cp.crmCampoPersonalizado)
            .map(cp => {
                const nombreCampo = (cp.crmCampoPersonalizado.nombreCampo ?? cp.crmCampoPersonalizado.nombre) ?? '';
                if (nombreCampo === '') {
                    console.warn(`[obtenerTareasCapacidad] Campo Personalizado con ID ${cp.crmCampoPersonalizado.id} no tiene nombreCampo ni nombre.`);
                }
                return {
                    nombre: nombreCampo,
                    tipo: cp.crmCampoPersonalizado.tipo,
                    descripcion: cp.crmCampoPersonalizado.descripcionParaIA || cp.crmCampoPersonalizado.nombre,
                    esObligatorio: cp.esRequerido,
                };
            });
        tareasCapacidad.push({
            id: tareaDb.id,
            nombre: tareaDb.nombre,
            descripcion: tareaDb.tareaFuncion?.descripcion,
            instruccionParaIA: tareaDb.instruccion,
            funcionHerramienta: funcionHerramienta,
            camposPersonalizadosRequeridos: camposPersonalizadosTarea.length > 0 ? camposPersonalizadosTarea : undefined,
        });
    }
    return tareasCapacidad;
}


// app/admin/_lib/ia/ia.actions.ts

/**
 * Convierte una cadena de texto en un vector de embeddings usando la API de Google.
 * Este vector representa el significado semántico del texto y se usa para búsquedas por similitud.
 * @param text El texto a convertir en embedding.
 * @returns Una promesa que se resuelve en un array de números (el vector) o null si ocurre un error.
 */
export async function getEmbeddingForText(text: string): Promise<number[] | null> {
    console.log(`[EMBEDDING] Generando vector para el texto: "${text.substring(0, 50)}..."`);

    // 1. Validar que el input no esté vacío.
    const cleanText = text.trim();
    if (!cleanText) {
        console.error("[EMBEDDING] El texto de entrada está vacío.");
        return null;
    }

    // 2. Verificar que la clave de la API esté disponible.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[EMBEDDING] La variable de entorno GEMINI_API_KEY no está configurada.");
        throw new Error("La configuración del servidor para la IA no está completa.");
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 3. Seleccionar el modelo de embedding. 'text-embedding-004' es el más reciente y recomendado.
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        // 4. Llamar a la API para generar el embedding.
        const result = await model.embedContent(cleanText);
        const embedding = result.embedding;

        if (!embedding || !embedding.values) {
            console.error("[EMBEDDING] La respuesta de la API no contiene un vector válido.");
            return null;
        }

        console.log(`[EMBEDDING] Vector generado exitosamente con una dimensión de ${embedding.values.length}.`);
        return embedding.values;

    } catch (error) {
        console.error("[EMBEDDING] Ocurrió un error al generar el vector:", error);
        // En un entorno de producción, podrías querer manejar este error de forma más granular.
        return null;
    }
}

// ... el resto de tus funciones en ia.actions.ts como generarRespuestaAsistente ...