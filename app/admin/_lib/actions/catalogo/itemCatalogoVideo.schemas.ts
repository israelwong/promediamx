// Sugerencia de Ruta: @/app/admin/_lib/actions/catalogo/itemCatalogoVideo.schemas.ts
import { z } from 'zod';

// Enum para los tipos de video (reutilizable)
export const TipoVideoEnumSchema = z.enum(['SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL'], {
    error: "Tipo de video no válido.",
});
export type TipoVideoType = z.infer<typeof TipoVideoEnumSchema>;

// Esquema para un ítem de video de ItemCatalogo (cuando se muestra o se devuelve por una acción)
export const ItemCatalogoVideoItemSchema = z.object({
    id: z.string().cuid(),
    itemCatalogoId: z.string().cuid(),
    videoUrl: z.string().url({ message: "URL de video inválida." }),
    tipoVideo: TipoVideoEnumSchema,
    titulo: z.string().max(150, "Máximo 150 caracteres.").nullable().optional(),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullable().optional(),
    orden: z.number().int().min(0).default(0).nullable().optional(), // Asumimos que solo habrá un video por ítem, orden podría ser siempre 0 o no usarse.
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type ItemCatalogoVideoItemType = z.infer<typeof ItemCatalogoVideoItemSchema>;

// Esquema para los datos al añadir/actualizar un video de ItemCatalogo
export const UpsertItemCatalogoVideoSchema = z.object({
    tipoVideo: TipoVideoEnumSchema,
    videoUrl: z.string().max(1024, "URL demasiado larga.").optional().nullable(), // URL para tipos YOUTUBE, VIMEO, OTRO_URL
    titulo: z.string().max(150, "El título no debe exceder los 150 caracteres.").optional().nullable(),
    descripcion: z.string().max(500, "La descripción no debe exceder los 500 caracteres.").optional().nullable(),
    // El archivo se maneja por separado (FormData) si tipoVideo es SUBIDO

}).refine(data => {
    if (data.tipoVideo !== TipoVideoEnumSchema.enum.SUBIDO) {
        if (!data.videoUrl || data.videoUrl.trim() === '') return false;
        try {
            new URL(data.videoUrl); // Validar si es una URL
            return true;
        } catch {
            return false;
        }
    }
    return true;
}, {
    message: "Se requiere una URL válida para el tipo de video seleccionado (YouTube, Vimeo, Otro URL).",
    path: ["videoUrl"], // Asociar error al campo videoUrl
});
export type UpsertItemCatalogoVideoData = z.infer<typeof UpsertItemCatalogoVideoSchema>;

