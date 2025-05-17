// @/app/admin/_lib/actions/catalogo/negocioCategoria.schemas.ts
import { z } from 'zod';

// Esquema base para los campos editables de una NegocioCategoria
export const NegocioCategoriaCoreSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre de la categoría es obligatorio.")
        .max(100, "El nombre no puede exceder los 100 caracteres."),
    descripcion: z.string().max(255, "La descripción no puede exceder los 255 caracteres.").nullish(),
    // 'orden', 'negocioId', 'status' son manejados por el backend o pasados como args.
});

// Esquema completo para una NegocioCategoria, reflejando el modelo Prisma
// y los campos que se podrían devolver.
export const NegocioCategoriaSchema = NegocioCategoriaCoreSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    orden: z.number().int().nullable(), // El orden puede ser null inicialmente
    status: z.string().default('activo'), // Asumimos un estado por defecto
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioCategoriaType = z.infer<typeof NegocioCategoriaSchema>;

// Esquema para los datos al crear una nueva categoría de negocio.
// negocioId se pasará como argumento directo a la acción.
export const CrearNegocioCategoriaDataSchema = NegocioCategoriaCoreSchema;
export type CrearNegocioCategoriaData = z.infer<typeof CrearNegocioCategoriaDataSchema>;

// Esquema para los datos al actualizar una categoría de negocio existente.
// id se pasará como argumento directo a la acción.
// Todos los campos son opcionales para la actualización.
export const ActualizarNegocioCategoriaDataSchema = NegocioCategoriaCoreSchema.partial();
export type ActualizarNegocioCategoriaData = z.infer<typeof ActualizarNegocioCategoriaDataSchema>;

// Esquema para un item individual en la data de reordenamiento de categorías.
export const CategoriaOrdenDataItemSchema = z.object({
    id: z.string().cuid({ message: "ID de categoría inválido." }),
    orden: z.number().int({ message: "El orden debe ser un número entero." }),
});

// Esquema para el array completo de datos de reordenamiento.
export const ActualizarOrdenCategoriasDataSchema = z.array(CategoriaOrdenDataItemSchema);
export type ActualizarOrdenCategoriasData = z.infer<typeof ActualizarOrdenCategoriasDataSchema>;

// Tipo que usa el componente CatalogoCategorias.tsx en su estado (NegocioCategoriaConOrden)
// Asegura que 'orden' sea un número (o null si así se prefiere en el estado inicial).
// El componente ya lo maneja como `number | null`.
export const NegocioCategoriaParaComponenteSchema = NegocioCategoriaSchema.extend({
    // No se necesita extender si NegocioCategoriaSchema.orden ya es nullable
    // orden: z.number().int().nullable(),
});
export type NegocioCategoriaParaComponenteType = z.infer<typeof NegocioCategoriaParaComponenteSchema>;

