// /helpers/actions.helpers.ts
// Este archivo contiene las acciones finales que ejecutan cambios en la base de datos (Crear, Actualizar, Borrar).

import prisma from '@/app/admin/_lib/prismaClient';
import { Agenda, StatusAgenda } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { AgendarCitaContext, FsmContext, ReagendarCitaContext } from '../whatsapp.schemas'; // Importamos los tipos desde su nuevo hogar
import { EnviarMensajeWhatsAppApiInputSchema, type EnviarMensajeWhatsAppApiInput } from '../whatsapp.schemas';
import { InteraccionParteTipo } from '@prisma/client';
import type { CRMCampoPersonalizado } from '@prisma/client';


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


// export async function enviarMensajeWhatsAppApiAction(
//     input: EnviarMensajeWhatsAppApiInput
// ): Promise<ActionResult<string | null>> {
//     const validation = EnviarMensajeWhatsAppApiInputSchema.safeParse(input);
//     if (!validation.success) {
//         console.error("[WhatsApp API Sender] Input inválido:", validation.error.flatten().fieldErrors);
//         return { success: false, error: "Datos de entrada inválidos para enviar mensaje WhatsApp." };
//     }
//     const {
//         destinatarioWaId,
//         mensajeTexto,
//         negocioPhoneNumberIdEnvia,
//         tokenAccesoAsistente,
//         tipoMensaje = 'text',
//     } = validation.data;

//     const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
//     const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

//     const messagePayload: Record<string, unknown> = {
//         messaging_product: "whatsapp",
//         to: destinatarioWaId,
//         type: tipoMensaje,
//         text: { preview_url: false, body: mensajeTexto }
//     };

//     try {
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${tokenAccesoAsistente}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(messagePayload),
//         });

//         const responseData = await response.json();
//         if (!response.ok) {
//             const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
//             return { success: false, error: errorMsg };
//         }
//         const messageId = responseData.messages?.[0]?.id;
//         return { success: true, data: messageId || null };
//     } catch (error) {
//         return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
//     }
// }


