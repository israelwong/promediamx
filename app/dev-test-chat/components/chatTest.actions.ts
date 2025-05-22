'use server';

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta la ruta
import { z } from 'zod';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    IniciarConversacionWebchatInputSchema,
    type IniciarConversacionWebchatInput,
    type IniciarConversacionWebchatOutput,
    EnviarMensajeWebchatInputSchema,
    type EnviarMensajeWebchatInput,
    type EnviarMensajeWebchatOutput,
    ChatMessageItemSchema, // Para validar la salida de obtenerUltimosMensajes
    type ChatMessageItem
} from './chatTest.schemas';

// Importar las acciones de IA y ejecución de funciones
import {
    generarRespuestaAsistente,
    obtenerTareasCapacidadParaAsistente
} from '@/app/admin/_lib/ia/ia.actions';
import { dispatchTareaEjecutadaAction } from '@/app/admin/_lib/ia/funcionesEjecucion.actions';
import { Prisma } from '@prisma/client'; // Para tipos de Prisma como TransactionClient

// --- obtenerUltimosMensajesAction (Refactorizada) ---
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
                mensaje: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                agenteCrmId: true, // Necesario si ChatMessageItemSchema lo espera
                agenteCrm: { select: { id: true, nombre: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: limit > 0 ? limit : undefined,
        });

        // Validar salida con Zod
        const validationResult = z.array(ChatMessageItemSchema).safeParse(interacciones);
        if (!validationResult.success) {
            console.error("Error Zod en obtenerUltimosMensajesAction:", validationResult.error.flatten());
            return { success: false, error: "Formato de mensajes inesperado." };
        }
        return { success: true, data: validationResult.data };
    } catch (error: unknown) {
        console.error(`Error en obtenerUltimosMensajesAction para conv ${conversationId}:`, error);
        return { success: false, error: 'No se pudieron cargar los mensajes.' };
    }
}

