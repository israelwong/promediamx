// app/admin/_lib/actions/whatsapp/whatsapp.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ProcesarMensajeWhatsAppInputSchema,
    type ProcesarMensajeWhatsAppInput,
    type ProcesarMensajeWhatsAppOutput,
    EnviarMensajeWhatsAppApiInputSchema,
    type EnviarMensajeWhatsAppApiInput
} from './whatsapp.schemas';
import {
    ChatMessageItemSchema,
    type ChatMessageItem,
    type HistorialTurnoParaGemini, // Importado de chatTest.schemas.ts
    // HistorialTurnoParaGeminiSchema // Schema Zod para validar si es necesario
} from '@/app/dev-test-chat/components/chatTest.schemas';

import {
    generarRespuestaAsistente,
    obtenerTareasCapacidadParaAsistente
} from '@/app/admin/_lib/ia/ia.actions';
import { dispatchTareaEjecutadaAction } from '@/app/admin/_lib/ia/funcionesEjecucion.actions';
// import { z } from 'zod'; // Para usar z.array().safeParse() si es necesario

const WHATSAPP_CHANNEL_NAME = "WhatsApp";

export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    console.log("[WhatsApp Actions] Procesando mensaje entrante:", input);
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("[WhatsApp Actions] Input inválido:", validation.error.flatten());
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensajeUsuario } = validation.data;

    // Variables que se poblarán en la transacción y se usarán después
    let conversationId: string | undefined;
    let leadId: string | undefined;
    let asistenteId: string | undefined;
    let asistenteNombre: string | undefined;
    let negocioNombre: string | undefined;
    let asistenteDescripcion: string | null | undefined;
    let estadoActualConversacion: string = '';
    let mensajeUsuarioGuardado: ChatMessageItem | undefined;


    try {
        const initialSetupResult = await prisma.$transaction(async (tx) => {
            const asistente = await tx.asistenteVirtual.findFirst({
                where: { phoneNumberId: negocioPhoneNumberId, status: 'activo' },
                include: { negocio: { include: { CRM: true } } }
            });

            if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
                throw new Error(`Asistente, Negocio o CRM no encontrado o no activo para PNID: ${negocioPhoneNumberId}`);
            }

            const crmId = asistente.negocio.CRM.id;
            // Asignar a variables del ámbito superior
            asistenteId = asistente.id;
            asistenteNombre = asistente.nombre;
            negocioNombre = asistente.negocio.nombre;
            asistenteDescripcion = asistente.descripcion;

            let canalWhatsApp = await tx.canalCRM.findFirst({ where: { crmId: crmId, nombre: WHATSAPP_CHANNEL_NAME } });
            if (!canalWhatsApp) {
                canalWhatsApp = await tx.canalCRM.create({ data: { crmId: crmId, nombre: WHATSAPP_CHANNEL_NAME, status: 'activo' } });
            }

            let currentLead = await tx.lead.findFirst({
                where: { crmId: crmId, telefono: usuarioWaId }
            });

            if (!currentLead) {
                const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: crmId, status: 'activo' }, orderBy: { orden: 'asc' } });
                if (!primerPipeline) throw new Error(`Pipeline inicial no configurado para CRM ID: ${crmId}`);
                currentLead = await tx.lead.create({
                    data: {
                        crmId: crmId,
                        nombre: nombrePerfilUsuario || `Usuario WhatsApp ${usuarioWaId.slice(-4)}`,
                        canalId: canalWhatsApp.id,
                        status: 'nuevo',
                        pipelineId: primerPipeline.id,
                        telefono: usuarioWaId,
                        jsonParams: { whatsappUserId: usuarioWaId, whatsappProfileName: nombrePerfilUsuario }
                    },
                });
            }
            leadId = currentLead.id;

            let currentConversacion = await tx.conversacion.findFirst({
                where: { leadId: currentLead.id, asistenteVirtualId: asistente.id },
                orderBy: { createdAt: 'desc' }
            });

            if (!currentConversacion || ['cerrada', 'archivada'].includes(currentConversacion.status)) {
                currentConversacion = await tx.conversacion.create({
                    data: {
                        leadId: currentLead.id,
                        asistenteVirtualId: asistente.id,
                        status: 'abierta',
                        phoneNumberId: negocioPhoneNumberId,
                        whatsappId: usuarioWaId,
                    }
                });
            } else if (currentConversacion.status !== 'abierta' && currentConversacion.status !== 'en_espera_agente' && currentConversacion.status !== 'hitl_activo') {
                currentConversacion = await tx.conversacion.update({
                    where: { id: currentConversacion.id },
                    data: { status: 'abierta', updatedAt: new Date() }
                });
            }
            conversationId = currentConversacion.id;
            estadoActualConversacion = currentConversacion.status;

            const interaccionUsuarioData: Prisma.InteraccionCreateInput = {
                conversacion: { connect: { id: conversationId } },
                role: 'user',
                mensajeTexto: mensajeUsuario,
                parteTipo: InteraccionParteTipo.TEXT,
            };
            const interaccionUsuario = await tx.interaccion.create({ data: interaccionUsuarioData });
            const parsedUserMsg = ChatMessageItemSchema.safeParse({
                ...interaccionUsuario,
                // Asegurar que los campos JSON se pasen como null si no existen, para que Zod no falle
                functionCallArgs: interaccionUsuario.functionCallArgs || null,
                functionResponseData: interaccionUsuario.functionResponseData || null,
            });
            if (!parsedUserMsg.success) {
                console.error("[WhatsApp Actions] Error Zod parseando mensaje de usuario guardado:", parsedUserMsg.error.flatten());
                throw new Error("Error al parsear mensaje de usuario guardado.");
            }

            return { userInteraction: parsedUserMsg.data };
        });

        mensajeUsuarioGuardado = initialSetupResult.userInteraction;

    } catch (error: unknown) {
        console.error('[WhatsApp Actions] Error en la configuración inicial de DB:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error al iniciar/continuar la conversación en la base de datos.' };
    }

    if (estadoActualConversacion === 'en_espera_agente' || estadoActualConversacion === 'hitl_activo') {
        console.log(`[WhatsApp Actions] Conversación ${mensajeUsuarioGuardado?.conversacionId ?? 'desconocida'} en espera. No se llama a IA.`);
        return {
            success: true,
            data: {
                conversationId: mensajeUsuarioGuardado!.conversacionId ?? conversationId!,
                interaccionUsuarioId: mensajeUsuarioGuardado!.id,
                leadId: leadId!, // leadId ahora se asigna desde el ámbito superior
                mensajeUsuarioGuardado: mensajeUsuarioGuardado
            }
        };
    }

    let mensajeAsistenteGuardado: ChatMessageItem | undefined;
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        // Esperar a que conversationId esté asignado antes de usarlo
        if (!conversationId) {
            throw new Error("conversationId no está asignado antes de consultar interacciones.");
        }

        const historialInteraccionesDb = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId as string },
            orderBy: { createdAt: 'asc' },
            take: 20,
            select: {
                id: true, role: true, parteTipo: true, mensajeTexto: true,
                functionCallNombre: true, functionCallArgs: true, functionResponseData: true,
            }
        });

        // const historialParaIA: HistorialTurnoParaGemini[] = historialInteraccionesDb.map(dbTurn => {
        //     let geminiRole: HistorialTurnoParaGemini['role'];
        //     const parts: HistorialTurnoParaGemini['parts'] = [];
        //     switch (dbTurn.role) {
        //         case 'user':
        //             geminiRole = 'user';
        //             parts.push({ text: dbTurn.mensajeTexto || "" });
        //             break;
        //         case 'assistant':
        //             geminiRole = 'model';
        //             if (dbTurn.parteTipo === InteraccionParteTipo.FUNCTION_CALL && dbTurn.functionCallNombre && dbTurn.functionCallArgs) {
        //                 parts.push({ functionCall: { name: dbTurn.functionCallNombre, args: dbTurn.functionCallArgs as Record<string, unknown> || {} } });
        //             } else { parts.push({ text: dbTurn.mensajeTexto || "" }); }
        //             break;
        //         case 'function':
        //             geminiRole = 'function';
        //             if (dbTurn.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE && dbTurn.functionCallNombre && dbTurn.functionResponseData) {
        //                 parts.push({ functionResponse: { name: dbTurn.functionCallNombre, response: dbTurn.functionResponseData as Record<string, unknown> || {} } });
        //             } else { parts.push({ functionResponse: { name: dbTurn.functionCallNombre || "unknownFunction", response: { content: dbTurn.mensajeTexto || "Respuesta procesada." } } }); }
        //             break;
        //         default: return null;
        //     }
        //     return { role: geminiRole, parts };
        // }).filter(Boolean) as HistorialTurnoParaGemini[];

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


        console.log(`[WhatsApp Actions] Historial para IA (conv ${conversationId}, últimos 5):`, JSON.stringify(historialParaIA.slice(-5), null, 2));

        if (!asistenteId) {
            throw new Error("asistenteId no está definido antes de obtener tareas de capacidad.");
        }
        const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, prisma); // Usar asistenteId del ámbito superior
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: historialParaIA, // Este debe ser HistorialTurnoParaGemini[]
            mensajeUsuarioActual: mensajeUsuario,
            contextoAsistente: {
                nombreAsistente: asistenteNombre ?? '',
                nombreNegocio: negocioNombre ?? '',
                descripcionAsistente: asistenteDescripcion
            },
            tareasDisponibles: tareasDisponibles,
        });

        if (resultadoIA.success && resultadoIA.data) {
            const respuestaIA = resultadoIA.data;
            let respuestaAsistenteTextoVar = respuestaIA.respuestaTextual;
            let iaMsgData: Prisma.InteraccionCreateInput;

            if (respuestaIA.llamadaFuncion) {
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
                iaMsgData = { conversacion: { connect: { id: conversationId } }, role: 'assistant', parteTipo: InteraccionParteTipo.TEXT, mensajeTexto: '(Respuesta IA vacía)' };
            }
            const iaMsg = await prisma.interaccion.create({ data: iaMsgData });
            const parsedAssistantMsg = ChatMessageItemSchema.safeParse({ ...iaMsg, functionCallArgs: null, functionResponseData: null });
            if (parsedAssistantMsg.success) mensajeAsistenteGuardado = parsedAssistantMsg.data;


            if (!respuestaIA.llamadaFuncion && respuestaAsistenteTextoVar) {
                const asistenteToken = (await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { token: true } }))?.token;
                if (asistenteToken) {
                    await enviarMensajeWhatsAppApiAction({
                        destinatarioWaId: usuarioWaId,
                        mensajeTexto: respuestaAsistenteTextoVar,
                        negocioPhoneNumberIdEnvia: negocioPhoneNumberId,
                        tokenAccesoAsistente: asistenteToken
                    });
                } else { console.error(`[WhatsApp Actions] No se encontró token para asistente ${asistenteId}.`); }
            }

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
                                canalNombre: WHATSAPP_CHANNEL_NAME,
                                destinatarioWaId: usuarioWaId,
                                negocioPhoneNumberIdEnvia: negocioPhoneNumberId,
                            })
                        }
                    });
                    tareaEjecutadaCreadaId = te.id;
                }
            }
        } else {
            await prisma.interaccion.create({ data: { conversacionId: conversationId, role: 'system', mensajeTexto: `Error IA: ${resultadoIA.error || 'Desconocido'}`, parteTipo: InteraccionParteTipo.TEXT } });
            const asistenteToken = (await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { token: true } }))?.token;
            if (asistenteToken) {
                await enviarMensajeWhatsAppApiAction({
                    destinatarioWaId: usuarioWaId,
                    mensajeTexto: "Lo siento, estoy teniendo algunos problemas técnicos. Un agente se pondrá en contacto contigo pronto.",
                    negocioPhoneNumberIdEnvia: negocioPhoneNumberId,
                    tokenAccesoAsistente: asistenteToken
                });
            }
        }

        if (tareaEjecutadaCreadaId) {
            await dispatchTareaEjecutadaAction(tareaEjecutadaCreadaId);
        }

        return {
            success: true,
            data: {
                conversationId: conversationId,
                interaccionUsuarioId: mensajeUsuarioGuardado!.id,
                leadId: leadId!, // leadId ahora se asigna desde el ámbito superior
                mensajeUsuarioGuardado: mensajeUsuarioGuardado,
                mensajeAsistenteGuardado: mensajeAsistenteGuardado
            }
        };

    } catch (error: unknown) {
        console.error('[WhatsApp Actions] Error en el procesamiento principal post-TX:', error);
        if (mensajeUsuarioGuardado) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error interno al procesar respuesta del asistente.',
                data: {
                    conversationId: conversationId!, // Asumimos que conversationId se asignó
                    interaccionUsuarioId: mensajeUsuarioGuardado.id,
                    leadId: leadId!, // Asumimos que leadId se asignó
                    mensajeUsuarioGuardado: mensajeUsuarioGuardado,
                    mensajeAsistenteGuardado: undefined,
                }
            };
        }
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje de WhatsApp.' };
    }
}

