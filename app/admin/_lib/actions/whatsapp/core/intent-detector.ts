// RUTA: /actions/whatsapp/core/intent-detector.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { EstadoTareaConversacional } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, WhatsAppMessageInput } from '../whatsapp.schemas';
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

// Handlers de Tareas
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';
import { responderPreguntaNoSoportada } from '../tasks/responderPreguntaNoSoportada.handler';
import { enviarMensajeAsistente } from '../core/orchestrator-original';



export async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<unknown>> {
    console.log(`[INTENT-DETECTOR] Analizando mensaje con Gemini.`);

    if (mensaje.type !== 'text' || !mensaje.content.trim()) {
        return { success: true, data: null };
    }

    const herramientasDeIntencion = [
        { id: 'intent-agendar', nombre: 'Agendar Cita', funcionHerramienta: { nombre: 'agendar_cita', descripcion: "Para programar, agendar, reservar o crear una nueva cita.", parametros: [] } },
        { id: 'intent-reagendar', nombre: 'Reagendar Cita', funcionHerramienta: { nombre: 'reagendar_cita', descripcion: "Para cambiar la fecha u hora de una cita existente.", parametros: [] } },
        { id: 'intent-cancelar', nombre: 'Cancelar Cita', funcionHerramienta: { nombre: 'cancelar_cita', descripcion: 'Para cancelar, borrar o eliminar una cita.', parametros: [] } },
        { id: 'intent-ver-citas', nombre: 'Ver Citas Agendadas', funcionHerramienta: { nombre: 'ver_citas_agendadas', descripcion: 'Para preguntar por citas ya agendadas.', parametros: [] } },
        { id: 'intent-saludar', nombre: 'Saludar', funcionHerramienta: { nombre: 'saludar', descripcion: "Para saludos ('hola'), agradecimientos ('gracias') o peticiones genéricas ('info').", parametros: [] } }
    ];

    try {
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: [],
            mensajeUsuarioActual: mensaje.content,
            contextoAsistente: { nombreAsistente: contexto.asistente.nombre, nombreNegocio: contexto.asistente.negocio?.nombre || 'el negocio' },
            tareasDisponibles: herramientasDeIntencion,
        });

        const funcionLlamada = resultadoIA.data?.llamadaFuncion;
        let intencionDetectada = 'pregunta_general'; // Default

        if (resultadoIA.success && funcionLlamada) {
            intencionDetectada = funcionLlamada.nombreFuncion;
            console.log(`[INTENT-DETECTOR] Intención detectada por Gemini: "${intencionDetectada}"`);
        } else {
            console.log(`[INTENT-DETECTOR] Gemini no detectó una intención específica. Se clasifica como pregunta general.`);
        }

        const fsmHandlers = {
            'agendar_cita': { handler: manejarAgendarCita, nombre: 'agendarCita' },
            'reagendar_cita': { handler: manejarReagendarCita, nombre: 'reagendarCita' },
            'cancelar_cita': { handler: manejarCancelarCita, nombre: 'cancelarCita' },
            'ver_citas_agendadas': { handler: manejarBuscarCitas, nombre: 'buscarCitas' },
        };

        const fsmMapping = fsmHandlers[intencionDetectada as keyof typeof fsmHandlers];

        if (fsmMapping) {
            console.log(`[INTENT-DETECTOR] Creando TareaEnProgreso para: "${fsmMapping.nombre}".`);
            const nuevaTarea = await prisma.tareaEnProgreso.create({
                data: { conversacionId: contexto.conversacionId, nombreTarea: fsmMapping.nombre, contexto: {}, estado: EstadoTareaConversacional.INICIADA }
            });
            return fsmMapping.handler(nuevaTarea, mensaje, contexto);
        } else {
            console.log(`[INTENT-DETECTOR] No es una tarea de FSM. Pasando a handler de respuesta directa.`);
            return responderPreguntaNoSoportada(contexto);
        }
    } catch (error) {
        console.error("[INTENT-DETECTOR] Error al llamar a la IA o procesar la intención:", error);
        // Fallback seguro: si la IA falla, no bloqueamos al usuario.
        await enviarMensajeAsistente(contexto.conversacionId, "Lo siento, estoy teniendo problemas para procesar tu solicitud. Por favor, intenta de nuevo en un momento.", contexto.usuarioWaId, contexto.negocioPhoneNumberId);
        return { success: false, error: "Error en la detección de intención." };
    }
}
