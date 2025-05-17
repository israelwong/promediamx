// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/ofertaVideos.schemas.ts
import { z } from 'zod';
import { SharedTipoVideoEnumSchema } from '@/app/admin/components/shared/SharedVideoManager'; // Reutilizar el enum

// Esquema para un ítem de video de una Oferta
export const OfertaVideoItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    videoUrl: z.string().url({ message: "URL de video inválida." }),
    tipoVideo: SharedTipoVideoEnumSchema, // Usar el enum compartido
    titulo: z.string().max(150).nullable().optional(),
    descripcion: z.string().max(500).nullable().optional(),
    orden: z.number().int().min(0).default(0).nullable().optional(),
    tamañoBytes: z.number().int().min(0).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(), // OfertaVideos SÍ tiene updatedAt en el modelo Prisma
});
export type OfertaVideoItemType = z.infer<typeof OfertaVideoItemSchema>;

// Esquema para los datos al añadir/actualizar un video de Oferta
// Reutilizar SharedUpsertVideoDataSchema o crear uno específico si hay diferencias
export const UpsertOfertaVideoSchema = z.object({
    tipoVideo: SharedTipoVideoEnumSchema,
    videoUrl: z.string().max(1024).optional().nullable(),
    titulo: z.string().max(150).optional().nullable(),
    descripcion: z.string().max(500).optional().nullable(),
}).refine(data => {
    if (data.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO) {
        if (!data.videoUrl || data.videoUrl.trim() === '') return false;
        try { new URL(data.videoUrl); return true; } catch { return false; }
    }
    return true;
}, {
    message: "Se requiere una URL válida para el tipo de video seleccionado.",
    path: ["videoUrl"],
});
export type UpsertOfertaVideoData = z.infer<typeof UpsertOfertaVideoSchema>;
