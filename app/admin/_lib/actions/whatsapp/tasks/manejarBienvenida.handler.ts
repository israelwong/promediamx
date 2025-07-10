// /app/admin/_lib/actions/whatsapp/tasks/manejarBienvenida.handler.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';
import type { FsmContext } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';

export async function manejarBienvenida(contexto: FsmContext) {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId, asistente } = contexto;

    // 1. Buscamos la información del negocio para obtener el mensaje y la web.
    const negocio = await prisma.negocio.findUnique({
        where: { id: asistente.negocio!.id },
        select: { mensajeBienvenida: true, paginaWeb: true }
    });

    // 2. Construimos el mensaje base usando el que está en la base de datos.
    // Si no hay mensaje de bienvenida, usamos uno genérico.
    let mensaje = negocio?.mensajeBienvenida || "¡Hola! Gracias por contactarnos.";

    // 3. Si el negocio tiene una página web, la añadimos al mensaje.
    if (negocio?.paginaWeb) {
        mensaje += `\n\nPara más detalles, puedes visitar nuestro sitio web: ${negocio.paginaWeb}`;
    }

    // 4. Añadimos la llamada a la acción final.
    mensaje += "\n\nMi función principal es ayudarte a agendar una cita. ¿Te gustaría que empecemos?";

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
