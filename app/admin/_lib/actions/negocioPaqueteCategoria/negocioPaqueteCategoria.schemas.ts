// Ruta sugerida: app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.schemas.ts
import { z } from 'zod';

export const NegocioPaqueteCategoriaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(1, { message: "El nombre es requerido." }),
    descripcion: z.string().nullable().optional(), // Asumiendo que tienes descripción en tu modelo
    orden: z.number().nullable().optional(),
    status: z.string(), // Puedes usar z.enum(["activo", "inactivo"]) si prefieres
});

export type NegocioPaqueteCategoriaData = z.infer<typeof NegocioPaqueteCategoriaSchema>;

// Esquema para la creación (podría ser ligeramente diferente si algunos campos son opcionales o no se envían)
export const CrearNegocioPaqueteCategoriaSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre es requerido." }),
    descripcion: z.string().optional(),
    // negocioId se pasará directamente a la acción, no necesariamente parte del formulario de datos tipado así
});
export type CrearNegocioPaqueteCategoriaData = z.infer<typeof CrearNegocioPaqueteCategoriaSchema>;

// Esquema para la actualización
export const ActualizarNegocioPaqueteCategoriaSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre es requerido." }).optional(),
    descripcion: z.string().nullable().optional(),
    status: z.string().optional(),
});
export type ActualizarNegocioPaqueteCategoriaData = z.infer<typeof ActualizarNegocioPaqueteCategoriaSchema>;

// Esquema para mostrar una categoría en la lista
export const NegocioPaqueteCategoriaListItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    orden: z.number().nullable().optional(),
    status: z.string(), // Podríamos añadir createdAt/updatedAt si se quiere mostrar
    // negocioId: z.string().cuid(), // Presente en la BD, no siempre necesario en el objeto de datos de UI
});
export type NegocioPaqueteCategoriaListItem = z.infer<typeof NegocioPaqueteCategoriaListItemSchema>;

// Esquema para los datos del formulario de CREACIÓN (solo nombre)
export const UpsertNegocioPaqueteCategoriaSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre de la categoría es obligatorio." }),
});
export type UpsertNegocioPaqueteCategoriaData = z.infer<typeof UpsertNegocioPaqueteCategoriaSchema>;

// Esquema para los datos de entrada de la acción de reordenar categorías
export const ReordenarCategoriasPaqueteSchema = z.array(
    z.object({
        id: z.string().cuid({ message: "ID de categoría inválido." }),
        orden: z.number().int().min(0, { message: "El orden debe ser un número positivo." }),
    })
);
export type ReordenarCategoriasPaqueteData = z.infer<typeof ReordenarCategoriasPaqueteSchema>;