// --- enviarMensajeWhatsAppApiAction (Mantenida como en la versión anterior del Canvas) ---
export async function enviarMensajeWhatsAppApiAction(
    input: EnviarMensajeWhatsAppApiInput
): Promise<ActionResult<string | null>> {
    const validation = EnviarMensajeWhatsAppApiInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada inválidos para enviar mensaje WhatsApp." };
    }
    const { destinatarioWaId, mensajeTexto, negocioPhoneNumberIdEnvia, tokenAccesoAsistente } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v19.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: "text",
        text: {
            preview_url: false,
            body: mensajeTexto,
        },
    };

    try {
        console.log(`[WhatsApp API Sender] Enviando a ${destinatarioWaId} desde ${negocioPhoneNumberIdEnvia}: "${mensajeTexto.substring(0, 50)}..."`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenAccesoAsistente}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("[WhatsApp API Sender] Error de API Meta:", JSON.stringify(responseData, null, 2));
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            return { success: false, error: errorMsg };
        }

        const messageId = responseData.messages?.[0]?.id;
        console.log(`[WhatsApp API Sender] Mensaje enviado. ID de WhatsApp: ${messageId}`);
        return { success: true, data: messageId || null };

    } catch (error) {
        console.error("[WhatsApp API Sender] Error de red o desconocido:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}
