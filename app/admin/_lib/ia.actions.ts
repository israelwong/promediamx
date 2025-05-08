// Ruta actual del archivo desde app: app/admin/_lib/ia.actions.ts
'use server';

import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
    GenerationConfig,
    // FunctionDeclarationSchemaType, // Para definir tipos de parámetros de funciones
    // Part, // Para manejar la respuesta de llamada a función
    // FunctionCall, // Para extraer la llamada a función
    FinishReason, // Para verificar por qué terminó la generación
    Tool, // Importar el tipo Tool
    FunctionDeclaration, // Importar FunctionDeclaration
    SchemaType, // Importar SchemaType para los tipos de parámetros
    Schema
} from "@google/generative-ai";

import {
    GenerarRespuestaAsistenteConHerramientasInput,
    RespuestaAsistenteConHerramientas,
    TareaCapacidadIA,
    // ParametroParaIA,
    // FuncionHerramientaIA
} from '@/app/admin/_lib/crmConversacion.types'; // O la ruta correcta a tus tipos

import { ActionResult } from '@/app/admin/_lib/types';
// import { ChatMessageItem } from '@/app/admin/_lib/crmConversacion.types'; // Asumiendo que ChatMessageItem está aquí

const generationConfig: GenerationConfig = {
    maxOutputTokens: 2048,
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Función auxiliar CORREGIDA para mapear tipos al enum SchemaType ---
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
            console.warn(`[IA Actions] Tipo 'seleccion_multiple' mapeado a SchemaType.ARRAY. Considerar definir 'items' en la declaración de la función.`);
            return SchemaType.ARRAY;
        default:
            console.warn(`[IA Actions] Tipo de parámetro no mapeado explícitamente: ${tipo}. Usando SchemaType.STRING por defecto.`);
            return SchemaType.STRING;
    }
}

// --- Función auxiliar para construir la declaración de herramientas para Gemini ---
// Devuelve Tool[] | undefined según la especificación
function construirHerramientasParaGemini(tareas: TareaCapacidadIA[]): Tool[] | undefined {
    const functionDeclarations: FunctionDeclaration[] = tareas
        .filter(tarea => tarea.funcionHerramienta)
        .map(tarea => {
            const funcion = tarea.funcionHerramienta!;

            // Especificar el tipo del objeto properties usando SchemaType
            const properties: Record<string, { type: SchemaType; description?: string }> = {};
            const requiredParams: string[] = [];

            funcion.parametros.forEach(param => {
                properties[param.nombre] = {
                    type: mapTipoParametroToSchemaType(param.tipo), // <-- Usar la función corregida
                    description: param.descripcion || `Parámetro ${param.nombre}`,
                };
                if (param.esObligatorio) {
                    requiredParams.push(param.nombre);
                }
            });

            if (tarea.camposPersonalizadosRequeridos) {
                tarea.camposPersonalizadosRequeridos.forEach(param => {
                    if (!properties[param.nombre]) {
                        properties[param.nombre] = {
                            type: mapTipoParametroToSchemaType(param.tipo), // <-- Usar la función corregida
                            description: param.descripcion || `Campo personalizado ${param.nombre}`,
                        };
                        if (param.esObligatorio) {
                            if (!requiredParams.includes(param.nombre)) {
                                requiredParams.push(param.nombre);
                            }
                        }
                    }
                });
            }

            const funcDecl: FunctionDeclaration = {
                name: funcion.nombreInterno,
                description: tarea.descripcion || funcion.descripcion || `Ejecuta la acción ${funcion.nombreVisible}`,
                parameters: {
                    type: SchemaType.OBJECT, // <-- Usar el enum SchemaType.OBJECT
                    properties: Object.fromEntries(
                        Object.entries(properties).map(([key, value]) => [
                            key,
                            { ...value, type: value.type as SchemaType } as Schema,
                        ])
                    ),
                    required: requiredParams.length > 0 ? requiredParams : undefined,
                },
            };
            return funcDecl;
        });

    if (functionDeclarations.length === 0) {
        return undefined;
    }

    const tools: Tool[] = [{ functionDeclarations }];
    return tools;
}


