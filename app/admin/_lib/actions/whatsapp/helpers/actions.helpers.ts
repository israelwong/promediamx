// /helpers/actions.helpers.ts
// Este archivo contiene las acciones finales que ejecutan cambios en la base de datos (Crear, Actualizar, Borrar).

import prisma from '@/app/admin/_lib/prismaClient';
import { Agenda, StatusAgenda } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { AgendarCitaContext, FsmContext, ReagendarCitaContext } from '../whatsapp.schemas'; // Importamos los tipos desde su nuevo hogar
import { EnviarMensajeWhatsAppApiInputSchema, type EnviarMensajeWhatsAppApiInput } from '../whatsapp.schemas';
import { InteraccionParteTipo } from '@prisma/client';

export async function ejecutarConfirmacionFinalCitaAction(
    tareaContexto: AgendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ agenda: Agenda, mensajeAdicional?: string }>> {
    console.log('[Paso 4.1 - AGENDAR] Ejecutando acción final para crear cita en BD.');
    const { leadId, asistente, conversacionId } = fsmContexto;
    const { servicioId, fechaHora, servicioNombre } = tareaContexto;

    if (!servicioId || !fechaHora || !servicioNombre) {
        return { success: false, error: "Faltan datos críticos (servicio o fecha) para agendar la cita." };
    }

    try {
        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: asistente.negocio!.id,
                leadId: leadId,
                asistenteId: asistente.id,
                fecha: new Date(fechaHora),
                tipo: 'Cita',
                asunto: `Cita para: ${servicioNombre}`,
                descripcion: `Cita agendada por asistente virtual vía WhatsApp. Conversación ID: ${conversacionId}`,
                tipoDeCitaId: servicioId,
                status: "PENDIENTE"
            }
        });
        console.log(`[Paso 4.2 - AGENDAR] Cita creada con éxito en BD. ID: ${nuevaCita.id}`);

        const fechaLegible = new Date(nuevaCita.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });
        const mensajeAdicional = `¡Excelente! Tu cita para "${servicioNombre}" ha sido agendada con éxito para el ${fechaLegible}.`;

        return { success: true, data: { agenda: nuevaCita, mensajeAdicional } };
    } catch (error) {
        console.error("[FSM ERROR] Error al crear la cita en la base de datos:", error);
        return { success: false, error: "Error interno al guardar la cita." };
    }
}

export async function ejecutarReagendamientoFinalCitaAction(
    tareaContexto: ReagendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ nuevaCita: Agenda }>> {
    const { leadId, asistente, conversacionId } = fsmContexto;
    const { citaOriginalId, nuevaFechaHora, citaOriginalAsunto, citaOriginalTipoDeCitaId } = tareaContexto;

    if (!citaOriginalId || !nuevaFechaHora || !citaOriginalAsunto || !citaOriginalTipoDeCitaId) {
        return { success: false, error: "Faltan datos críticos para reagendar." };
    }

    try {
        const [, nuevaCita] = await prisma.$transaction([
            prisma.agenda.update({
                where: { id: citaOriginalId },
                data: { status: StatusAgenda.REAGENDADA }
            }),
            prisma.agenda.create({
                data: {
                    negocioId: asistente.negocio!.id,
                    leadId: leadId,
                    asistenteId: asistente.id,
                    fecha: new Date(nuevaFechaHora),
                    tipo: 'Cita',
                    asunto: citaOriginalAsunto,
                    descripcion: `Cita reagendada desde la cita original ID: ${citaOriginalId}. Conversación ID: ${conversacionId}`,
                    tipoDeCitaId: citaOriginalTipoDeCitaId,
                    status: "PENDIENTE"
                }
            })
        ]);

        console.log(`[Paso 4.2 - REAGENDAR] Cita reagendada con éxito. Nueva cita ID: ${nuevaCita.id}`);
        return { success: true, data: { nuevaCita } };

    } catch (error) {
        console.error("[FSM ERROR] Error al reagendar la cita:", error);
        return { success: false, error: "Error interno al procesar el reagendamiento." };
    }
}

