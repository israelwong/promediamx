// ruta: app/admin/_lib/actions/conversacion/crmConversacion.actions.ts
// (Asegúrate que la ruta sea la correcta para tus esquemas del CRM)
// import { z } from 'zod';
// import { InteraccionParteTipo } from '@prisma/client'; // Importar el enum de Prisma

// // Esquema para la información básica de un agente (ya lo tenías)
// export const agenteBasicoSchema = z.object({
//     id: z.string().cuid(),
//     nombre: z.string().nullable(),
// });
// export type AgenteBasicoData = z.infer<typeof agenteBasicoSchema>;

// // Esquema para los detalles de una conversación para el panel (ya lo tenías)
// export const conversacionDetailsForPanelSchema = z.object({
//     id: z.string().cuid(),
//     status: z.string(), // Podrías usar un z.enum si los estados son fijos
//     leadId: z.string().cuid().nullable(),
//     leadNombre: z.string().nullable(),
//     agenteCrmActual: agenteBasicoSchema.nullable(),
//     // canalOrigen: z.string().nullable().optional(), // Si lo añades desde la acción
// });
// export type ConversationDetailsForPanelData = z.infer<typeof conversacionDetailsForPanelSchema>;

// // Esquema para los parámetros de entrada de obtenerDetallesConversacionAction (ya lo tenías)
// export const obtenerDetallesConversacionParamsSchema = z.object({
//     conversacionId: z.string().cuid("ID de conversación inválido."),
// });
// export type ObtenerDetallesConversacionParams = z.infer<typeof obtenerDetallesConversacionParamsSchema>;

// // Esquema para cada item en la vista previa de la lista de conversaciones
// // Actualizado para usar mensajeTexto
// export const conversacionPreviewItemSchema = z.object({
//     id: z.string().cuid(),
//     leadId: z.string().cuid().nullable().optional(),
//     leadName: z.string(),
//     lastMessagePreview: z.string().nullable(), // Viene de mensajeTexto
//     lastMessageTimestamp: z.date(),
//     status: z.string(),
//     avatarUrl: z.string().url().nullable().optional(),
//     canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(), // 'desconocido' como fallback
//     canalIcono: z.string().nullable().optional(), // URL del icono del canal
// });
// export type ConversacionPreviewItemData = z.infer<typeof conversacionPreviewItemSchema>;

// // Esquema para los parámetros de entrada de listarConversacionesAction (ya lo tenías)
// export const listarConversacionesParamsSchema = z.object({
//     negocioId: z.string().cuid("ID de negocio inválido."),
//     searchTerm: z.string().nullable().optional(),
//     filtroStatus: z.enum(['activas', 'archivadas', 'todas']).default('activas'),
//     filtroPipelineId: z.string().cuid().nullable().optional(),
// });
// export type ListarConversacionesParams = z.infer<typeof listarConversacionesParamsSchema>;

// // --- ESQUEMAS PARA MENSAJES DE CHAT EN EL CRM (ChatComponent) ---

// // Esquema para un item de mensaje de chat para el CRM
// // Similar a ChatMessageItemSchema de chatTest, pero específico para el CRM si es necesario.
// // Adaptado para la nueva estructura de Interaccion.
// export const chatMessageItemCrmSchema = z.object({
//     id: z.string().cuid(),
//     conversacionId: z.string().cuid(),
//     role: z.string(), // roles: user, assistant, agent, system, function. Validar más estrictamente si es necesario.

//     mensajeTexto: z.string().nullable().optional(),

//     // Campos estructurales de IA (opcionales para la UI, pero pueden estar en los datos)
//     parteTipo: z.nativeEnum(InteraccionParteTipo).default('TEXT').nullable().optional(),
//     functionCallNombre: z.string().nullable().optional(),
//     functionCallArgs: z.record(z.any()).nullable().optional(),
//     functionResponseData: z.record(z.any()).nullable().optional(),

//     mediaUrl: z.string().url().nullable().optional(),
//     mediaType: z.string().nullable().optional(),
//     createdAt: z.preprocess((arg) => { // Para asegurar que Prisma Date o string se conviertan a Date
//         if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
//         return arg;
//     }, z.date()),
//     agenteCrm: agenteBasicoSchema.nullable().optional(),
// });
// export type ChatMessageItemCrmData = z.infer<typeof chatMessageItemCrmSchema>;

