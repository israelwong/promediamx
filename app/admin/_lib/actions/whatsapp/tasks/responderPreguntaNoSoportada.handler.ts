// /app/admin/_lib/actions/whatsapp/tasks/responderPreguntaNoSoportada.handler.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';
import { enviarMensajeAsistente } from '../core/orchestrator';

interface ResponderPreguntaNoSoportadaContexto {
    conversacionId: string;
    usuarioWaId: string;
    negocioPhoneNumberId: string;
}

interface ResponderPreguntaNoSoportadaResult {
    success: boolean;
    data: null;
}

export async function responderPreguntaNoSoportada(
    contexto: ResponderPreguntaNoSoportadaContexto
): Promise<ResponderPreguntaNoSoportadaResult> {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    const mensaje = "En este momento, mi función principal es ayudarte a agendar una cita para que un asesor resuelva todas tus dudas. ¿Te gustaría que agendemos una?";
    await enviarMensajeAsistente(conversacionId, mensaje, usuarioWaId, negocioPhoneNumberId);

    // Creamos una tarea de seguimiento para que si el usuario dice "sí",
    // se inicie el flujo de agendamiento.
    await prisma.tareaEnProgreso.create({
        data: {
            conversacionId,
            nombreTarea: 'seguimientoGenerico',
            contexto: {
                siguienteTarea: 'agendarCita',
                preguntaDeCierre: '' // No hay pregunta de cierre, solo esperamos la confirmación.
            } as Prisma.JsonObject
        }
    });

    return { success: true, data: null };
}