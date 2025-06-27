import { z } from 'zod';

// Esquema base que refleja los campos editables del modelo Prisma
export const NegocioRedSocialSchema = z.object({
    id: z.string().cuid(),
    nombreRed: z.string()
        .trim()
        .min(1, "El nombre de la red es obligatorio.")
        .max(50, "El nombre no debe exceder los 50 caracteres."),
    url: z.string()
        .trim()
        .min(1, "La URL es obligatoria.")
        .url("La URL proporcionada no es válida."),
    icono: z.string().trim().max(50).nullable().optional(),
    orden: z.number().int().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Esquema para la entrada de la acción de CREAR una red social
export const CrearRedSocialNegocioSchema = NegocioRedSocialSchema.pick({
    nombreRed: true,
    url: true,
    icono: true,
});

// Esquema para la entrada de la acción de ACTUALIZAR una red social
export const ActualizarRedSocialNegocioSchema = NegocioRedSocialSchema.pick({
    nombreRed: true,
    url: true,
    icono: true,
}).partial();

// Esquema para un item individual en la data de REORDENAMIENTO
export const RedSocialOrdenDataItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int(),
});
export const ActualizarOrdenRedesSocialesSchema = z.array(RedSocialOrdenDataItemSchema);


// --- Tipos Inferidos ---
export type NegocioRedSocialType = z.infer<typeof NegocioRedSocialSchema>;
export type CrearRedSocialNegocioType = z.infer<typeof CrearRedSocialNegocioSchema>;
export type ActualizarRedSocialNegocioType = z.infer<typeof ActualizarRedSocialNegocioSchema>;
export type ActualizarOrdenRedesSocialesType = z.infer<typeof ActualizarOrdenRedesSocialesSchema>;
