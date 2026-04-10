import { z } from 'zod';

// Esquema para la entrada de crear y editar una EtiquetaTarea
export const EtiquetaTareaInputSchema = z.object({
    nombre: z.string().min(1, "El nombre de la etiqueta es obligatorio.").max(50, "El nombre no puede exceder los 50 caracteres."),
    descripcion: z.string().max(200, "La descripción no puede exceder los 200 caracteres.").nullable().optional(),
    // 'orden' se maneja en el backend o por la acción de ordenar.
    // 'id' no se incluye aquí, se pasa por separado para editar.
});
export type EtiquetaTareaInput = z.infer<typeof EtiquetaTareaInputSchema>;

// Esquema para un ítem en la lista de ordenamiento
export const OrdenarEtiquetaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(0),
});
export type OrdenarEtiquetaItem = z.infer<typeof OrdenarEtiquetaItemSchema>;

// Esquema para el input de la acción de ordenar etiquetas
export const OrdenarEtiquetasInputSchema = z.array(OrdenarEtiquetaItemSchema);
export type OrdenarEtiquetasInput = z.infer<typeof OrdenarEtiquetasInputSchema>;

// Esquema para EtiquetaTarea tal como se devuelve desde Prisma (o una versión simplificada)
// El tipo EtiquetaTareaBasePrisma que importas en tus types parece ser el tipo de Prisma.
// Podemos usar ese directamente o definir un schema si necesitamos transformaciones/validaciones específicas al leer.
export const EtiquetaTareaPrismaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    orden: z.number().int().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type EtiquetaTareaPrisma = z.infer<typeof EtiquetaTareaPrismaSchema>;


// Esquema para EtiquetaConOrden (usado en la UI, incluyendo el conteo de tareas)
export const EtiquetaConOrdenSchema = EtiquetaTareaPrismaSchema.extend({
    orden: z.number().int(), // 'orden' es requerido y no nulo en la UI después del mapeo
    _count: z.object({
        tareas: z.number().int().optional(), // Conteo de tareas que usan esta etiqueta
    }).optional(),
});
export type EtiquetaConOrden = z.infer<typeof EtiquetaConOrdenSchema>;