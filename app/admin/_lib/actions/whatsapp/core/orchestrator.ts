// RUTA: /actions/whatsapp/core/orchestrator.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso } from '@prisma/client';
import { InteraccionParteTipo } from '@prisma/client';
import type { ActionResult } from '../../../types';
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput, type FsmContext, type WhatsAppMessageInput, type AsistenteContext } from '../whatsapp.schemas';

// Handlers de Tareas
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';
import { manejarSeguimiento } from '../tasks/manejarSeguimiento.handler';
import { manejarConversacionGeneral } from './intent-detector';
import { enviarMensajeInternoYWhatsAppAction } from '../helpers/actions.helpers';

async function setupConversacion(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<FsmContext>> {
    console.log("[ORCHESTRATOR - SETUP] Iniciando configuración de conversación...");
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensaje, messageIdOriginal } = input;

    try {
        const result = await prisma.$transaction(async (tx) => {
            console.log("[ORCHESTRATOR - SETUP] Dentro de la transacción de Prisma.");
            const asistente = await tx.asistenteVirtual.findFirst({
                where: { phoneNumberId: negocioPhoneNumberId, status: 'activo' },
                include: { negocio: { include: { CRM: true } } }
            });
            if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
                throw new Error(`Asistente/Negocio/CRM no encontrado para PNID: ${negocioPhoneNumberId}`);
            }
            console.log(`[ORCHESTRATOR - SETUP] Asistente encontrado: ${asistente.id}`);

            let lead = await tx.lead.findFirst({ where: { telefono: usuarioWaId, crmId: asistente.negocio.CRM.id } });
            if (lead) {
                console.log(`[ORCHESTRATOR - SETUP] Lead existente encontrado: ${lead.id}`);
            } else {
                const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: asistente.negocio.CRM.id, status: 'activo' }, orderBy: { orden: 'asc' } });
                if (!primerPipeline) throw new Error(`Pipeline inicial no configurado para CRM ID: ${asistente.negocio.CRM.id}`);
                lead = await tx.lead.create({
                    data: {
                        crm: { connect: { id: asistente.negocio.CRM.id } },
                        Pipeline: { connect: { id: primerPipeline.id } },
                        nombre: nombrePerfilUsuario || `Usuario ${usuarioWaId.slice(-4)}`,
                        telefono: usuarioWaId,
                        Canal: { connectOrCreate: { where: { crmId_nombre: { crmId: asistente.negocio.CRM.id, nombre: "WhatsApp" } }, create: { nombre: "WhatsApp", crmId: asistente.negocio.CRM.id } } }
                    }
                });
                console.log(`[ORCHESTRATOR - SETUP] Nuevo lead creado: ${lead.id}`);
            }

            let conversacion = await tx.conversacion.findFirst({ where: { whatsappId: usuarioWaId }, orderBy: { createdAt: 'desc' } });
            if (!conversacion || ['cerrada', 'archivada'].includes(conversacion.status)) {
                conversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta', phoneNumberId: negocioPhoneNumberId, whatsappId: usuarioWaId } });
                console.log(`[ORCHESTRATOR - SETUP] Nueva conversación creada: ${conversacion.id}`);
            } else {
                console.log(`[ORCHESTRATOR - SETUP] Conversación existente encontrada: ${conversacion.id}`);
            }

            const mensajeTexto = mensaje.type === 'text' ? mensaje.content : `[Interacción no textual: ${mensaje.type}]`;
            await tx.interaccion.create({ data: { conversacionId: conversacion.id, role: 'user', mensajeTexto: mensajeTexto, parteTipo: InteraccionParteTipo.TEXT, canalInteraccion: 'WhatsApp', messageId: messageIdOriginal } });
            console.log(`[ORCHESTRATOR - SETUP] Interacción de usuario guardada.`);

            return {
                conversacionId: conversacion.id,
                leadId: lead.id,
                asistente: asistente as AsistenteContext,
                mensaje: mensaje,
                usuarioWaId: usuarioWaId,
                negocioPhoneNumberId: negocioPhoneNumberId
            };
        });

        console.log("[ORCHESTRATOR - SETUP] Configuración completada exitosamente.");
        return { success: true, data: result };
    } catch (error) {
        console.error("[ORCHESTRATOR - SETUP] Error CRÍTICO durante la configuración:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido en setupConversacion" };
    }
}

