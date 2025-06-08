import { z } from 'zod';
import { ChangedByType as PrismaChangedByType } from '@prisma/client'; // Importar el enum de Prisma

// Esquema Zod para ActorInfo
export const ActorInfoSchema = z.object({
    type: z.nativeEnum(PrismaChangedByType), // Usar el enum de Prisma directamente
    id: z.string().cuid().nullable(), // ID del actor (agente, asistente, etc.)
});
export type ActorInfo = z.infer<typeof ActorInfoSchema>;

// Esquema Zod para los argumentos que Gemini podría extraer
export const CancelarCitaArgsFromAISchema = z.object({
    cita_id_cancelar: z.string().cuid("ID de cita para cancelar inválido.").nullable().optional(),
    detalle_cita_para_cancelar: z.string().min(1, "El detalle no puede estar vacío si se proporciona.").max(200, "Detalle demasiado largo.").nullable().optional(),
    confirmacion_usuario_cancelar: z.boolean().nullable().optional(),
    motivo_cancelacion: z.string().min(1, "El motivo no puede estar vacío si se proporciona.").max(500, "Motivo demasiado largo.").nullable().optional(),
});
export type CancelarCitaArgsFromAI = z.infer<typeof CancelarCitaArgsFromAISchema>;

// Esquema Zod completo para los argumentos que la acción ejecutarCancelarCitaAction espera
// (incluyendo los que añade el dispatcher)
export const CancelarCitaArgsSchema = CancelarCitaArgsFromAISchema.extend({
    leadId: z.string().cuid("ID de lead inválido."),
    asistenteVirtualId: z.string().cuid("ID de asistente virtual inválido."),
    // negocioId podría ser necesario si las citas no se buscan solo por leadId y la lógica lo requiere
});
export type CancelarCitaArgs = z.infer<typeof CancelarCitaArgsSchema>;


// Esquema Zod para CitaDetalleParaCancelar
export const CitaDetalleParaCancelarSchema = z.object({
    id: z.string().cuid(),
    fechaHora: z.string(), // Fecha y hora formateada para el usuario
    asunto: z.string(),
    modalidad: z.string().nullable().optional(),
});
export type CitaDetalleParaCancelar = z.infer<typeof CitaDetalleParaCancelarSchema>;


// Esquema Zod para los datos que devuelve la acción ejecutarCancelarCitaAction
export const CancelarCitaDataSchema = z.object({
    mensajeParaUsuario: z.string(),
    cancelacionRealizada: z.boolean(),
    citaCanceladaId: z.string().cuid().nullable().optional(),
    requiereConfirmacion: z.boolean().optional(), // Hacer opcional ya que no siempre está presente
    citaParaConfirmar: CitaDetalleParaCancelarSchema.nullable().optional(),
    listaCitasParaElegir: z.array(CitaDetalleParaCancelarSchema).nullable().optional(),
});
export type CancelarCitaData = z.infer<typeof CancelarCitaDataSchema>;

