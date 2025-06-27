// app/admin/_lib/actions/whatsapp/whatsapp.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { InteraccionParteTipo, Prisma, TareaEnProgreso, EstadoTareaConversacional, Agenda } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ProcesarMensajeWhatsAppInputSchema,
    type ProcesarMensajeWhatsAppInput,
    type ProcesarMensajeWhatsAppOutput,
    EnviarMensajeWhatsAppApiInputSchema,
    type EnviarMensajeWhatsAppApiInput,
    type WhatsAppMessageInput
} from './whatsapp.schemas';
import { type HistorialTurnoParaGemini, type ContextoAsistente } from '@/app/admin/_lib/ia/ia.schemas';
import { generarRespuestaAsistente, obtenerTareasCapacidadParaAsistente } from '@/app/admin/_lib/ia/ia.actions';
import { dispatchTareaEjecutadaAction } from '@/app/admin/_lib/dispatcher/funcionesEjecucion.actions';
import { enviarMensajeInternoYWhatsAppAction } from '../../dispatcher/funcionesEjecucion.helpers';
import { ejecutarListarServiciosDeCitasAction } from '../../funciones/citas/listarServiciosDeCitas/listarServiciosDeCitas.actions';

// CORRECCIÓN: Tipo específico para el objeto Asistente que se usa en el contexto.
// Esto reemplaza 'any' y hace nuestro código más seguro y legible.
type AsistenteContext = {
    id: string;
    nombre: string;
    negocio: {
        id: string;
        nombre: string;
        CRM: {
            id: string;
        } | null;
    } | null;
};


// Tipo para el objeto de contexto que se pasará a través de la FSM
type FsmContext = {
    conversacionId: string;
    leadId: string;
    asistente: AsistenteContext; // Reemplazamos 'any' con nuestro tipo específico
    mensaje: WhatsAppMessageInput;
    usuarioWaId: string;
    negocioPhoneNumberId: string;
};

// Tipo específico para el contexto de la tarea de agendar cita
type AgendarCitaContext = {
    servicioId?: string;
    servicioNombre?: string;
    fechaHora?: string;
};


// ===================================================================================
// PASO 1: PUNTO DE ENTRADA Y ORQUESTACIÓN PRINCIPAL
// ===================================================================================
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    // PASO 1.1: Validación del Input
    console.log('[Paso 1.1] Validando el input del webhook:', input);
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ERROR en Paso 1.1] Datos de entrada inválidos:', validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    try {
        // PASO 1.2: Setup de la Conversación (Lead, Asistente, etc.)
        console.log('[Paso 1.2] Iniciando setup de la conversación.');
        const setup = await setupConversacion(validation.data);

        if (!setup.success) {
            console.error('[ERROR en Paso 1.2] El setup de la conversación falló:', setup.error);
            return {
                success: false,
                error: setup.error || "La configuración de la conversación falló.",
                errorDetails: setup.errorDetails
            };
        }
        console.log('[Paso 1.2] Setup de conversación completado con éxito.');

        // PASO 1.3: Cargar Tarea Activa (si existe)
        if (!setup.data) {
            return {
                success: false,
                error: "No se pudo obtener el contexto de la conversación.",
                errorDetails: setup.errorDetails
            };
        }
        const tareaActiva = await prisma.tareaEnProgreso.findUnique({ where: { conversacionId: setup.data.conversacionId } });
        console.log(`[Paso 1.3] ¿Tarea activa encontrada?: ${tareaActiva ? `Sí, ID: ${tareaActiva.id}, Estado: ${tareaActiva.estado}` : 'No'}`);

        // PASO 1.4: Enrutamiento al Gestor Adecuado
        if (tareaActiva) {
            console.log('[Paso 1.4] Enrutando al GESTOR DE TAREAS.');
            return await manejarTareaEnProgreso(tareaActiva, setup.data.mensaje, setup.data);
        } else {
            console.log('[Paso 1.4] Enrutando al GESTOR DE CONVERSACIÓN GENERAL.');
            return await manejarConversacionGeneral(setup.data.mensaje, setup.data);
        }

    } catch (error: unknown) {
        console.error('[WhatsApp Orquestador] Error en el procesamiento principal:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje.' };
    }
}

