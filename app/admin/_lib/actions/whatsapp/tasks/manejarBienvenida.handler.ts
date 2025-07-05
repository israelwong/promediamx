// app/admin/_lib/actions/whatsapp/tasks/manejarBienvenida.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';

// Tipos
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput } from '../whatsapp.schemas';

// Helpers
import { enviarMensajeAsistente } from '../core/orchestrator';

/**
 * Handler para gestionar el primer contacto o preguntas genéricas.
 * Su única responsabilidad es buscar y enviar el mensaje de bienvenida
 * configurado en el modelo de Negocio. No crea ninguna TareaEnProgreso.
 */
export async function manejarBienvenida(
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log('[BIENVENIDA HANDLER] Iniciando, recuperando mensaje de bienvenida.');
    const { conversacionId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;

    try {
        // El contexto ya nos da el asistente, que tiene la relación con el negocio.
        // No necesitamos volver a consultar al asistente.
        const negocio = await prisma.negocio.findUnique({
            where: {
                id: asistente.negocio!.id,
            },
            select: {
                mensajeBienvenida: true,
            }
        });

        const mensajeAEnviar = negocio?.mensajeBienvenida;

        if (mensajeAEnviar && mensajeAEnviar.trim() !== '') {
            await enviarMensajeAsistente(conversacionId, mensajeAEnviar, usuarioWaId, negocioPhoneNumberId);
            console.log('[BIENVENIDA HANDLER] Mensaje de bienvenida enviado con éxito.');
        } else {
            // Fallback por si el mensaje no está configurado en la base de datos.
            console.warn(`[BIENVENIDA HANDLER] No se encontró un mensaje de bienvenida para el negocio ID: ${asistente.negocio!.id}`);
            const mensajeFallback = `¡Hola! Gracias por comunicarte con ${asistente.negocio!.nombre}. ¿En qué puedo ayudarte hoy?`;
            await enviarMensajeAsistente(conversacionId, mensajeFallback, usuarioWaId, negocioPhoneNumberId);
        }

        // Este handler no continúa un flujo, solo responde y espera el siguiente
        // input del usuario, que será procesado de nuevo por el intent-detector.
        return { success: true, data: null };

    } catch (error) {
        console.error("[BIENVENIDA HANDLER] Error al procesar el saludo:", error);
        // Enviamos un saludo genérico para no dejar al usuario sin respuesta.
        const mensajeError = "¡Hola! Gracias por comunicarte. ¿Cómo puedo ayudarte?";
        await enviarMensajeAsistente(conversacionId, mensajeError, usuarioWaId, negocioPhoneNumberId);
        return { success: false, error: "Error interno en el handler de bienvenida." };
    }
}