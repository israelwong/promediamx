import { z } from 'zod';
import { SharedTipoVideoEnumSchema } from '@/app/admin/_lib/schemas/sharedCommon.schemas'; // Correcta importación del enum compartido

// Re-exportar TipoVideo o usar SharedTipoVideoType directamente
export { SharedTipoVideoEnumSchema as TipoVideoEnumSchema }; // Para usar TipoVideoEnumSchema.enum.SUBIDO etc.
export type TipoVideoType = z.infer<typeof SharedTipoVideoEnumSchema>;

export enum TipoVideo {
    YOUTUBE = 'YOUTUBE',
    VIMEO = 'VIMEO',
    SUBIDO = 'SUBIDO',
    OTRO_URL = 'OTRO_URL'
}

// Esquema para un ítem de video de un OfertaDetalle (REFLEJA LA BASE DE DATOS)
export const OfertaDetalleVideoItemSchema = z.object({
    id: z.string().cuid(),
    ofertaDetalleId: z.string().cuid(),
    videoUrl: z.string().url({ message: "URL de video inválida." }),
    tipoVideo: z.nativeEnum(TipoVideo), // Usar el enum compartido
    titulo: z.string().max(150).nullable().optional(),         // <--- CORREGIDO/CONFIRMADO
    descripcion: z.string().max(500).nullable().optional(),   // <--- CORREGIDO/CONFIRMADO
    orden: z.number().int().min(0).default(0).nullable().optional(), // Mantener si SharedManager lo necesita, aunque sea 1 video
    tamanoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type OfertaDetalleVideoItemType = z.infer<typeof OfertaDetalleVideoItemSchema>;


// Esquema para los datos al añadir/actualizar un video de OfertaDetalle
export const UpsertOfertaDetalleVideoSchema = z.object({
    tipoVideo: SharedTipoVideoEnumSchema,
    videoUrl: z.string().max(1024).trim().optional().nullable(),
    titulo: z.string().max(150).trim().optional().nullable(),
    descripcion: z.string().max(500).trim().optional().nullable(),
}).refine(data => {
    if (data.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO) {
        if (!data.videoUrl || data.videoUrl.trim() === '') return false;
        try { new URL(data.videoUrl); return true; } catch { return false; }
    }
    return true;
}, {
    message: "Se requiere una URL válida para el tipo de video seleccionado (YouTube, Vimeo, Otro Enlace).",
    path: ["videoUrl"], // Aplica el error al campo videoUrl
});
export type UpsertOfertaDetalleVideoData = z.infer<typeof UpsertOfertaDetalleVideoSchema>;


