// Ruta: app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.schemas.ts
import { z } from 'zod';

// Esquema para un ítem de la galería de paquete (cuando se muestra o se devuelve por una acción)
export const NegocioPaqueteGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    negocioPaqueteId: z.string().cuid(),
    imageUrl: z.string().url(),
    altText: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().min(0),
    tamañoBytes: z.number().int().min(0).nullable().optional(), // Puede ser null si no se pudo determinar
    createdAt: z.date(),
});
export type NegocioPaqueteGaleriaItem = z.infer<typeof NegocioPaqueteGaleriaItemSchema>;

// Esquema para actualizar los detalles (altText, descripción) de una imagen
export const ActualizarDetallesImagenGaleriaPaqueteSchema = z.object({
    altText: z.string().optional(),
    descripcion: z.string().optional(),
});
export type ActualizarDetallesImagenGaleriaPaqueteData = z.infer<typeof ActualizarDetallesImagenGaleriaPaqueteSchema>;

// Esquema para los datos de entrada de la acción de reordenar imágenes de la galería
export const ReordenarImagenesGaleriaPaqueteSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de imagen inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo." }),
    })
);
export type ReordenarImagenesGaleriaPaqueteData = z.infer<typeof ReordenarImagenesGaleriaPaqueteSchema>;