// /helpers/actions.helpers.ts
// Actualización: Nueva función para construir dinámicamente un menú de agendamiento
// basado en los campos personalizados y sus metadatos.
// CORRECCIÓN: Ahora usa `crmId` como parámetro, que es el correcto.


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
    } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const messagePayload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: tipoMensaje,
        text: { preview_url: false, body: mensajeTexto }
    };

    // ✅ INICIO DEL DIAGNÓSTICO: Logueamos todo antes de enviar.
    console.log("--- [DIAGNÓSTICO DE ENVÍO] ---");
    console.log(`[API Sender] Intentando enviar a la URL: ${url}`);
    console.log(`[API Sender] Usando Phone Number ID: ${negocioPhoneNumberIdEnvia}`);
    // Ocultamos la mayor parte del token por seguridad, pero vemos si existe.
    console.log(`[API Sender] ¿Token de Acceso recibido? ${tokenAccesoAsistente ? `Sí, termina en "...${tokenAccesoAsistente.slice(-5)}"` : "No, es undefined o null"}`);
    console.log("---------------------------------");
    // ✅ FIN DEL DIAGNÓSTICO

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

        // Logueamos la respuesta de Meta para ver si hay un error específico
        console.log("[API Sender] Respuesta de Meta:", JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            console.error(`[API Sender] Fallo en el envío: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

        const messageId = responseData.messages?.[0]?.id;
        return { success: true, data: messageId || null };

    } catch (error) {
        console.error("[API Sender] Error catastrófico en fetch:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}


export async function construirMenuDeAgendamiento(crmId: string): Promise<string> {
    try {
        // 1. Obtenemos la información de los campos relevantes en una sola consulta
        const campos = await prisma.cRMCampoPersonalizado.findMany({
            where: {
                crmId: crmId,
                nombre: { in: ["Colegio", "Nivel Educativo"] }
            },
        });

        const campoColegio = campos.find(c => c.nombre === "Colegio");
        const campoNivel = campos.find(c => c.nombre === "Nivel Educativo");

        // Fallback por si los campos no existen o no tienen metadata
        if (!campoColegio || !campoNivel || !campoColegio.metadata || !campoNivel.metadata) {
            return "Por favor, indícame el Colegio, Nivel Educativo y Grado para tu cita.";
        }

        // 2. Extraemos las opciones de la metadata
        const metadataColegio = campoColegio.metadata as { opciones?: string[] };
        const metadataNivel = campoNivel.metadata as { opcionesCondicionales?: Record<string, string[]> };

        const opcionesColegio = metadataColegio.opciones || [];
        const opcionesCondicionalesNivel = metadataNivel.opcionesCondicionales || {};

        if (opcionesColegio.length === 0) {
            return "Por favor, indícame el Colegio, Nivel Educativo y Grado para tu cita.";
        }

        // 3. Construimos el mensaje dinámicamente
        let menu = `Entendido. ¿Para qué colegio, nivel educativo y grado te gustaría tu cita de Informes?\n\n`;

        for (const colegio of opcionesColegio) {
            const nombreNormalizado = colegio.charAt(0).toUpperCase() + colegio.slice(1).toLowerCase();
            menu += `*${nombreNormalizado}*\n`;

            const nivelesDisponibles = opcionesCondicionalesNivel[colegio] || [];
            if (nivelesDisponibles.length > 0) {
                // Normalizamos cada nivel para que se vea bien
                const nivelesNormalizados = nivelesDisponibles.map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase());
                menu += `_${nivelesNormalizados.join(' | ')}_\n\n`;
            }
        }

        menu += `Puedes responder con todo junto para ir más rápido, por ejemplo:\n"primero de primaria en Tecno"`;

        return menu;

    } catch (error) {
        console.error("Error al construir el menú de agendamiento:", error);
        return "Por favor, indícame el Colegio, Nivel Educativo y Grado para tu cita.";
    }
}

export async function construirPreguntaDinamica(
    camposFaltantes: CRMCampoPersonalizado[]
): Promise<{ pregunta: string; ejemplo: string }> {
    if (camposFaltantes.length === 0) {
        return { pregunta: '', ejemplo: '' };
    }

    // Construye la pregunta principal
    const nombresCampos = camposFaltantes.map(c => `**${c.nombre}**`).join(', ');
    const pregunta = `Entendido. Para continuar, por favor, indícame: ${nombresCampos}.`;

    // Construye un ejemplo dinámico
    const partesEjemplo: string[] = [];
    // Priorizamos estos campos para un ejemplo más lógico
    const ordenEjemplo = ["Grado", "Nivel Educativo", "Colegio"];
    const camposOrdenados = [...camposFaltantes].sort((a, b) => ordenEjemplo.indexOf(a.nombre) - ordenEjemplo.indexOf(b.nombre));

    camposOrdenados.slice(0, 2).forEach(campo => {
        const metadata = campo.metadata as { opciones?: string[] };
        if (metadata?.opciones && metadata.opciones.length > 0) {
            partesEjemplo.push(metadata.opciones[0]); // Usamos la primera opción como ejemplo
        }
    });

    const ejemplo = partesEjemplo.length > 0
        ? `\nPuedes escribirlos juntos (ej: "${partesEjemplo.join(' en ')}").`
        : "";

    return { pregunta, ejemplo };
}

export async function ejecutarReagendamientoFinalAction(
    tareaContexto: ReagendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ nuevaCita: Agenda }>> {
    const { citaOriginalId, nuevaFechaHora } = tareaContexto;

    if (!citaOriginalId || !nuevaFechaHora) {
        return { success: false, error: "Faltan datos críticos para reagendar." };
    }

    try {
        const citaOriginal = await prisma.agenda.findUniqueOrThrow({
            where: { id: citaOriginalId }
        });

        const [, nuevaCita] = await prisma.$transaction([
            prisma.agenda.update({
                where: { id: citaOriginalId },
                data: { status: StatusAgenda.REAGENDADA }
            }),
            prisma.agenda.create({
                data: {
                    negocioId: citaOriginal.negocioId,
                    leadId: citaOriginal.leadId,
                    asistenteId: fsmContexto.asistente.id,
                    fecha: new Date(nuevaFechaHora),
                    tipo: citaOriginal.tipo,
                    asunto: citaOriginal.asunto,
                    descripcion: `Cita reagendada desde la cita original ID: ${citaOriginalId}. Conversación ID: ${fsmContexto.conversacionId}`,
                    tipoDeCitaId: citaOriginal.tipoDeCitaId,
                    status: StatusAgenda.PENDIENTE,
                    modalidad: citaOriginal.modalidad,
                }
            })
        ]);

        console.log(`[REAGENDAR] Cita reagendada con éxito. Nueva cita ID: ${nuevaCita.id}`);
        return { success: true, data: { nuevaCita } };

    } catch (error) {
        console.error("[FSM ERROR] Error al reagendar la cita:", error);
        return { success: false, error: "Error interno al procesar el reagendamiento." };
    }
}