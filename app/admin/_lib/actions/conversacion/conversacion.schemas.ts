// app/admin/_lib/actions/conversacion/conversacion.schemas.ts

import { z } from 'zod';
import { InteraccionParteTipo } from '@prisma/client';
import { agenteBasicoCrmSchema } from '../agenteCrm/agenteCrm.schemas';

// Esquema para un item de media (reutilizable)
export const MediaItemSchema = z.object({
    tipo: z.enum(['image', 'video', 'document', 'audio']),
    url: z.string().url("URL de media inválida"),
    caption: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

export const FunctionResponseMediaDataSchema = z.object({
    content: z.string().nullable().optional(),
    media: z.array(MediaItemSchema).nullable().optional(),

    // La forma correcta es: z.record(keyType, valueType)
    additionalData: z.record(z.string(), z.unknown()).nullable().optional(),

    uiComponentPayload: z.record(z.string(), z.unknown()).nullable().optional(),
});


// --- ESQUEMA CORREGIDO ---
export const conversacionDetailsForPanelSchema = z.object({
    id: z.string().cuid(),
    status: z.string(),
    leadId: z.string().cuid().nullable(),
    leadNombre: z.string().nullable(),
    agenteCrmActual: agenteBasicoCrmSchema.nullable(),
    // CORRECCIÓN: Se añaden los campos que faltaban para que coincida con los datos que devuelven las acciones.
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro', 'desconocido']).nullable().optional(),
    canalIcono: z.string().nullable().optional(),
    asistenteNombre: z.string().nullable().optional(),
    updatedAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()).optional(),
});
export type ConversationDetailsForPanelData = z.infer<typeof conversacionDetailsForPanelSchema>;

export const conversacionPreviewItemSchema = z.object({
    id: z.string().cuid(),
    leadId: z.string().cuid().nullable(),
    leadName: z.string(),
    lastMessagePreview: z.string().nullable(),
    lastMessageTimestamp: z.date(),
    status: z.string(),
    avatarUrl: z.string().url().nullable(),
    canalesInvolucrados: z.array(z.string()).nullable(),
});
export type ConversacionPreviewItemData = z.infer<typeof conversacionPreviewItemSchema>;

export const obtenerDetallesConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid("ID de conversación inválido."),
});

export const listarConversacionesParamsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    searchTerm: z.string().nullable().optional(),
    filtroStatus: z.enum(['activas', 'archivadas', 'todas']).default('activas'),
    filtroPipelineId: z.string().cuid().nullable().optional(),
});

export const chatMessageItemCrmSchema = z.object({
    id: z.string().cuid(),
    conversacionId: z.string().cuid(),
    role: z.string(),
    mensajeTexto: z.string().nullable().optional(),
    parteTipo: z.nativeEnum(InteraccionParteTipo).default('TEXT').nullable().optional(),
    functionCallNombre: z.string().nullable().optional(),
    functionCallArgs: z.record(z.string(), z.unknown()).nullable().optional(), // Cambiado de z.any() a z.unknown()
    functionResponseData: FunctionResponseMediaDataSchema.nullable().optional(),
    uiComponentPayload: z.record(z.string(), z.unknown()).nullable().optional(), // Cambiado de z.any() a z.unknown()
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

export const enviarMensajeCrmParamsSchema = z.object({
    conversacionId: z.string().cuid("ID de conversación inválido."),
    mensaje: z.string().min(1, { message: "El mensaje no puede estar vacío." }),
    role: z.enum(['agent', 'system']),
    agenteCrmId: z.string().cuid("Se requiere ID de agente CRM válido.").nullable().optional(),
});
export type EnviarMensajeCrmParams = z.infer<typeof enviarMensajeCrmParamsSchema>;

export const asignarAgenteConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    agenteCrmId: z.string().cuid().nullable(),
    nombreAgenteQueAsigna: z.string().nullable().optional(),
});

export const gestionarPausaAutomatizacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreAgenteQueGestiona: z.string().nullable().optional(),
});

export const archivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreUsuarioQueArchiva: z.string().nullable().optional(),
});

export const desarchivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    nombreUsuarioQueDesarchiva: z.string().nullable().optional(),
});



export type ListarConversacionesParams = z.infer<typeof listarConversacionesParamsSchema>;