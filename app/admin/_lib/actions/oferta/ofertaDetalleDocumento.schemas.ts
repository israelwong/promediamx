import { z } from 'zod';

// Esquema para un ítem de documento de un OfertaDetalle
export const OfertaDetalleDocumentoItemSchema = z.object({
    id: z.string().cuid(),
    ofertaDetalleId: z.string().cuid(), // Clave foránea a OfertaDetalle
    documentoUrl: z.string().url({ message: "URL del documento inválida." }),
    documentoNombre: z.string().min(1, "El nombre es requerido.").max(255).nullable().optional(),
    documentoTipo: z.string().max(100).nullable().optional(), // Ej: 'application/pdf'
    documentoTamanoBytes: z.number().int().positive("El tamaño debe ser positivo.").nullable().optional(),
    descripcion: z.string().max(500, "Descripción demasiado larga.").nullable().optional(),
    orden: z.number().int().optional(), // Mantener por si SharedDocumentManager lo usa
    createdAt: z.date(),
    // Asumiendo que el modelo OfertaDetalleDocumento no tiene 'updatedAt'
});
export type OfertaDetalleDocumentoItemType = z.infer<typeof OfertaDetalleDocumentoItemSchema>;

// Esquema para actualizar los detalles de un documento de OfertaDetalle
export const ActualizarDetallesDocumentoDetalleSchema = z.object({
    documentoNombre: z.string().min(1, "El nombre no puede ser vacío.").max(255).transform(val => val.trim() === '' ? null : val).nullable().optional(),
    descripcion: z.string().max(500).transform(val => val.trim() === '' ? null : val).nullable().optional(),
});
export type ActualizarDetallesDocumentoDetalleData = z.infer<typeof ActualizarDetallesDocumentoDetalleSchema>;

// Esquema para reordenar documentos de OfertaDetalle
export const ReordenarDocumentosDetalleSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de documento inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo o cero." }),
    })
).min(0); // Permitir array vacío
export type ReordenarDocumentosDetalleData = z.infer<typeof ReordenarDocumentosDetalleSchema>;