export async function ejecutarCancelacionFinalCitaAction(citaId: string): Promise<ActionResult<Agenda>> {
    console.log(`[Paso 4.1 - CANCELAR] Ejecutando cancelación final en BD para cita ID: ${citaId}`);
    try {
        const citaCancelada = await prisma.agenda.update({
            where: { id: citaId },
            data: { status: StatusAgenda.CANCELADA }
        });
        console.log(`[Paso 4.2 - CANCELAR] Cita actualizada a CANCELADA con éxito.`);
        return { success: true, data: citaCancelada };
    } catch (error) {
        console.error("[FSM ERROR] Error al cancelar la cita en la base de datos:", error);
        return { success: false, error: "Error al cancelar la cita en la base de datos." };
    }
}

export async function ejecutarBuscarCitasAction(
    args: object,
    fsmContexto: FsmContext
): Promise<ActionResult<{ content: string }>> {
    const { leadId } = fsmContexto;

    try {
        // La consulta ahora solo busca citas PENDIENTES, como definimos.
        const citasFuturas = await prisma.agenda.findMany({
            where: {
                leadId: leadId,
                status: StatusAgenda.PENDIENTE,
                fecha: { gte: new Date() }
            },
            orderBy: { fecha: 'asc' },
            take: 10
        });

        if (citasFuturas.length === 0) {
            return { success: true, data: { content: "No tienes ninguna cita futura agendada en este momento." } };
        }

        let mensajeLista = "Estas son tus próximas citas agendadas:\n";
        citasFuturas.forEach((cita, index) => {
            const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
            mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
        });

        return { success: true, data: { content: mensajeLista } };

    } catch (error) {
        console.error("[ACTION ERROR] Error en ejecutarBuscarCitasAction:", error);
        return { success: false, error: "Tuve un problema al buscar tus citas." };
    }
}

// Esta función ahora vive aquí
export async function enviarMensajeInternoYWhatsAppAction(input: {
    conversacionId: string;
    contentFuncion: string;
    role: 'assistant' | 'user' | 'system';
    parteTipo: InteraccionParteTipo;
    canalOriginal: string;
    destinatarioWaId: string;
    negocioPhoneNumberIdEnvia: string;
}) {
    // Lógica para guardar la interacción en la BD...
    await prisma.interaccion.create({
        data: {
            conversacionId: input.conversacionId,
            role: input.role,
            mensajeTexto: input.contentFuncion,
            parteTipo: input.parteTipo,
            canalInteraccion: input.canalOriginal,
        }
    });

    // Lógica para obtener el token del asistente...
    const asistente = await prisma.asistenteVirtual.findFirst({
        where: { phoneNumberId: input.negocioPhoneNumberIdEnvia }
    });
    if (!asistente || !asistente.token) {
        console.error("No se encontró el token para el asistente con PNID:", input.negocioPhoneNumberIdEnvia);
        return;
    }

    // Llamada a la API de WhatsApp
    await enviarMensajeWhatsAppApiAction({
        destinatarioWaId: input.destinatarioWaId,
        mensajeTexto: input.contentFuncion,
        negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
        tokenAccesoAsistente: asistente.token,
        // --- ¡CORRECCIÓN AQUÍ! ---
        // Añadimos la propiedad obligatoria que faltaba.
        tipoMensaje: 'text'
    });
}

// Esta función también vive aquí, ya que la anterior depende de ella.
export async function enviarMensajeWhatsAppApiAction(
    input: EnviarMensajeWhatsAppApiInput
): Promise<ActionResult<string | null>> {
    const validation = EnviarMensajeWhatsAppApiInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("[WhatsApp API Sender] Input inválido:", validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos para enviar mensaje WhatsApp." };
    }
    const {
        destinatarioWaId,
        mensajeTexto,
        negocioPhoneNumberIdEnvia,
        tokenAccesoAsistente,
        tipoMensaje = 'text',
        // mediaUrl,
        // caption,
    } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const messagePayload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: tipoMensaje,
        text: { preview_url: false, body: mensajeTexto }
    };

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
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            return { success: false, error: errorMsg };
        }
        const messageId = responseData.messages?.[0]?.id;
        return { success: true, data: messageId || null };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}