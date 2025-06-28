// /core/intent-detector.ts
// Responsabilidad: Escuchar al usuario cuando no hay una tarea activa y detectar su intención inicial.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { EstadoTareaConversacional } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Importando los handlers de sus nuevos hogares
// Update the import path and filename to match the actual file name (case-sensitive)
import { manejarAgendarCita } from '../tasks/agendarCita-x.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler-x';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';

import { detectarIntencionUsuario } from '../helpers/ia.helpers-x';
import { enviarMensajeAsistente } from './orchestrator';

export async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log(`[Paso 2.1] Gestor General: Analizando mensaje de usuario con IA.`);
    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }

    // --- ¡NUEVA LÓGICA DE DETECCIÓN CON IA! ---
    const nombreTarea = await detectarIntencionUsuario(mensaje.content);

    if (nombreTarea && nombreTarea !== 'charlaGeneral') {
        console.log(`[Paso 2.2] Intención de "${nombreTarea}" detectada por IA. Creando TareaEnProgreso.`);

        const nuevaTarea = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId: contexto.conversacionId,
                nombreTarea: nombreTarea,
                contexto: {},
                estado: EstadoTareaConversacional.RECOLECTANDO_DATOS,
            }
        });

        console.log(`[Paso 2.3] Pasando control directamente al sub-gestor: ${nombreTarea}`);
        switch (nombreTarea) {
            case 'agendarCita':
                return manejarAgendarCita(nuevaTarea, mensaje, contexto);
            case 'reagendarCita':
                return manejarReagendarCita(nuevaTarea, mensaje, contexto);
            case 'cancelarCita':
                return manejarCancelarCita(nuevaTarea, mensaje, contexto);
            case 'buscarCitas':
                return manejarBuscarCitas(nuevaTarea, mensaje, contexto);
            // case 'informacionOferta':
            //     return manejarInformacionOferta(nuevaTarea, mensaje, contexto);
            default:
                await prisma.tareaEnProgreso.delete({ where: { id: nuevaTarea.id } });
                console.warn(`Intención de IA '${nombreTarea}' detectada pero no hay un handler implementado.`);
        }
    }

    console.log(`[Paso 2.4] No se detectó intención de tarea específica o es charla general.`);
    // Opcional: enviar una respuesta genérica si no se detecta nada.
    await enviarMensajeAsistente(contexto.conversacionId, "Hola, soy el asistente virtual del Grupo Cultural Albatros. Puedo ayudarte a agendar una cita, ver tus citas existentes o darte más información. ¿Cómo te puedo ayudar hoy?", contexto.usuarioWaId, contexto.negocioPhoneNumberId);

    return { success: true, data: null };
}