import { z } from 'zod';

// Esquema Zod para la entrada del formulario al crear/actualizar AgendaConfiguracion.
export const upsertAgendaConfiguracionFormSchema = z.object({
    aceptaCitasPresenciales: z.boolean().default(false),
    aceptaCitasVirtuales: z.boolean().default(false),
    requiereTelefonoParaCita: z.boolean().default(false),
    requiereEmailParaCita: z.boolean().default(false),
    requiereNombreParaCita: z.boolean().default(true), // Default que tenías en Negocio
    bufferMinutos: z.number().int().positive().nullish().transform(val => val ?? null), // nullish para aceptar undefined o null
    metodosPagoTexto: z.string().trim().optional().nullable().transform(val => val === '' ? null : val), // Si está vacío, lo transformamos a null
});
// Tipo TypeScript inferido para los datos del formulario
export type UpsertAgendaConfiguracionFormInput = z.infer<typeof upsertAgendaConfiguracionFormSchema>;

// Esquema Zod para los datos de AgendaConfiguracion que las actions devolverán.
// Este define la "forma" de los datos de esta entidad.
export const agendaConfiguracionDataSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    aceptaCitasPresenciales: z.boolean(),
    aceptaCitasVirtuales: z.boolean(),
    requiereTelefonoParaCita: z.boolean(),
    requiereEmailParaCita: z.boolean(),
    requiereNombreParaCita: z.boolean(),
    bufferMinutos: z.number().int().positive().nullable(),
    metodosPagoTexto: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// Tipo TypeScript inferido para los datos de AgendaConfiguracion devueltos por la action
export type AgendaConfiguracionData = z.infer<typeof agendaConfiguracionDataSchema>;