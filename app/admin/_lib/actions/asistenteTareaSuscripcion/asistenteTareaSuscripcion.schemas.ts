// app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.schemas.ts
import { z } from 'zod';

// Esquema para los detalles de una tarea individual dentro de la suscripción
export const tareaEnSuscripcionSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    precio: z.number().nullable(), // Precio original de la tarea
});
export type TareaEnSuscripcionData = z.infer<typeof tareaEnSuscripcionSchema>;

// Esquema principal para una tarea suscrita con detalles, incluyendo ejecuciones
export const tareaSuscritaDetalleSchema = z.object({
    suscripcionId: z.string().cuid(), // ID del registro AsistenteTareaSuscripcion
    nombre: z.string(), // Nombre de la tarea
    tarea: tareaEnSuscripcionSchema,
    montoSuscripcion: z.number().nullable(), // Monto específico de esta suscripción (puede ser 0 o el precio de la tarea)
    ejecuciones: z.number().int().default(0), // Conteo de TareaEjecutada
    // Podríamos añadir status de la suscripción si fuera necesario aquí ('activo', 'inactivo')
});
export type TareaSuscritaDetalleData = z.infer<typeof tareaSuscritaDetalleSchema>;

// Schema para los detalles de la Tarea en sí
export const tareaDetallesSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionMarketplace: z.string().optional(),
    precio: z.number().nullable(),
    iconoUrl: z.string().url().nullable().optional(), // Hacer opcional si puede no estar
    CategoriaTarea: z.object({
        nombre: z.string(),
        color: z.string().nullable().optional(), // Hacer opcional si puede no estar
    }).nullable(),
    etiquetas: z.array(
        z.object({
            etiquetaTarea: z.object({ // La estructura anidada que proveíste
                id: z.string().cuid(),
                nombre: z.string(),
            }),
        })
    ).default([]),
    TareaGaleria: z.array(
        z.object({
            id: z.string().cuid(),
            imageUrl: z.string().url(),
            altText: z.string().nullable().optional(),
            descripcion: z.string().nullable().optional(),
        })
    ).default([]),
});
export type TareaDetallesData = z.infer<typeof tareaDetallesSchema>;

// Schema para la información de la suscripción existente
export const suscripcionInfoSchema = z.object({
    id: z.string().cuid(),
    status: z.string(), // Podría ser un z.enum si tienes estados fijos
    montoSuscripcion: z.number().nullable(),
    fechaSuscripcion: z.date(),
    fechaDesuscripcion: z.date().nullable(),
});
export type SuscripcionInfoData = z.infer<typeof suscripcionInfoSchema>;

// Schema principal para los detalles completos que la página necesita
export const tareaSuscripcionDetallesDataSchema = z.object({
    tarea: tareaDetallesSchema,
    suscripcion: suscripcionInfoSchema.nullable(), // La suscripción puede no existir
    // Los IDs de contexto son útiles si el componente necesita re-pasarlos o usarlos para navegación
    clienteId: z.string().cuid().nullable(),
    negocioId: z.string().cuid().nullable(),
});
export type TareaSuscripcionDetallesData = z.infer<typeof tareaSuscripcionDetallesDataSchema>;


// --- Schemas ya existentes o definidos para otras actions en este archivo ---

// Para crear/reactivar una suscripción (desde el marketplace o esta página)
export const upsertSuscripcionTareaInputSchema = z.object({
    asistenteId: z.string().cuid(),
    tareaId: z.string().cuid(),
    // Los IDs de contexto para revalidación se pasarán como args separados a la action
    clienteId: z.string().cuid().optional(),
    negocioId: z.string().cuid().optional(),
});
export type UpsertSuscripcionTareaInput = z.infer<typeof upsertSuscripcionTareaInputSchema>;

// Para el resultado de crear/reactivar o cancelar una suscripcion
export const suscripcionBasicaDataSchema = z.object({
    id: z.string().cuid(), // ID de la suscripción
    status: z.string(),    // ej. 'activo', 'inactivo'
});
export type SuscripcionBasicaData = z.infer<typeof suscripcionBasicaDataSchema>;


export const tareaSuscripcionDetallesSchema = tareaSuscripcionDetallesDataSchema;
export type TareaSuscripcionDetalles = TareaSuscripcionDetallesData;

// Schema para obtener las suscripciones activas de un asistente (solo IDs son suficientes para el Set)
export const suscripcionActivaInfoSchema = z.object({
    id: z.string().cuid(), // ID de la suscripción
    tareaId: z.string().cuid(),
    // status: z.string(), // Siempre será 'activo' si filtramos en la query
    // montoSuscripcion: z.number().nullable(), // No es necesario para el Set de suscritoTaskIds
});
export type SuscripcionActivaInfoData = z.infer<typeof suscripcionActivaInfoSchema>;


// Para la galería de imágenes de una tarea
export const tareaGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    imageUrl: z.string().url(),
    altText: z.string().nullable().optional(),
    descripcion: z.string().optional(),
});
export type TareaGaleriaItemData = z.infer<typeof tareaGaleriaItemSchema>;

// Para la categoría de una tarea
export const categoriaDeTareaSchema = z.object({
    nombre: z.string(),
    color: z.string().nullable().optional(),
}).nullable(); // La categoría puede ser null si no está asignada
export type CategoriaDeTareaData = z.infer<typeof categoriaDeTareaSchema>;

// Para las etiquetas de una tarea
export const etiquetaDeTareaSchema = z.object({
    // La estructura que proveíste es etiquetaTarea: { id, nombre }
    // pero el tipo TareaSuscripcionDetalles en tu componente tiene etiquetas: { id, nombre }[] directamente
    // Voy a asumir que la action mapeará a la estructura más simple para el schema Zod.
    id: z.string().cuid(),
    nombre: z.string(),
});
export type EtiquetaDeTareaData = z.infer<typeof etiquetaDeTareaSchema>;

// Detalles de la Tarea (la parte 'tarea' de TareaSuscripcionDetalles)
export const tareaFullDetailsSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().optional(),
    precio: z.number().nullable(),
    iconoUrl: z.string().url().nullable().optional(),
    CategoriaTarea: categoriaDeTareaSchema,
    etiquetas: z.array(etiquetaDeTareaSchema).default([]), // Mapeado a la estructura más simple
    TareaGaleria: z.array(tareaGaleriaItemSchema).default([]),
});
export type TareaFullDetailsData = z.infer<typeof tareaFullDetailsSchema>;


export const suscripcionIdentificadoresSchema = z.object({
    suscripcionId: z.string().cuid(),
    asistenteId: z.string().cuid(), // Para revalidar paths específicos del asistente
    tareaId: z.string().cuid(),     // Para revalidar paths específicos de la tarea
    clienteId: z.string().cuid(),
    negocioId: z.string().cuid(),
});
export type SuscripcionIdentificadores = z.infer<typeof suscripcionIdentificadoresSchema>;

