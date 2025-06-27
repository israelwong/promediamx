// app/admin/_lib/actions/conversacion/conversacion.schemas.ts
import { z } from 'zod';
import { InteraccionParteTipo } from '@prisma/client';
import { agenteBasicoCrmSchema } from '../agenteCrm/agenteCrm.schemas'; // Asegúrate que esta ruta sea correcta

// Esquema para un item de media (reutilizable)
export const MediaItemSchema = z.object({
    tipo: z.enum(['image', 'video', 'document', 'audio']),
    url: z.string().url("URL de media inválida"),
    caption: z.string().nullable().optional(),
    filename: z.string().nullable().optional(), // Usualmente para tipo 'document'
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

// Esquema para la parte 'media' dentro de functionResponseData
export const FunctionResponseMediaDataSchema = z.object({
    content: z.string().nullable().optional(), // El texto principal que la función generó
    media: z.array(MediaItemSchema).nullable().optional(), // El array de media items
    additionalData: z.record(z.any()).nullable().optional(), // Otros datos que la función guardó
    uiComponentPayload: z.record(z.any()).nullable().optional(), // Payload para componentes UI personalizados
});
export type FunctionResponseMediaData = z.infer<typeof FunctionResponseMediaDataSchema>;


// Esquema para los detalles de una conversación para el panel
export const conversacionDetailsForPanelSchema = z.object({
    id: z.string().cuid(),
    status: z.string(),
    leadId: z.string().cuid().nullable(),
    leadNombre: z.string().nullable(),
    agenteCrmActual: agenteBasicoCrmSchema.nullable(),
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(),
    canalIcono: z.string().nullable().optional(),
    asistenteNombre: z.string().nullable().optional(), // Nombre del asistente si aplica
    updatedAt: z.preprocess((arg) => { // Añadir preproceso para convertir string a Date
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()).optional(), // <-- AÑADIR ESTE CAMPO (hazlo opcional si puede no venir siempre)
});
export type ConversationDetailsForPanelData = z.infer<typeof conversacionDetailsForPanelSchema>;

export const conversacionPreviewItemSchema = z.object({
    id: z.string().cuid(),
    leadId: z.string().cuid().nullable().optional(),
    leadName: z.string(),
    lastMessagePreview: z.string().nullable(),
    lastMessageTimestamp: z.date(),
    status: z.string(),
    avatarUrl: z.string().url().nullable().optional(),
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(),
    canalIcono: z.string().nullable().optional(),
    canalesInvolucrados: z.array(z.string()).optional().nullable(), // Array de strings con los nombres de los canales
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
    functionCallArgs: z.record(z.string(), z.any()).nullable().optional(), // Claves string
    functionResponseData: FunctionResponseMediaDataSchema.nullable().optional(), // Este es el objeto que contiene content, media, y el uiComponentPayload ANIDADO

    // NUEVO CAMPO DE PRIMER NIVEL (si el backend lo puebla así directamente en Interaccion)
    uiComponentPayload: z.record(z.string(), z.any()).nullable().optional(), // Claves string

    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()),
    agenteCrm: agenteBasicoCrmSchema.nullable().optional(),
    canalInteraccion: z.string().nullable().optional(),
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
    role: z.enum(['agent', 'system']), // Agentes o sistema pueden enviar mensajes directos
    agenteCrmId: z.string().cuid("Se requiere ID de agente CRM válido.").nullable().optional(),
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

export const desarchivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreUsuarioQueDesarchiva: z.string().nullable().optional(),
});
export type DesarchivarConversacionParams = z.infer<typeof desarchivarConversacionParamsSchema>;



