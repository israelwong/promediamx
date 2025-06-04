//rur actual: app/admin/_lib/ia/ia.schemas.ts

import { z } from 'zod';
import { InteraccionParteTipo } from '@prisma/client'; // ¡Importante!


// Esquema para AgenteBasico (podría estar en agente.schemas.ts e importarse aquí)
export const AgenteBasicoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(),
});
export type AgenteBasico = z.infer<typeof AgenteBasicoSchema>;

// CHAT MESSAGE ITEM SCHEMA ACTUALIZADO
export const ChatMessageItemSchema = z.object({
    id: z.string().cuid().optional(),
    conversacionId: z.string().cuid().optional(),
    role: z.string(), // user, assistant, agent, system, function

    mensajeTexto: z.string().nullable().optional(), // Campo principal para UI

    // Campos estructurales opcionales
    parteTipo: z.nativeEnum(InteraccionParteTipo).default('TEXT').nullable().optional(),
    functionCallNombre: z.string().nullable().optional(),
    functionCallArgs: z.record(z.any()).nullable().optional(),
    functionResponseData: z.record(z.any()).nullable().optional(),

    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
    }, z.date()).optional(), // Hacer opcional si no siempre está al parsear
    agenteCrm: AgenteBasicoSchema.nullable().optional(),
    functionResponseNombre: z.string().nullable().optional(), // AÑADIR ESTO

});
export type ChatMessageItem = z.infer<typeof ChatMessageItemSchema>;


// Esquema para ParametroParaIA
export const ParametroParaIASchema = z.object({
    nombre: z.string(), // snake_case
    tipo: z.string(),   // tipoDato de TareaFuncionParametro
    descripcion: z.string().nullable().optional(), // descripcionParaIA de TareaFuncionParametro
    esObligatorio: z.boolean(),
});
export type ParametroParaIA = z.infer<typeof ParametroParaIASchema>;

// Esquema para FuncionHerramientaIA
export const FuncionHerramientaIASchema = z.object({
    nombre: z.string(), // camelCase, de TareaFuncion.nombre
    descripcion: z.string().nullable().optional(), // de TareaFuncion.descripcion (admin) o Tarea.descripcionTool
    parametros: z.array(ParametroParaIASchema),
});
export type FuncionHerramientaIA = z.infer<typeof FuncionHerramientaIASchema>;

// Esquema para TareaCapacidadIA
export const TareaCapacidadIASchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable().optional(),
    instruccionParaIA: z.string().nullable().optional(),
    funcionHerramienta: FuncionHerramientaIASchema.nullable().optional(),
    camposPersonalizadosRequeridos: z.array(ParametroParaIASchema).optional(),
});
export type TareaCapacidadIA = z.infer<typeof TareaCapacidadIASchema>;

// Esquema para LlamadaFuncionDetectada
export const LlamadaFuncionDetectadaSchema = z.object({
    nombreFuncion: z.string(),
    argumentos: z.record(z.unknown()), // Record<string, unknown>
});
export type LlamadaFuncionDetectada = z.infer<typeof LlamadaFuncionDetectadaSchema>;

// Esquema para la salida de generarRespuestaAsistente
export const RespuestaAsistenteConHerramientasSchema = z.object({
    respuestaTextual: z.string().nullable(),
    llamadaFuncion: LlamadaFuncionDetectadaSchema.nullable().optional(),
    pensamientoIA: z.string().nullable().optional(), // Si decides usarlo
});
export type RespuestaAsistenteConHerramientas = z.infer<typeof RespuestaAsistenteConHerramientasSchema>;


// Asegúrate que HistorialTurnoParaGeminiSchema esté definido así o similar:
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
        }).refine(part => { // Asegurar que solo una propiedad de 'part' esté presente
            const keys = Object.keys(part) as Array<keyof typeof part>;
            const presentKeys = keys.filter(key => part[key] !== undefined);
            return presentKeys.length === 1;
        }, { message: "Cada parte debe tener exactamente una propiedad: text, functionCall, o functionResponse." })
    ).min(1, "Parts array no puede estar vacío."), // parts no puede ser un array vacío
});
export type HistorialTurnoParaGemini = z.infer<typeof HistorialTurnoParaGeminiSchema>; // Este es el tipo Content de Gemini

export const GenerarRespuestaAsistenteConHerramientasInputSchema = z.object({
    historialConversacion: z.array(HistorialTurnoParaGeminiSchema),
    mensajeUsuarioActual: z.string(),
    contextoAsistente: z.object({
        nombreAsistente: z.string(),
        nombreNegocio: z.string(),
        descripcionAsistente: z.string().nullable().optional(),
    }),
    tareasDisponibles: z.array(TareaCapacidadIASchema),
});
export type GenerarRespuestaAsistenteConHerramientasInput = z.infer<typeof GenerarRespuestaAsistenteConHerramientasInputSchema>;