// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/ofertaGaleria.schemas.ts
import { z } from 'zod';

// Esquema para un ítem de la galería de una Oferta
export const OfertaGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    imageUrl: z.string().url({ message: "URL de imagen inválida." }),
    altText: z.string().max(255, "Máximo 255 caracteres.").nullable().optional(),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullable().optional(),
    orden: z.number().int().min(0).default(0),
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(), // Prisma devuelve Date, z.date() lo espera
    // No hay 'updatedAt' en el modelo Prisma para OfertaGaleria
});
export type OfertaGaleriaItemType = z.infer<typeof OfertaGaleriaItemSchema>;

// Esquema para actualizar los detalles (altText, descripción) de una imagen de la galería de oferta
export const ActualizarDetallesImagenGaleriaOfertaSchema = z.object({
    altText: z.string().max(255).transform(val => val.trim() === '' ? null : val).nullable().optional(),
    descripcion: z.string().max(500).transform(val => val.trim() === '' ? null : val).nullable().optional(),
});
export type ActualizarDetallesImagenGaleriaOfertaData = z.infer<typeof ActualizarDetallesImagenGaleriaOfertaSchema>;

// Esquema para los datos de entrada de la acción de reordenar imágenes de la galería de oferta
export const ReordenarImagenesGaleriaOfertaSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de imagen inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo o cero." }),
    })
);
export type ReordenarImagenesGaleriaOfertaData = z.infer<typeof ReordenarImagenesGaleriaOfertaSchema>;
