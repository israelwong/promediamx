// Ruta: app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas.ts
import { z } from 'zod';

// --- ACTUALIZADO: Esquema para un ItemCatalogo cuando se lista para selección ---
export const ItemCatalogoParaSeleccionSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    precio: z.number(),
    descripcion: z.string().nullable().optional(),
    imagenPortadaUrl: z.string().url().nullable().optional(),
    // Información del Catálogo al que pertenece el ítem
    catalogoId: z.string().cuid(),
    catalogoNombre: z.string(),
    // Mantenemos la categoría del ítem por si se quiere mostrar, aunque la agrupación principal sea por Catálogo
    itemCategoriaNombre: z.string().nullable().optional(),
});
export type ItemCatalogoParaSeleccion = z.infer<typeof ItemCatalogoParaSeleccionSchema>;

// --- Esquema para los datos que se envían al actualizar los ítems de un paquete ---
export const ActualizarItemsDePaqueteSchema = z.object({
    itemCatalogoIds: z.array(z.string().cuid()),
});
export type ActualizarItemsDePaqueteData = z.infer<typeof ActualizarItemsDePaqueteSchema>;


// --- Esquema para la creación (se mantiene por contexto) ---
export const CrearNegocioPaqueteSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del paquete es obligatorio." }),
    descripcionCorta: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
    precio: z.number({ invalid_type_error: "El precio debe ser un número.", required_error: "El precio es obligatorio." })
        .positive({ message: "El precio debe ser un valor positivo." }),
    linkPago: z.string().url({ message: "Por favor, ingresa una URL válida." }).optional().nullable(),
    negocioPaqueteCategoriaId: z.string().cuid({ message: "ID de categoría inválido." }).optional().nullable(),
});
export type CrearNegocioPaqueteData = z.infer<typeof CrearNegocioPaqueteSchema>;

// --- Esquema para el objeto NegocioPaquete devuelto por la acción de creación (se mantiene por contexto) ---
export const NegocioPaqueteCreadoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionCorta: z.string().nullable(),
    descripcion: z.string().nullable(),
    precio: z.number(),
    linkPago: z.string().nullable(),
    orden: z.number().nullable(),
    status: z.string(),
    negocioId: z.string().cuid(),
    negocioPaqueteCategoriaId: z.string().cuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioPaqueteCreado = z.infer<typeof NegocioPaqueteCreadoSchema>;


// --- ESQUEMA ACTUALIZADO: Para un item de paquete en la lista ---
export const NegocioPaqueteListItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionCorta: z.string().nullable().optional(),
    precio: z.number(),
    orden: z.number().nullable().optional(),
    status: z.string(),
    negocioPaqueteCategoria: z.object({
        id: z.string().cuid(),
        nombre: z.string(),
    }).nullable().optional(),
    createdAt: z.date(),
    linkPagoConfigurado: z.boolean(),
    tieneGaleria: z.boolean(),
    tieneVideo: z.boolean(),
    imagenPortadaUrl: z.string().url().nullable().optional(),
});
export type NegocioPaqueteListItem = z.infer<typeof NegocioPaqueteListItemSchema>;


// --- Esquema para los datos de un NegocioPaquete al obtenerlo para edición (se mantiene por contexto) ---
export const NegocioPaqueteParaEditarSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionCorta: z.string().nullable(),
    descripcion: z.string().nullable(),
    precio: z.number(),
    linkPago: z.string().nullable(),
    status: z.string(),
    negocioPaqueteCategoriaId: z.string().cuid().nullable(),
});
export type NegocioPaqueteParaEditar = z.infer<typeof NegocioPaqueteParaEditarSchema>;


// --- Esquema para los datos del formulario de ACTUALIZACIÓN de un NegocioPaquete (se mantiene por contexto) ---
export const ActualizarNegocioPaqueteSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del paquete es obligatorio." }).optional(),
    descripcionCorta: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
    precio: z.number({ invalid_type_error: "El precio debe ser un número.", required_error: "El precio es obligatorio." })
        .positive({ message: "El precio debe ser un valor positivo." }).optional(),
    linkPago: z.string().url({ message: "URL de pago inválida." }).optional().nullable(),
    status: z.string().min(1, { message: "El estado es obligatorio." }).optional(),
    negocioPaqueteCategoriaId: z.string().cuid({ message: "ID de categoría inválido." }).optional().nullable(),
});
export type ActualizarNegocioPaqueteData = z.infer<typeof ActualizarNegocioPaqueteSchema>;

// --- ESQUEMA NUEVO: Para los datos de entrada de la acción de reordenar paquetes ---
export const ReordenarPaquetesSchema = z.array(
    z.object({
        id: z.string().cuid(),
        orden: z.number().int().min(0),
    })
);
export type ReordenarPaquetesData = z.infer<typeof ReordenarPaquetesSchema>;