export async function enviarMensajeAsistente(
    conversacionId: string,
    mensaje: string,
    destinatarioWaId: string,
    negocioPhoneNumberIdEnvia: string
) {
    const chunks = mensaje.split(/\n\s*\n/).filter(chunk => chunk.trim() !== '');
    console.log(`[ORCHESTRATOR - ENVIAR] Mensaje dividido en ${chunks.length} chunks.`);

    for (const chunk of chunks) {
        const mensajeLimpio = chunk.trim();
        console.log(`[ORCHESTRATOR - ENVIAR] Preparando chunk para ${destinatarioWaId}: "${mensajeLimpio}"`);

        try {
            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId,
                contentFuncion: mensajeLimpio,
                role: 'assistant',
                parteTipo: InteraccionParteTipo.TEXT,
                canalOriginal: 'WhatsApp',
                destinatarioWaId: destinatarioWaId,
                negocioPhoneNumberIdEnvia: negocioPhoneNumberIdEnvia,
            });
        } catch (error) {
            console.error(`[ORCHESTRATOR - ENVIAR] Error al enviar chunk:`, error);
        }

        if (chunks.length > 1) await new Promise(resolve => setTimeout(resolve, 800));
    }
}

export async function manejarTareaEnProgreso(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<unknown>> {
    console.log(`[ORCHESTRATOR - TAREA] Manejando tarea activa: '${tarea.nombreTarea}'`);

    if (mensaje.type !== 'text') {
        return enrutarASubGestor(tarea, mensaje, contexto);
    }

    const textoNormalizado = mensaje.content.toLowerCase().normalize("NFD").replace(/[^a-z0-9\s]/gi, '');
    const keywordsDeCancelacion = ['no gracias', 'ya no', 'cancelar', 'olvidalo', 'detener'];

    if (keywordsDeCancelacion.some(kw => textoNormalizado.includes(kw))) {
        console.log(`[ORCHESTRATOR - TAREA] Palabra clave de ESCAPE detectada. Abortando tarea.`);
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        await enviarMensajeAsistente(contexto.conversacionId, "Entendido, cancelando la operación. ¿Hay algo más en lo que pueda ayudarte?", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
        return { success: true, data: null };
    }

    return enrutarASubGestor(tarea, mensaje, contexto);
}

export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<unknown>> {
    console.log("--- [ORCHESTRATOR] Inicio del procesamiento del mensaje ---");
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ORCHESTRATOR] ERROR: Datos de entrada inválidos:', validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos." };
    }

    const { messageIdOriginal } = validation.data;
    if (messageIdOriginal) {
        const interaccionExistente = await prisma.interaccion.findFirst({ where: { messageId: messageIdOriginal } });
        if (interaccionExistente) {
            console.log(`[ORCHESTRATOR] IDEMPOTENCIA: Mensaje con ID ${messageIdOriginal} ya procesado. Omitiendo.`);
            return { success: true, data: null };
        }
    }

    try {
        const setup = await setupConversacion(validation.data);
        if (!setup.success || !setup.data) {
            return { success: false, error: setup.error || "La configuración de la conversación falló." };
        }

        let tareaActiva = await prisma.tareaEnProgreso.findUnique({ where: { conversacionId: setup.data.conversacionId } });

        if (tareaActiva) {
            const TIMEOUT_MINUTES = parseInt(process.env.TASK_TIMEOUT_MINUTES || '120');
            const MINUTOS_INACTIVA = (new Date().getTime() - new Date(tareaActiva.updatedAt).getTime()) / 60000;
            if (MINUTOS_INACTIVA > TIMEOUT_MINUTES) {
                await prisma.tareaEnProgreso.delete({ where: { id: tareaActiva.id } });
                tareaActiva = null;
            }
        }

        if (tareaActiva) {
            return await manejarTareaEnProgreso(tareaActiva, setup.data.mensaje, setup.data);
        } else {
            return await manejarConversacionGeneral(setup.data.mensaje, setup.data);
        }
    } catch (error: unknown) {
        console.error('[ORCHESTRATOR] Error CRÍTICO en el procesamiento principal:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje.' };
    }
}

function enrutarASubGestor(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
) {
    console.log(`[ORCHESTRATOR - ROUTER] Enrutando a sub-gestor para la tarea: "${tarea.nombreTarea}"`);
    switch (tarea.nombreTarea) {
        case 'agendarCita': return manejarAgendarCita(tarea, mensaje, contexto);
        case 'cancelarCita': return manejarCancelarCita(tarea, mensaje, contexto);
        case 'reagendarCita': return manejarReagendarCita(tarea, mensaje, contexto);
        case 'buscarCitas': return manejarBuscarCitas(tarea, mensaje, contexto);
        case 'seguimientoGenerico': return manejarSeguimiento(tarea, mensaje, contexto);
        default:
            console.warn(`[ORCHESTRATOR - ROUTER] ADVERTENCIA: Tarea desconocida: ${tarea.nombreTarea}. Eliminando tarea.`);
            return prisma.tareaEnProgreso.delete({ where: { id: tarea.id } }).then(() => ({ success: false, error: "Tarea desconocida." }));
    }
}
