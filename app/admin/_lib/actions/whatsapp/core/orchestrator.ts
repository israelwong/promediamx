// RUTA: /actions/whatsapp/core/orchestrator.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { InteraccionParteTipo } from '@prisma/client';
import type { ActionResult } from '../../../types';
import { type ProcesarMensajeWhatsAppInput, type FsmContext, type AsistenteContext } from '../whatsapp.schemas';

/**
 * Esta es la función que configura la conversación.
 * Ahora incluye una prueba de conexión a la BD.
 */
async function setupConversacion(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<FsmContext>> {
    console.log("[ORCHESTRATOR - SETUP] Iniciando configuración de conversación...");
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensaje, messageIdOriginal } = input;

    // ✅ PASO DE PRUEBA: Intentamos una consulta simple a la BD primero.
    try {
        console.log("[ORCHESTRATOR - SETUP] Probando conexión a la base de datos...");
        const negocioTest = await prisma.negocio.findFirst({ select: { id: true } });
        if (negocioTest) {
            console.log(`[ORCHESTRATOR - SETUP] ¡ÉXITO! Conexión a la BD establecida. Encontrado negocio con ID: ${negocioTest.id}`);
        } else {
            console.warn("[ORCHESTRATOR - SETUP] Conexión a la BD exitosa, pero no se encontraron negocios.");
        }
    } catch (dbError) {
        console.error("[ORCHESTRATOR - SETUP] ¡FALLO CRÍTICO! No se pudo conectar a la base de datos.", dbError);
        // Devolvemos un error claro para saber que este es el problema.
        return { success: false, error: "Error de conexión con la base de datos." };
    }

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
        console.error("[ORCHESTRATOR - SETUP] Error durante la configuración:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido en setupConversacion" };
    }
}


/**
 * VERSIÓN DE PRUEBA DE ORQUESTADOR (PASO 3)
 * Llama a setupConversacion para probar la conexión con la BD.
 */
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<null>> {

    console.log("--- [ORCHESTRATOR - PASO 3] Intentando ejecutar setupConversacion... ---");

    const setupResult = await setupConversacion(input);

    if (!setupResult.success) {
        console.error("[ORCHESTRATOR - PASO 3] FALLO en setupConversacion. El problema está en la conexión a la BD o en la lógica de la transacción.");
        return { success: false, error: setupResult.error };
    }

    console.log("[ORCHESTRATOR - PASO 3] ¡ÉXITO! setupConversacion se ejecutó correctamente.");
    // Por ahora, no hacemos nada más.

    return { success: true, data: null };
}
