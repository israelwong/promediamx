// /app/admin/_lib/actions/whatsapp/tasks/buscarCitas.handler.ts

// ==================================================================
// MANEJADOR DE TAREA: buscarCitas
// VERSIÓN: 1.0 - SELLADA
// FECHA DE SELLADO: 4 de Julio de 2025
//
// DESCRIPCIÓN:
// Handler de un solo paso que se activa cuando un usuario
// solicita ver sus citas pendientes. Realiza una consulta a la
// base de datos y formatea la respuesta para el usuario.
//
// NOTA DE REFACTORIZACIÓN:
// La lógica es simple, directa y cumple su propósito.
// No se requieren refactorizaciones futuras.
// ==================================================================

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso } from '@prisma/client';
import { StatusAgenda } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarBuscarCitas(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, leadId, usuarioWaId, negocioPhoneNumberId } = contexto;

    console.log(`[BUSCAR CITAS] Buscando citas para el lead ID: ${leadId}`);

    try {
        const citasPendientes = await prisma.agenda.findMany({
            where: {
                leadId: leadId,
                status: StatusAgenda.PENDIENTE,
                fecha: {
                    // Buscamos citas de ahora en adelante
                    gte: new Date()
                }
            },
            orderBy: {
                fecha: 'asc'
            },
            include: {
                tipoDeCita: {
                    select: { nombre: true }
                }
            }
        });

        let mensajeRespuesta = '';

        if (citasPendientes.length === 0) {
            mensajeRespuesta = "No tienes ninguna cita programada en este momento. ¿Te gustaría agendar una?";
        } else {
            mensajeRespuesta = "Estas son tus próximas citas agendadas:\n";
            citasPendientes.forEach((cita, index) => {
                const nombreServicio = cita.tipoDeCita?.nombre || 'Cita';
                const fechaFormateada = new Date(cita.fecha).toLocaleString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Mexico_City'
                });
                mensajeRespuesta += `\n${index + 1}. **${nombreServicio}** el ${fechaFormateada}`;
            });
        }

        await enviarMensajeAsistente(conversacionId, mensajeRespuesta, usuarioWaId, negocioPhoneNumberId);

    } catch (error) {
        console.error("Error en manejarBuscarCitas:", error);
        await enviarMensajeAsistente(conversacionId, "Tuve un problema al buscar tus citas. Por favor, intenta de nuevo más tarde.", usuarioWaId, negocioPhoneNumberId);
    }

    // Esta tarea es de un solo paso, por lo que siempre se elimina al finalizar.
    await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

    return { success: true, data: null };
}