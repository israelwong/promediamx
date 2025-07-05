'use server';

import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';

// Esta es la función de prueba que ejecutaremos
export async function testearIntencionAction(textoUsuario: string): Promise<string> {
    if (!textoUsuario.trim()) {
        return 'ENTRADA_VACIA';
    }

    // =================================================================================
    // <-- CORRECCIÓN 1: Se elimina el tipo simple y el "as any".
    // Construimos el array con la estructura completa y correcta que espera la función.
    // =================================================================================
    const herramientasDeIntencion = [
        {
            id: 'intent-agendar',
            nombre: 'Agendar Cita',
            funcionHerramienta: {
                nombre: 'agendar_cita',
                descripcion: "Usar para iniciar el proceso de una nueva cita. Aplica si el usuario dice 'quiero agendar', 'reservar', 'pedir informes para una fecha', o pregunta por disponibilidad como '¿tienes espacio?' o '¿puedo ir el viernes?'.",
                parametros: []
            }
        },
        {
            id: 'intent-reagendar',
            nombre: 'Reagendar Cita',
            funcionHerramienta: {
                nombre: 'reagendar_cita',
                descripcion: "Usar cuando el usuario quiere cambiar la fecha u hora de una cita ya existente. Aplica si dice 'reagendar', 'modificar', 'mover mi reunión', o 'no puedo ir el lunes, ¿podemos cambiarla?'.",
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
                descripcion: 'Usar cuando un usuario pregunta por las citas que ya tiene.',
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

    // =================================================================================
    // <-- CORRECCIÓN 2: Se construye 'contextoAsistente' con la estructura correcta.
    // Las propiedades deben ser 'nombreAsistente' y 'nombreNegocio'.
    // =================================================================================
    const contextoAsistente = {
        nombreAsistente: 'Asistente de Prueba',
        nombreNegocio: 'Negocio de Prueba'
    };

    try {
        const resultadoIA = await generarRespuestaAsistente({
            historialConversacion: [],
            mensajeUsuarioActual: textoUsuario,
            contextoAsistente: contextoAsistente,
            tareasDisponibles: herramientasDeIntencion, // Ahora el tipo coincide perfectamente
        });

        const funcionLlamada = resultadoIA.data?.llamadaFuncion;

        if (resultadoIA.success && funcionLlamada) {
            return funcionLlamada.nombreFuncion;
        } else {
            return 'solicitar_informacion_general'; // Fallback
        }
    } catch (error) {
        console.error("Error en el test de intención:", error);
        return 'ERROR_EN_EJECUCION';
    }
}