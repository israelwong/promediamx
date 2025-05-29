// ruta: 'app/admin/_lib/actions/webchat_test/chatTest.actions.ts'
'use server';

import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    IniciarConversacionWebchatInputSchema,
    type IniciarConversacionWebchatInput,
    type IniciarConversacionWebchatOutput,
    EnviarMensajeWebchatInputSchema,
    type EnviarMensajeWebchatInput,
    type EnviarMensajeWebchatOutput,
    type HistorialTurnoParaGemini,
} from './chatTest.schemas';

import { ChatMessageItemSchema, type ChatMessageItem } from '@/app/admin/_lib/schemas/sharedCommon.schemas';

import {
    generarRespuestaAsistente,
    obtenerTareasCapacidadParaAsistente
} from '@/app/admin/_lib/ia/ia.actions';
import { dispatchTareaEjecutadaAction } from '../../ia/funcionesEjecucion.actions';
import { InteraccionParteTipo, Prisma } from '@prisma/client';

// --- obtenerUltimosMensajesAction ---
export async function obtenerUltimosMensajesAction(
    conversationId: string,
    limit: number = 50
): Promise<ActionResult<ChatMessageItem[]>> {
    if (!conversationId) {
        return { success: false, error: 'El ID de la conversación es requerido.' };
    }
    try {
        const interacciones = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId },
            select: {
                id: true,
                conversacionId: true,
                role: true,
                mensajeTexto: true,
                parteTipo: true,
                functionCallNombre: true,
                functionCallArgs: true,
                functionResponseData: true,
                uiComponentPayload: true,     // <-- ¡¡CRUCIAL!! Seleccionar el nuevo campo
                canalInteraccion: true, // <-- AÑADIR AL SELECT
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                agenteCrmId: true,
                agenteCrm: { select: { id: true, nombre: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: limit > 0 ? limit : undefined,
        });
        const interaccionesMapeadas = interacciones.map(i => {

            let parsedArgs: Record<string, unknown> | null = null;

            if (i.functionCallArgs && typeof i.functionCallArgs === 'object') {
                parsedArgs = i.functionCallArgs as Record<string, unknown>;
            } else if (typeof i.functionCallArgs === 'string') {
                try { parsedArgs = JSON.parse(i.functionCallArgs); } catch (e) { console.warn("No se pudo parsear functionCallArgs para interaccion ID:", i.id, e); }
            }

            let parsedResponseData: Record<string, unknown> | null = null;
            if (i.functionResponseData && typeof i.functionResponseData === 'object') {
                parsedResponseData = i.functionResponseData as Record<string, unknown>;
            } else if (typeof i.functionResponseData === 'string') {
                try { parsedResponseData = JSON.parse(i.functionResponseData); } catch (e) { console.warn("No se pudo parsear functionResponseData para interaccion ID:", i.id, e); }
            }

            return {
                ...i,
                functionCallArgs: parsedArgs,
                functionResponseData: parsedResponseData,
                uiComponentPayload: i.uiComponentPayload as Record<string, unknown> | null,
                canalInteraccion: i.canalInteraccion, // <-- AÑADIR AL MAPEO
            };
        });
        const validationResult = z.array(ChatMessageItemSchema).safeParse(interaccionesMapeadas);
        if (!validationResult.success) {
            console.error("Error Zod en obtenerUltimosMensajesAction:", validationResult.error.flatten().fieldErrors);
            return { success: false, error: "Formato de mensajes inesperado al cargar historial." };
        }
        return { success: true, data: validationResult.data };
    } catch (error: unknown) {
        console.error(`Error en obtenerUltimosMensajesAction para conv ${conversationId}:`, error);
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}


// --- iniciarConversacionWebchatAction ---
export async function iniciarConversacionWebchatAction(
    input: IniciarConversacionWebchatInput
): Promise<ActionResult<IniciarConversacionWebchatOutput>> {
    const validationResult = IniciarConversacionWebchatInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }
    const { asistenteId, mensajeInicial, remitenteIdWeb, nombreRemitenteSugerido } = validationResult.data;

    let initialDbData: {
        conversationIdVar: string;
        leadIdVar: string;
        mensajeUsuarioGuardadoVar?: ChatMessageItem;
        asistenteNombre: string;
        negocioNombre: string; // Nombre de la variable que se desestructura
        asistenteDescripcion: string | null; // Nombre de la variable que se desestructura
    } | null = null;

    try {
        const txResult = await prisma.$transaction(async (tx) => {
            const asistente = await tx.asistenteVirtual.findUnique({
                where: { id: asistenteId },
                include: { negocio: { include: { CRM: true } } }
            });
            if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
                throw new Error(`Asistente, Negocio o CRM no encontrado para Asistente ID: ${asistenteId}`);
            }
            const crmId = asistente.negocio.CRM.id;

            let canalWebchat = await tx.canalCRM.findFirst({ where: { crmId: crmId, nombre: "Webchat" } });
            if (!canalWebchat) {
                canalWebchat = await tx.canalCRM.create({ data: { crmId: crmId, nombre: "Webchat", status: 'activo' } });
            }
            let lead = await tx.lead.findFirst({ where: { crmId: crmId, jsonParams: { path: ['webchatUserId'], equals: remitenteIdWeb } } });
            if (!lead) {
                const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: crmId, status: 'activo' }, orderBy: { orden: 'asc' } });
                if (!primerPipeline) throw new Error("Pipeline inicial no configurado para el CRM.");
                lead = await tx.lead.create({
                    data: {
                        crmId: crmId,
                        nombre: nombreRemitenteSugerido || `Usuario Webchat ${remitenteIdWeb.substring(0, 8)}`,
                        canalId: canalWebchat.id,
                        status: 'nuevo',
                        pipelineId: primerPipeline.id,
                        jsonParams: { webchatUserId: remitenteIdWeb }
                    },
                });
            }
            const nuevaConversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta' } });
            const interaccionUsuarioData: Prisma.InteraccionCreateInput = {
                conversacion: { connect: { id: nuevaConversacion.id } },
                role: 'user',
                mensajeTexto: mensajeInicial,
                parteTipo: InteraccionParteTipo.TEXT,
                canalInteraccion: "webchat", // <-- AÑADIR (o "webchat" genérico)
            };
            const interaccionUsuario = await tx.interaccion.create({ data: interaccionUsuarioData });

            // Parsear después de crear, asegurando que los campos de Prisma (como createdAt) estén presentes
            const parsedUserMessage = ChatMessageItemSchema.parse({
                ...interaccionUsuario,
                functionCallArgs: null, // Asegurar que estos campos sean null si no aplican
                functionResponseData: null,
            });

            return {
                conversationIdVar: nuevaConversacion.id,
                leadIdVar: lead.id,
                mensajeUsuarioGuardadoVar: parsedUserMessage,
                asistenteNombre: asistente.nombre,
                negocioNombre: asistente.negocio.nombre, // Coincide con la desestructuración
                asistenteDescripcion: asistente.descripcion, // Coincide con la desestructuración
            };
        });
        initialDbData = txResult;

    } catch (error: unknown) {
        console.error('[ChatTest Actions Iniciar] Error en la transacción inicial de DB:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error al iniciar la conversación en la base de datos.';
        if (errorMessage.includes("Pipeline inicial no configurado")) {
            return { success: false, error: "Error de configuración: No hay un pipeline inicial definido para el CRM." };
        }
        return { success: false, error: errorMessage };
    }

    if (!initialDbData) {
        return { success: false, error: 'Fallo la creación inicial de la conversación.' };
    }

    // Usar los nombres de variables correctos de la desestructuración
    const { conversationIdVar, leadIdVar, mensajeUsuarioGuardadoVar,
        asistenteNombre, negocioNombre, asistenteDescripcion } = initialDbData;

    let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, prisma);
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: [],
            mensajeUsuarioActual: mensajeInicial,
            contextoAsistente: {
                nombreAsistente: asistenteNombre, // Usar la variable correcta
                nombreNegocio: negocioNombre,     // Usar la variable correcta
                descripcionAsistente: asistenteDescripcion // Usar la variable correcta
            },
            tareasDisponibles: tareasDisponibles
        });

        if (resultadoIA.success && resultadoIA.data) {
            const respuestaIA = resultadoIA.data;
            let respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
            let iaMsgData: Prisma.InteraccionCreateInput;

            if (respuestaIA.llamadaFuncion) {
                // console.log('[ChatTest Actions Iniciar] IA solicitó FunctionCall:', respuestaIA.llamadaFuncion.nombreFuncion);
                iaMsgData = {
                    conversacion: { connect: { id: conversationIdVar } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.FUNCTION_CALL,
                    functionCallNombre: respuestaIA.llamadaFuncion.nombreFuncion,
                    functionCallArgs: respuestaIA.llamadaFuncion.argumentos as Prisma.InputJsonValue,
                    mensajeTexto: respuestaAsistenteTextoVar,
                };
                if (!respuestaAsistenteTextoVar && respuestaIA.llamadaFuncion.nombreFuncion) {
                    respuestaAsistenteTextoVar = `Entendido. Procesando: ${respuestaIA.llamadaFuncion.nombreFuncion}.`;
                    iaMsgData.mensajeTexto = respuestaAsistenteTextoVar;
                }
            } else if (respuestaAsistenteTextoVar) {
                iaMsgData = {
                    conversacion: { connect: { id: conversationIdVar } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.TEXT,
                    mensajeTexto: respuestaAsistenteTextoVar,
                };
            } else {
                iaMsgData = {
                    conversacion: { connect: { id: conversationIdVar } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.TEXT,
                    mensajeTexto: '(Respuesta de IA vacía)',
                };
            }
            const iaMsg = await prisma.interaccion.create({ data: iaMsgData });
            mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse({
                ...iaMsg,
                functionCallArgs: iaMsg.functionCallArgs ? iaMsg.functionCallArgs as Record<string, unknown> : null,
                functionResponseData: iaMsg.functionResponseData ? iaMsg.functionResponseData as Record<string, unknown> : null,
            });

            if (respuestaIA.llamadaFuncion) {
                const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombre === respuestaIA.llamadaFuncion?.nombreFuncion);
                if (tareaCoincidente) {
                    const te = await prisma.tareaEjecutada.create({
                        data: {
                            asistenteVirtualId: asistenteId,
                            tareaId: tareaCoincidente.id,
                            fechaEjecutada: new Date(),
                            metadata: JSON.stringify({
                                conversacionId: conversationIdVar, leadId: leadIdVar, asistenteVirtualId: asistenteId,
                                funcionLlamada: respuestaIA.llamadaFuncion.nombreFuncion,
                                argumentos: respuestaIA.llamadaFuncion.argumentos,
                                canalNombre: 'webchat'
                            })
                        }
                    });
                    tareaEjecutadaCreadaId = te.id;
                }
            }
        } else {
            await prisma.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'system', mensajeTexto: `Error IA: ${resultadoIA.error || 'Desconocido'}`, parteTipo: InteraccionParteTipo.TEXT } });
        }
        await prisma.conversacion.update({ where: { id: conversationIdVar }, data: { updatedAt: new Date() } });

        if (tareaEjecutadaCreadaId) {
            await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
        }

        return {
            success: true,
            data: {
                conversationId: conversationIdVar,
                interaccionUsuarioId: mensajeUsuarioGuardadoVar!.id,
                leadId: leadIdVar,
                mensajeUsuario: mensajeUsuarioGuardadoVar,
                mensajeAsistente: mensajeAsistenteGuardadoVar,
                mensajeResultadoFuncion: null
            }
        };
    } catch (error: unknown) {
        console.error('[ChatTest Actions Iniciar] Error después de la transacción inicial o en IA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error interno post-transacción.';
        if (initialDbData && initialDbData.mensajeUsuarioGuardadoVar) { // Asegurar que mensajeUsuarioGuardadoVar exista
            return {
                success: false,
                error: `Error procesando respuesta del asistente: ${errorMessage}`,
                data: {
                    conversationId: initialDbData.conversationIdVar,
                    interaccionUsuarioId: initialDbData.mensajeUsuarioGuardadoVar.id,
                    leadId: initialDbData.leadIdVar,
                    mensajeUsuario: initialDbData.mensajeUsuarioGuardadoVar,
                    mensajeAsistente: undefined,
                    mensajeResultadoFuncion: null
                }
            };
        }
        return { success: false, error: errorMessage };
    }
}


