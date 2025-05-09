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
    Schema
} from "@google/generative-ai";

import {
    GenerarRespuestaAsistenteConHerramientasInput,
    RespuestaAsistenteConHerramientas,
    TareaCapacidadIA,
} from '@/app/admin/_lib/crmConversacion.types';

import { ActionResult } from '@/app/admin/_lib/types';

// *** CAMBIO 1: Añadir temperature a generationConfig ***
const generationConfig: GenerationConfig = {
    temperature: 0.1, // Temperatura baja para respuestas más predecibles y mejor seguimiento de formato
    maxOutputTokens: 2048,
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function mapTipoParametroToSchemaType(tipo: string): SchemaType {
    switch (tipo.toLowerCase()) {
        case 'texto':
        case 'email':
        case 'telefono':
        case 'direccion':
        case 'fecha':
        case 'fechahora':
        case 'seleccion_unica':
            return SchemaType.STRING;
        case 'numero':
        case 'decimal':
        case 'float':
            return SchemaType.NUMBER;
        case 'entero':
            return SchemaType.INTEGER;
        case 'booleano':
            return SchemaType.BOOLEAN;
        case 'seleccion_multiple':
            console.warn(`[IA Actions] Tipo 'seleccion_multiple' mapeado a SchemaType.ARRAY.`);
            return SchemaType.ARRAY;
        case 'fecha_hora': // <-- AÑADIR ESTE CASO
        default:
            console.warn(`[IA Actions] Tipo de parámetro no mapeado explícitamente: ${tipo}. Usando SchemaType.STRING.`);
            return SchemaType.STRING;
    }
}

function construirHerramientasParaGemini(tareas: TareaCapacidadIA[]): Tool[] | undefined {
    // ... (sin cambios en esta función auxiliar) ...
    const functionDeclarations: FunctionDeclaration[] = tareas
        .filter(tarea => tarea.funcionHerramienta)
        .map(tarea => {
            const funcion = tarea.funcionHerramienta!;
            const properties: Record<string, { type: SchemaType; description?: string }> = {};
            const requiredParams: string[] = [];

            funcion.parametros.forEach(param => {
                properties[param.nombre] = {
                    type: mapTipoParametroToSchemaType(param.tipo),
                    description: param.descripcion || `Parámetro ${param.nombre}`,
                };
                if (param.esObligatorio) requiredParams.push(param.nombre);
            });

            if (tarea.camposPersonalizadosRequeridos) {
                tarea.camposPersonalizadosRequeridos.forEach(param => {
                    if (!properties[param.nombre]) {
                        properties[param.nombre] = {
                            type: mapTipoParametroToSchemaType(param.tipo),
                            description: param.descripcion || `Campo personalizado ${param.nombre}`,
                        };
                        if (param.esObligatorio && !requiredParams.includes(param.nombre)) {
                            requiredParams.push(param.nombre);
                        }
                    }
                });
            }

            const funcDecl: FunctionDeclaration = {
                name: funcion.nombreInterno,
                description: tarea.descripcion || funcion.descripcion || `Ejecuta la acción ${funcion.nombreInterno}`,
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: Object.fromEntries(
                        Object.entries(properties).map(([key, value]) => [key, { ...value, type: value.type as SchemaType } as Schema])
                    ),
                    required: requiredParams.length > 0 ? requiredParams : undefined,
                },
            };
            return funcDecl;
        });

    if (functionDeclarations.length === 0) return undefined;
    const tools: Tool[] = [{ functionDeclarations }];
    return tools;
}


