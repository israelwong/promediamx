import { z } from 'zod';
import type { AgenteBasico } from '@/app/admin/_lib/agente.types'; // Asumiendo esta ruta para AgenteBasico

// Esquema para un ChatMessageItem (basado en tu crmConversacion.types.ts)
export const ChatMessageItemSchema = z.object({
    id: z.string().cuid(),
    conversacionId: z.string().cuid(),
    role: z.enum(['user', 'assistant', 'agent', 'system']),
    mensaje: z.string().nullable(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date()),
    nombreRemitente: z.string().nullable().optional(),
    agenteCrm: z.custom<AgenteBasico>().nullable().optional(), // Asumimos que AgenteBasico es un tipo conocido
});
export type ChatMessageItem = z.infer<typeof ChatMessageItemSchema>;

// Esquema para IniciarConversacionWebchatInput (basado en tu crmConversacion.types.ts)
export const IniciarConversacionWebchatInputSchema = z.object({
    asistenteId: z.string().cuid("ID de Asistente inválido."),
    mensajeInicial: z.string().min(1, "El mensaje inicial no puede estar vacío."),
    remitenteIdWeb: z.string().uuid("ID de remitente web inválido (debe ser UUID)."),
    nombreRemitenteSugerido: z.string().optional(),
    // canalId es opcional, no lo incluimos a menos que sea estrictamente necesario aquí
});
export type IniciarConversacionWebchatInput = z.infer<typeof IniciarConversacionWebchatInputSchema>;

// Esquema para la salida de iniciarConversacionWebchatAction (basado en IniciarConversacionWebchatDataConDispatcher)
export const IniciarConversacionWebchatOutputSchema = z.object({
    conversationId: z.string().cuid(),
    interaccionUsuarioId: z.string().cuid(),
    leadId: z.string().cuid(),
    respuestaAsistente: z.string().nullable().optional(),
    interaccionAsistenteId: z.string().cuid().optional(),
    mensajeUsuario: ChatMessageItemSchema.optional(),
    mensajeAsistente: ChatMessageItemSchema.optional(),
    mensajeResultadoFuncion: ChatMessageItemSchema.nullable().optional(),
});
export type IniciarConversacionWebchatOutput = z.infer<typeof IniciarConversacionWebchatOutputSchema>;

// Esquema para EnviarMensajeWebchatInput (basado en tu crmConversacion.types.ts)
export const EnviarMensajeWebchatInputSchema = z.object({
    conversationId: z.string().cuid("ID de Conversación inválido."),
    mensaje: z.string().min(1, "El mensaje no puede estar vacío."),
    remitenteIdWeb: z.string().uuid("ID de remitente web inválido."),
});
export type EnviarMensajeWebchatInput = z.infer<typeof EnviarMensajeWebchatInputSchema>;

// Esquema para la salida de enviarMensajeWebchatAction (basado en EnviarMensajeWebchatDataConDispatcher)
export const EnviarMensajeWebchatOutputSchema = z.object({
    interaccionUsuarioId: z.string().cuid(),
    respuestaAsistente: z.string().nullable().optional(),
    interaccionAsistenteId: z.string().cuid().optional(),
    mensajeUsuario: ChatMessageItemSchema.optional(),
    mensajeAsistente: ChatMessageItemSchema.optional(),
    mensajeResultadoFuncion: ChatMessageItemSchema.nullable().optional(),
});
export type EnviarMensajeWebchatOutput = z.infer<typeof EnviarMensajeWebchatOutputSchema>;