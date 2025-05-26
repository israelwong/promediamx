// app/admin/_lib/actions/whatsapp/whatsapp.schemas.ts
import { z } from 'zod';
import { ChatMessageItemSchema } from '@/app/dev-test-chat/components/chatTest.schemas'; // Reutilizar para la estructura de mensajes si es compatible

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
export const EnviarMensajeWhatsAppApiInputSchema = z.object({
    destinatarioWaId: z.string().min(1, "WAID del destinatario es requerido."),
    mensajeTexto: z.string().min(1, "El texto del mensaje es requerido."),
    // El PNID del AsistenteVirtual/Negocio DESDE el cual se envía
    negocioPhoneNumberIdEnvia: z.string().min(1, "Phone Number ID del remitente (negocio) es requerido."),
    tokenAccesoAsistente: z.string().min(1, "Token de acceso del asistente es requerido."),
    // messageIdRespuesta: z.string().optional(), // Si es una respuesta a un mensaje específico
});
export type EnviarMensajeWhatsAppApiInput = z.infer<typeof EnviarMensajeWhatsAppApiInputSchema>;
