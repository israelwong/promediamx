import { z } from 'zod';

export const OfertaDocumentoItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    documentoUrl: z.string().url({ message: "URL del documento inválida." }),
    createdAt: z.date(),
    documentoNombre: z.string().min(1, "El nombre del documento es requerido.").max(255).nullable().optional(),
    documentoTipo: z.string().max(100).nullable().optional(),
    documentoTamanoBytes: z.number().int().positive("El tamaño debe ser positivo.").nullable().optional(),
    descripcion: z.string().max(500, "Descripción demasiado larga.").nullable().optional(),
    orden: z.number().int().nullable(),
});
export type OfertaDocumentoItemType = z.infer<typeof OfertaDocumentoItemSchema>;

export const ActualizarDetallesDocumentoOfertaSchema = z.object({
    documentoNombre: z.string().min(1, "El nombre no puede estar vacío.").max(255).nullable().optional()
        .transform(val => val === '' ? null : val), // Transforma string vacío a null
    descripcion: z.string().max(500).nullable().optional()
        .transform(val => val === '' ? null : val),
});
export type ActualizarDetallesDocumentoOfertaData = z.infer<typeof ActualizarDetallesDocumentoOfertaSchema>;

export const ReordenarDocumentosOfertaSchema = z.array(
    z.object({
        id: z.string().cuid(),
        orden: z.number().int(),
    })
).min(1, "Se requiere al menos un elemento para reordenar.");
export type ReordenarDocumentosOfertaData = z.infer<typeof ReordenarDocumentosOfertaSchema>;
