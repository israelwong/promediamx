import { z } from 'zod';

// Esquema para un ítem de la galería de un OfertaDetalle
export const OfertaDetalleGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    ofertaDetalleId: z.string().cuid(), // Cambiado de ofertaId
    imageUrl: z.string().url({ message: "URL de imagen inválida." }),
    altText: z.string().max(255, "Máximo 255 caracteres.").nullable().optional(),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullable().optional(),
    orden: z.number().int().min(0).default(0),
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(),
});
export type OfertaDetalleGaleriaItemType = z.infer<typeof OfertaDetalleGaleriaItemSchema>;

// Esquema para actualizar los detalles de una imagen de la galería de OfertaDetalle
export const ActualizarDetallesImagenDetalleGaleriaSchema = z.object({
    altText: z.string().max(255).transform(val => val.trim() === '' ? null : val).nullable().optional(),
    descripcion: z.string().max(500).transform(val => val.trim() === '' ? null : val).nullable().optional(),
});
export type ActualizarDetallesImagenDetalleGaleriaData = z.infer<typeof ActualizarDetallesImagenDetalleGaleriaSchema>;

// Esquema para los datos de entrada de la acción de reordenar imágenes de la galería de OfertaDetalle
export const ReordenarImagenesDetalleGaleriaSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de imagen inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo o cero." }),
    })
).min(0); // Permitir array vacío si no hay nada que reordenar o se eliminan todas.
export type ReordenarImagenesDetalleGaleriaData = z.infer<typeof ReordenarImagenesDetalleGaleriaSchema>;