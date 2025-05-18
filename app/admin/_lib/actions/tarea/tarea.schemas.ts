import { z } from 'zod';

// Esquema para la información básica de una tarea (ID, nombre, descripción)
// Esto es lo que la acción obtenerTareasBaseAction devolverá por cada tarea.
export const tareaBaseInfoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(), // La descripción puede ser opcional/nula
});
export type TareaBaseInfoData = z.infer<typeof tareaBaseInfoSchema>;

export const categoriaParaTareaSchema = z.object({
    nombre: z.string(),
    // color: z.string().nullable().optional(), // Si lo necesitas para la card
}).nullable();

export const etiquetaParaTareaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});

export const tareaParaMarketplaceSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    precio: z.number().nullable(),
    categoriaTareaId: z.string().cuid().nullable(), // Categoria puede ser opcional
    CategoriaTarea: categoriaParaTareaSchema,
    etiquetas: z.array(
        z.object({
            etiquetaTarea: etiquetaParaTareaSchema.nullable(), // etiquetaTarea puede ser null
        })
    ).default([]),
    _count: z.object({
        AsistenteTareaSuscripcion: z.number().int().default(0),
        TareaGaleria: z.number().int().default(0),
    }),
    // Campos adicionales que podrías querer para la lógica del admin:
    // status: z.string().optional(),
    // esTareaPorDefecto: z.boolean().optional(),
});
export type TareaParaMarketplaceData = z.infer<typeof tareaParaMarketplaceSchema>;