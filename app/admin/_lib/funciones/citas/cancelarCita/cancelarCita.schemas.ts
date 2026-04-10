import { z } from 'zod';
import { ChangedByType as PrismaChangedByType } from '@prisma/client'; // Importar el enum de Prisma

// Esquema Zod para ActorInfo
export const ActorInfoSchema = z.object({
    type: z.nativeEnum(PrismaChangedByType), // Usar el enum de Prisma directamente
    id: z.string().cuid().nullable(), // ID del actor (agente, asistente, etc.)
});
export type ActorInfo = z.infer<typeof ActorInfoSchema>;

// Este es el único schema de argumentos que necesitamos.
// Define lo que la IA debe extraer. El resto lo pone el dispatcher.
export const CancelarCitaArgsFromAISchema = z.object({
    cita_id_cancelar: z.string().cuid("ID de cita para cancelar inválido.").nullable().optional(),
    detalle_cita_para_cancelar: z.string().min(1).max(200).nullable().optional(),
    confirmacion_usuario_cancelar: z.boolean().nullable().optional(),
    motivo_cancelacion: z.string().min(1).max(500).nullable().optional(),
});
export type CancelarCitaArgsFromAI = z.infer<typeof CancelarCitaArgsFromAISchema>;

// El schema de retorno se puede mantener si es útil, pero no es estrictamente necesario
// para la lógica de la acción, ya que la acción construye el objeto de retorno directamente.
export const CitaDetalleParaCancelarSchema = z.object({
    id: z.string().cuid(),
    fechaHora: z.string(),
    asunto: z.string(),
    modalidad: z.string().nullable().optional(),
});
export type CitaDetalleParaCancelar = z.infer<typeof CitaDetalleParaCancelarSchema>;