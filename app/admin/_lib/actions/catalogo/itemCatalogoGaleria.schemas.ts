// Sugerencia de Ruta: @/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.schemas.ts
import { z } from 'zod';

// Esquema para un ítem de la galería de ItemCatalogo
export const ItemCatalogoGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    itemCatalogoId: z.string().cuid(),
    imageUrl: z.string().url({ message: "URL de imagen inválida." }),
    altText: z.string().max(255, "Máximo 255 caracteres.").nullable().optional(),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullable().optional(),
    orden: z.number().int().min(0).default(0),
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(), // createdAt SÍ existe en el modelo Prisma
});
export type ItemCatalogoGaleriaItemType = z.infer<typeof ItemCatalogoGaleriaItemSchema>;

// Esquema para actualizar los detalles (altText, descripción) de una imagen de la galería del ítem
export const ActualizarDetallesImagenGaleriaItemSchema = z.object({
    altText: z.string().max(255).transform(val => val.trim() === '' ? null : val).nullable().optional(),
    descripcion: z.string().max(500).transform(val => val.trim() === '' ? null : val).nullable().optional(),
});
export type ActualizarDetallesImagenGaleriaItemData = z.infer<typeof ActualizarDetallesImagenGaleriaItemSchema>;

// Esquema para los datos de entrada de la acción de reordenar imágenes
export const ReordenarImagenesGaleriaItemSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de imagen inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo o cero." }),
    })
);
export type ReordenarImagenesGaleriaItemData = z.infer<typeof ReordenarImagenesGaleriaItemSchema>;
