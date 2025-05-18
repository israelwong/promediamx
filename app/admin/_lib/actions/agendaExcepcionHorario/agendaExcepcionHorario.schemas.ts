import { z } from 'zod';

// Esquema para validar el formato HH:MM
const horaHHMMRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Esquema para el formulario de creación/edición de ExcepcionHorario
export const upsertExcepcionHorarioFormSchema = z.object({
    fecha: z.string().min(1, { message: "La fecha es obligatoria." })
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha debe ser YYYY-MM-DD." }),
    descripcion: z.string().trim().nullish().transform(val => val || null),
    esDiaNoLaborable: z.boolean().default(true),
    horaInicio: z.string().regex(horaHHMMRegex, { message: "Formato de hora de inicio inválido (HH:MM)." }).nullish().transform(val => val || null),
    horaFin: z.string().regex(horaHHMMRegex, { message: "Formato de hora de fin inválido (HH:MM)." }).nullish().transform(val => val || null),
})
    .refine(data => {
        // Si NO es día no laborable, las horas son requeridas
        if (!data.esDiaNoLaborable) {
            return !!data.horaInicio && !!data.horaFin;
        }
        return true;
    }, {
        message: "Para 'Horario Especial', las horas de inicio y fin son obligatorias.",
        path: ['horaInicio'], // O un path genérico o a ambos campos de hora
    })
    .refine(data => {
        // Si NO es día no laborable y ambas horas están presentes, inicio debe ser menor que fin
        if (!data.esDiaNoLaborable && data.horaInicio && data.horaFin) {
            return data.horaInicio < data.horaFin;
        }
        return true;
    }, {
        message: "La hora de inicio debe ser anterior a la hora de fin.",
        path: ['horaFin'],
    });

export type UpsertExcepcionHorarioFormInput = z.infer<typeof upsertExcepcionHorarioFormSchema>;

// Esquema para los datos de ExcepcionHorario que las actions devolverán.
// La fecha se mantiene como string YYYY-MM-DD para consistencia con el formulario.
export const excepcionHorarioDataSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Fecha como YYYY-MM-DD
    descripcion: z.string().nullable(),
    esDiaNoLaborable: z.boolean(),
    horaInicio: z.string().regex(horaHHMMRegex).nullable(),
    horaFin: z.string().regex(horaHHMMRegex).nullable(),
    // No incluimos createdAt/updatedAt a menos que la UI los necesite explícitamente
});
export type ExcepcionHorarioData = z.infer<typeof excepcionHorarioDataSchema>;