// --- iniciarConversacionWebchatAction (Refactorizada) ---
// (La lógica interna es similar a tu versión original en crmConversacion.actions.ts,
// pero con validación Zod al inicio y ActionResult al final)
export async function iniciarConversacionWebchatAction(
    input: IniciarConversacionWebchatInput
): Promise<ActionResult<IniciarConversacionWebchatOutput>> {

    const validationResult = IniciarConversacionWebchatInputSchema.safeParse(input);

    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }

    const { asistenteId, mensajeInicial, remitenteIdWeb, nombreRemitenteSugerido } = validationResult.data;

    let tareaEjecutadaCreadaId: string | null = null; // Para el dispatcher

    try {
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteId },
            include: { negocio: { include: { CRM: true } } }
        });

        if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
            return { success: false, error: `Asistente, Negocio o CRM no encontrado para Asistente ID: ${asistenteId}` };
        }

        const crmId = asistente.negocio.CRM.id;
        const negocioNombre = asistente.negocio.nombre;

        // Variables para la respuesta
        let leadIdVar: string = '';
        let conversationIdVar: string = '';
        let mensajeUsuarioGuardadoVar: ChatMessageItem | undefined;
        let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
        let mensajeResultadoFuncionVar: ChatMessageItem | null = null;

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Lógica para obtener/crear canalWebchatId (como en tu original)
            let canalWebchat = await tx.canalCRM.findFirst({ where: { crmId: crmId, nombre: "Webchat" } });
            if (!canalWebchat) {
                canalWebchat = await tx.canalCRM.create({ data: { crmId: crmId, nombre: "Webchat", status: 'activo' } });
            }
            const canalWebchatId = canalWebchat.id;

            // Lógica para obtener/crear Lead (como en tu original)
            let lead = await tx.lead.findFirst({ where: { crmId: crmId, jsonParams: { path: ['webchatUserId'], equals: remitenteIdWeb } } });
            if (!lead) {
                const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: crmId, status: 'activo' }, orderBy: { orden: 'asc' } });
                if (!primerPipeline) throw new Error("Pipeline inicial no configurado para el CRM.");
                lead = await tx.lead.create({
                    data: {
                        crmId: crmId,
                        nombre: nombreRemitenteSugerido || `Usuario Webchat ${remitenteIdWeb.substring(0, 8)}`,
                        canalId: canalWebchatId,
                        status: 'nuevo',
                        pipelineId: primerPipeline.id,
                        jsonParams: { webchatUserId: remitenteIdWeb }
                    },
                });
            }
            leadIdVar = lead.id;

            // Crear Conversación e Interacción de Usuario
            const nuevaConversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta' } });
            conversationIdVar = nuevaConversacion.id;
            const interaccionUsuario = await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'user', mensaje: mensajeInicial } });
            mensajeUsuarioGuardadoVar = ChatMessageItemSchema.parse(interaccionUsuario); // Validar/transformar

            // Obtener Tareas y llamar a IA (como en tu original)
            const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistente.id, tx);

            //! Generar respuesta IA y obtener función a ejecutar
            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: [], // Es el primer mensaje
                mensajeUsuarioActual: mensajeInicial,
                contextoAsistente: { /* ... */ nombreAsistente: asistente.nombre, nombreNegocio: negocioNombre },
                tareasDisponibles: tareasDisponibles
            });

            if (resultadoIA.success && resultadoIA.data) {
                const respuestaIA = resultadoIA.data;
                let respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;

                if (respuestaAsistenteTextoVar) {
                    const iaMsg = await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'assistant', mensaje: respuestaAsistenteTextoVar } });
                    mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse(iaMsg);
                }

                if (respuestaIA.llamadaFuncion) {
                    const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombre === respuestaIA.llamadaFuncion?.nombreFuncion); // Usar nombre nuevo
                    if (tareaCoincidente) {
                        const te = await tx.tareaEjecutada.create({
                            data: { /* ... como en tu original, usando respuestaIA.llamadaFuncion ... */
                                asistenteVirtualId: asistente.id,
                                tareaId: tareaCoincidente.id,
                                fechaEjecutada: new Date(),
                                metadata: JSON.stringify({
                                    conversacionId: conversationIdVar,
                                    leadId: leadIdVar,
                                    asistenteVirtualId: asistente.id,
                                    funcionLlamada: respuestaIA.llamadaFuncion.nombreFuncion,
                                    argumentos: respuestaIA.llamadaFuncion.argumentos,
                                    canalNombre: 'webchat'//! revissar
                                })
                            }
                        });
                        tareaEjecutadaCreadaId = te.id;
                        if (!respuestaAsistenteTextoVar) { // Mensaje de "procesando" si no hubo texto
                            respuestaAsistenteTextoVar = `Entendido. Procesando: ${respuestaIA.llamadaFuncion.nombreFuncion}.`;
                            const iaMsgProcesando = await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'assistant', mensaje: respuestaAsistenteTextoVar } });
                            mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse(iaMsgProcesando);
                        }
                    }
                }
            } else {
                await tx.interaccion.create({ data: { conversacionId: conversationIdVar, role: 'system', mensaje: `Error IA: ${resultadoIA.error || 'Desconocido'}` } });
            }
            await tx.conversacion.update({ where: { id: conversationIdVar }, data: { updatedAt: new Date() } });
        }); // Fin de la transacción

        if (tareaEjecutadaCreadaId) {
            const dispatchResult = await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
            if (dispatchResult.success && dispatchResult.data) {
                mensajeResultadoFuncionVar = ChatMessageItemSchema.parse(dispatchResult.data);
            }
        }

        return {
            success: true,
            data: {
                conversationId: conversationIdVar,
                interaccionUsuarioId: mensajeUsuarioGuardadoVar!.id, // Asumimos que se creó
                leadId: leadIdVar,
                mensajeUsuario: mensajeUsuarioGuardadoVar,
                mensajeAsistente: mensajeAsistenteGuardadoVar,
                mensajeResultadoFuncion: mensajeResultadoFuncionVar
            }
        };
    } catch (error: unknown) {
        // ... (manejo de error como en tu original) ...
        console.error('[ChatTest Actions] Error en iniciarConversacionWebchatAction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno.' };
    }
}