// // Esquema para los parámetros de entrada de la acción que obtiene los mensajes del CRM
// export const obtenerMensajesCrmParamsSchema = z.object({
//     conversacionId: z.string().cuid("ID de conversación inválido."),
//     limit: z.number().int().positive().optional().default(50),
//     // cursor: z.string().cuid().optional(), // Para paginación basada en cursor
// });
// export type ObtenerMensajesCrmParams = z.infer<typeof obtenerMensajesCrmParamsSchema>;

// // Esquema para los parámetros de entrada de la acción de enviar un mensaje desde el CRM
// export const enviarMensajeCrmParamsSchema = z.object({
//     conversacionId: z.string().cuid("ID de conversación inválido."),
//     mensaje: z.string().min(1, { message: "El mensaje no puede estar vacío." }),
//     // En el CRM, el 'role' probablemente siempre será 'agent' o 'system' si es una nota interna.
//     // Si el asistente también puede enviar desde aquí, incluir 'assistant'.
//     role: z.enum(['agent', 'system']),
//     agenteCrmId: z.string().cuid("Se requiere ID de agente para enviar mensaje desde CRM."),
//     // Se podrían añadir campos para adjuntos si se implementa
// });
// export type EnviarMensajeCrmParams = z.infer<typeof enviarMensajeCrmParamsSchema>;


// // --- ESQUEMAS PARA OTRAS ACCIONES DE CONVERSACIÓN DEL CRM ---

// export const asignarAgenteConversacionParamsSchema = z.object({
//     conversacionId: z.string().cuid(),
//     agenteCrmId: z.string().cuid().nullable(),
//     nombreAgenteQueAsigna: z.string().nullable().optional(), // Nombre del admin/agente que realiza la acción
// });
// export type AsignarAgenteConversacionParams = z.infer<typeof asignarAgenteConversacionParamsSchema>;

// export const gestionarPausaAutomatizacionParamsSchema = z.object({
//     conversacionId: z.string().cuid(),
//     nombreAgenteQueGestiona: z.string().nullable().optional(),
// });
// export type GestionarPausaAutomatizacionParams = z.infer<typeof gestionarPausaAutomatizacionParamsSchema>;

// export const archivarConversacionParamsSchema = z.object({
//     conversacionId: z.string().cuid(),
//     nombreUsuarioQueArchiva: z.string().nullable().optional(),
// });
// export type ArchivarConversacionParams = z.infer<typeof archivarConversacionParamsSchema>;


// // Tipo para el historial que se pasaría a generarRespuestaAsistente
// // (Similar a HistorialTurnoParaGeminiSchema de chatTest.schemas.ts)
// // Si vas a usar generarRespuestaAsistente desde las acciones del CRM (ej. si un agente pide ayuda a la IA)
// // entonces necesitarás este tipo. Si no, puedes omitirlo de este archivo.
// export const HistorialCrmTurnoParaGeminiSchema = z.object({
//     role: z.enum(['user', 'model', 'function']),
//     parts: z.array(
//         z.object({
//             text: z.string().optional(),
//             functionCall: z.object({
//                 name: z.string(),
//                 args: z.record(z.string(), z.any()),
//             }).optional(),
//             functionResponse: z.object({
//                 name: z.string(),
//                 response: z.record(z.string(), z.any()),
//             }).optional(),
//         })
//     ),
// });
// export type HistorialCrmTurnoParaGemini = z.infer<typeof HistorialCrmTurnoParaGeminiSchema>;









// app/admin/_lib/actions/crm/conversacion.schemas.ts
import { z } from 'zod';
import { InteraccionParteTipo } from '@prisma/client';
import { agenteBasicoCrmSchema } from '../agenteCrm/agenteCrm.schemas'; // Asumiendo que moviste/renombraste agenteBasicoSchema aquí o importas de la fuente correcta

// Esquema para los detalles de una conversación para el panel
export const conversacionDetailsForPanelSchema = z.object({
    id: z.string().cuid(),
    status: z.string(),
    leadId: z.string().cuid().nullable(),
    leadNombre: z.string().nullable(),
    agenteCrmActual: agenteBasicoCrmSchema.nullable(),
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(), // NUEVO
    canalIcono: z.string().nullable().optional(), // NUEVO (para el icono del canal si lo tienes en DB)
});
export type ConversationDetailsForPanelData = z.infer<typeof conversacionDetailsForPanelSchema>;

