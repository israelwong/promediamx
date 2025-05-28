// app/admin/_lib/actions/whatsapp/whatsapp.schemas.ts
import { z } from 'zod';
// import { ChatMessageItemSchema } from '../webchat_test/chatTest.schemas'; // Reutilizar para la estructura de mensajes si es compatible
import { ChatMessageItemSchema } from '@/app/admin/_lib/schemas/sharedCommon.schemas'; // Reutilizar el esquema de mensajes

// Input para la acción principal que procesa un mensaje entrante de WhatsApp
export const ProcesarMensajeWhatsAppInputSchema = z.object({
    negocioPhoneNumberId: z.string().min(1, "Phone Number ID del negocio es requerido."),
    usuarioWaId: z.string().min(1, "WhatsApp ID del usuario es requerido."),
    nombrePerfilUsuario: z.string().nullable().optional(),
    mensajeUsuario: z.string().min(1, "El mensaje del usuario es requerido."),
    // messageIdOriginal: z.string().optional(), // ID del mensaje de WhatsApp, si lo necesitas
    // timestampOriginal: z.number().optional(), // Timestamp del mensaje de WhatsApp
});
export type ProcesarMensajeWhatsAppInput = z.infer<typeof ProcesarMensajeWhatsAppInputSchema>;

// Output de procesarMensajeWhatsAppEntranteAction podría ser complejo,
// similar a Iniciar/EnviarConversacionWebchatOutput, incluyendo los mensajes guardados.
// Por ahora, la acción principal podría no devolver mucho si las respuestas se envían por otro lado.
// Pero si queremos devolver el mensaje del usuario y la primera respuesta (o intento) del asistente:
export const ProcesarMensajeWhatsAppOutputSchema = z.object({
    conversationId: z.string().cuid(),
    interaccionUsuarioId: z.string().cuid(),
    leadId: z.string().cuid(),
    mensajeUsuarioGuardado: ChatMessageItemSchema.optional(), // El mensaje del usuario que se guardó
    mensajeAsistenteGuardado: ChatMessageItemSchema.optional(), // El primer mensaje del asistente (texto o FC)
    // No incluimos mensajeResultadoFuncion aquí porque se maneja asíncronamente
});
export type ProcesarMensajeWhatsAppOutput = z.infer<typeof ProcesarMensajeWhatsAppOutputSchema>;

// Input para la acción que envía un mensaje saliente vía WhatsApp API
// Ahora con soporte para diferentes tipos de mensajes
export const EnviarMensajeWhatsAppApiInputSchema = z.object({
    destinatarioWaId: z.string().min(1, "WAID del destinatario es requerido."),
    negocioPhoneNumberIdEnvia: z.string().min(1, "Phone Number ID del remitente (negocio) es requerido."),
    tokenAccesoAsistente: z.string().min(1, "Token de acceso del asistente es requerido."),

    tipoMensaje: z.enum(['text', 'image', 'video', 'document', 'audio']).default('text'),

    // Para tipoMensaje = 'text'
    mensajeTexto: z.string().optional(),

    // Para tipoMensaje = 'image', 'video', 'document', 'audio'
    mediaUrl: z.string().url("Se requiere una URL válida para la media.").optional(),
    // mediaId: z.string().optional(), // Alternativa si subes la media a Meta primero

    // Para tipoMensaje = 'image', 'video', 'document' (audio no tiene caption)
    caption: z.string().max(1024, "La descripción no puede exceder 1024 caracteres.").optional(),

    // Para tipoMensaje = 'document'
    filename: z.string().optional(),
})
    .refine(data => {
        if (data.tipoMensaje === 'text') {
            return !!data.mensajeTexto && data.mensajeTexto.trim() !== '';
        }
        return true;
    }, { message: "Se requiere 'mensajeTexto' para mensajes de tipo 'text'.", path: ['mensajeTexto'] })
    .refine(data => {
        if (['image', 'video', 'document', 'audio'].includes(data.tipoMensaje)) {
            return !!data.mediaUrl; // O || !!data.mediaId si implementas mediaId
        }
        return true;
    }, { message: "Se requiere 'mediaUrl' (o mediaId) para mensajes de tipo media.", path: ['mediaUrl'] });

export type EnviarMensajeWhatsAppApiInput = z.infer<typeof EnviarMensajeWhatsAppApiInputSchema>;