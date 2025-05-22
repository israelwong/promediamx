import { z } from 'zod';

// Esquema para un ítem de la galería de Tarea (TareaGaleria)
// Este es el tipo T que usará SharedImageGalleryManager
export const TareaGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    tareaId: z.string().cuid(),
    imageUrl: z.string().url({ message: "URL de imagen inválida." }),
    altText: z.string().max(255, "Máximo 255 caracteres.").nullable().optional(),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullable().optional(),
    orden: z.number().int().min(0).default(0),
    // tamañoBytes se omite según tu requerimiento
    createdAt: z.preprocess((arg) => { // Para manejar string o Date desde DB/fetch
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date()),
});
export type TareaGaleriaItemType = z.infer<typeof TareaGaleriaItemSchema>;

// Esquema para la entrada de crear un nuevo registro TareaGaleria (después de subir la imagen)
// La acción recibirá la imageUrl de Supabase y el tareaId.
export const CrearTareaGaleriaInputSchema = z.object({
    tareaId: z.string().cuid(),
    imageUrl: z.string().url(),
    altText: z.string().max(255).nullable().optional(),
    descripcion: z.string().max(500).nullable().optional(),
    // orden y tamañoBytes se manejan en el backend o se omiten
});
export type CrearTareaGaleriaInput = z.infer<typeof CrearTareaGaleriaInputSchema>;

// Esquema para actualizar los detalles (altText, descripción) de una imagen de la galería
// Coincide con UpdateGalleryItemDetailsData del SharedImageGalleryManager
export const ActualizarDetallesImagenGaleriaTareaSchema = z.object({
    altText: z.string().max(255).transform(val => val.trim() === '' ? null : val).nullable().optional(),
    descripcion: z.string().max(500).transform(val => val.trim() === '' ? null : val).nullable().optional(),
});
export type ActualizarDetallesImagenGaleriaTareaData = z.infer<typeof ActualizarDetallesImagenGaleriaTareaSchema>;

// Esquema para los datos de entrada de la acción de reordenar imágenes
// Coincide con ReorderGalleryItemData del SharedImageGalleryManager
export const ReordenarImagenesGaleriaTareaSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de imagen inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo o cero." }),
    })
);
export type ReordenarImagenesGaleriaTareaData = z.infer<typeof ReordenarImagenesGaleriaTareaSchema>;