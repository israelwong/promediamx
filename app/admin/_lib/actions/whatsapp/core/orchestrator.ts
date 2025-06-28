// /core/orchestrator.ts
// Responsabilidad: Es el cerebro principal. Prepara el entorno y enruta las peticiones.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
// Tipos y Enums de Prisma
import type { TareaEnProgreso } from '@prisma/client';
import { InteraccionParteTipo, StatusAgenda } from '@prisma/client';

// Tipos personalizados y Schemas de Zod
import type { ActionResult } from '../../../types';
import { ProcesarMensajeWhatsAppInputSchema, type ProcesarMensajeWhatsAppInput, type ProcesarMensajeWhatsAppOutput, type FsmContext, type WhatsAppMessageInput, type AsistenteContext } from '../whatsapp.schemas';

// Handlers de Tareas
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';


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
    // Ya no extraemos las variables aquí para evitar que queden sin usar.

    if (mensaje.type === 'text') {
        const textoUsuario = mensaje.content.toLowerCase();

        // MANEJO DE "META-PREGUNTAS"
        const keywordsListarCitas = ['que citas tengo', 'mis citas', 'ver mis citas'];
        if (keywordsListarCitas.some(kw => textoUsuario.includes(kw))) {

            // --- CORRECCIÓN AQUÍ ---
            // Extraemos las variables solo dentro de este bloque, donde sí se utilizan.
            const { conversacionId, leadId, usuarioWaId, negocioPhoneNumberId } = contexto;

            console.log(`[META-PREGUNTA] El usuario solicitó la lista de sus citas.`);
            const citasActivas = await prisma.agenda.findMany({
                where: { leadId, status: StatusAgenda.PENDIENTE, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' }
            });
            if (citasActivas.length > 0) {
                let mensajeLista = "Claro, estas son tus próximas citas:\n";
                citasActivas.forEach(cita => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n- ${cita.asunto} para el ${fechaLegible}`;
                });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            } else {
                await enviarMensajeAsistente(conversacionId, "Actualmente no tienes ninguna cita futura agendada.", usuarioWaId, negocioPhoneNumberId);
            }

            await enviarMensajeAsistente(conversacionId, "Continuando con nuestra tarea anterior...", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        // Lógica de Escape y Reinicio (no necesita las variables destructuradas)
        const keywordsReagendar = ['reagendar', 'reagenda', 'cambiar', 'mover', 'modificar', 'reprogramar'];
        if (tarea.nombreTarea !== 'reagendarCita' && keywordsReagendar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[ESCAPE] Intención 'reagendar' detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }

        if (tarea.nombreTarea === 'reagendarCita' && keywordsReagendar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[REINICIO] El usuario quiere reiniciar la tarea 'reagendarCita'. Eliminando tarea actual.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }

        const keywordsCancelar = ['cancela', 'cancelar', 'eliminar', 'borrar'];
        if (tarea.nombreTarea !== 'cancelarCita' && keywordsCancelar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[ESCAPE] Intención 'cancelar' detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }
    }

    // Enrutamiento a sub-gestor
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
        default:
            console.warn(`[FSM ADVERTENCIA] Tarea desconocida: ${tarea.nombreTarea}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: false, error: "Tarea desconocida." };
    }
}

export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ERROR en Paso 1.1] Datos de entrada inválidos:', validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    try {
        const setup = await setupConversacion(validation.data);
        if (!setup.success) {
            return { success: false, error: setup.error || "La configuración de la conversación falló.", errorDetails: setup.errorDetails };
        }

        let tareaActiva = setup.data ? await prisma.tareaEnProgreso.findUnique({ where: { conversacionId: setup.data.conversacionId } }) : null;

        if (tareaActiva) {
            const AHORA = new Date();
            const ULTIMA_ACTUALIZACION = new Date(tareaActiva.updatedAt);
            const MINUTOS_INACTIVA = (AHORA.getTime() - ULTIMA_ACTUALIZACION.getTime()) / 60000;
            if (MINUTOS_INACTIVA > 15) {
                console.warn(`[LIMPIEZA] Tarea obsoleta encontrada (inactiva por ${MINUTOS_INACTIVA.toFixed(2)} min). Eliminando.`);
                await prisma.tareaEnProgreso.delete({ where: { id: tareaActiva.id } });
                tareaActiva = null;
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