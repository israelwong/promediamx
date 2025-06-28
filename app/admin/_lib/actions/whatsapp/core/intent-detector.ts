// /core/intent-detector.ts
// Responsabilidad: Escuchar al usuario cuando no hay una tarea activa y detectar su intención inicial.

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { EstadoTareaConversacional } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';

// Importando los handlers de sus nuevos hogares
// Update the import path and filename to match the actual file name (case-sensitive)
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';

export async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log(`[Paso 2.1] Gestor General: Analizando mensaje de usuario.`);
    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }
    const mensajeTexto = mensaje.content.toLowerCase();
    let nombreTarea: string | null = null;

    // Lógica de detección de intención
    const keywordsReagendar = ['reagendar', 'reagenda', 'cambiar', 'mover', 'modificar', 'reprogramar'];
    if (keywordsReagendar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'reagendarCita';
    }

    const keywordsCancelar = ['cancela', 'cancelar', 'eliminar', 'borrar'];
    if (!nombreTarea && keywordsCancelar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'cancelarCita';
    }

    const keywordsBuscar = [
        'que citas tengo',
        'mis citas',
        'ver mis citas',
        'ver mi agenda',
        'muéstrame mis citas',
        'cuando es mi cita',
        'qué cita tengo',
        'para cuando es mi cita',
        'cuando tengo cita',
        'tengo cita',
        'cuándo es mi cita',
        'qué citas tengo',
        'cuándo tengo cita',
        'cuándo tengo mi cita'
    ];
    if (!nombreTarea && keywordsBuscar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'buscarCitas';
    }

    const keywordsAgendar = [
        'agendar cita',
        'reservar cita',
        'nueva cita',
        'agendamiento',
        'reservación',
        'visitar la escuela',
        'visitar el colegio',
        'asistir a la escuela',
        'conocer el colegio',
        'conocer la escuela',
        'ir a ver la escuela',
    ];
    if (!nombreTarea && keywordsAgendar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'agendarCita';
    }

    if (nombreTarea) {
        console.log(`[Paso 2.2] Intención de "${nombreTarea}" detectada. Creando nueva TareaEnProgreso.`);
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
            case 'reagendarCita':
                return manejarReagendarCita(nuevaTarea, mensaje, contexto);
            case 'agendarCita':
                return manejarAgendarCita(nuevaTarea, mensaje, contexto);
            case 'cancelarCita':
                return manejarCancelarCita(nuevaTarea, mensaje, contexto);
            case 'buscarCitas':
                return manejarBuscarCitas(nuevaTarea, mensaje, contexto);
            default:
                await prisma.tareaEnProgreso.delete({ where: { id: nuevaTarea.id } });
                return { success: false, error: `Intención detectada pero sub-gestor para '${nombreTarea}' no implementado.` };
        }
    }

    console.log("[Paso 2.4] No se detectó intención de tarea. Pasando a charla general con IA (lógica no implementada).");
    return { success: true, data: null };
}