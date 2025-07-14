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
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensaje, messageIdOriginal } = input;

    // Este bloque try/catch es crucial para diagnosticar errores de BD
    try {
        const result = await prisma.$transaction(async (tx) => {
            const asistente = await tx.asistenteVirtual.findFirst({
                where: { phoneNumberId: negocioPhoneNumberId, status: 'activo' },
                include: { negocio: { include: { CRM: true } } }
            });
            if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
                throw new Error(`Asistente/Negocio/CRM no encontrado para PNID: ${negocioPhoneNumberId}`);
            }

            let lead = await tx.lead.findFirst({ where: { telefono: usuarioWaId, crmId: asistente.negocio.CRM.id } });
            if (!lead) {
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
            }

            let conversacion = await tx.conversacion.findFirst({ where: { whatsappId: usuarioWaId }, orderBy: { createdAt: 'desc' } });
            if (!conversacion || ['cerrada', 'archivada'].includes(conversacion.status)) {
                conversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta', phoneNumberId: negocioPhoneNumberId, whatsappId: usuarioWaId } });
            }

            const mensajeTexto = mensaje.type === 'text' ? mensaje.content : `[Interacción no textual: ${mensaje.type}]`;
            await tx.interaccion.create({ data: { conversacionId: conversacion.id, role: 'user', mensajeTexto: mensajeTexto, parteTipo: InteraccionParteTipo.TEXT, canalInteraccion: 'WhatsApp', messageId: messageIdOriginal } });

            return {
                conversacionId: conversacion.id,
                leadId: lead.id,
                asistente: asistente as AsistenteContext,
                mensaje: mensaje,
                usuarioWaId: usuarioWaId,
                negocioPhoneNumberId: negocioPhoneNumberId
            };
        });
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
    for (const chunk of chunks) {
        try {
            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId,
                contentFuncion: chunk.trim(),
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
    if (mensaje.type === 'text') {
        const textoNormalizado = mensaje.content.toLowerCase().normalize("NFD").replace(/[^a-z0-9\s]/gi, '');
        const keywordsDeCancelacion = ['no gracias', 'ya no', 'cancelar', 'olvidalo', 'detener'];
        if (keywordsDeCancelacion.some(kw => textoNormalizado.includes(kw))) {
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            await enviarMensajeAsistente(contexto.conversacionId, "Entendido, cancelando la operación. ¿Hay algo más en lo que pueda ayudarte?", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
            return { success: true, data: null };
        }
    }
    return enrutarASubGestor(tarea, mensaje, contexto);
}

export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<unknown>> {
    // ✅ CAJA DE SEGURIDAD PRINCIPAL
    try {
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
                console.log(`[ORCHESTRATOR] IDEMPOTENCIA: Mensaje con ID ${messageIdOriginal} ya procesado.`);
                return { success: true, data: null };
            }
        }

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
        // Devolvemos un error genérico para no exponer detalles internos.
        return { success: false, error: 'Ocurrió un error inesperado al procesar tu mensaje.' };
    }
}

function enrutarASubGestor(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
) {
    switch (tarea.nombreTarea) {
        case 'agendarCita': return manejarAgendarCita(tarea, mensaje, contexto);
        case 'cancelarCita': return manejarCancelarCita(tarea, mensaje, contexto);
        case 'reagendarCita': return manejarReagendarCita(tarea, mensaje, contexto);
        case 'buscarCitas': return manejarBuscarCitas(tarea, mensaje, contexto);
        case 'seguimientoGenerico': return manejarSeguimiento(tarea, mensaje, contexto);
        default:
            console.warn(`[ORCHESTRATOR - ROUTER] Tarea desconocida: ${tarea.nombreTarea}.`);
            return prisma.tareaEnProgreso.delete({ where: { id: tarea.id } }).then(() => ({ success: false, error: "Tarea desconocida." }));
    }
}