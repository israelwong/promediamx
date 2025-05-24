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
    Schema,
    Content, // Importar Content para tipar el historial correctamente
    FunctionCall, // Importar FunctionCall
    FunctionResponse, // Importar FunctionResponse
} from "@google/generative-ai";

import {
    GenerarRespuestaAsistenteConHerramientasInput,
    RespuestaAsistenteConHerramientas,
    TareaCapacidadIA,
    ParametroParaIA,
} from '@/app/admin/_lib/ia/ia.schemas';

import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';

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

function mapTipoParametroToSchemaType(tipoDatoOriginal: string): SchemaType {
    if (!tipoDatoOriginal) {
        console.warn(`[IA Actions] mapTipoParametroToSchemaType recibió un tipoDato nulo o undefined. Usando SchemaType.STRING.`);
        return SchemaType.STRING;
    }
    const tipo = tipoDatoOriginal.toLowerCase().trim();

    switch (tipo) {
        case 'string': // Si usas 'string' directamente
            return SchemaType.STRING;

        case 'number':        // Si usas 'number'
            return SchemaType.NUMBER;

        case 'integer':
            return SchemaType.INTEGER;

        case 'boolean':
            return SchemaType.BOOLEAN;

        case 'array':
            return SchemaType.ARRAY;
        default:
            console.warn(`[IA Actions] Tipo de parámetro NO MAPEADO explícitamente: '${tipoDatoOriginal}' (normalizado a '${tipo}'). Usando SchemaType.STRING como default.`);
            return SchemaType.STRING;
    }
}

