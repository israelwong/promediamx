// app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.schemas.ts
import { z } from 'zod';

export const etiquetaCrmItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    color: z.string().nullable().optional(),
});
export type EtiquetaCrmItemData = z.infer<typeof etiquetaCrmItemSchema>;

// Esquema para los parámetros de obtenerEtiquetasCrmNegocioAction
export const obtenerEtiquetasCrmNegocioParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerEtiquetasCrmNegocioParams = z.infer<typeof obtenerEtiquetasCrmNegocioParamsSchema>;

// Esquema para una EtiquetaCRM (basado en tu modelo Prisma y tipo EtiquetaCRM)
export const etiquetaCrmSchema = z.object({
    id: z.string().cuid(),
    crmId: z.string().cuid(),
    nombre: z.string().min(1, "El nombre es requerido.").max(100, "Nombre muy largo."),
    color: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Color hexadecimal inválido.").nullable().optional() // Valida formato #RGB o #RRGGBB
        .transform(val => val === '' ? null : val), // Tratar string vacío como null
    status: z.string().default('activo'), // Podría ser z.enum(['activo', 'inactivo'])
    orden: z.number().int().nullable().optional(), // El orden puede ser null
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type EtiquetaCrmData = z.infer<typeof etiquetaCrmSchema>;

// Esquema para el resultado de la acción que obtiene las etiquetas y el crmId
export const obtenerEtiquetasCrmResultSchema = z.object({
    crmId: z.string().cuid().nullable(),
    etiquetas: z.array(etiquetaCrmSchema),
});
export type ObtenerEtiquetasCrmResultData = z.infer<typeof obtenerEtiquetasCrmResultSchema>;

// Esquema para los parámetros de entrada de listarEtiquetasCrmAction
export const listarEtiquetasCrmParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ListarEtiquetasCrmParams = z.infer<typeof listarEtiquetasCrmParamsSchema>;

// Esquema para el formulario de creación/edición de Etiqueta (nombre, color, status)
export const etiquetaCrmFormSchema = z.object({
    nombre: z.string().min(1, "El nombre de la etiqueta es obligatorio.").max(50, "Nombre demasiado largo."),
    color: z.string()
        .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Debe ser un color hexadecimal válido (ej. #RRGGBB).")
        .nullable().optional().or(z.literal('')) // Permite string vacío para input
        .transform(val => (val === "" || val === "#ffffff" ? null : val)), // #ffffff (blanco) también se trata como "sin color" (null)

    // status: z.string().optional().default('activo'), // <-- LÍNEA ANTIGUA
    status: z.string(), // <-- LÍNEA NUEVA: Simplemente un string. Asumimos que siempre tendrá un valor.
});
export type EtiquetaCrmFormData = z.infer<typeof etiquetaCrmFormSchema>;

// Esquema para los parámetros de entrada de la acción crearEtiquetaCrmAction
export const crearEtiquetaCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    nombre: z.string().min(1).max(50),
    color: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Color inválido.").nullable().optional(),
    status: z.string().optional(),
});
export type CrearEtiquetaCrmParams = z.infer<typeof crearEtiquetaCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción editarEtiquetaCrmAction
export const editarEtiquetaCrmParamsSchema = z.object({
    etiquetaId: z.string().cuid(),
    datos: etiquetaCrmFormSchema, // Reutilizamos el schema del formulario
});
export type EditarEtiquetaCrmParams = z.infer<typeof editarEtiquetaCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción eliminarEtiquetaCrmAction
export const eliminarEtiquetaCrmParamsSchema = z.object({
    etiquetaId: z.string().cuid(),
});
export type EliminarEtiquetaCrmParams = z.infer<typeof eliminarEtiquetaCrmParamsSchema>;

// Esquema para un ítem en la lista de reordenamiento de etiquetas
export const etiquetaOrdenSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(1), // Asumiendo orden 1-based
});

// Esquema para los parámetros de entrada de la acción reordenarEtiquetasCrmAction
export const reordenarEtiquetasCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    etiquetasOrdenadas: z.array(etiquetaOrdenSchema),
});
export type ReordenarEtiquetasCrmParams = z.infer<typeof reordenarEtiquetasCrmParamsSchema>;