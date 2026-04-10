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
    // --- CORRECCIÓN AQUÍ ---
    // Se añade z.string() como primer argumento y se usa z.unknown() por seguridad.
    functionCallArgs: z.record(z.string(), z.unknown()).nullable().optional(),
    functionResponseData: z.record(z.string(), z.unknown()).nullable().optional(),

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
    argumentos: z.record(z.string(), z.unknown()), // Record<string, unknown>
});
export type LlamadaFuncionDetectada = z.infer<typeof LlamadaFuncionDetectadaSchema>;

// Esquema para la salida de generarRespuestaAsistente
export const RespuestaAsistenteConHerramientasSchema = z.object({
    respuestaTextual: z.string().nullable(),
    llamadaFuncion: LlamadaFuncionDetectadaSchema.nullable().optional(),
    pensamientoIA: z.string().nullable().optional(), // Si decides usarlo
});
export type RespuestaAsistenteConHerramientas = z.infer<typeof RespuestaAsistenteConHerramientasSchema>;


// Parte de Texto
const TextPartSchema = z.object({
    text: z.string(),
    // Asegurar que no haya otras propiedades de Part aquí
    functionCall: z.undefined().optional(),
    functionResponse: z.undefined().optional(),
});

// Parte de Llamada a Función
const FunctionCallPartSchema = z.object({
    functionCall: z.object({
        name: z.string(),
        args: z.record(z.string(), z.any()), // Gemini espera Record<string, any>
    }),
    // Asegurar que no haya otras propiedades de Part aquí
    text: z.undefined().optional(),
    functionResponse: z.undefined().optional(),
});

// Parte de Respuesta de Función
const FunctionResponsePartSchema = z.object({
    functionResponse: z.object({
        name: z.string(), // Nombre de la función original
        response: z.record(z.string(), z.any()), // El objeto de respuesta
    }),
    // Asegurar que no haya otras propiedades de Part aquí
    text: z.undefined().optional(),
    functionCall: z.undefined().optional(),
});

// Schema para una 'Part' individual, usando una unión discriminada implícita por la estructura
// Esto se acerca más a cómo el SDK de Google define `Part`.
const PartSchema = z.union([
    TextPartSchema,
    FunctionCallPartSchema,
    FunctionResponsePartSchema,
    // Nota: No estamos incluyendo otros tipos de Part del SDK de Google como
    // InlineDataPart, FileDataPart, ExecutableCodePart, CodeExecutionResultPart,
    // porque tu lógica actual solo genera text, functionCall, o functionResponse.
    // Si el SDK REQUIERE que el tipo Part pueda ser CUALQUIERA de sus miembros
    // incluso si no los usas, la compatibilidad directa puede ser más compleja.
    // Sin embargo, la queja de TypeScript suele ser por no poder discriminar
    // claramente qué tipo de Part es tu objeto.
]);

// Schema para un turno completo en el historial para Gemini
export const HistorialTurnoParaGeminiSchema = z.object({
    role: z.enum(['user', 'model', 'function']),
    parts: z.array(PartSchema).min(1, "El array 'parts' no puede estar vacío."),
});
export type HistorialTurnoParaGemini = z.infer<typeof HistorialTurnoParaGeminiSchema>; // Este tipo debería ser compatible con Content de Gemini

// Input para generarRespuestaAsistente (se mantiene, pero ahora HistorialTurnoParaGemini es más preciso)
export const GenerarRespuestaAsistenteConHerramientasInputSchema = z.object({
    historialConversacion: z.array(HistorialTurnoParaGeminiSchema), // Usar el schema de turno actualizado
    mensajeUsuarioActual: z.string(),
    contextoAsistente: z.object({
        nombreAsistente: z.string(),
        nombreNegocio: z.string(),
        descripcionAsistente: z.string().nullable().optional(),
    }),
    tareasDisponibles: z.array(TareaCapacidadIASchema), // Asumiendo que TareaCapacidadIASchema está definido
});
export type GenerarRespuestaAsistenteConHerramientasInput = z.infer<typeof GenerarRespuestaAsistenteConHerramientasInputSchema>;


export type TareaFuncionConParametros = {
    name: string;
    description: string;
    // El 'parameters' sigue el formato que espera la API de Google Gemini
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
    };
};