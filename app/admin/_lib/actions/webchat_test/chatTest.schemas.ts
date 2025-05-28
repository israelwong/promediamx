// ruta: 'app/admin/_lib/actions/webchat_test/chatTest.schemas.ts'
import { z } from 'zod';
import { ChatMessageItemSchema } from '@/app/admin/_lib/schemas/sharedCommon.schemas'; // Reutilizar el esquema de mensajes


export const IniciarConversacionWebchatInputSchema = z.object({
    asistenteId: z.string().cuid("ID de Asistente inválido."),
    mensajeInicial: z.string().min(1, "El mensaje inicial no puede estar vacío."),
    remitenteIdWeb: z.string().uuid("ID de remitente web inválido (debe ser UUID)."),
    nombreRemitenteSugerido: z.string().optional(),
});
export type IniciarConversacionWebchatInput = z.infer<typeof IniciarConversacionWebchatInputSchema>;

export const IniciarConversacionWebchatOutputSchema = z.object({
    conversationId: z.string().cuid(),
    interaccionUsuarioId: z.string().cuid(),
    leadId: z.string().cuid(),
    mensajeUsuario: ChatMessageItemSchema.optional(),    // Será un ChatMessageItem
    mensajeAsistente: ChatMessageItemSchema.optional(),   // Será un ChatMessageItem
    mensajeResultadoFuncion: ChatMessageItemSchema.nullable().optional(), // Probablemente siempre null si el dispatcher no lo devuelve
});
export type IniciarConversacionWebchatOutput = z.infer<typeof IniciarConversacionWebchatOutputSchema>;


export const EnviarMensajeWebchatInputSchema = z.object({
    conversationId: z.string().cuid("ID de Conversación inválido."),
    mensaje: z.string().min(1, "El mensaje no puede estar vacío."),
    remitenteIdWeb: z.string().uuid("ID de remitente web inválido."),
});
export type EnviarMensajeWebchatInput = z.infer<typeof EnviarMensajeWebchatInputSchema>;

export const EnviarMensajeWebchatOutputSchema = z.object({
    interaccionUsuarioId: z.string().cuid(),
    mensajeUsuario: ChatMessageItemSchema.optional(),    // Será un ChatMessageItem
    mensajeAsistente: ChatMessageItemSchema.optional(),   // Será un ChatMessageItem
    mensajeResultadoFuncion: ChatMessageItemSchema.nullable().optional(), // Probablemente siempre null
});
export type EnviarMensajeWebchatOutput = z.infer<typeof EnviarMensajeWebchatOutputSchema>;


// Interfaz/Schema que `generarRespuestaAsistente` espera para su historial.
// Este es el formato al que mapearemos los ChatMessageItem en `chatTest.actions.ts`.
export const HistorialTurnoParaGeminiSchema = z.object({
    role: z.enum(['user', 'model', 'function']), // Roles que Gemini espera para el historial
    parts: z.array(
        z.object({
            text: z.string().optional(),
            functionCall: z.object({
                name: z.string(),
                args: z.record(z.string(), z.any()), // Gemini espera Record<string, any>
            }).optional(),
            functionResponse: z.object({
                name: z.string(), // Nombre de la función original
                response: z.record(z.string(), z.any()), // El objeto de respuesta
            }).optional(),
        })
        // Asegurar que solo una de las propiedades de 'parts' (text, functionCall, functionResponse) esté presente.
        // Zod puede manejar esto con .refine o .superRefine si es necesario, o un discriminatedUnion en 'parts'.
        // Por ahora, la lógica de construcción se encargará de esto.
    ),
});
export type HistorialTurnoParaGemini = z.infer<typeof HistorialTurnoParaGeminiSchema>;

