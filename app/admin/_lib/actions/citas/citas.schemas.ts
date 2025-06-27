import { z } from 'zod';
import { StatusAgenda as PrismaStatusAgendaEnum } from '@prisma/client';

// Zod enum para el estado de la cita
export const CitaStatusZodEnum = z.nativeEnum(PrismaStatusAgendaEnum);

// Esquema principal para una cita en la UI
export const CitaSchema = z.object({
    id: z.string().cuid(),
    fecha: z.date(),
    asunto: z.string(),
    status: CitaStatusZodEnum,
    lead: z.object({
        nombre: z.string(),
        telefono: z.string().nullable(),
    }),
    // El tipo de cita puede no estar siempre vinculado
    tipoDeCita: z.object({
        nombre: z.string(),
        duracionMinutos: z.number().int().nullable(),
    }).nullable(),
});

// Tipo inferido para usar en los componentes
export type CitaType = z.infer<typeof CitaSchema>;

// import { StatusAgenda } from '@prisma/client';
export enum StatusAgenda {
    COMPLETADA = "COMPLETADA",
    NO_ASISTIO = "NO_ASISTIO",
    // Agrega aquí otros estados si existen
}



// Esquema para la entrada de la acción
export const listarCitasParamsSchema = z.object({
    negocioId: z.string().cuid(),
});

// Esquema para un item individual en la lista/calendario
export const citaListItemSchema = z.object({
    id: z.string().cuid(),
    asunto: z.string(),
    start: z.date(),
    end: z.date(),
    // CORRECCIÓN 2: Usamos el enum nativo de Prisma para la validación.
    status: z.nativeEnum(StatusAgenda),
    lead: z.object({
        id: z.string().cuid(),
        nombre: z.string(),
        telefono: z.string().nullable(),
    }).nullable(),
    tipoDeCita: z.object({
        nombre: z.string(),
    }).nullable(),
});

export type CitaListItem = z.infer<typeof citaListItemSchema>;

// CORRECCIÓN 3: Actualizamos también el esquema para la acción de cambio de estado.
export const actualizarEstadoCitaParamsSchema = z.object({
    agendaId: z.string().cuid(),
    nuevoEstado: z.nativeEnum(StatusAgenda),
});