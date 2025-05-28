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
    type ChatMessageItem,
    type HistorialTurnoParaGemini,
    ChatMessageItemSchema
} from '@/app/admin/_lib/ia/ia.schemas';

import {
    generarRespuestaAsistente,
    obtenerTareasCapacidadParaAsistente
} from '@/app/admin/_lib/ia/ia.actions';
import { dispatchTareaEjecutadaAction } from '@/app/admin/_lib/ia/funcionesEjecucion.actions';

const WHATSAPP_CHANNEL_NAME = "WhatsApp";

// --- procesarMensajeWhatsAppEntranteAction (Mantenida como en la versión anterior del Canvas) ---
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
            const interaccionUsuario = await tx.interaccion.create({
                data: interaccionUsuarioData,
                select: {
                    id: true, conversacionId: true, role: true, mensajeTexto: true,
                    parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                    functionResponseData: true, functionResponseNombre: true,
                    mediaUrl: true, mediaType: true, createdAt: true,
                    agenteCrm: { select: { id: true, nombre: true } },
                }
            });

            const parsedUserMsg = ChatMessageItemSchema.safeParse(interaccionUsuario);
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
        console.log(`[WhatsApp Actions] Conversación ${conversationId} en espera. No se llama a IA.`);
        return {
            success: true,
            data: {
                conversationId: conversationId!,
                interaccionUsuarioId: mensajeUsuarioGuardado && mensajeUsuarioGuardado.id ? mensajeUsuarioGuardado.id : '',
                leadId: leadId!,
                mensajeUsuarioGuardado: mensajeUsuarioGuardado && mensajeUsuarioGuardado.id && mensajeUsuarioGuardado.createdAt && mensajeUsuarioGuardado.conversacionId
                    ? mensajeUsuarioGuardado as Required<typeof mensajeUsuarioGuardado>
                    : undefined
            }
        };
    }

    let mensajeAsistenteGuardado: ChatMessageItem | undefined;
    let tareaEjecutadaCreadaId: string | null = null;

    try {
        if (!conversationId || !asistenteId || !asistenteNombre || !negocioNombre) {
            throw new Error("Faltan variables críticas (conversationId, asistenteId, etc.) antes de llamar a la IA.");
        }

        const historialInteraccionesDb = await prisma.interaccion.findMany({
            where: { conversacionId: conversationId },
            orderBy: { createdAt: 'asc' },
            take: 20,
            select: {
                role: true, parteTipo: true, mensajeTexto: true,
                functionCallNombre: true, functionCallArgs: true,
                functionResponseNombre: true, functionResponseData: true,
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
            } else if (dbTurn.role === 'function') {
                roleForGemini = 'function';
                if (dbTurn.parteTipo === 'FUNCTION_RESPONSE' && dbTurn.functionCallNombre && dbTurn.functionResponseData) {
                    parts.push({ functionResponse: { name: dbTurn.functionCallNombre, response: dbTurn.functionResponseData as Record<string, unknown> || {} } });
                } else if (dbTurn.mensajeTexto) {
                    parts.push({ functionResponse: { name: dbTurn.functionCallNombre || "unknownFunctionExecuted", response: { content: dbTurn.mensajeTexto } } });
                }
            }

            if (roleForGemini && parts.length > 0) {
                return { role: roleForGemini, parts };
            }
            return null;
        }).filter(Boolean) as HistorialTurnoParaGemini[];

        console.log(`[WhatsApp Actions] Historial para IA (conv ${conversationId}, últimos 5):`, JSON.stringify(historialParaIA.slice(-5), null, 2));

        const tareasDisponibles = await obtenerTareasCapacidadParaAsistente(asistenteId, prisma);
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: historialParaIA,
            mensajeUsuarioActual: mensajeUsuario,
            contextoAsistente: {
                nombreAsistente: asistenteNombre,
                nombreNegocio: negocioNombre,
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
            const iaMsg = await prisma.interaccion.create({
                data: iaMsgData, select: { /* ... select completo ... */
                    id: true, conversacionId: true, role: true, mensajeTexto: true,
                    parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                    functionResponseData: true, functionResponseNombre: true,
                    mediaUrl: true, mediaType: true, createdAt: true,
                    agenteCrm: { select: { id: true, nombre: true } },
                }
            });
            const parsedAssistantMsg = ChatMessageItemSchema.safeParse(iaMsg);
            if (parsedAssistantMsg.success) mensajeAsistenteGuardado = parsedAssistantMsg.data;
            else console.error("[WhatsApp Actions] Error Zod parseando mensaje de asistente guardado:", parsedAssistantMsg.error.flatten());

            if (!respuestaIA.llamadaFuncion && respuestaAsistenteTextoVar) {
                const asistente = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { token: true } });
                if (asistente?.token) {
                    await enviarMensajeWhatsAppApiAction({
                        destinatarioWaId: usuarioWaId,
                        mensajeTexto: respuestaAsistenteTextoVar, // Solo enviar texto si no hay llamada a función
                        negocioPhoneNumberIdEnvia: negocioPhoneNumberId,
                        tokenAccesoAsistente: asistente.token,
                        tipoMensaje: 'text' // Asegurar que el tipo sea 'text'
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
            const asistente = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { token: true } });
            if (asistente?.token) {
                await enviarMensajeWhatsAppApiAction({
                    destinatarioWaId: usuarioWaId,
                    mensajeTexto: "Lo siento, estoy teniendo algunos problemas técnicos. Un agente se pondrá en contacto contigo pronto.",
                    negocioPhoneNumberIdEnvia: negocioPhoneNumberId,
                    tokenAccesoAsistente: asistente.token,
                    tipoMensaje: 'text'
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
                interaccionUsuarioId: mensajeUsuarioGuardado && mensajeUsuarioGuardado.id ? mensajeUsuarioGuardado.id : '',
                leadId: leadId!,
                mensajeUsuarioGuardado: mensajeUsuarioGuardado && mensajeUsuarioGuardado.id && mensajeUsuarioGuardado.createdAt && mensajeUsuarioGuardado.conversacionId
                    ? mensajeUsuarioGuardado as Required<typeof mensajeUsuarioGuardado>
                    : undefined,
                mensajeAsistenteGuardado: mensajeAsistenteGuardado && mensajeAsistenteGuardado.id && mensajeAsistenteGuardado.conversacionId && mensajeAsistenteGuardado.createdAt
                    ? mensajeAsistenteGuardado as Required<typeof mensajeAsistenteGuardado>
                    : undefined
            }
        };

    } catch (error: unknown) {
        console.error('[WhatsApp Actions] Error en el procesamiento principal post-TX:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje de WhatsApp.' };
    }
}


export async function enviarMensajeWhatsAppApiAction(
    input: EnviarMensajeWhatsAppApiInput // Usa el schema actualizado
): Promise<ActionResult<string | null>> {
    const validation = EnviarMensajeWhatsAppApiInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("[WhatsApp API Sender] Input inválido:", validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos para enviar mensaje WhatsApp." };
    }
    // Desestructurar todos los campos del input validado
    const {
        destinatarioWaId,
        mensajeTexto,
        negocioPhoneNumberIdEnvia,
        tokenAccesoAsistente,
        tipoMensaje,
        mediaUrl,
        caption,
        filename
    } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v19.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const messagePayload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: tipoMensaje,
    };

    switch (tipoMensaje) {
        case 'text':
            if (!mensajeTexto) { // Validación adicional, aunque Zod ya lo hace con .refine
                return { success: false, error: "mensajeTexto es requerido para tipo 'text'." };
            }
            messagePayload.text = { preview_url: false, body: mensajeTexto };
            break;
        case 'image':
            if (!mediaUrl) return { success: false, error: "mediaUrl es requerido para tipo 'image'." };
            messagePayload.image = { link: mediaUrl } as { link: string; caption?: string };
            if (caption) (messagePayload.image as { link: string; caption?: string }).caption = caption;
            break;
        case 'video':
            if (!mediaUrl) return { success: false, error: "mediaUrl es requerido para tipo 'video'." };
            messagePayload.video = { link: mediaUrl } as { link: string; caption?: string };
            if (caption) (messagePayload.video as { link: string; caption?: string }).caption = caption;
            break;
        case 'document':
            if (!mediaUrl) return { success: false, error: "mediaUrl es requerido para tipo 'document'." };
            messagePayload.document = { link: mediaUrl };
            if (caption) (messagePayload.document as { link: string; caption?: string; filename?: string }).caption = caption;
            if (filename) (messagePayload.document as { link: string; caption?: string; filename?: string }).filename = filename;
            break;
        case 'audio':
            if (!mediaUrl) return { success: false, error: "mediaUrl es requerido para tipo 'audio'." };
            messagePayload.audio = { link: mediaUrl };
            // Audio no soporta caption
            break;
        default:
            return { success: false, error: `Tipo de mensaje no soportado: ${tipoMensaje}` };
    }

    console.log(`[WhatsApp API Sender] Preparando para enviar. Payload.to: "${destinatarioWaId}", Tipo: "${tipoMensaje}"`);
    if (tipoMensaje === 'text') console.log(`   Mensaje: "${mensajeTexto?.substring(0, 50)}..."`);
    else console.log(`   MediaURL: "${mediaUrl}", Caption: "${caption?.substring(0, 30)}..."`);


    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenAccesoAsistente}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("[WhatsApp API Sender] Error de API Meta:", JSON.stringify(responseData, null, 2));
            if (responseData.error?.error_data?.details) {
                console.error("[WhatsApp API Sender] Detalles del error de Meta:", responseData.error.error_data.details);
            }
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            return { success: false, error: errorMsg };
        }

        const messageId = responseData.messages?.[0]?.id;
        console.log(`[WhatsApp API Sender] Mensaje tipo '${tipoMensaje}' enviado. ID de WhatsApp: ${messageId}`);
        return { success: true, data: messageId || null };

    } catch (error) {
        console.error("[WhatsApp API Sender] Error de red o desconocido:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}