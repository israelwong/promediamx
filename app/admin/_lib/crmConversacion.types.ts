//admin/_lib/crmConversacion.types.ts

import { AgenteBasico } from '@/app/admin/_lib/agente.types';

// Tipo para los detalles de la conversación que podría necesitar el chat o el panel de herramientas
export type ConversationDetails = {
    id: string;
    status: string;
    leadId?: string | null;
    leadNombre?: string | null;
    // ... otros campos que puedan ser útiles
};


// Interfaz para los datos que el componente ChatComponent podría necesitar
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'agent' | 'system';
    mensaje: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: Date | string; // Puede ser string si viene de API y no se parsea a Date inmediatamente
    nombreRemitente?: string; // Para mostrar nombre en mensajes de sistema o agente
}

/**
 * Representa un mensaje individual dentro de la interfaz de chat.
 * Incluye información del agente que envió el mensaje si aplica.
 */
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


/**
 * Tipo para los detalles de la conversación.
 * Incluye información del lead y del agente CRM actualmente asignado.
 */
export type ConversationDetailsForPanel = {
    id: string; // Conversation ID
    status: string;
    leadId?: string | null;
    leadNombre?: string | null;
    agenteCrmActual?: AgenteBasico | null; // Agente actualmente asignado a la conversación
    // Otros campos relevantes de la conversación...
    canalOrigen?: 'whatsapp' | 'webchat' | 'otro' | null; // Indica el canal principal o inicial

};

/**
 * Tipo para los detalles más completos de un Lead para mostrar en el ToolsPanel.
 */
export type LeadDetailsForPanel = {
    id: string;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    // ...otros campos del Lead ...
};

/**
 * Tipo para una etiqueta del CRM.
 */
export type EtiquetaCrmItem = {
    id: string;
    nombre: string;
    color?: string | null;
};


/**
 * Datos de entrada para la acción de enviar un mensaje como usuario final.
 */
export type EnviarMensajeUsuarioInput = {
    conversationId: string;
    mensaje: string;
};


/** //! WEBCHAT */


/**
 * Datos de entrada para la acción que inicia una nueva conversación desde el webchat.
 */
export interface IniciarConversacionWebchatInput {
    asistenteId: string;
    mensajeInicial: string;
    remitenteIdWeb: string; // Identificador único del usuario en el webchat (ej. UUID de localStorage)
    nombreRemitenteSugerido?: string; // Nombre opcional para el Lead al crearlo
    canalId?: string; // ID del canal de webchat
}

/**
 * Datos devueltos por la acción IniciarConversacionWebchatAction tras una ejecución exitosa.
 */
export interface IniciarConversacionWebchatData {
    conversationId: string;
    interaccionUsuarioId: string;
    leadId: string;
    respuestaAsistente?: string | null; // Texto de la respuesta de la IA
    interaccionAsistenteId?: string;    // ID de la interacción de la IA
    // Opcional: Podrías devolver los objetos ChatMessageItem completos si el frontend los necesita inmediatamente
    mensajeUsuario?: ChatMessageItem;
    mensajeAsistente?: ChatMessageItem;
}

/**
 * Datos de entrada para la acción que envía un mensaje a una conversación webchat existente.
 */
export interface EnviarMensajeWebchatInput {
    conversationId: string;
    mensaje: string;
    remitenteIdWeb: string; // Se mantiene para consistencia o logging, aunque el lead ya está asociado
}

/**
 * Datos devueltos por la acción EnviarMensajeWebchatAction tras una ejecución exitosa.
 */
export interface EnviarMensajeWebchatData {
    interaccionUsuarioId: string;
    respuestaAsistente?: string | null; // Texto de la respuesta de la IA
    interaccionAsistenteId?: string;    // ID de la interacción de la IA
    // Opcional: Podrías devolver los objetos ChatMessageItem completos
    mensajeUsuario?: ChatMessageItem;
    mensajeAsistente?: ChatMessageItem;
}

/**
 * Describe un parámetro requerido, ya sea por una TareaFuncion o como un CRMCampoPersonalizado para una Tarea.
 * Formateado para la IA.
 */
export interface ParametroParaIA {
    nombre: string; // nombreInterno del ParametroRequerido o nombreCampo del CRMCampoPersonalizado
    tipo: string;   // tipoDato del ParametroRequerido o tipo del CRMCampoPersonalizado
    descripcion?: string | null; // Descripción del parámetro o nombreVisible del CRMCampoPersonalizado
    esObligatorio: boolean; // Determinado por TareaFuncionParametroRequerido.esObligatorio o TareaCampoPersonalizado.esRequerido
}

/**
 * Describe una TareaFuncion, formateada como una herramienta para la IA.
 * Sus parámetros son los definidos directamente en TareaFuncionParametroRequerido.
 */
export interface FuncionHerramientaIA {
    nombreInterno: string; // nombreInterno de la TareaFuncion (este es el que la IA llamará)
    nombreVisible?: string; // nombreVisible de la TareaFuncion
    descripcion?: string | null;
    parametros: ParametroParaIA[]; // Parámetros estándar de la función
}

