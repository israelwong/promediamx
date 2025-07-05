// /core/orchestrator.ts
// Responsabilidad: Es el cerebro principal. Prepara el entorno y enruta las peticiones.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Tipos y Enums de Prisma
import type { TareaEnProgreso } from '@prisma/client';
import { InteraccionParteTipo } from '@prisma/client';

// Tipos personalizados y Schemas de Zod
import type { ActionResult } from '../../../types';
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput, type ProcesarMensajeWhatsAppOutput, type FsmContext, type WhatsAppMessageInput, type AsistenteContext } from '../whatsapp.schemas';

// Handlers de Tareas
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';
import { manejarSeguimiento } from '../tasks/manejarSeguimiento.handler';
import { manejarEsperandoClarificacionCostos } from '../tasks/esperandoClarificacionCostos.handler';

// Detector de Intenciones
import { manejarConversacionGeneral } from './intent-detector';

// Helpers de Acciones
import { enviarMensajeInternoYWhatsAppAction } from '../helpers/actions.helpers';


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
        await tx.interaccion.create({ data: { conversacionId: conversacion.id, role: 'user', mensajeTexto: mensajeTexto, parteTipo: InteraccionParteTipo.TEXT, canalInteraccion: 'WhatsApp' } });

        const fsmContext: FsmContext = {
            conversacionId: conversacion.id,
            leadId: lead.id,
            asistente: asistente as AsistenteContext, // Cast para asegurar la estructura
            mensaje: mensaje,
            usuarioWaId: usuarioWaId,
            negocioPhoneNumberId: negocioPhoneNumberId
        };
        return fsmContext;
    });

    return { success: true, data: result };
}

export async function enviarMensajeAsistente(conversacionId: string, mensaje: string, destinatarioWaId: string, negocioPhoneNumberIdEnvia: string) {
    console.log(`[LOG ASISTENTE] Enviando a ${destinatarioWaId}: "${mensaje}"`);
    return enviarMensajeInternoYWhatsAppAction({ conversacionId, contentFuncion: mensaje, role: 'assistant', parteTipo: InteraccionParteTipo.TEXT, canalOriginal: 'WhatsApp', destinatarioWaId, negocioPhoneNumberIdEnvia });
}