export async function generarRespuestaAsistente(
    input: GenerarRespuestaAsistenteConHerramientasInput
): Promise<ActionResult<RespuestaAsistenteConHerramientas>> {

    console.log("[IA Action] Iniciando generación de respuesta con Gemini SDK (con herramientas v3)..."); // Log versión
    console.log("[IA Action] Mensaje Usuario:", input.mensajeUsuarioActual);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[IA Action] Error: GEMINI_API_KEY no está configurada.");
        return { success: false, error: "Configuración de IA incompleta en el servidor." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const systemInstructionText = `Eres ${input.contextoAsistente.nombreAsistente}, un asistente virtual amigable y eficiente para ${input.contextoAsistente.nombreNegocio}. ${input.contextoAsistente.descripcionAsistente ? `${input.contextoAsistente.descripcionAsistente}. ` : ''}Tu objetivo es ayudar al usuario.
Evalúa la consulta del usuario contra las herramientas (funciones) disponibles:
* **SI** la consulta coincide claramente con la descripción de una herramienta específica Y has verificado que tienes (o has obtenido del usuario preguntando ANTES) **todos** los parámetros requeridos por esa herramienta:
    * **DEBES** usar la herramienta. Tu respuesta **COMPLETA Y ÚNICA** debe ser el objeto \`functionCall\` estructurado.
    * **FORMATO ESPERADO DEL OBJETO \`functionCall\` (EJEMPLO):** \`{"functionCall": {"name": "nombreDeLaFuncionCorrecta", "args": {"parametro1": "valor1", "parametro2": "valor2"}}}\`
    * **REGLAS ESTRICTAS PARA \`functionCall\`:**
        * **NO** incluyas ningún texto explicativo, confirmación, o conversación antes o después de este objeto.
        * **NO** escribas el objeto \`functionCall\` como un string JSON dentro de la parte 'text' de la respuesta.
        * **NO** uses bloques de código Markdown.
        * Simplemente devuelve el objeto \`functionCall\` puro como lo define la API.
* **EN CUALQUIER OTRO CASO** (si la consulta es general, no coincide con una herramienta, no estás seguro de cuál usar, o no pudiste obtener los parámetros necesarios después de preguntar):
    * **DEBES** responder con un **mensaje de texto** útil y conversacional. No intentes llamar a una función. Si no puedes ayudar, explica la situación e indica que notificarás a un agente humano.
Mantén siempre un tono amigable y eficiente.`;

        const tools = construirHerramientasParaGemini(input.tareasDisponibles);
        console.log("[IA Action] Herramientas DEFINITIVAS pasadas a Gemini:", JSON.stringify(tools, null, 2)); // <--- AÑADE ESTE LOG DETALLADO

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstructionText }],
            },
            generationConfig: generationConfig, // generationConfig ahora incluye temperature
            safetySettings: safetySettings,
            tools: tools,
        });

        const chatHistory = input.historialConversacion.map(turn => ({
            role: (turn.role === 'user' ? 'user' : 'model') as 'user' | 'model',
            parts: [{ text: turn.mensaje || "" }],
        }));

        const chatSession = model.startChat({
            history: chatHistory,
        });

        console.log("[IA Action] Enviando mensaje a Gemini:", input.mensajeUsuarioActual);
        const result = await chatSession.sendMessage(input.mensajeUsuarioActual);
        const response = result.response;
        const candidate = response.candidates?.[0];

        console.log("[IA Action] Respuesta completa de Gemini:", JSON.stringify(response, null, 2));

        let respuestaTextual: string | null = null;
        let llamadaFuncion: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;

        const functionCallPart = candidate?.content?.parts?.find(part => part.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            // --- CASO IDEAL: functionCall ESTRUCTURADO ---
            console.log("[IA Action] Gemini solicitó llamada a función estructurada.");
            const fc = functionCallPart.functionCall;
            const args = (fc.args || {}) as Record<string, unknown>;
            llamadaFuncion = {
                nombreFuncion: fc.name,
                argumentos: args,
            };
            console.log(`[IA Action] Función a llamar: ${llamadaFuncion.nombreFuncion}, Argumentos:`, llamadaFuncion.argumentos);
            respuestaTextual = response.text() || null;
            if (!respuestaTextual && llamadaFuncion) {
                respuestaTextual = `Entendido, voy a proceder con la acción: ${llamadaFuncion.nombreFuncion}.`;
            }
            // --- FIN CASO IDEAL ---

        } else {
            // --- CASO NO IDEAL: NO hay functionCall estructurado ---
            console.log("[IA Action] No se encontró functionCall estructurado. Verificando respuesta textual...");
            respuestaTextual = response.text() || null;

            // *** CAMBIO 3: INICIO WORKAROUND - Parsear JSON desde Texto ***
            if (respuestaTextual && typeof respuestaTextual === 'string') { // Guarda de tipo
                const jsonMatch = respuestaTextual.match(/```json\s*([\s\S]*?)\s*```/);

                if (jsonMatch && jsonMatch[1]) {
                    console.log("[IA Action] Workaround: Se encontró bloque JSON en texto.");
                    try {
                        const parsedJson = JSON.parse(jsonMatch[1]);

                        // *** INICIO DE CORRECCIÓN PARA JSON ANIDADO ***
                        // Verificar si el JSON parseado contiene la clave 'functionCall'
                        // y si esa clave contiene 'name' y 'args'
                        if (parsedJson.functionCall &&
                            typeof parsedJson.functionCall === 'object' &&
                            parsedJson.functionCall !== null &&
                            typeof parsedJson.functionCall.name === 'string' &&
                            typeof parsedJson.functionCall.args === 'object' &&
                            parsedJson.functionCall.args !== null) {

                            console.warn("[IA Action] Workaround: Función recuperada desde JSON en texto (estructura anidada).");
                            llamadaFuncion = { // Asigna a llamadaFuncion
                                nombreFuncion: parsedJson.functionCall.name,
                                argumentos: parsedJson.functionCall.args as Record<string, unknown>,
                            };
                            // const funcionRecuperada = true; // Asegúrate de tener esta bandera si la usas
                            // *** NUEVA LÍNEA: Actualizar respuestaTextual ***
                            console.log(`[IA Action] Workaround - Función recuperada: ${llamadaFuncion.nombreFuncion}, Args:`, llamadaFuncion.argumentos);
                            respuestaTextual = `Entendido. Procesando tu solicitud para: ${llamadaFuncion.nombreFuncion}.`;
                            console.log("[IA Action] Workaround: respuestaTextual actualizada después de recuperar función desde JSON.");
                            // *** FIN NUEVA LÍNEA ***

                        } else {
                            console.warn("[IA Action] Workaround: JSON parseado no tiene la estructura esperada { functionCall: { name, args } }.");
                        }
                        // *** FIN DE CORRECCIÓN PARA JSON ANIDADO ***

                    } catch (parseError) {
                        console.warn("[IA Action] Workaround: Error al parsear JSON encontrado en texto.", parseError);
                    }
                }
            }
            // *** FIN WORKAROUND ***

            // Manejo de razones de finalización (si no se recuperó una función)
            if (!llamadaFuncion) {
                if (candidate?.finishReason === FinishReason.STOP || candidate?.finishReason === FinishReason.MAX_TOKENS) {
                    console.log("[IA Action] Generación finalizada con texto (o JSON no parseable).");
                } else if (candidate?.finishReason === FinishReason.SAFETY) {
                    console.error("[IA Action] Respuesta bloqueada por seguridad.");
                    return { success: false, error: "La respuesta fue bloqueada por razones de seguridad." };
                } else {
                    console.warn(`[IA Action] Razón de finalización inesperada: ${candidate?.finishReason}.`);
                    if (!respuestaTextual) {
                        return { success: false, error: `La IA no generó una respuesta válida (Razón: ${candidate?.finishReason || 'Desconocida'}).` };
                    }
                }
            }
        }

        // Construcción final del resultado
        const data: RespuestaAsistenteConHerramientas = {
            respuestaTextual: respuestaTextual ? respuestaTextual.trim() : null,
            llamadaFuncion: llamadaFuncion,
        };

        console.log("[IA Action] Resultado procesado final:", data);
        return { success: true, data };

    } catch (error) {
        console.error("[IA Action] Error al interactuar con Gemini SDK:", error);
        let errorMessage = "Error al comunicarse con el servicio de IA.";
        if (error instanceof Error) { errorMessage = error.message; }
        return { success: false, error: errorMessage };
    }
}