/**
 * ===================================================================================
 * PASO 2: GESTOR DE CONVERSACIÓN GENERAL (CUANDO NO HAY TAREA ACTIVA)
 * ===================================================================================
 */
async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log(`[Paso 2.1] Gestor General: Analizando mensaje de usuario.`);
    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }
    const mensajeTexto = mensaje.content.toLowerCase();

    const keywordsCita = ['cita', 'agendar', 'reservar', 'reservación'];
    if (keywordsCita.some(kw => mensajeTexto.includes(kw))) {
        // PASO 2.2: Intención de agendar detectada. Creando nueva tarea.
        console.log('[Paso 2.2] Intención de "agendar cita" detectada. Creando nueva TareaEnProgreso.');
        const nuevaTarea = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId: contexto.conversacionId,
                nombreTarea: 'agendarCita',
                contexto: {},
                estado: EstadoTareaConversacional.RECOLECTANDO_DATOS,
            }
        });

        return manejarTareaEnProgreso(nuevaTarea, mensaje, contexto);
    }

    console.log("[Paso 2.3] No se detectó intención de tarea. Pasando a charla general con IA (lógica no implementada).");
    return { success: true, data: null };
}

/**
 * ===================================================================================
 * PASO 3: GESTOR DE TAREAS EN PROGRESO (EL CEREBRO DE LA FSM)
 * ===================================================================================
 */
