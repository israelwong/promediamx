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


// Esquema para la entrada de crear y editar una CategoriaTarea
export const CategoriaTareaInputSchema = z.object({
    nombre: z.string().min(1, "El nombre de la categoría es obligatorio.").max(100, "El nombre no puede exceder 100 caracteres."),
    descripcion: z.string().max(255, "La descripción no puede exceder 255 caracteres.").nullable().optional(),
    color: z.string()
        .regex(/^#[0-9A-F]{6}$/i, "Debe ser un código hexadecimal de color válido (ej: #RRGGBB).")
        .nullable()
        .optional(),
});
export type CategoriaTareaInput = z.infer<typeof CategoriaTareaInputSchema>;

// Esquema para un ítem en la lista de ordenamiento
export const OrdenarCategoriaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(0),
});
export type OrdenarCategoriaItem = z.infer<typeof OrdenarCategoriaItemSchema>;

// Esquema para el input de la acción de ordenar categorías
export const OrdenarCategoriasInputSchema = z.array(OrdenarCategoriaItemSchema);
export type OrdenarCategoriasInput = z.infer<typeof OrdenarCategoriasInputSchema>;

// Esquema base para CategoriaTarea (similar al tipo Prisma)
export const CategoriaTareaPrismaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    orden: z.number().int().nullable(),
    color: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type CategoriaTareaPrisma = z.infer<typeof CategoriaTareaPrismaSchema>;

// Esquema para CategoriaConOrden (usado en la UI, incluyendo el conteo de Tareas)
export const CategoriaConOrdenSchema = CategoriaTareaPrismaSchema.extend({
    orden: z.number().int(), // 'orden' es requerido y no nulo en la UI después del mapeo inicial
    _count: z.object({
        Tarea: z.number().int().optional(), // Conteo de Tareas asociadas
    }).optional(),
});
export type CategoriaConOrden = z.infer<typeof CategoriaConOrdenSchema>;

// Tipo para el estado del formulario del modal
export type CategoriaFormData = Partial<CategoriaTareaInput> & { id?: string };