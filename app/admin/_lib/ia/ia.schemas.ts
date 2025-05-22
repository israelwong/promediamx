import { z } from 'zod';

// Esquema para AgenteBasico (podría estar en agente.schemas.ts e importarse aquí)
export const AgenteBasicoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(),
});
export type AgenteBasico = z.infer<typeof AgenteBasicoSchema>;

// Esquema para ChatMessageItem (usado en historialConversacion)
export const ChatMessageItemSchema = z.object({
    id: z.string().cuid().optional(), // ID es opcional para historial que se pasa a Gemini
    conversacionId: z.string().cuid().optional(), // ID de la conversación, opcional para historial
    role: z.enum(['user', 'assistant', 'agent', 'system']),
    mensaje: z.string().nullable(),
    mediaUrl: z.string().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    createdAt: z.date().optional(),
    agenteCrm: AgenteBasicoSchema.nullable().optional(),
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
    nombre: z.string().optional(),
    descripcionTool: z.string().nullable().optional(),
    instruccionParaIA: z.string().nullable().optional(),
    funcionHerramienta: FuncionHerramientaIASchema.nullable().optional(),
    camposPersonalizadosRequeridos: z.array(ParametroParaIASchema).optional(),
});
export type TareaCapacidadIA = z.infer<typeof TareaCapacidadIASchema>;

// Esquema para el input de generarRespuestaAsistente
export const GenerarRespuestaAsistenteConHerramientasInputSchema = z.object({
    historialConversacion: z.array(ChatMessageItemSchema.pick({ role: true, mensaje: true })), // Solo role y mensaje
    mensajeUsuarioActual: z.string(),
    contextoAsistente: z.object({
        nombreAsistente: z.string(),
        descripcionAsistente: z.string().nullable().optional(),
        nombreNegocio: z.string(),
    }),
    tareasDisponibles: z.array(TareaCapacidadIASchema),
});
export type GenerarRespuestaAsistenteConHerramientasInput = z.infer<typeof GenerarRespuestaAsistenteConHerramientasInputSchema>;

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