/**
 * Genera una respuesta utilizando la API de Google Gemini, con capacidad de usar herramientas (function calling).
 * @param input Datos necesarios, incluyendo historial, mensaje actual y tareas/herramientas disponibles.
 * @returns ActionResult con un objeto RespuestaAsistenteConHerramientas.
 */
export async function generarRespuestaAsistente(
    input: GenerarRespuestaAsistenteConHerramientasInput
): Promise<ActionResult<RespuestaAsistenteConHerramientas>> {
    console.log("[IA Action] Iniciando generación de respuesta con Gemini SDK (con herramientas)...");
    console.log("[IA Action] Mensaje Usuario:", input.mensajeUsuarioActual);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[IA Action] Error: GEMINI_API_KEY no está configurada.");
        return { success: false, error: "Configuración de IA incompleta en el servidor." };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        let systemInstructionText = `Eres ${input.contextoAsistente.nombreAsistente}, un asistente virtual amigable y eficiente para ${input.contextoAsistente.nombreNegocio}. `;
        if (input.contextoAsistente.descripcionAsistente) {
            systemInstructionText += `${input.contextoAsistente.descripcionAsistente}. `;
        }
        systemInstructionText += `Tu objetivo es ayudar a los usuarios. Puedes responder directamente o usar las herramientas disponibles si la consulta del usuario coincide con la descripción de una herramienta. Si decides usar una herramienta, responde SOLAMENTE con la llamada a la función necesaria (function call) y los argumentos extraídos. No añadas texto adicional antes o después de la llamada a función. Si necesitas más información para usar una herramienta, solicítala al usuario ANTES de intentar la llamada a la función. Si no puedes ayudar o falta información, indica que consultarás a un agente humano.`;

        const tools = construirHerramientasParaGemini(input.tareasDisponibles);

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstructionText }],
            },
            // Corrección: Usar asignación explícita para generationConfig
            generationConfig: generationConfig,
            safetySettings: safetySettings, // Asignación explícita (aunque shorthand funcione usualmente)
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
            console.log("[IA Action] Gemini solicitó llamada a función.");
            const fc = functionCallPart.functionCall;

            const args = (fc.args || {}) as Record<string, unknown>;

            llamadaFuncion = {
                nombreFuncion: fc.name,
                argumentos: args,
            };
            console.log(`[IA Action] Función a llamar: ${llamadaFuncion.nombreFuncion}, Argumentos:`, llamadaFuncion.argumentos);

            respuestaTextual = response.text() || null;
            if (!respuestaTextual) {
                respuestaTextual = `Entendido, voy a proceder con la acción: ${llamadaFuncion.nombreFuncion}.`;
            }

        } else if (candidate?.finishReason === FinishReason.STOP || candidate?.finishReason === FinishReason.MAX_TOKENS) {
            console.log("[IA Action] Gemini generó respuesta textual.");
            respuestaTextual = response.text() || null;
        } else if (candidate?.finishReason === FinishReason.SAFETY) {
            console.error("[IA Action] Respuesta bloqueada por seguridad.");
            return { success: false, error: "La respuesta fue bloqueada por razones de seguridad." };
        } else {
            console.warn(`[IA Action] Razón de finalización inesperada: ${candidate?.finishReason}. Extrayendo texto si es posible.`);
            respuestaTextual = response.text() || null;
            if (!respuestaTextual && !llamadaFuncion) {
                return { success: false, error: `La IA no generó una respuesta (Razón: ${candidate?.finishReason || 'Desconocida'}).` };
            }
        }

        const data: RespuestaAsistenteConHerramientas = {
            respuestaTextual: respuestaTextual ? respuestaTextual.trim() : null,
            llamadaFuncion: llamadaFuncion,
        };

        console.log("[IA Action] Resultado procesado:", data);
        return { success: true, data };

    } catch (error) {
        console.error("[IA Action] Error al interactuar con Gemini SDK:", error);
        let errorMessage = "Error al comunicarse con el servicio de IA.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
