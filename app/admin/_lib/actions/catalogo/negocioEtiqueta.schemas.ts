// @/app/admin/_lib/actions/catalogo/negocioEtiqueta.schemas.ts
import { z } from 'zod';

// Esquema base que refleja los campos editables de NegocioEtiqueta
// y los que se devuelven comúnmente.
export const NegocioEtiquetaCoreSchema = z.object({
    nombre: z.string()
        .min(1, "El nombre de la etiqueta es obligatorio.")
        .max(100, "El nombre no puede exceder los 100 caracteres."),
    descripcion: z.string().max(255, "La descripción no puede exceder los 255 caracteres.").nullish(),
    // 'orden', 'negocioId', 'status' son manejados por el backend o pasados como args.
});

// Esquema completo para una NegocioEtiqueta, incluyendo campos de la DB
export const NegocioEtiquetaSchema = NegocioEtiquetaCoreSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    orden: z.number().int().nullable(), // Prisma puede devolver null para orden
    status: z.string(), // Podría ser un enum si tienes estados definidos
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioEtiquetaType = z.infer<typeof NegocioEtiquetaSchema>;

// Esquema para los datos al crear una nueva etiqueta de negocio
// negocioId se pasará como argumento directo a la acción.
export const CrearNegocioEtiquetaDataSchema = NegocioEtiquetaCoreSchema;
export type CrearNegocioEtiquetaData = z.infer<typeof CrearNegocioEtiquetaDataSchema>;

// Esquema para los datos al actualizar una etiqueta de negocio existente
// id se pasará como argumento directo a la acción.
export const ActualizarNegocioEtiquetaDataSchema = NegocioEtiquetaCoreSchema.partial(); // Todos los campos son opcionales
export type ActualizarNegocioEtiquetaData = z.infer<typeof ActualizarNegocioEtiquetaDataSchema>;

// Esquema para un item individual en la data de reordenamiento
export const EtiquetaOrdenDataItemSchema = z.object({
    id: z.string().cuid({ message: "ID de etiqueta inválido." }),
    orden: z.number().int({ message: "El orden debe ser un número entero." }),
});

// Esquema para el array completo de datos de reordenamiento
export const ActualizarOrdenEtiquetasDataSchema = z.array(EtiquetaOrdenDataItemSchema);
export type ActualizarOrdenEtiquetasData = z.infer<typeof ActualizarOrdenEtiquetasDataSchema>;

// Esquema para el tipo NegocioEtiquetaConOrden que usa el componente
export const NegocioEtiquetaConOrdenSchema = NegocioEtiquetaSchema.extend({
    orden: z.number().int(), // En el componente, se asegura que orden sea un número.
});
export type NegocioEtiquetaConOrdenType = z.infer<typeof NegocioEtiquetaConOrdenSchema>;

