// /tasks/buscarCitas.handler.ts
// Este handler contiene la lógica para la tarea de buscar citas.
// Es un handler simple de una sola acción.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { ejecutarBuscarCitasAction } from '../helpers/actions.helpers';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarBuscarCitas(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    // Esta tarea es tan simple que se ejecuta de inmediato.
    const resultado = await ejecutarBuscarCitasAction({}, contexto);

    if (resultado.success) {
        await enviarMensajeAsistente(conversacionId, resultado.data!.content, usuarioWaId, negocioPhoneNumberId);
    } else {
        await enviarMensajeAsistente(conversacionId, resultado.error || "Lo siento, algo salió mal.", usuarioWaId, negocioPhoneNumberId);
    }

    // Como la tarea es de una sola acción, la eliminamos inmediatamente después de completarla.
    await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

    return { success: true, data: null };
}