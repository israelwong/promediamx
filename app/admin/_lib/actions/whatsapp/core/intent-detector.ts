// app/admin/_lib/actions/whatsapp/core/intent-detector.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { EstadoTareaConversacional, type TareaEnProgreso } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

// Handlers de Tareas
import { manejarAgendarCita } from '../tasks/agendarCita.handler';
import { manejarReagendarCita } from '../tasks/reagendarCita.handler';
import { manejarCancelarCita } from '../tasks/cancelarCita.handler';
import { manejarBuscarCitas } from '../tasks/buscarCitas.handler';
import { manejarBienvenida } from '../tasks/manejarBienvenida.handler';
// import { responderPreguntaGeneral } from '../tasks/responderPreguntaGeneral.handler';
import { responderPreguntaNoSoportada } from '../tasks/responderPreguntaNoSoportada.handler'; // <-- NUEVO HANDLER
import { manejarSolicitudDeCostos } from '../tasks/manejarSolicitudDeCostos.handler';

// import { manejarCostos } from '../tasks/manejarCostos.handler';

// ====================================================================================
// DETECTOR DE INTENCIONES BASADO EN IA (FUNCTION CALLING)
// ====================================================================================
export async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log(`[GESTOR GENERAL IA] Analizando mensaje de usuario con Gemini.`);

    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }

    const textoUsuario = mensaje.content;

    if (!textoUsuario.trim()) {
        return { success: true, data: null };
    }

    // =================================================================================
    // ✅ Herramientas de Intención validadas y refinadas a través de las pruebas.
    // =================================================================================
    const herramientasDeIntencion = [
        {
            id: 'intent-agendar',
            nombre: 'Agendar Cita',
            funcionHerramienta: {
                nombre: 'agendar_cita',
                descripcion: "Esta es la herramienta principal para cuando la intención del usuario es programar, agendar, reservar o crear una nueva cita o reunión. Se debe activar si el usuario expresa el deseo de separar un espacio en el calendario, incluso si ya proporciona una fecha o detalles.",
                parametros: []
            }
        },
        {
            id: 'intent-reagendar',
            nombre: 'Reagendar Cita',
            funcionHerramienta: {
                nombre: 'reagendar_cita',
                descripcion: "Se usa cuando el usuario quiere cambiar la fecha u hora de una cita ya existente. Aplica si dice 'reagendar', 'modificar', 'mover mi reunión', o 'no puedo ir el lunes, ¿podemos cambiarla?'.",
                parametros: []
            }
        },
        {
            id: 'intent-cancelar',
            nombre: 'Cancelar Cita',
            funcionHerramienta: {
                nombre: 'cancelar_cita',
                descripcion: 'Usar cuando el usuario quiere explícitamente cancelar, borrar o eliminar una cita.',
                parametros: []
            }
        },
        {
            id: 'intent-ver-citas',
            nombre: 'Ver Citas Agendadas',
            funcionHerramienta: {
                nombre: 'ver_citas_agendadas',
                descripcion: 'Usar cuando un usuario pregunta por las citas que ya tiene agendadas.',
                parametros: []
            }
        },
        {
            id: 'intent-costos',
            nombre: 'Solicitar Costos',
            funcionHerramienta: {
                nombre: 'solicitar_costos',
                descripcion: "Usar única y exclusivamente para preguntas sobre dinero: costos, precios, colegiaturas, inscripciones, valor o métodos de pago. No usar para preguntas generales sobre qué servicios se ofrecen.",
                parametros: []
            }
        },
        {
            id: 'intent-saludar',
            nombre: 'Saludar',
            funcionHerramienta: {
                nombre: 'saludar',
                descripcion: "Usar para saludos ('hola'), agradecimientos ('gracias') o peticiones de información muy genéricas ('info'). Si la pregunta es más específica sobre un tema, usar otra herramienta.",
                parametros: []
            }
        }
    ];

    // 2. Llamamos a la IA con el mensaje y las herramientas disponibles.
    const resultadoIA = await generarRespuestaAsistente({
        historialConversacion: [],
        mensajeUsuarioActual: textoUsuario,
        contextoAsistente: { nombreAsistente: contexto.asistente.nombre, nombreNegocio: contexto.asistente.negocio?.nombre || 'el negocio' },
        tareasDisponibles: herramientasDeIntencion, // Pasamos las herramientas a la IA
    });

    const funcionLlamada = resultadoIA.data?.llamadaFuncion;
    let intencionDetectada: string | null = null;

    if (resultadoIA.success && funcionLlamada) {
        intencionDetectada = funcionLlamada.nombreFuncion;
        console.log(`[GESTOR GENERAL IA] Intención detectada por Gemini: "${intencionDetectada}"`);
    } else {
        console.log(`[GESTOR GENERAL IA] Gemini no detectó una intención específica. Se clasifica como pregunta general.`);
        intencionDetectada = 'solicitar_informacion_general';
    }

    // 3. Mapeamos la intención detectada por la IA a nuestros handlers.
    let handlerDirecto: ((contexto: FsmContext) => Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>>) | null = null;
    let nombreTareaFSM: string | null = null;

    switch (intencionDetectada) {
        case 'agendar_cita':
            nombreTareaFSM = 'agendarCita';
            break;
        case 'reagendar_cita':
            nombreTareaFSM = 'reagendarCita';
            break;
        case 'cancelar_cita':
            nombreTareaFSM = 'cancelarCita';
            break;
        case 'ver_citas_agendadas':
            nombreTareaFSM = 'buscarCitas';
            break;
        case 'saludar':
            handlerDirecto = manejarBienvenida;
            break;

        // ✅ NUESTRA REGLA DE EXCEPCIÓN
        case 'solicitar_costos':
            handlerDirecto = manejarSolicitudDeCostos;
            break;

        // "Catch-all": Cualquier otra pregunta va a nuestro nuevo handler.
        case 'pregunta_general':
        default:
            // ✅ NUEVA VERIFICACIÓN
            handlerDirecto = responderPreguntaNoSoportada; // Si está OFF, usa el Plan B
            //!! Si quieres que use IA, descomenta la siguiente línea:
            // if (contexto.asistente.conocimientoActivado) {
            //     handlerDirecto = responderPreguntaGeneral; // Si está ON, usa la IA
            // } else {
            //     handlerDirecto = responderPreguntaNoSoportada; // Si está OFF, usa el Plan B
            // }
            break;
    }

    // 4. Ejecutamos la lógica correspondiente.
    if (handlerDirecto) {
        console.log(`[GESTOR GENERAL IA] Pasando control a handler directo: ${handlerDirecto.name}`);
        return handlerDirecto(contexto);
    }

    if (nombreTareaFSM) {
        console.log(`[GESTOR GENERAL IA] Intención de FSM detectada: "${nombreTareaFSM}". Creando TareaEnProgreso.`);
        const nuevaTarea = await prisma.tareaEnProgreso.create({
            data: { conversacionId: contexto.conversacionId, nombreTarea: nombreTareaFSM, contexto: {}, estado: EstadoTareaConversacional.INICIADA }
        });

        const fsmHandlers: { [key: string]: (tarea: TareaEnProgreso, mensaje: WhatsAppMessageInput, contexto: FsmContext) => Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> } = {
            agendarCita: manejarAgendarCita,
            reagendarCita: manejarReagendarCita,
            cancelarCita: manejarCancelarCita,
            buscarCitas: manejarBuscarCitas,
        };
        const handler = fsmHandlers[nombreTareaFSM];

        if (handler) {
            return handler(nuevaTarea, mensaje, contexto);
        } else {
            await prisma.tareaEnProgreso.delete({ where: { id: nuevaTarea.id } });
            return { success: false, error: `Sub-gestor para '${nombreTareaFSM}' no implementado.` };
        }
    }

    return { success: true, data: null };
}