// --- enviarMensajeWebchatAction ---
export async function enviarMensajeWebchatAction(
    input: EnviarMensajeWebchatInput
): Promise<ActionResult<EnviarMensajeWebchatOutput>> {
    const validationResult = EnviarMensajeWebchatInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }
    const { conversationId, mensaje } = validationResult.data;

    let mensajeUsuarioGuardadoVar: ChatMessageItem | undefined;
    let conversacionData: {
        asistenteId: string;
        estadoActual: string;
        asistenteNombre: string; // Nombre de la variable que se desestructura
        negocioNombre: string;   // Nombre de la variable que se desestructura
        asistenteDescripcion: string | null; // Nombre de la variable que se desestructura
        leadId: string | null;
    } | null = null;

    try {
        const txResult = await prisma.$transaction(async (tx) => {
            const interaccionUsuarioData: Prisma.InteraccionCreateInput = {
                conversacion: { connect: { id: conversationId } },
                role: 'user',
                mensajeTexto: mensaje,
                parteTipo: InteraccionParteTipo.TEXT,
                canalInteraccion: "webchat", // <-- AÑADIR (o "webchat" genérico)
            };
            const interaccionUsuario = await tx.interaccion.create({ data: interaccionUsuarioData });
            const parsedUserMessage = ChatMessageItemSchema.parse({
                ...interaccionUsuario,
                functionCallArgs: null,
                functionResponseData: null,
            });

            const conversacion = await tx.conversacion.findUnique({
                where: { id: conversationId },
                include: { asistenteVirtual: { include: { negocio: true } }, lead: true },
            });
            if (!conversacion || !conversacion.asistenteVirtual || !conversacion.asistenteVirtual.negocio || !conversacion.lead) {
                throw new Error("Conversación, asistente o lead no encontrado.");
            }
            await tx.conversacion.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

            return {
                mensajeUsuarioGuardadoVar: parsedUserMessage,
                asistenteId: conversacion.asistenteVirtualId!,
                estadoActual: conversacion.status,
                asistenteNombre: conversacion.asistenteVirtual.nombre,
                negocioNombre: conversacion.asistenteVirtual.negocio.nombre, // Coincide con la desestructuración
                asistenteDescripcion: conversacion.asistenteVirtual.descripcion, // Coincide con la desestructuración
                leadId: conversacion.leadId,
            };
        });
        mensajeUsuarioGuardadoVar = txResult.mensajeUsuarioGuardadoVar;
        conversacionData = txResult;

    } catch (error: unknown) {
        console.error('[ChatTest Actions Enviar] Error en la transacción inicial de DB:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error al guardar el mensaje del usuario.' };
    }

    if (!conversacionData) {
        return { success: false, error: 'Fallo al obtener datos de conversación post-transacción.' };
    }

    // Usar los nombres de variables correctos de la desestructuración
    const { asistenteId, estadoActual,
        asistenteNombre, negocioNombre, asistenteDescripcion, leadId } = conversacionData;

    let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        if (estadoActual === 'en_espera_agente' || estadoActual === 'hitl_activo') {
            // console.log(`[ChatTest Actions Enviar] Conversación ${conversationId} en espera de agente. No se llama a IA.`);
            return {
                success: true,
                data: {
                    interaccionUsuarioId: mensajeUsuarioGuardadoVar!.id,
                    mensajeUsuario: mensajeUsuarioGuardadoVar,
                    mensajeAsistente: undefined,
                    mensajeResultadoFuncion: null
                }
            };
        }

        const historialInteraccionesDb = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId },
            orderBy: { createdAt: 'asc' },
            take: 20,
            select: {
                id: true, role: true, parteTipo: true, mensajeTexto: true,
                functionCallNombre: true, functionCallArgs: true, functionResponseData: true,
            }
        });

        const historialParaIA: HistorialTurnoParaGemini[] = historialInteraccionesDb.map(dbTurn => {
            const parts: HistorialTurnoParaGemini['parts'] = [];
            let roleForGemini: HistorialTurnoParaGemini['role'] | null = null;

            if (dbTurn.role === 'user') {
                roleForGemini = 'user';
                if (dbTurn.mensajeTexto) parts.push({ text: dbTurn.mensajeTexto });
            } else if (dbTurn.role === 'assistant') {
                roleForGemini = 'model';
                if (dbTurn.parteTipo === 'FUNCTION_CALL' && dbTurn.functionCallNombre && dbTurn.functionCallArgs) {
                    parts.push({ functionCall: { name: dbTurn.functionCallNombre, args: dbTurn.functionCallArgs as Record<string, unknown> || {} } });
                } else if (dbTurn.mensajeTexto) {
                    parts.push({ text: dbTurn.mensajeTexto });
                }
            } else if (dbTurn.role === 'function') { // Asumiendo que guardas las respuestas de función con este rol
                roleForGemini = 'function';
                if (dbTurn.parteTipo === 'FUNCTION_RESPONSE' && dbTurn.functionCallNombre && dbTurn.functionResponseData) {
                    parts.push({ functionResponse: { name: dbTurn.functionCallNombre, response: dbTurn.functionResponseData as Record<string, unknown> || {} } });
                } else if (dbTurn.mensajeTexto) { // Fallback
                    parts.push({ functionResponse: { name: dbTurn.functionCallNombre || "unknownFunctionExecuted", response: { content: dbTurn.mensajeTexto } } });
                }
            }

            if (roleForGemini && parts.length > 0) {
                return { role: roleForGemini, parts };
            }
            return null; // Para filtrar turnos no válidos
        }).filter(Boolean) as HistorialTurnoParaGemini[];


        // console.log(`[ChatTest Actions Enviar] Historial para IA (últimos 5) para conv ${conversationId}:`, JSON.stringify(historialParaIA.slice(-5), null, 2));

        const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, prisma);

        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: historialParaIA,
            mensajeUsuarioActual: mensaje,
            contextoAsistente: {
                nombreAsistente: asistenteNombre, // Usar la variable correcta
                nombreNegocio: negocioNombre,     // Usar la variable correcta
                descripcionAsistente: asistenteDescripcion // Usar la variable correcta
            },
            tareasDisponibles: tareasDisponibles,
        });

        if (resultadoIA.success && resultadoIA.data) {
            const respuestaIA = resultadoIA.data;
            let respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
            let iaMsgData: Prisma.InteraccionCreateInput;

            if (respuestaIA.llamadaFuncion) {
                // console.log('[ChatTest Actions Enviar] IA solicitó FunctionCall:', respuestaIA.llamadaFuncion.nombreFuncion);
                iaMsgData = {
                    conversacion: { connect: { id: conversationId } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.FUNCTION_CALL,
                    functionCallNombre: respuestaIA.llamadaFuncion.nombreFuncion,
                    functionCallArgs: respuestaIA.llamadaFuncion.argumentos as Prisma.InputJsonValue,
                    mensajeTexto: respuestaAsistenteTextoVar,
                };
                if (!respuestaAsistenteTextoVar && respuestaIA.llamadaFuncion.nombreFuncion) {
                    respuestaAsistenteTextoVar = `Entendido. Procesando: ${respuestaIA.llamadaFuncion.nombreFuncion}.`;
                    iaMsgData.mensajeTexto = respuestaAsistenteTextoVar;
                }
            } else if (respuestaAsistenteTextoVar) {
                iaMsgData = {
                    conversacion: { connect: { id: conversationId } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.TEXT,
                    mensajeTexto: respuestaAsistenteTextoVar,
                };
            } else {
                iaMsgData = {
                    conversacion: { connect: { id: conversationId } },
                    role: 'assistant', parteTipo: InteraccionParteTipo.TEXT,
                    mensajeTexto: '(Respuesta de IA vacía)',
                };
            }
            const iaMsg = await prisma.interaccion.create({ data: iaMsgData });
            mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse({
                ...iaMsg,
                functionCallArgs: iaMsg.functionCallArgs ? iaMsg.functionCallArgs as Record<string, unknown> : null,
                functionResponseData: iaMsg.functionResponseData ? iaMsg.functionResponseData as Record<string, unknown> : null,
            });

            if (respuestaIA.llamadaFuncion) {
                const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombre === respuestaIA.llamadaFuncion?.nombreFuncion);
                if (tareaCoincidente) {
                    const te = await prisma.tareaEjecutada.create({
                        data: {
                            asistenteVirtualId: asistenteId,
                            tareaId: tareaCoincidente.id,
                            fechaEjecutada: new Date(),
                            metadata: JSON.stringify({
                                conversacionId: conversationId, leadId: leadId, asistenteVirtualId: asistenteId,
                                funcionLlamada: respuestaIA.llamadaFuncion.nombreFuncion,
                                argumentos: respuestaIA.llamadaFuncion.argumentos,
                                canalNombre: 'webchat'
                            })
                        }
                    });
                    tareaEjecutadaCreadaId = te.id;
                }
            }
        } else {
            await prisma.interaccion.create({ data: { conversacionId: conversationId, role: 'system', mensajeTexto: `Error IA: ${resultadoIA.error || 'Desconocido'}`, parteTipo: InteraccionParteTipo.TEXT } });
        }
        await prisma.conversacion.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

        if (tareaEjecutadaCreadaId) {
            await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
        }

        return {
            success: true,
            data: {
                interaccionUsuarioId: mensajeUsuarioGuardadoVar!.id,
                mensajeUsuario: mensajeUsuarioGuardadoVar,
                mensajeAsistente: mensajeAsistenteGuardadoVar,
                mensajeResultadoFuncion: null
            }
        };
    } catch (error: unknown) {
        console.error('[ChatTest Actions Enviar] Error después de la transacción inicial o en IA:', error);
        if (mensajeUsuarioGuardadoVar) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error interno al procesar respuesta del asistente.',
                data: {
                    interaccionUsuarioId: mensajeUsuarioGuardadoVar.id,
                    mensajeUsuario: mensajeUsuarioGuardadoVar,
                    mensajeAsistente: undefined,
                    mensajeResultadoFuncion: null
                }
            };
        }
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al enviar mensaje.' };
    }
}