// --- enviarMensajeWebchatAction (Refactorizada) ---
// (Similar a iniciarConversacionWebchatAction en estructura de validación y retorno)
export async function enviarMensajeWebchatAction(
    input: EnviarMensajeWebchatInput
): Promise<ActionResult<EnviarMensajeWebchatOutput>> {

    const validationResult = EnviarMensajeWebchatInputSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }
    const { conversationId, mensaje } = validationResult.data; // remitenteIdWeb no se usa mucho después de iniciar si ya tenemos leadId

    let tareaEjecutadaCreadaId: string | null = null;

    try {
        const conversacion = await prisma.conversacion.findUnique({
            where: { id: conversationId },
            include: { asistenteVirtual: { include: { negocio: true } }, lead: true },
        });
        if (!conversacion || !conversacion.asistenteVirtual || !conversacion.asistenteVirtual.negocio || !conversacion.lead) {
            return { success: false, error: "Conversación, asistente o lead no encontrado." };
        }
        const asistenteId = conversacion.asistenteVirtualId!;
        const estadoActual = conversacion.status;

        // Variables para la respuesta
        let mensajeUsuarioGuardadoVar: ChatMessageItem | undefined;
        let mensajeAsistenteGuardadoVar: ChatMessageItem | undefined;
        let mensajeResultadoFuncionVar: ChatMessageItem | null = null;


        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const interaccionUsuario = await tx.interaccion.create({ data: { conversacionId: conversationId, role: 'user', mensaje: mensaje } });
            mensajeUsuarioGuardadoVar = ChatMessageItemSchema.parse(interaccionUsuario);

            if (estadoActual === 'en_espera_agente' || estadoActual === 'hitl_activo') {
                await tx.conversacion.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
                return; // No llamar a IA
            }

            const historialInteracciones = await tx.interaccion.findMany({ where: { conversacionId: conversationId }, orderBy: { createdAt: 'asc' }, take: 20 });
            const historialParaIA = historialInteracciones.map(i => ({ role: i.role as ChatMessageItem['role'], mensaje: i.mensaje }));
            const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, tx);

            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: historialParaIA.filter(h => h.role !== 'system'),
                mensajeUsuarioActual: mensaje,
                contextoAsistente: {
                    nombreAsistente: conversacion.asistenteVirtual ? conversacion.asistenteVirtual.nombre : '',
                    nombreNegocio: conversacion.asistenteVirtual && conversacion.asistenteVirtual.negocio ? conversacion.asistenteVirtual.negocio.nombre : ''
                },
                tareasDisponibles: tareasDisponibles,
            });

            if (resultadoIA.success && resultadoIA.data) {
                const respuestaIA = resultadoIA.data;
                let respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
                if (respuestaAsistenteTextoVar) {
                    const iaMsg = await tx.interaccion.create({ data: { conversacionId: conversationId, role: 'assistant', mensaje: respuestaAsistenteTextoVar } });
                    mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse(iaMsg);
                }
                if (respuestaIA.llamadaFuncion) {
                    const tareaCoincidente = tareasDisponibles.find(t => t.funcionHerramienta?.nombre === respuestaIA.llamadaFuncion?.nombreFuncion);
                    if (tareaCoincidente) {
                        const te = await tx.tareaEjecutada.create({
                            data: {
                                asistenteVirtualId: asistenteId,
                                tareaId: tareaCoincidente.id,
                                fechaEjecutada: new Date(),
                                metadata: JSON.stringify({
                                    conversacionId: conversationId,
                                    leadId: conversacion.leadId,
                                    asistenteVirtualId: asistenteId,
                                    funcionLlamada: respuestaIA.llamadaFuncion.nombreFuncion,
                                    argumentos: respuestaIA.llamadaFuncion.argumentos,
                                    canalNombre: 'webchat'//! revissar
                                })
                            }
                        });
                        tareaEjecutadaCreadaId = te.id;
                        if (!respuestaAsistenteTextoVar) {
                            respuestaAsistenteTextoVar = `Entendido. Procesando: ${respuestaIA.llamadaFuncion.nombreFuncion}.`;
                            const iaMsgProcesando = await tx.interaccion.create({ data: { conversacionId: conversationId, role: 'assistant', mensaje: respuestaAsistenteTextoVar } });
                            mensajeAsistenteGuardadoVar = ChatMessageItemSchema.parse(iaMsgProcesando);
                        }
                    }
                }
            } else {
                await tx.interaccion.create({ data: { conversacionId: conversationId, role: 'system', mensaje: `Error IA: ${resultadoIA.error || 'Desconocido'}` } });
            }
            await tx.conversacion.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        }); // Fin de la transacción

        if (tareaEjecutadaCreadaId) {
            const dispatchResult = await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
            if (dispatchResult.success && dispatchResult.data) {
                mensajeResultadoFuncionVar = ChatMessageItemSchema.parse(dispatchResult.data);
            }
        }

        return {
            success: true,
            data: {
                interaccionUsuarioId: mensajeUsuarioGuardadoVar!.id,
                mensajeUsuario: mensajeUsuarioGuardadoVar,
                mensajeAsistente: mensajeAsistenteGuardadoVar,
                mensajeResultadoFuncion: mensajeResultadoFuncionVar
                // respuestaAsistente y interaccionAsistenteId podrían deducirse de mensajeAsistente
            }
        };
    } catch (error: unknown) {
        // ... (manejo de error)
        console.error('[ChatTest Actions] Error en enviarMensajeWebchatAction:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al enviar mensaje.' };
    }
}