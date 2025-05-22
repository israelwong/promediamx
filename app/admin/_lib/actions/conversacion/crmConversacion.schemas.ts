//ruta actual app/admin/_lib/actions/negocio/negocioImagenLogo.actions.ts

import { AgenteBasico } from '@/app/admin/_lib/agente.types';


export interface ParametroParaIA { // Como lo consume construirHerramientasParaGemini
    nombre: string;          // Antes nombreInterno/nombreVisible, ahora TareaFuncionParametro.nombre (snake_case)
    tipo: string;            // Antes tipoDato, ahora TareaFuncionParametro.tipoDato
    descripcion?: string | null; // Antes descripcion/nombreVisible, ahora TareaFuncionParametro.descripcionParaIA
    esObligatorio: boolean;  // Sigue igual
}

export interface FuncionHerramientaIA { // Como lo consume construirHerramientasParaGemini
    nombre: string;                 // Antes nombreInterno, ahora TareaFuncion.nombre (camelCase)
    descripcion?: string | null;    // Antes TareaFuncion.descripcion, ahora también TareaFuncion.descripcion (la interna del admin, usada como fallback por construirHerramientasParaGemini)
    parametros: ParametroParaIA[];
}

export interface TareaCapacidadIA { // Como lo consume construirHerramientasParaGemini
    id: string;
    nombre?: string; // Nombre de la Tarea (de Tarea.nombre)
    descripcionTool?: string | null; // Descripción principal para la IA (de Tarea.descripcionTool)
    instruccionParaIA?: string | null; // Instrucción detallada para la IA (de Tarea.instruccion)
    funcionHerramienta?: FuncionHerramientaIA | null;
    camposPersonalizadosRequeridos?: ParametroParaIA[]; // Se mantiene si TareaCampoPersonalizado sigue en uso
}

export type ChatMessageItem = {
    id: string; // ID de la Interaccion
    conversacionId: string;
    role: 'user' | 'assistant' | 'agent' | 'system';
    mensaje: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: Date;
    nombreRemitente?: string | null; // Nombre a mostrar (Lead, "Asistente IA", o nombre del Agente)
    agenteCrm?: AgenteBasico | null; // Información del Agente CRM si role === 'agent' y agenteCrmId está presente en Interaccion
};


export interface GenerarRespuestaAsistenteConHerramientasInput {
    historialConversacion: Pick<ChatMessageItem, 'role' | 'mensaje'>[];
    mensajeUsuarioActual: string;
    contextoAsistente: {
        nombreAsistente: string;
        descripcionAsistente?: string | null;
        nombreNegocio: string;
        // configNegocio: {
        //     aceptaPresencial: boolean | undefined;
        //     aceptaRemoto: boolean | undefined;
        // }
    };
    tareasDisponibles: TareaCapacidadIA[]; // Lista de tareas/herramientas que el asistente puede usar
    // Opcional: Podríamos pasar aquí los datos actuales del Lead (incluyendo jsonParams con campos personalizados ya llenos)
    // para que la IA sepa qué información ya tiene y qué necesita preguntar.
    // datosLeadActuales?: Record<string, any>; 
}


export interface GenerarRespuestaAsistenteConHerramientasInput {
    historialConversacion: Pick<ChatMessageItem, 'role' | 'mensaje'>[];
    mensajeUsuarioActual: string;
    contextoAsistente: {
        nombreAsistente: string;
        descripcionAsistente?: string | null;
        nombreNegocio: string;
        // configNegocio: {
        //     aceptaPresencial: boolean | undefined;
        //     aceptaRemoto: boolean | undefined;
        // }
    };
    tareasDisponibles: TareaCapacidadIA[]; // Lista de tareas/herramientas que el asistente puede usar
    // Opcional: Podríamos pasar aquí los datos actuales del Lead (incluyendo jsonParams con campos personalizados ya llenos)
    // para que la IA sepa qué información ya tiene y qué necesita preguntar.
    // datosLeadActuales?: Record<string, any>; 
}

export interface LlamadaFuncionDetectada {
    nombreFuncion: string; // El nombreInterno de la TareaFuncion a llamar
    argumentos: Record<string, unknown>; // Argumentos extraídos por la IA para la función (incluirá tanto parámetros estándar como campos personalizados si son relevantes para la función)
}



export interface RespuestaAsistenteConHerramientas {
    respuestaTextual: string | null; // Respuesta para mostrar directamente al usuario
    llamadaFuncion?: LlamadaFuncionDetectada | null; // Si la IA decide llamar a una función
    pensamientoIA?: string | null; // Opcional: "Pensamiento" o "chain of thought" de la IA
}
