import { z } from 'zod';
import { DiaSemana as DiaSemanaPrisma } from '@prisma/client'; // Importar el enum de Prisma

// Esquema base para un item individual de horario de atención (usado para entrada y salida)
const horarioAtencionItemBaseSchema = z.object({
    // 'id' es opcional para la creación, pero presente al leer
    id: z.string().cuid().optional(),
    // 'negocioId' no es necesario en este schema si se pasa por separado a la action,
    // pero sí al leer de la BD. Lo incluimos para el tipo de dato de salida.
    negocioId: z.string().cuid().optional(),
    dia: z.nativeEnum(DiaSemanaPrisma), // Validar contra el enum de Prisma
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora de inicio inválido (HH:MM)." }),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora de fin inválido (HH:MM)." }),
});

export const horarioAtencionItemSchema = horarioAtencionItemBaseSchema.refine(data => data.horaInicio < data.horaFin, {
    message: "La hora de inicio debe ser anterior a la hora de fin.",
    // path: ['horaFin'], // Puedes asignar el error a un campo específico si lo deseas
});
export type HorarioAtencionItemData = z.infer<typeof horarioAtencionItemSchema>;

export const guardarHorariosAtencionInputSchema = z.object({
    negocioId: z.string().cuid(),
    horarios: z.array(
        horarioAtencionItemBaseSchema
            .omit({ id: true, negocioId: true })
            .refine(data => data.horaInicio < data.horaFin, {
                message: "La hora de inicio debe ser anterior a la hora de fin.",
            })
    ), // Para la creación, no necesitamos id ni negocioId por item
});
export type GuardarHorariosAtencionInput = z.infer<typeof guardarHorariosAtencionInputSchema>;

// export type GuardarHorariosAtencionInput = z.infer<typeof guardarHorariosAtencionInputSchema>;

// Esquema para los datos devueltos por la acción de obtener horarios
// (similar a HorarioAtencionItemData pero 'id' y 'negocioId' son esperados)
export const horarioAtencionDataSchema = horarioAtencionItemBaseSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
}).refine(data => data.horaInicio < data.horaFin, {
    message: "La hora de inicio debe ser anterior a la hora de fin.",
});
export type HorarioAtencionData = z.infer<typeof horarioAtencionDataSchema>;