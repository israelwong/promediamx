import { z } from 'zod';
import { ChangedByType as PrismaChangedByType } from '@prisma/client';

// Esquema Zod para ActorInfo (si no lo tienes global y lo quieres validar aquí)
export const ActorInfoSchema = z.object({
    type: z.nativeEnum(PrismaChangedByType),
    id: z.string().cuid().nullable(),
});
export type ActorInfo = z.infer<typeof ActorInfoSchema>;

// Esquema Zod para los argumentos que Gemini podría extraer
export const ReagendarCitaArgsFromAISchema = z.object({
    cita_id_original: z.string().cuid("ID de cita original inválido.").nullable().optional(),
    detalle_cita_original_para_reagendar: z.string().min(1).max(200, "Detalle demasiado largo.").nullable().optional(),
    nueva_fecha_hora_deseada: z.string().min(1, "La nueva fecha y hora son requeridas si se proporcionan.").nullable().optional(),
    confirmacion_usuario_reagendar: z.boolean().nullable().optional(),
    nombre_contacto: z.string().max(100).nullable().optional(),
    email_contacto: z.string().email("Email de contacto inválido.").max(100).nullable().optional(),
    telefono_contacto: z.string().max(20).nullable().optional(),
    servicio_nombre: z.string().min(1).max(100).nullable().optional(), // Nombre del servicio
});

// Esquema Zod completo para los argumentos que la acción ejecutarReagendarCitaAction espera
export const ReagendarCitaArgsSchema = ReagendarCitaArgsFromAISchema.extend({
    leadId: z.string().cuid("ID de lead inválido."),
    asistenteVirtualId: z.string().cuid("ID de asistente virtual inválido."),
    // negocioId se infiere a través de configAgenda, que es un parámetro separado
});
export type ReagendarCitaArgs = z.infer<typeof ReagendarCitaArgsSchema>;


// Esquema Zod para CitaOriginalDetalles
export const CitaOriginalDetallesSchema = z.object({
    id: z.string().cuid(),
    fechaHoraOriginal: z.string(),
    asuntoOriginal: z.string(),
    modalidadOriginal: z.string().nullable().optional(),
    nombreContactoOriginal: z.string().nullable().optional(),
    emailContactoOriginal: z.string().email().nullable().optional(),
    telefonoContactoOriginal: z.string().nullable().optional(),
    fechaOriginalObj: z.date().optional(), // Para uso interno, no parte del JSON de Gemini usualmente
    tipoDeCitaIdOriginal: z.string().cuid().optional(),
    duracionMinutosOriginal: z.number().int().positive().optional(),
});
export type CitaOriginalDetalles = z.infer<typeof CitaOriginalDetallesSchema>;


// Esquema Zod para la estructura de nuevoSlotPropuesto dentro de ReagendarCitaData
export const NuevoSlotPropuestoSchema = z.object({
    fechaHoraNueva: z.string(),
    id: z.string().cuid(),
    asunto: z.string(),
    modalidad: z.string().nullable().optional(),
    nombreContacto: z.string().nullable().optional(),
    emailContacto: z.string().email().nullable().optional(),
    telefonoContacto: z.string().nullable().optional(),
});

// Esquema Zod para los datos que devuelve la acción ejecutarReagendarCitaAction
export const ReagendarCitaDataSchema = z.object({
    mensajeParaUsuario: z.string(),
    reagendamientoRealizado: z.boolean(),
    citaReagendadaId: z.string().cuid().nullable().optional(),
    requiereIdentificarCitaOriginal: z.boolean().optional(),
    requiereConfirmarCitaOriginal: z.boolean().optional(),
    citaOriginalParaConfirmar: CitaOriginalDetallesSchema.nullable().optional(),
    listaCitasOriginalesParaElegir: z.array(CitaOriginalDetallesSchema).nullable().optional(),
    requiereNuevaFechaHora: z.boolean().optional(),
    requiereConfirmarNuevoSlot: z.boolean().optional(),
    nuevoSlotPropuesto: NuevoSlotPropuestoSchema.nullable().optional(),
});
export type ReagendarCitaData = z.infer<typeof ReagendarCitaDataSchema>;

// Recordatorio: ConfiguracionAgendaDelNegocio ya tiene un schema en agendarCita.schemas.ts
// import { type ConfiguracionAgendaDelNegocio } from './agendarCita.schemas';