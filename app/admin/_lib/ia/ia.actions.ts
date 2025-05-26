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
    Content,
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
        console.warn(`[IA Actions mapTipo] tipoDato nulo/undefined. Usando STRING.`);
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
            console.warn(`[IA Actions mapTipo] Tipo NO MAPEADO: '${tipoDatoOriginal}'. Usando STRING.`);
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
                description: tarea.descripcionTool || funcion.descripcion || `Ejecuta la acción ${funcion.nombre}`,
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
    // Se espera que input.historialConversacion ya sea de tipo Content[]
    // La transformación de tu estructura de DB a Content[] debe ocurrir ANTES de llamar a esta función.
    input: GenerarRespuestaAsistenteConHerramientasInput
): Promise<ActionResult<RespuestaAsistenteConHerramientas>> {

    console.log("[IA Action] Iniciando generación de respuesta con Gemini SDK (v_final_alineada - historial pre-formateado)...");
    console.log("[IA Action] Mensaje Usuario Actual:", input.mensajeUsuarioActual);

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

* **SI has hecho una pregunta de confirmación al usuario para una acción de una herramienta (ej. '¿Confirmas que deseas X?') y el usuario responde afirmatirmativamente:**
    * DEBES volver a llamar a la MISMA herramienta que estabas procesando.
    * Asegúrate de incluir el parámetro de confirmación apropiado (ej. 'confirmacion_usuario_reagendar: true').
    * También DEBES incluir los identificadores clave que se estaban procesando (ej. 'cita_id_original').
* **Cuando una herramienta requiere múltiples datos del usuario en varios turnos (ej. primero identificar cita, luego nueva fecha):**
    * Llama a la herramienta con la información que tengas. El backend te dirá qué falta.
    * En el siguiente turno, cuando el usuario proporcione la información faltante, vuelve a llamar a la MISMA herramienta, incluyendo tanto la información nueva como la información clave previamente establecida (ej. \`cita_id_original\` Y \`nueva_fecha_hora_deseada\`).

* **EN CUALQUIER OTRO CASO** (si la consulta es general, no coincide con una herramienta, no estás seguro de cuál usar, o no pudiste obtener los parámetros necesarios después de preguntar):
    * **DEBES** responder con un **mensaje de texto** útil y conversacional. No intentes llamar a una función. Si no puedes ayudar, explica la situación e indica que notificarás a un agente humano.
Mantén siempre un tono amigable y eficiente.
`;

        const tools = construirHerramientasParaGemini(input.tareasDisponibles);

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: { role: "system", parts: [{ text: systemInstructionText }] },
            generationConfig, safetySettings, tools,
        });

        // El historial ya debe venir formateado como Content[]
        const chatHistory: Content[] = input.historialConversacion as Content[];
        console.log("[IA Action] Historial RECIBIDO para Gemini (últimos 10):", JSON.stringify(chatHistory.slice(-10), null, 2));

        const chatSession = model.startChat({ history: chatHistory });
        const result = await chatSession.sendMessage(input.mensajeUsuarioActual);
        const response = result.response;
        const candidate = response.candidates?.[0];

        console.log("[IA Action] Respuesta completa de Gemini (actual):", JSON.stringify(response, null, 2));

        let respuestaTextual: string | null = null;
        let llamadaFuncion: RespuestaAsistenteConHerramientas['llamadaFuncion'] = null;
        const functionCallPart = candidate?.content?.parts?.find(part => part.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            console.log("[IA Action] Gemini solicitó llamada a función ESTRUCTURADA (actual).");
            const fc = functionCallPart.functionCall;
            llamadaFuncion = {
                nombreFuncion: fc.name,
                argumentos: (fc.args || {}) as Record<string, unknown>,
            };
            respuestaTextual = response.text() || null;
            if (!respuestaTextual && llamadaFuncion) {
                respuestaTextual = `Entendido, procesando tu solicitud para la acción: ${llamadaFuncion.nombreFuncion}.`;
            }
        } else {
            console.log("[IA Action] No se encontró functionCall ESTRUCTURADO (actual). Verificando respuesta textual y workaround...");
            respuestaTextual = response.text() || null;
            if (respuestaTextual && typeof respuestaTextual === 'string' && !llamadaFuncion) {
                const jsonMatch = respuestaTextual.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    console.log("[IA Action] Workaround: Se encontró bloque JSON en texto (actual).");
                    try {
                        const parsedJson = JSON.parse(jsonMatch[1]);
                        if (parsedJson.functionCall &&
                            typeof parsedJson.functionCall.name === 'string' &&
                            typeof parsedJson.functionCall.args === 'object' &&
                            parsedJson.functionCall.args !== null
                        ) {
                            console.warn("[IA Action] Workaround: Función recuperada desde JSON en texto (actual).");
                            llamadaFuncion = {
                                nombreFuncion: parsedJson.functionCall.name,
                                argumentos: parsedJson.functionCall.args as Record<string, unknown>,
                            };
                            respuestaTextual = `Entendido. Procesando tu solicitud para: ${llamadaFuncion.nombreFuncion}.`;
                        } else {
                            console.warn("[IA Action] Workaround: JSON parseado no tiene la estructura esperada (actual).");
                        }
                    } catch (parseError) {
                        console.warn("[IA Action] Workaround: Error al parsear JSON encontrado en texto (actual).", parseError);
                    }
                }
            }

            if (!llamadaFuncion) {
                if (candidate?.finishReason === FinishReason.STOP || candidate?.finishReason === FinishReason.MAX_TOKENS) {
                    console.log("[IA Action] Generación finalizada con texto (o JSON no parseable) (actual).");
                } else if (candidate?.finishReason === FinishReason.SAFETY) {
                    console.error("[IA Action] Respuesta bloqueada por seguridad (actual).");
                    return { success: false, error: "La respuesta fue bloqueada por razones de seguridad." };
                } else {
                    console.warn(`[IA Action] Razón de finalización inesperada (actual): ${candidate?.finishReason}.`);
                    if (!respuestaTextual) {
                        return { success: false, error: `La IA no generó una respuesta válida (Razón: ${candidate?.finishReason || 'Desconocida'}).` };
                    }
                }
            }
        }

        const data: RespuestaAsistenteConHerramientas = {
            respuestaTextual: respuestaTextual ? respuestaTextual.trim() : null,
            llamadaFuncion: llamadaFuncion,
        };

        console.log("[IA Action] Resultado procesado final (actual):", data);
        return { success: true, data };

    } catch (error) {
        console.error("[IA Action] Error al interactuar con Gemini SDK:", error);
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
            descripcionTool: tareaDb.tareaFuncion?.descripcion,
            instruccionParaIA: tareaDb.instruccion,
            funcionHerramienta: funcionHerramienta,
            camposPersonalizadosRequeridos: camposPersonalizadosTarea.length > 0 ? camposPersonalizadosTarea : undefined,
        });
    }
    return tareasCapacidad;
}
