// /app/admin/_lib/actions/whatsapp/tasks/responderPreguntaNoSoportada.handler.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';
import type { FsmContext } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function responderPreguntaNoSoportada(contexto: FsmContext) {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId, asistente } = contexto;

    // 1. Buscamos la información del negocio para obtener su página web.
    const negocio = await prisma.negocio.findUnique({
        where: { id: asistente.negocio!.id },
        select: { paginaWeb: true }
    });

    // 2. Construimos el mensaje base.
    let mensaje = "Entiendo que tienes una pregunta. En este momento mi función principal es ayudarte a agendar una cita.";

    // 3. Si el negocio tiene una página web, la añadimos al mensaje.
    if (negocio?.paginaWeb) {
        mensaje += `\n\nSi lo prefieres, puedes visitar nuestro sitio web para obtener más información a detalle: ${negocio.paginaWeb}`;
    }

    // 4. Añadimos la llamada a la acción final.
    mensaje += "\n\n¿Te gustaría que agendemos una ahora?";

    await enviarMensajeAsistente(conversacionId, mensaje, usuarioWaId, negocioPhoneNumberId);

    // Creamos la tarea de seguimiento para que si el usuario dice "sí",
    // se inicie el flujo de agendamiento.
    await prisma.tareaEnProgreso.create({
        data: {
            conversacionId,
            nombreTarea: 'seguimientoGenerico',
            contexto: { siguienteTarea: 'agendarCita' } as Prisma.JsonObject
        }
    });

    return { success: true, data: null };
}
