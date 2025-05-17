// Ruta: app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.schemas.ts
import { z } from 'zod';

// Enum para los tipos de video (puedes expandirlo)
export const TipoVideoEnum = z.enum(['SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL']);
export type TipoVideo = z.infer<typeof TipoVideoEnum>;

// Enum para los tipos de video (reutilizable)
export const TipoVideoEnumSchema = z.enum(['SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL'], {
    required_error: "El tipo de video es requerido.",
    invalid_type_error: "Tipo de video no válido.",
});
export type TipoVideoType = z.infer<typeof TipoVideoEnumSchema>;


// Esquema para un ítem de video de paquete (cuando se muestra o se devuelve por una acción)
export const NegocioPaqueteVideoItemSchema = z.object({
    id: z.string().cuid(),
    negocioPaqueteId: z.string().cuid(),
    videoUrl: z.string().url({ message: "URL de video inválida." }),
    tipoVideo: TipoVideoEnum,
    titulo: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().min(0).default(0),
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioPaqueteVideoItem = z.infer<typeof NegocioPaqueteVideoItemSchema>;

// Esquema para los datos al añadir/actualizar un video
export const UpsertNegocioPaqueteVideoSchema = z.object({
    tipoVideo: TipoVideoEnum,
    videoUrl: z.string().optional().nullable(), // Hacerlo opcional en la base
    titulo: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
}).refine(data => {
    // Si el tipo NO es SUBIDO, entonces videoUrl es requerido y debe ser una URL válida.
    if (data.tipoVideo !== TipoVideoEnum.enum.SUBIDO) {
        if (!data.videoUrl || data.videoUrl.trim() === '') return false; // Requerido
        try {
            // Validar que sea una URL si no es SUBIDO y tiene valor
            // Zod lo haría con .url() si no fuera por esta lógica condicional.
            // Aquí hacemos un chequeo simple. Para validación de URL más robusta,
            // podrías usar una librería o un regex más complejo si es necesario.
            new URL(data.videoUrl);
            return true;
        } catch {
            return false; // No es una URL válida
        }
    }
    return true; // Si es SUBIDO, videoUrl puede estar vacío (el archivo se maneja por selectedFile)
}, {
    // Este mensaje se aplicará si la función refine devuelve false.
    // Es mejor manejar mensajes de error específicos para videoUrl en la UI si es posible.
    message: "Se requiere una URL válida para el tipo de video seleccionado, o un archivo si el tipo es 'Subir'.",
    path: ["videoUrl"], // Asocia el error al campo videoUrl si la lógica de URL falla
});
export type UpsertNegocioPaqueteVideoData = z.infer<typeof UpsertNegocioPaqueteVideoSchema>;


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