// ... (el resto de tus schemas: obtenerDetallesConversacionParamsSchema, 
//      conversacionPreviewItemSchema, listarConversacionesParamsSchema,
//      chatMessageItemCrmSchema, obtenerMensajesCrmParamsSchema,
//      enviarMensajeCrmParamsSchema, etc., se mantienen como en la última versión
//      del Canvas crm_conversacion_schemas_refactor que ya te proporcioné)
// Asegúrate que conversacionPreviewItemSchema también tenga canalIcono si lo usa ListaConversaciones
export const conversacionPreviewItemSchema = z.object({
    id: z.string().cuid(),
    leadId: z.string().cuid().nullable().optional(),
    leadName: z.string(),
    lastMessagePreview: z.string().nullable(),
    lastMessageTimestamp: z.date(),
    status: z.string(),
    avatarUrl: z.string().url().nullable().optional(),
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(),
    canalIcono: z.string().nullable().optional(), // Añadido aquí también para consistencia con ListaConversaciones
});
export type ConversacionPreviewItemData = z.infer<typeof conversacionPreviewItemSchema>;

export const obtenerDetallesConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid("ID de conversación inválido."),
});
export type ObtenerDetallesConversacionParams = z.infer<typeof obtenerDetallesConversacionParamsSchema>;

export const listarConversacionesParamsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    searchTerm: z.string().nullable().optional(),
    filtroStatus: z.enum(['activas', 'archivadas', 'todas']).default('activas'),
    filtroPipelineId: z.string().cuid().nullable().optional(),
});
export type ListarConversacionesParams = z.infer<typeof listarConversacionesParamsSchema>;

export const chatMessageItemCrmSchema = z.object({
    id: z.string().cuid(),
    conversacionId: z.string().cuid(),
    role: z.string(),
    mensajeTexto: z.string().nullable().optional(),
    parteTipo: z.nativeEnum(InteraccionParteTipo).default('TEXT').nullable().optional(),
    functionCallNombre: z.string().nullable().optional(),
    functionCallArgs: z.record(z.any()).nullable().optional(),
    functionResponseData: z.record(z.any()).nullable().optional(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    agenteCrm: agenteBasicoCrmSchema.nullable().optional(),
});
export type ChatMessageItemCrmData = z.infer<typeof chatMessageItemCrmSchema>;

export const obtenerMensajesCrmParamsSchema = z.object({
    conversacionId: z.string().cuid("ID de conversación inválido."),
    limit: z.number().int().positive().optional().default(50),
});
export type ObtenerMensajesCrmParams = z.infer<typeof obtenerMensajesCrmParamsSchema>;

export const enviarMensajeCrmParamsSchema = z.object({
    conversacionId: z.string().cuid("ID de conversación inválido."),
    mensaje: z.string().min(1, { message: "El mensaje no puede estar vacío." }),
    role: z.enum(['agent', 'system']),
    agenteCrmId: z.string().cuid("Se requiere ID de agente CRM válido.").nullable().optional(), // Puede ser null si admin/owner envía y no es agente específico
});
export type EnviarMensajeCrmParams = z.infer<typeof enviarMensajeCrmParamsSchema>;

export const asignarAgenteConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    agenteCrmId: z.string().cuid().nullable(),
    nombreAgenteQueAsigna: z.string().nullable().optional(),
});
export type AsignarAgenteConversacionParams = z.infer<typeof asignarAgenteConversacionParamsSchema>;

export const gestionarPausaAutomatizacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreAgenteQueGestiona: z.string().nullable().optional(),
});
export type GestionarPausaAutomatizacionParams = z.infer<typeof gestionarPausaAutomatizacionParamsSchema>;

export const archivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreUsuarioQueArchiva: z.string().nullable().optional(),
});
export type ArchivarConversacionParams = z.infer<typeof archivarConversacionParamsSchema>;

export const HistorialCrmTurnoParaGeminiSchema = z.object({
    role: z.enum(['user', 'model', 'function']),
    parts: z.array(
        z.object({
            text: z.string().optional(),
            functionCall: z.object({ name: z.string(), args: z.record(z.string(), z.any()), }).optional(),
            functionResponse: z.object({ name: z.string(), response: z.record(z.string(), z.any()), }).optional(),
        })
    ),
});
export type HistorialCrmTurnoParaGemini = z.infer<typeof HistorialCrmTurnoParaGeminiSchema>;

// ... al final de conversacion.schemas.ts
export const desarchivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreUsuarioQueDesarchiva: z.string().nullable().optional(),
});
export type DesarchivarConversacionParams = z.infer<typeof desarchivarConversacionParamsSchema>;