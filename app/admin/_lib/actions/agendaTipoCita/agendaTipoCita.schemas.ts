import { z } from 'zod';

// Esquema para el formulario de creación/edición de AgendaTipoCita
export const upsertAgendaTipoCitaFormSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre es obligatorio." }).trim(),
    descripcion: z.string().trim().nullish().transform(val => val || null),
    duracionMinutos: z.preprocess(
        // Convierte string vacío o no número a undefined para que Zod lo maneje como opcional o lo coaccione.
        // O permite que Zod lo coaccione directamente a número, Zod intentará parseInt.
        // Si es string vacío, se vuelve null por el .nullish().transform()
        val => (val === "" || val === undefined || val === null) ? null : Number(val),
        z.number().int().positive({ message: "La duración debe ser un número positivo." }).nullish().transform(val => val ?? null)
    ),
    esVirtual: z.boolean().default(false),
    esPresencial: z.boolean().default(false),
    limiteConcurrencia: z.preprocess(
        val => (val === "" || val === undefined || val === null) ? 1 : Number(val), // Default 1 si está vacío
        z.number().int().min(1, { message: "La concurrencia debe ser al menos 1." }).default(1)
    ),
    // 'activo' y 'orden' no se manejan directamente en este formulario,
    // 'orden' se actualiza por DnD y 'activo' podría ser un switch separado si se necesitara.
});
export type UpsertAgendaTipoCitaFormInput = z.infer<typeof upsertAgendaTipoCitaFormSchema>;

// Esquema para los datos de AgendaTipoCita que las actions devolverán.
// Incluye campos del modelo Prisma que son relevantes para la UI.
export const agendaTipoCitaDataSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    duracionMinutos: z.number().int().positive().nullable(),
    esVirtual: z.boolean(),
    esPresencial: z.boolean(),
    orden: z.number().int().nullable(), // El orden puede ser null inicialmente desde la BD
    limiteConcurrencia: z.number().int().min(1),
    activo: z.boolean(),
    // No incluimos createdAt/updatedAt a menos que la UI los necesite explícitamente
});
export type AgendaTipoCitaData = z.infer<typeof agendaTipoCitaDataSchema>;

// Esquema para la actualización del orden
export const ordenAgendaTipoCitaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int(),
});
export type OrdenAgendaTipoCitaItem = z.infer<typeof ordenAgendaTipoCitaItemSchema>;

export const actualizarOrdenTiposCitaSchema = z.object({
    negocioId: z.string().cuid(),
    items: z.array(ordenAgendaTipoCitaItemSchema),
});
export type ActualizarOrdenTiposCitaInput = z.infer<typeof actualizarOrdenTiposCitaSchema>;