async function manejarTareaEnProgreso(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    let tareaContexto = (tarea.contexto as AgendarCitaContext) || {};

    console.log(`[Paso 3.1] Gestor de Tareas: Procesando Tarea ID: ${tarea.id}, Estado Actual: ${tarea.estado}`);

    switch (tarea.estado) {
        case EstadoTareaConversacional.INICIADA:
            // Este caso ahora es un fallback si RECOLECTANDO_DATOS no encuentra nada y necesita ayuda.
            console.log(`[Paso 3.2 - INICIADA] Tarea '${tarea.nombreTarea}' en estado INICIADA. Listando servicios.`);
            const resultadoListar = await ejecutarListarServiciosDeCitasAction({}, { conversacionId, leadId, asistenteId: asistente.id, negocioId: asistente.negocio!.id, canalNombre: 'WhatsApp', tareaEjecutadaId: '' });

            if (resultadoListar.success && resultadoListar.data?.content) {
                await enviarMensajeAsistente(conversacionId, resultadoListar.data.content, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.RECOLECTANDO_DATOS } });
            } else {
                console.error("[FSM ERROR] Fallo al ejecutar listarServiciosDeCitas:", resultadoListar.error);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.FALLIDA, mensajeError: resultadoListar.error || "No se pudieron obtener los servicios." } });
            }
            return { success: true, data: null };

        case EstadoTareaConversacional.RECOLECTANDO_DATOS:
            console.log(`[Paso 3.2 - RECOLECTANDO_DATOS] Contexto actual:`, tareaContexto);

            if (mensaje.type !== 'text') { return { success: true, data: null }; }
            const textoUsuario = mensaje.content;

            let seHizoUnaExtraccion = false;

            // Paso 3.2.1: Intentar extraer SERVICIO
            if (!tareaContexto.servicioId) { // Solo si falta el servicio
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });
                const servicioEncontrado = serviciosDisponibles.find(s => textoUsuario.toLowerCase().includes(s.nombre.toLowerCase()));
                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                    seHizoUnaExtraccion = true;
                    console.log(`[Paso 3.2.1 - LOG] Se extrajo el servicio: ${servicioEncontrado.nombre}`);
                }
            }

            // Paso 3.2.2: Intentar extraer FECHA/HORA
            if (!tareaContexto.fechaHora) { // Solo si falta la fecha
                const userTimeZone = 'America/Mexico_City';
                const promptExtractor = `Tu tarea es analizar el texto de un usuario para extraer una fecha y hora. La fecha actual es ${new Date().toISOString()}. El usuario está en la zona horaria '${userTimeZone}'. Extrae el año, mes, día, hora (en formato 24h) y minuto. Responde únicamente con un objeto JSON con el formato: {"año":AAAA,"mes":MM,"dia":DD,"hora":HH,"minuto":mm}. Si no puedes determinar una fecha y hora, responde exactamente con la palabra 'null'. Texto a analizar: "${textoUsuario}"`;

                console.log(`[Paso 3.2.2 - LOG] Enviando prompt a IA para extraer piezas de fecha.`);
                const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: promptExtractor, contextoAsistente: { nombreAsistente: asistente.nombre, nombreNegocio: asistente.negocio!.nombre }, tareasDisponibles: [] });
                const respuestaJson = resultadoIA.data?.respuestaTextual;
                console.log(`[Paso 3.2.2 - LOG] Respuesta de IA para piezas de fecha: ${respuestaJson}`);

                if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
                    try {
                        // CORRECCIÓN: Limpiar el string de la IA antes de parsearlo para evitar errores.
                        const cleanJsonString = respuestaJson.replace(/```json\n|```/g, '').trim();
                        const fechaParts = JSON.parse(cleanJsonString);

                        const isoStringLocal = `${fechaParts.año}-${String(fechaParts.mes).padStart(2, '0')}-${String(fechaParts.dia).padStart(2, '0')}T${String(fechaParts.hora).padStart(2, '0')}:${String(fechaParts.minuto).padStart(2, '0')}:00-06:00`;
                        const fechaExtraida = new Date(isoStringLocal);

                        if (!isNaN(fechaExtraida.getTime()) && fechaExtraida > new Date()) {
                            tareaContexto.fechaHora = fechaExtraida.toISOString();
                            seHizoUnaExtraccion = true;
                            console.log(`[Paso 3.2.2 - LOG] Fecha local construida: ${isoStringLocal}. Fecha UTC final: ${fechaExtraida.toISOString()}`);
                        }
                    } catch (e) { console.error("Error al parsear JSON de fecha de la IA", e); }
                }
            }

            if (seHizoUnaExtraccion) {
                console.log('[Paso 3.2.3] Actualizando contexto en BD con datos extraídos.', tareaContexto);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });
            }

            // PASO 3.3: Decidir siguiente acción
            console.log('[Paso 3.3] Decidiendo siguiente acción post-recolección.');
            if (!tareaContexto.servicioId) {
                console.log('[Paso 3.3.1] FALTA SERVICIO. Listando servicios disponibles.');
                const resListar = await ejecutarListarServiciosDeCitasAction({}, { conversacionId, leadId, asistenteId: asistente.id, negocioId: asistente.negocio!.id, canalNombre: 'WhatsApp', tareaEjecutadaId: '' });
                if (resListar.success && resListar.data?.content) {
                    await enviarMensajeAsistente(conversacionId, resListar.data.content, usuarioWaId, negocioPhoneNumberId);
                } else {
                    await enviarMensajeAsistente(conversacionId, "Lo siento, tuve un problema al buscar nuestros servicios. Intenta de nuevo en un momento.", usuarioWaId, negocioPhoneNumberId);
                }

            } else if (!tareaContexto.fechaHora) {
                console.log('[Paso 3.3.2] FALTA FECHA. Pidiendo de nuevo.');
                await enviarMensajeAsistente(conversacionId, `Perfecto, servicio: "${tareaContexto.servicioNombre}". Ahora, ¿para qué fecha y hora te gustaría tu cita?`, usuarioWaId, negocioPhoneNumberId);
            } else {
                console.log('[Paso 3.3.3] DATOS COMPLETOS. Pasando a confirmación.');
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });

                const servicioNombre = tareaContexto.servicioNombre;
                const fechaHora = new Date(tareaContexto.fechaHora);
                const fechaLegible = fechaHora.toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Mexico_City' });

                await enviarMensajeAsistente(conversacionId, `¡Listo! Solo para confirmar: cita para "${servicioNombre}" el ${fechaLegible}. ¿Es correcto?`, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO:
            console.log(`[Paso 3.2 - PENDIENTE_CONFIRMACION] Usuario respondió a la confirmación.`);

            if (mensaje.type !== 'text') return { success: true, data: null };
            const respuestaUsuario = mensaje.content.toLowerCase();

            if (['si', 'sí', 'simon', 'afirmativo', 'confirmo', 'correcto', 'se ve bien', 'adelante'].some(kw => respuestaUsuario.includes(kw))) {
                console.log('[Paso 3.3.1 - CONFIRMADO] El usuario confirmó. Ejecutando acción final.');
                const resultadoAgendado = await ejecutarConfirmacionFinalCitaAction(tareaContexto, contexto);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                await enviarMensajeAsistente(conversacionId, resultadoAgendado.success ? `¡Excelente! Tu cita ha sido agendada con éxito. ${resultadoAgendado.data?.mensajeAdicional || ''}` : `Hubo un problema al agendar tu cita: ${resultadoAgendado.error}`, usuarioWaId, negocioPhoneNumberId);
            } else if (['no', 'nelson', 'nel', 'cancelar', 'corregir'].some(kw => respuestaUsuario.includes(kw))) {
                console.log('[Paso 3.3.2 - CORRECCIÓN] El usuario quiere corregir. Volviendo a recolectar datos.');
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.RECOLECTANDO_DATOS, contexto: {} } }); // Reseteamos el contexto para empezar de cero la corrección
                await enviarMensajeAsistente(conversacionId, "Entendido, empecemos de nuevo. ¿Para qué servicio te gustaría agendar tu cita?", usuarioWaId, negocioPhoneNumberId);
            } else {
                console.log('[Paso 3.3.3 - RESPUESTA AMBIGUA] Pidiendo aclaración.');
                const servicioNombre = tareaContexto.servicioNombre || 'el servicio seleccionado';
                const fechaHora = new Date(tareaContexto.fechaHora || '');
                const fechaLegible = fechaHora.toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Mexico_City' });
                await enviarMensajeAsistente(conversacionId, `Disculpa, no entendí. Para confirmar la cita para "${servicioNombre}" el ${fechaLegible}, responde 'sí'. Si hay un error, responde 'no'.`, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };

        default:
            console.warn(`[FSM ADVERTENCIA] Tarea '${tarea.nombreTarea}' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: true, data: null };
    }
}

/**
 * ===================================================================================
 * PASO 4: ACCIÓN FINAL (ESCRITURA EN BD)
 * ===================================================================================
 */
async function ejecutarConfirmacionFinalCitaAction(
    tareaContexto: AgendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ agenda: Agenda, mensajeAdicional?: string }>> {
    console.log('[Paso 4.1] Ejecutando acción final para crear cita en BD.');
    const { leadId, asistente, conversacionId } = fsmContexto;
    const { servicioId, fechaHora } = tareaContexto;

    if (!servicioId || !fechaHora) {
        console.error('[ERROR en Paso 4.1] Faltan datos críticos para agendar:', tareaContexto);
        return { success: false, error: "Faltan datos críticos (servicio o fecha) para agendar la cita." };
    }

    try {
        const servicio = await prisma.agendaTipoCita.findUnique({ where: { id: servicioId } });
        if (!servicio) {
            return { success: false, error: "El servicio seleccionado ya no es válido." };
        }

        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: asistente.negocio!.id,
                leadId: leadId,
                asistenteId: asistente.id,
                fecha: new Date(fechaHora),
                tipo: 'Cita',
                asunto: `Cita para: ${servicio.nombre}`,
                descripcion: `Cita agendada por asistente virtual vía WhatsApp. Conversación ID: ${conversacionId}`,
                tipoDeCitaId: servicio.id,
                status: "PENDIENTE"
            }
        });

        console.log(`[Paso 4.2] Cita creada con éxito en BD. ID: ${nuevaCita.id}`);
        return { success: true, data: { agenda: nuevaCita } };
    } catch (error) {
        console.error("[FSM ERROR] Error al crear la cita en la base de datos:", error);
        return { success: false, error: "Error interno al guardar la cita." };
    }
}


/**
 * ===================================================================================
 * FUNCIÓN AUXILIAR: SETUP DE CONVERSACIÓN
 * ===================================================================================
 */
async function setupConversacion(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<FsmContext>> {
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensaje } = input;

    const result = await prisma.$transaction(async (tx) => {
        const asistente = await tx.asistenteVirtual.findFirst({
            where: { phoneNumberId: negocioPhoneNumberId, status: 'activo' },
            include: { negocio: { include: { CRM: true } } }
        });
        if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
            throw new Error(`Configuración crítica no encontrada para PNID: ${negocioPhoneNumberId}`);
        }

        let lead = await tx.lead.findFirst({ where: { telefono: usuarioWaId, crmId: asistente.negocio.CRM.id } });
        if (lead) {
            if (nombrePerfilUsuario && lead.nombre !== nombrePerfilUsuario) {
                lead = await tx.lead.update({ where: { id: lead.id }, data: { nombre: nombrePerfilUsuario } });
            }
        } else {
            const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: asistente.negocio.CRM.id, status: 'activo' }, orderBy: { orden: 'asc' } });
            if (!primerPipeline) throw new Error(`Pipeline inicial no configurado para CRM ID: ${asistente.negocio.CRM.id}`);
            lead = await tx.lead.create({
                data: {
                    crm: { connect: { id: asistente.negocio.CRM.id } },
                    Pipeline: { connect: { id: primerPipeline.id } },
                    nombre: nombrePerfilUsuario || `Usuario ${usuarioWaId.slice(-4)}`,
                    telefono: usuarioWaId,
                    Canal: {
                        connectOrCreate: {
                            where: { crmId_nombre: { crmId: asistente.negocio.CRM.id, nombre: "WhatsApp" } },
                            create: { nombre: "WhatsApp", crmId: asistente.negocio.CRM.id }
                        }
                    }
                }
            });
        }

        let conversacion = await tx.conversacion.findFirst({ where: { whatsappId: usuarioWaId }, orderBy: { createdAt: 'desc' } });
        if (!conversacion || ['cerrada', 'archivada'].includes(conversacion.status)) {
            conversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta', phoneNumberId: negocioPhoneNumberId, whatsappId: usuarioWaId } });
        } else if (!conversacion.leadId || conversacion.leadId !== lead.id) {
            conversacion = await tx.conversacion.update({ where: { id: conversacion.id }, data: { leadId: lead.id } });
        }

        const mensajeTexto = mensaje.type === 'text' ? mensaje.content : `[Interacción no textual: ${mensaje.type}]`;
        console.log(`[LOG USUARIO] Mensaje entrante de ${usuarioWaId}: "${mensajeTexto}"`);
        await tx.interaccion.create({ data: { conversacionId: conversacion.id, role: 'user', mensajeTexto: mensajeTexto, parteTipo: InteraccionParteTipo.TEXT, canalInteraccion: 'WhatsApp' } });

        return { conversacionId: conversacion.id, leadId: lead.id, asistente };
    });

    return { success: true, data: { ...result, mensaje, usuarioWaId, negocioPhoneNumberId } };
}

// Wrapper para centralizar el log de los mensajes del asistente
async function enviarMensajeAsistente(conversacionId: string, mensaje: string, destinatarioWaId: string, negocioPhoneNumberIdEnvia: string) {
    console.log(`[LOG ASISTENTE] Enviando a ${destinatarioWaId}: "${mensaje}"`);
    return enviarMensajeInternoYWhatsAppAction({ conversacionId, contentFuncion: mensaje, role: 'assistant', parteTipo: InteraccionParteTipo.TEXT, canalOriginal: 'WhatsApp', destinatarioWaId, negocioPhoneNumberIdEnvia });
}

// La función enviarMensajeWhatsAppApiAction no necesita cambios por ahora.
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
        tipoMensaje,
        mediaUrl,
        caption,
        filename
    } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const messagePayload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: tipoMensaje,
    };

    switch (tipoMensaje) {
        case 'text':
            if (!mensajeTexto) {
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
            break;
        default:
            return { success: false, error: `Tipo de mensaje no soportado: ${tipoMensaje}` };
    }

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
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            return { success: false, error: errorMsg };
        }

        const messageId = responseData.messages?.[0]?.id;
        console.log(`[LOG] Mensaje de WhatsApp enviado con éxito. ID de Meta: ${messageId}`);
        return { success: true, data: messageId || null };

    } catch (error) {
        console.error("[WhatsApp API Sender] Error de red o desconocido:", error);
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}