function construirHerramientasParaGemini(tareas: TareaCapacidadIA[]): Tool[] | undefined {
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
                name: funcion.nombre,
                description: tarea.descripcionTool || funcion.descripcion || `Ejecuta la acción ${funcion.nombre}`,
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: Object.fromEntries(
                        Object.entries(properties).map(([key, value]) => [key, { ...value, type: value.type as SchemaType } as Schema])
                    ),
                    //! required: requiredParams.length > 0 ? requiredParams : undefined, 
                    //! omitido por estrategia
                    required: []
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

* **SI has hecho una pregunta de confirmación al usuario para una acción de una herramienta (ej. '¿Confirmas que deseas X?') y el usuario responde afirmativamente:**
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

        //! Herramientas para Gemini
        const tools = construirHerramientasParaGemini(input.tareasDisponibles);
        console.log("[IA Action] Herramientas DEFINITIVAS pasadas a Gemini:", JSON.stringify(tools, null, 2));

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

        // const chatHistory = input.historialConversacion.map(turn => ({
        //     role: (turn.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        //     parts: [{ text: turn.mensaje || "" }],
        // }));

        // --- INICIO DE LA MODIFICACIÓN AVANZADA PARA CONSTRUIR CHAT HISTORY ---
        const chatHistory: Content[] = [];
        for (let i = 0; i < input.historialConversacion.length; i++) {
            const turn = input.historialConversacion[i];

            // Ignorar roles 'agent' y 'system' del historial de ChatMessageItem para Gemini,
            // ya que Gemini espera 'user', 'model', o 'function' (o 'tool').
            if (turn.role === 'agent' || turn.role === 'system') {
                console.log(`[IA Action History Reconstructor] Ignorando turno con rol: ${turn.role}`);
                continue;
            }

            const geminiRole = (turn.role === 'user' ? 'user' : 'model') as 'user' | 'model';
            // const turnParts: Content['parts'] = [{ text: turn.mensaje || "" }]; // Default a texto

            if (geminiRole === 'model' && turn.mensaje) {
                let parsedFunctionCallFromHistory: FunctionCall | null = null;
                const jsonMatch = turn.mensaje.match(/```json\s*([\s\S]*?)\s*```/);

                if (jsonMatch && jsonMatch[1]) {
                    try {
                        const parsedJson = JSON.parse(jsonMatch[1]);
                        if (parsedJson.functionCall &&
                            typeof parsedJson.functionCall.name === 'string' &&
                            typeof parsedJson.functionCall.args === 'object') {
                            parsedFunctionCallFromHistory = parsedJson.functionCall as FunctionCall;
                        }
                    } catch { /* No es JSON válido, se tratará como texto */ }
                } else if (turn.mensaje.trim().startsWith('{"functionCall":')) {
                    try {
                        const parsedJson = JSON.parse(turn.mensaje.trim());
                        if (parsedJson.functionCall &&
                            typeof parsedJson.functionCall.name === 'string' &&
                            typeof parsedJson.functionCall.args === 'object') {
                            parsedFunctionCallFromHistory = parsedJson.functionCall as FunctionCall;
                        }
                    } catch { /* No es JSON válido, se tratará como texto */ }
                }

                if (parsedFunctionCallFromHistory) {
                    console.log(`[IA Action History Reconstructor] Historial: Turno del 'model' interpretado como functionCall: ${parsedFunctionCallFromHistory.name}`);
                    chatHistory.push({ role: 'model', parts: [{ functionCall: parsedFunctionCallFromHistory }] });

                    // INTENTO DE INFERIR FUNCTION_RESPONSE DEL SIGUIENTE MENSAJE DEL MODELO
                    // Esto es una heurística y depende de cómo tu dispatcher guarda los resultados.
                    if (i + 1 < input.historialConversacion.length) {
                        const nextTurn = input.historialConversacion[i + 1];
                        // Si el siguiente mensaje también es del 'assistant' (model) y NO es otra functionCall,
                        // lo asumimos como el resultado textual de la functionCall anterior.
                        if ((nextTurn.role === 'assistant') && nextTurn.mensaje) {
                            let nextTurnIsItselfAFunctionCall = false;
                            const nextJsonMatchAttempt = nextTurn.mensaje.match(/```json\s*([\s\S]*?)\s*```/);
                            if (nextJsonMatchAttempt && nextJsonMatchAttempt[1]) {
                                try { const p = JSON.parse(nextJsonMatchAttempt[1]); if (p.functionCall) nextTurnIsItselfAFunctionCall = true; } catch { }
                            } else if (nextTurn.mensaje.trim().startsWith('{"functionCall":')) {
                                try { const p = JSON.parse(nextTurn.mensaje.trim()); if (p.functionCall) nextTurnIsItselfAFunctionCall = true; } catch { }
                            }

                            if (!nextTurnIsItselfAFunctionCall) {
                                console.log(`[IA Action History Reconstructor] Historial: Asumiendo que el siguiente turno del 'model' es la functionResponse para ${parsedFunctionCallFromHistory.name}`);
                                const functionResponsePart: FunctionResponse = {
                                    name: parsedFunctionCallFromHistory.name,
                                    response: {
                                        // Gemini espera un objeto aquí. Si tu 'nextTurn.mensaje' es solo texto,
                                        // envuélvelo en una estructura, por ejemplo, { "content": "texto del mensaje" }
                                        // o { "messageForUser": "texto del mensaje" }
                                        // Esto es CRUCIAL y debe coincidir con lo que tus funciones realmente devuelven
                                        // y cómo quieres que la IA lo interprete.
                                        // Para este ejemplo, asumimos que el mensaje es el contenido principal.
                                        content: nextTurn.mensaje,
                                        // Podrías añadir más estructura si tus funciones devuelven objetos más complejos
                                        // y quieres que la IA los "vea" en el historial.
                                    }
                                };
                                chatHistory.push({ role: 'function', parts: [{ functionResponse: functionResponsePart }] });
                                i++; // Avanzamos el índice porque ya procesamos el siguiente turno
                                continue; // Pasamos al siguiente turno del bucle principal
                            }
                        }
                    }
                } else {
                    // Mensaje de texto normal del modelo
                    chatHistory.push({ role: 'model', parts: [{ text: turn.mensaje || "" }] });
                }
            } else if (geminiRole === 'user') {
                chatHistory.push({ role: 'user', parts: [{ text: turn.mensaje || "" }] });
            }
        }
        // --- FIN DE LA MODIFICACIÓN AVANZADA ---

        console.log("[IA Action] Historial RECONSTRUIDO para Gemini (v2):", JSON.stringify(chatHistory, null, 2));

        const chatSession = model.startChat({
            history: chatHistory,
        });

        console.log("[IA Action] Enviando mensaje a Gemini:", input.mensajeUsuarioActual);
        const result = await chatSession.sendMessage(input.mensajeUsuarioActual);
        const response = result.response;
        const candidate = response.candidates?.[0];

        console.log("[IA Action] Respuesta completa de Gemini:", JSON.stringify(response, null, 2));

        //! ***** variables para almacenar la respuesta textual y la llamada a función a devolver
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

            //! reemplazar con el texto de respuesta
            if (!respuestaTextual && llamadaFuncion) {
                respuestaTextual = `Entendido, dame un momento.`;
                // respuestaTextual = `Entendido, dame un momento. voy a proceder con la acción: ${llamadaFuncion.nombreFuncion}.`;
                console.log(llamadaFuncion.nombreFuncion)
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

                        // *** JSON ANIDADO ***
                        // Verificar si el JSON parseado contiene la clave 'functionCall'
                        // y si esa clave contiene 'name' y 'args'
                        if (parsedJson.functionCall &&
                            typeof parsedJson.functionCall === 'object' &&
                            parsedJson.functionCall !== null &&
                            typeof parsedJson.functionCall.name === 'string' &&
                            typeof parsedJson.functionCall.args === 'object' &&
                            parsedJson.functionCall.args !== null) {

                            console.warn("[IA Action] Workaround: Función recuperada desde JSON en texto (estructura anidada).");
                            llamadaFuncion = {
                                //! Asigna a llamadaFuncion
                                nombreFuncion: parsedJson.functionCall.name,
                                argumentos: parsedJson.functionCall.args as Record<string, unknown>,
                            };
                            // const funcionRecuperada = true; // Asegúrate de tener esta bandera si la usas
                            //!respuestaTextual
                            console.log(`[IA Action] Workaround - Función recuperada: ${llamadaFuncion.nombreFuncion}, Args:`, llamadaFuncion.argumentos);
                            respuestaTextual = `Entendido. Procesando tu solicitud para: ${llamadaFuncion.nombreFuncion}.`;
                            console.log("[IA Action] Workaround: respuestaTextual actualizada después de recuperar función desde JSON.");

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


export async function obtenerTareasCapacidadParaAsistente(
    asistenteId: string,
    tx: Prisma.TransactionClient // Prisma Client o Transaction Client
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
            const tf = tareaDb.tareaFuncion; // Alias para TareaFuncion

            // Mapear los nuevos TareaFuncionParametro a ParametroParaIA
            const parametrosFuncion: ParametroParaIA[] = tf.parametros.map(p => {
                // 'p' aquí es un objeto TareaFuncionParametro
                return {
                    nombre: p.nombre, // Este es el nombre snake_case para la IA
                    tipo: p.tipoDato,
                    descripcion: p.descripcionParaIA, // Descripción específica para la IA
                    esObligatorio: p.esObligatorio,
                };
            });

            funcionHerramienta = {
                nombre: tf.nombre ?? '',
                descripcion: tf.descripcion,
                parametros: parametrosFuncion,
            };
        }

        // Mapeo de campos personalizados (sin cambios si la lógica se mantiene)
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
                    // Usar crmCampoPersonalizado.descripcionParaIA si existe, o crmCampoPersonalizado.nombre como fallback
                    descripcion: cp.crmCampoPersonalizado.descripcionParaIA || cp.crmCampoPersonalizado.nombre,
                    esObligatorio: cp.esRequerido,
                };
            });

        tareasCapacidad.push({
            id: tareaDb.id,
            nombre: tareaDb.nombre, // Nombre de la Tarea
            descripcionTool: tareaDb.tareaFuncion?.descripcion,
            instruccionParaIA: tareaDb.instruccion,
            funcionHerramienta: funcionHerramienta,
            camposPersonalizadosRequeridos: camposPersonalizadosTarea.length > 0 ? camposPersonalizadosTarea : undefined,
        });
    }
    return tareasCapacidad;
}