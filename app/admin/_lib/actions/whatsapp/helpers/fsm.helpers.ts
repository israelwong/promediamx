// /app/admin/_lib/actions/whatsapp/helpers/fsm.helpers.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { enviarMensajeAsistente } from '../core/orchestrator';
import type { TareaEnProgreso } from '@prisma/client';
import type { FsmContext, WhatsAppMessageInput } from '../whatsapp.schemas';

export async function verificarYmanejarEscape(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<boolean> {
    const textoUsuario = mensaje.type === 'text' ? mensaje.content.toLowerCase() : '';
    const keywordsDeCancelacion = ['no gracias', 'ya no', 'cancelar', 'olvidalo', 'detener', 'cancela'];

    if (keywordsDeCancelacion.some(kw => textoUsuario.includes(kw))) {
        console.log(`[ESCAPE] Negación detectada. Abortando tarea: '${tarea.nombreTarea}'.`);
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        await enviarMensajeAsistente(contexto.conversacionId, "Entendido, cancelamos lo que estábamos haciendo. ¿Hay algo más en lo que pueda ayudarte?", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
        return true; // Se manejó un escape
    }

    return false; // No se manejó un escape
}