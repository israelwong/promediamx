// @/app/admin/_lib/actions/negocio/redesNegocio.schemas.ts
import { z } from 'zod';

// Esquema base que refleja el modelo Prisma NegocioRedSocial
export const NegocioRedSocialSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombreRed: z.string()
        .min(1, "El nombre de la red es obligatorio.")
        .max(50, "El nombre de la red no debe exceder los 50 caracteres."),
    url: z.string()
        .min(1, "La URL es obligatoria.")
        .url("La URL proporcionada no es válida."),
    icono: z.string().max(50, "El nombre del icono no debe exceder los 50 caracteres.").nullish(),
    orden: z.number().int().nullish(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioRedSocialType = z.infer<typeof NegocioRedSocialSchema>;

// Esquema para los datos al crear una nueva red social
// negocioId se pasará como argumento directo a la acción.
export const CrearRedSocialNegocioDataSchema = z.object({
    nombreRed: NegocioRedSocialSchema.shape.nombreRed,
    url: NegocioRedSocialSchema.shape.url,
    icono: NegocioRedSocialSchema.shape.icono.optional(), // Hacerlo opcional explícitamente aquí
});
export type CrearRedSocialNegocioData = z.infer<typeof CrearRedSocialNegocioDataSchema>;

// Esquema para los datos al actualizar una red social existente
// id se pasará como argumento directo a la acción.
export const ActualizarRedSocialNegocioDataSchema = z.object({
    nombreRed: NegocioRedSocialSchema.shape.nombreRed.optional(),
    url: NegocioRedSocialSchema.shape.url.optional(),
    icono: NegocioRedSocialSchema.shape.icono.optional(),
    // 'orden' se maneja con una acción separada y no se actualiza aquí
});
export type ActualizarRedSocialNegocioData = z.infer<typeof ActualizarRedSocialNegocioDataSchema>;

// Esquema para un item individual en la data de reordenamiento
export const RedSocialOrdenDataItemSchema = z.object({
    id: z.string().cuid({ message: "ID de red social inválido." }),
    orden: z.number().int({ message: "El orden debe ser un número entero." }),
});

// Esquema para el array completo de datos de reordenamiento
export const ActualizarOrdenRedesSocialesDataSchema = z.array(RedSocialOrdenDataItemSchema);
export type ActualizarOrdenRedesSocialesData = z.infer<typeof ActualizarOrdenRedesSocialesDataSchema>;