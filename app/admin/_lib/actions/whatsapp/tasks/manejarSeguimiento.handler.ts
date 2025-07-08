// /app/admin/_lib/actions/whatsapp/tasks/manejarSeguimiento.handler.ts
// VERSIÓN FINAL - CON MANEJO DE DIGRESIONES

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';
import { manejarAgendarCita } from './agendarCita.handler';
import { manejarConversacionGeneral } from '../core/intent-detector';

export async function manejarSeguimiento(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;
    const textoUsuario = mensaje.type === 'text' ? mensaje.content : '';

    const { siguienteTarea } = (tarea.contexto as { siguienteTarea?: string }) || {};

    if (!siguienteTarea) {
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        return { success: false, error: "Contexto de seguimiento inválido." };
    }

    const keywordsAfirmativos = ['si', 'sí', 'claro', 'ok', 'por favor', 'me gustaría', 'agenda', 'agendar'];
    const keywordsNegativos = ['no', 'nel', 'despues', 'luego', 'ahora no', 'gracias'];

    if (keywordsAfirmativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
        // --- CAMINO 1: El usuario dice "SÍ" ---
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

        const nuevaTarea = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId,
                nombreTarea: siguienteTarea,
                contexto: {} as Prisma.JsonObject,
                estado: EstadoTareaConversacional.INICIADA
            }
        });

        if (siguienteTarea === 'agendarCita') {
            return manejarAgendarCita(nuevaTarea, mensaje, contexto);
        }

    } else if (keywordsNegativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
        // --- CAMINO 2: El usuario dice "NO" ---
        await enviarMensajeAsistente(conversacionId, "Entendido. ¿Hay algo más en lo que pueda ayudarte?", usuarioWaId, negocioPhoneNumberId);
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

    } else {
        // --- CAMINO 3: El usuario cambió de tema (hizo otra pregunta) ---
        console.log("[SEGUIMIENTO] Digresión detectada. Abortando seguimiento y pasando a GESTOR GENERAL.");
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        // Le devolvemos la estafeta al director de orquesta para que analice la nueva pregunta.
        return manejarConversacionGeneral(mensaje, contexto);
    }

    return { success: true, data: null };
}