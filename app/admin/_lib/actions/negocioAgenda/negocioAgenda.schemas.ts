import { z } from 'zod';
import { agendaConfiguracionDataSchema } from '../agendaConfiguracion/agendaConfiguracion.schemas';
import type { DiaSemana as DiaSemanaPrisma, AgendaTipoCita as AgendaTipoCitaPrisma, HorarioAtencion as HorarioAtencionPrisma, ExcepcionHorario as ExcepcionHorarioPrisma } from '@prisma/client';

// Esquema para AgendaTipoCita (basado en el tipo de Prisma)
export const agendaTipoCitaDataSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    duracionMinutos: z.number().int().nullable(),
    esVirtual: z.boolean(),
    esPresencial: z.boolean(),
    orden: z.number().int().nullable(),
    limiteConcurrencia: z.number().int().default(1),
    activo: z.boolean().default(true),
    // No incluir createdAt, updatedAt a menos que la UI los necesite
});
export type AgendaTipoCitaData = z.infer<typeof agendaTipoCitaDataSchema>;

// Esquema para HorarioAtencion (HorarioAtencionBase)
export const horarioAtencionDataSchema = z.object({
    id: z.string().cuid(),
    // negocioId: z.string().cuid(), // El negocioId ya está en el nivel superior
    dia: z.custom<DiaSemanaPrisma>(), // Asumimos que DiaSemanaPrisma es un enum importado de @prisma/client
    horaInicio: z.string(), // Formato HH:MM
    horaFin: z.string(),   // Formato HH:MM
});
export type HorarioAtencionData = z.infer<typeof horarioAtencionDataSchema>;

// Esquema para ExcepcionHorario (ExcepcionHorarioBase)
export const excepcionHorarioDataSchema = z.object({
    id: z.string().cuid(),
    // negocioId: z.string().cuid(),
    fecha: z.string(), // Formato YYYY-MM-DD
    esDiaNoLaborable: z.boolean(),
    horaInicio: z.string().nullable(),
    horaFin: z.string().nullable(),
    descripcion: z.string().nullable(),
});
export type ExcepcionHorarioData = z.infer<typeof excepcionHorarioDataSchema>;


// Esquema para la configuración completa de la agenda que devuelve la acción principal
export const configuracionCompletaAgendaSchema = z.object({
    negocioId: z.string().cuid(),
    agendaConfiguracion: agendaConfiguracionDataSchema.nullable(),
    agendaTiposCita: z.array(agendaTipoCitaDataSchema),
    horariosAtencion: z.array(horarioAtencionDataSchema),
    excepcionesHorario: z.array(excepcionHorarioDataSchema),
});
export type ConfiguracionCompletaAgendaData = z.infer<typeof configuracionCompletaAgendaSchema>;

// Funciones de parsing de Prisma a Zod para cada tipo
export function parsePrismaTiposCitaToZod(data: AgendaTipoCitaPrisma[]): AgendaTipoCitaData[] {
    return z.array(agendaTipoCitaDataSchema).parse(data.map(tc => ({ ...tc, limiteConcurrencia: tc.limiteConcurrencia ?? 1, activo: tc.activo ?? true })));
}
export function parsePrismaHorariosToZod(data: HorarioAtencionPrisma[]): HorarioAtencionData[] {
    return z.array(horarioAtencionDataSchema).parse(data);
}
export function parsePrismaExcepcionesToZod(data: ExcepcionHorarioPrisma[]): ExcepcionHorarioData[] {
    return z.array(excepcionHorarioDataSchema).parse(data.map(ex => ({
        ...ex,
        fecha: ex.fecha.toISOString().split('T')[0] // Convertir Date a string YYYY-MM-DD
    })));
}