/**
 * Describe una Tarea disponible para el asistente, incluyendo su función si existe
 * y los campos personalizados del CRM que requiere,
 * formateada para que la IA la entienda como una capacidad.
 */
export interface TareaCapacidadIA {
    id: string; // ID de la Tarea original
    nombre?: string; // Nombre de la Tarea
    descripcion?: string | null; // Descripción de la Tarea (para IA/OpenAPI)
    instruccionParaIA?: string | null; // La 'instruccion' detallada de la Tarea
    funcionHerramienta?: FuncionHerramientaIA | null; // La función de automatización asociada, si existe
    // NUEVO: Campos personalizados del CRM requeridos específicamente por ESTA TAREA
    camposPersonalizadosRequeridos?: ParametroParaIA[];
}

/**
 * Datos de entrada actualizados para la acción generarRespuestaAsistente.
 */
export interface GenerarRespuestaAsistenteConHerramientasInput {
    historialConversacion: Pick<ChatMessageItem, 'role' | 'mensaje'>[];
    mensajeUsuarioActual: string;
    contextoAsistente: {
        nombreAsistente: string;
        descripcionAsistente?: string | null;
        nombreNegocio: string;
        // Podrías añadir más contexto del negocio aquí si es necesario
    };
    tareasDisponibles: TareaCapacidadIA[]; // Lista de tareas/herramientas que el asistente puede usar
    // Opcional: Podríamos pasar aquí los datos actuales del Lead (incluyendo jsonParams con campos personalizados ya llenos)
    // para que la IA sepa qué información ya tiene y qué necesita preguntar.
    // datosLeadActuales?: Record<string, any>; 
}

/**
 * Representa la decisión de la IA de llamar a una función.
 */
export interface LlamadaFuncionDetectada {
    nombreFuncion: string; // El nombreInterno de la TareaFuncion a llamar
    argumentos: Record<string, unknown>; // Argumentos extraídos por la IA para la función (incluirá tanto parámetros estándar como campos personalizados si son relevantes para la función)
}

/**
 * Datos devueltos por la acción generarRespuestaAsistente cuando usa herramientas.
 * Puede ser una respuesta textual directa o una solicitud para llamar a una función.
 */
export interface RespuestaAsistenteConHerramientas {
    respuestaTextual: string | null; // Respuesta para mostrar directamente al usuario
    llamadaFuncion?: LlamadaFuncionDetectada | null; // Si la IA decide llamar a una función
    pensamientoIA?: string | null; // Opcional: "Pensamiento" o "chain of thought" de la IA
}

// --- Tipos para acciones de pausa/reanudación (si no están ya) ---
export interface PausarReanudarInput {
    conversationId: string;
    agenteId: string;
    nombreAgente: string | null | undefined;
}

// --- Tipos para acción de envío de mensajes (asegúrate que esté actualizado) ---
export type EnviarMensajeInput = {
    conversacionId: string;
    mensaje: string;
    role: 'user' | 'assistant' | 'agent' | 'system'; // Asegúrate que 'agent' esté permitido
    agenteCrmId?: string | null; // ID del Agente CRM si role === 'agent'
};

export type ConversationPreviewItem = {
    id: string;
    leadId?: string | null;
    leadName: string;
    lastMessagePreview: string;
    lastMessageTimestamp: Date;
    status: string;
    avatarUrl?: string | null;
    unreadCount?: number;
    // --- NUEVO CAMPO ---
    canalOrigen?: 'whatsapp' | 'webchat' | 'otro' | null; // Indica el canal
    // --- FIN NUEVO CAMPO ---
};


export interface IniciarConversacionWebchatData {
    conversationId: string;
    interaccionUsuarioId: string;
    leadId: string;
    respuestaAsistente?: string | null;
    interaccionAsistenteId?: string;
    mensajeUsuario?: ChatMessageItem;
    mensajeAsistente?: ChatMessageItem;
}

/**
 * Datos devueltos por la acción IniciarConversacionWebchatAction (extendido).
 * Incluye opcionalmente el mensaje resultante de la ejecución de una función por el dispatcher.
 */
export interface IniciarConversacionWebchatDataConDispatcher extends IniciarConversacionWebchatData {
    mensajeResultadoFuncion?: ChatMessageItem | null; // Mensaje devuelto por el dispatcher
}

/**
 * Datos devueltos por la acción EnviarMensajeWebchatAction (versión base).
 */
export interface EnviarMensajeWebchatData {
    interaccionUsuarioId: string;
    respuestaAsistente?: string | null;
    interaccionAsistenteId?: string;
    mensajeUsuario?: ChatMessageItem;
    mensajeAsistente?: ChatMessageItem;
}

/**
 * Datos devueltos por la acción EnviarMensajeWebchatAction (extendido).
 * Incluye opcionalmente el mensaje resultante de la ejecución de una función por el dispatcher.
 */
export interface EnviarMensajeWebchatDataConDispatcher extends EnviarMensajeWebchatData {
    mensajeResultadoFuncion?: ChatMessageItem | null; // Mensaje devuelto por el dispatcher
}