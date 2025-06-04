// Propuesta para: app/admin/_lib/dispatcher/dispatcher.types.ts
// O para añadir en: app/admin/_lib/types.ts

import type { SimpleFuncionContext, ActionResult } from '@/app/admin/_lib/types'; // Asume que SimpleFuncionContext y ActionResult ya existen en tu archivo global de tipos
import type { MediaItem } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas'; // Asume que MediaItem y FunctionResponseMediaData están aquí

// Estructura esperada para la respuesta de una función ejecutada exitosamente
// que el dispatcher pueda procesar para enviar al usuario.
export interface FunctionResponsePayload {
    content: string | null;
    media?: MediaItem[] | null;
    uiComponentPayload?: Record<string, unknown> | null;
    // Datos estructurados que representan el "resultado" de la función para la IA.
    // Esto es lo que irá en el historial de Gemini como 'response' del FunctionResponsePart.
    aiContextData?: Record<string, unknown>;
}

// Contexto extendido que se pasará a cada función ejecutora
export interface FullExecutionFunctionContext extends SimpleFuncionContext {
    tareaEjecutadaId: string;
    // Aquí podrías añadir otros datos comunes que el dispatcher ya tiene y podrían ser útiles,
    // como 'asistenteDb' o 'negocioDb' completos si muchas funciones los necesitan.
}

// Firma estándar para todas las funciones que se registren en el dispatcher
export type FunctionExecutor = (
    argsFromIA: Record<string, unknown>, // Argumentos parseados de la IA (JSON como objeto)
    context: FullExecutionFunctionContext
) => Promise<ActionResult<FunctionResponsePayload | null>>; // El payload de datos exitoso debe ser FunctionResponsePayload o null