// @/app/admin/_lib/actions/catalogo/catalogo.schemas.ts
import { z } from 'zod';

// Esquema para los datos de un catálogo como se muestra en la lista
// Basado en el tipo CatalogoParaLista de tus actions.
export const CatalogoParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(1, "El nombre del catálogo es obligatorio."),
    descripcion: z.string().nullish(),
    status: z.string(), // Podría ser un z.enum(['activo', 'inactivo']) si tienes estados fijos
    imagenPortadaUrl: z.string().url().nullish(),
    _count: z.object({
        ItemCatalogo: z.number().int().nonnegative(),
    }).optional(),
});
export type CatalogoParaListaType = z.infer<typeof CatalogoParaListaSchema>;

// Esquema para los datos necesarios al crear un nuevo catálogo.
// negocioId se pasará como argumento a la acción.
export const CrearCatalogoDataSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre del catálogo es obligatorio.")
        .max(100, "El nombre no puede exceder los 100 caracteres."),
    descripcion: z.string().max(500, "La descripción no puede exceder los 500 caracteres.").nullish(),
    status: z.string().optional(), // Default a 'activo' si no se provee
});
export type CrearCatalogoData = z.infer<typeof CrearCatalogoDataSchema>;

// Esquema para los datos al actualizar un catálogo (desde CatalogoEditarForm.tsx, por ejemplo)
// id se pasará como argumento a la acción.
export const ActualizarCatalogoDataSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre del catálogo es obligatorio.")
        .max(100, "El nombre no puede exceder los 100 caracteres.")
        .optional(),
    descripcion: z.string().max(500, "La descripción no puede exceder los 500 caracteres.").nullish().optional(),
    status: z.string().optional(),
    // imagenPortadaUrl se manejará con una acción separada (CatalogoPortada.tsx)
});
export type ActualizarCatalogoData = z.infer<typeof ActualizarCatalogoDataSchema>;

// Esquema para la respuesta de la acción de eliminar catálogo
// (Aunque CatalogoLista no la usa directamente, es bueno tenerla)
export const EliminarCatalogoPayloadSchema = z.object({
    // Podría incluir el id del catálogo eliminado si fuera útil
    // id: z.string().cuid(),
    message: z.string().optional(),
});
export type EliminarCatalogoPayload = z.infer<typeof EliminarCatalogoPayloadSchema>;

