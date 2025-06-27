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
