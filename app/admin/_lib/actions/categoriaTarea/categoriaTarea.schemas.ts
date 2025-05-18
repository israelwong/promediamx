// En: app/admin/_lib/actions/categoriaTarea/categoriaTarea.schemas.ts
import { z } from 'zod';

export const categoriaTareaDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    orden: z.number().int().nullable(),
    color: z.string().nullable(), // El componente usa color
});
export type CategoriaTareaData = z.infer<typeof categoriaTareaDataSchema>;

// Schema para crear/actualizar si lo necesitas para otras funciones
export const upsertCategoriaTareaFormSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido"),
    descripcion: z.string().nullish().transform(val => val || null),
    color: z.string().nullish().transform(val => val || null),
    // orden se maneja por separado
});
export type UpsertCategoriaTareaFormInput = z.infer<typeof upsertCategoriaTareaFormSchema>;