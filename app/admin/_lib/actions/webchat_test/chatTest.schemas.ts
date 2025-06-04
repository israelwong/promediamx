// ruta: 'app/admin/_lib/actions/webchat_test/chatTest.schemas.ts'
import { z } from 'zod';
import { ChatMessageItemSchema } from '@/app/admin/_lib/schemas/sharedCommon.schemas'; // Reutilizar el esquema de mensajes

import { Prisma } from '@prisma/client'; // Importa los tipos necesarios

export type InteraccionParaHistorial = Prisma.InteraccionGetPayload<{
    select: {
        role: true;
        parteTipo: true;
        mensajeTexto: true;
        functionCallNombre: true;
        functionCallArgs: true;
        functionResponseNombre: true; // Incluido
        functionResponseData: true;
    }
}>;

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
    role: z.enum(['user', 'model', 'function']),
    parts: z.array(
        z.object({ // Cada objeto en 'parts' puede ser uno de estos
            text: z.string().optional(),
            functionCall: z.object({
                name: z.string(),
                args: z.record(z.string(), z.any()),
            }).optional(),
            functionResponse: z.object({
                name: z.string(),
                response: z.record(z.string(), z.any()),
            }).optional(),
        })
        // ... comentario sobre .refine o discriminatedUnion
    ),
});
export type HistorialTurnoParaGemini = z.infer<typeof HistorialTurnoParaGeminiSchema>;