export async function manejarTareaEnProgreso(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    if (mensaje.type !== 'text') {
        // Si no es texto, por ahora simplemente continuamos con la tarea actual.
        return enrutarASubGestor(tarea, mensaje, contexto);
    }

    // First, remove all characters that are not letters, numbers, or spaces.
    const textoLimpio = mensaje.content.replace(/[^a-z0-9\s]/gi, '');

    // Then, perform the rest of your normalization.
    const textoNormalizado = textoLimpio
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // --- LÓGICA DE ESCAPE GLOBAL ---
    // Antes de continuar, revisamos si el usuario quiere hacer algo diferente.

    // 1. Escape por negación explícita o cancelación
    const keywordsDeCancelacion = ['no gracias', 'ya no', 'cancelar', 'olvidalo', 'detener'];
    if (keywordsDeCancelacion.some(kw => textoNormalizado.includes(kw))) {
        console.log(`[ESCAPE] Negación detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        await enviarMensajeAsistente(contexto.conversacionId, "Entendido, cancelamos lo que estábamos haciendo. ¿Hay algo más en lo que pueda ayudarte?", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
        return { success: true, data: null };
    }

    // 2. Escape por una nueva intención de alta prioridad (Costos)
    // Se verifica que no estemos ya en un flujo de seguimiento para evitar bucles.
    const keywordsCostos = ['costo', 'precio', 'colegiatura', 'inscripcion'];
    if (tarea.nombreTarea !== 'seguimientoGenerico' && keywordsCostos.some(kw => textoNormalizado.includes(kw))) {
        console.log(`[ESCAPE] Nueva intención 'solicitarCostos' detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        // Pasamos el control al gestor general para que inicie el nuevo flujo de costos.
        return manejarConversacionGeneral(mensaje, contexto);
    }

    // Aquí podrías añadir más reglas de escape para otras intenciones en el futuro (ej. "ver mis citas")

    // Si no se detectó ninguna intención de escape, continuamos con la tarea actual.
    return enrutarASubGestor(tarea, mensaje, contexto);
}

export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ERROR en Paso 1.1] Datos de entrada inválidos:', validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    // --- ¡NUEVA LÓGICA DE IDEMPOTENCIA! ---
    const { messageIdOriginal } = validation.data;
    if (messageIdOriginal) {
        const interaccionExistente = await prisma.interaccion.findFirst({
            where: { messageId: messageIdOriginal }
        });

        if (interaccionExistente) {
            console.log(`[IDEMPOTENCIA] Mensaje con ID ${messageIdOriginal} ya procesado. Omitiendo.`);
            return { success: true, data: null }; // Detenemos la ejecución
        }
    }
    // --- FIN DE LA LÓGICA DE IDEMPOTENCIA ---

    try {
        const setup = await setupConversacion(validation.data);
        if (!setup.success) {
            return { success: false, error: setup.error || "La configuración de la conversación falló.", errorDetails: setup.errorDetails };
        }

        let tareaActiva = setup.data ? await prisma.tareaEnProgreso.findUnique({ where: { conversacionId: setup.data.conversacionId } }) : null;

        if (tareaActiva) {
            // --- LÓGICA DE TIMEOUT MEJORADA ---
            // Leemos el timeout desde las variables de entorno, con un default generoso.
            const TIMEOUT_MINUTES = parseInt(process.env.TASK_TIMEOUT_MINUTES || '120'); // Default: 2 horas

            const AHORA = new Date();
            const ULTIMA_ACTUALIZACION = new Date(tareaActiva.updatedAt);
            const MINUTOS_INACTIVA = (AHORA.getTime() - ULTIMA_ACTUALIZACION.getTime()) / 60000;

            if (MINUTOS_INACTIVA > TIMEOUT_MINUTES) {
                console.warn(`[LIMPIEZA] Tarea obsoleta encontrada (inactiva por ${MINUTOS_INACTIVA.toFixed(2)} min). Eliminando.`);
                await prisma.tareaEnProgreso.delete({ where: { id: tareaActiva.id } });
                tareaActiva = null; // La tarea ya no existe
            }
        }

        console.log(`[Paso 1.3] ¿Tarea activa encontrada?: ${tareaActiva ? `Sí, ID: ${tareaActiva.id}, Tarea: ${tareaActiva.nombreTarea}` : 'No'}`);

        if (tareaActiva) {
            console.log('[Paso 1.4] Enrutando al GESTOR DE TAREAS.');
            return await manejarTareaEnProgreso(tareaActiva, setup.data!.mensaje, setup.data!);
        } else {
            console.log('[Paso 1.4] Enrutando al GESTOR DE CONVERSACIÓN GENERAL.');
            return await manejarConversacionGeneral(setup.data!.mensaje, setup.data!);
        }
    } catch (error: unknown) {
        console.error('[WhatsApp Orquestador] Error en el procesamiento principal:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje.' };
    }
}

/**
 * Función de ayuda para enrutar al handler correcto basado en el nombre de la tarea.
 * Evita repetir el bloque switch.
 */
function enrutarASubGestor(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
) {
    console.log(`[Paso 3.1] Gestor de Tareas: Enrutando a sub-gestor para la tarea: "${tarea.nombreTarea}"`);

    switch (tarea.nombreTarea) {
        case 'agendarCita':
            return manejarAgendarCita(tarea, mensaje, contexto);
        case 'cancelarCita':
            return manejarCancelarCita(tarea, mensaje, contexto);
        case 'reagendarCita':
            return manejarReagendarCita(tarea, mensaje, contexto);
        case 'buscarCitas':
            return manejarBuscarCitas(tarea, mensaje, contexto);
        case 'seguimientoGenerico':
            return manejarSeguimiento(tarea, mensaje, contexto);
        // --- AÑADIR EL NUEVO CASE ---
        case 'esperandoClarificacionCostos':
            return manejarEsperandoClarificacionCostos(tarea, mensaje, contexto);

        default:
            console.warn(`[FSM ADVERTENCIA] Tarea desconocida: ${tarea.nombreTarea}`);
            return prisma.tareaEnProgreso.delete({ where: { id: tarea.id } }).then(() => ({ success: false, error: "Tarea desconocida." }));
    }
}