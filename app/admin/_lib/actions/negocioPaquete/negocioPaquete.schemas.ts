// Ruta: app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas.ts
import { z } from 'zod';


// --- Esquema para la creación (del paso anterior, lo mantenemos por completitud) ---
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

// --- Esquema para el objeto NegocioPaquete devuelto por la acción de creación ---
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


// --- Esquema para un item de paquete en la lista (del paso anterior) ---
export const NegocioPaqueteListItemSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable().optional(), // Podría ser descripcionCorta aquí para la lista
    precio: z.number(),
    orden: z.number().nullable().optional(),
    status: z.string(),
    negocioPaqueteCategoria: z.object({
        id: z.string().cuid(),
        nombre: z.string(),
    }).nullable().optional(),
    createdAt: z.date(),
});
export type NegocioPaqueteListItem = z.infer<typeof NegocioPaqueteListItemSchema>;


// --- NUEVO: Esquema para los datos de un NegocioPaquete al obtenerlo para edición ---
export const NegocioPaqueteParaEditarSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionCorta: z.string().nullable(),
    descripcion: z.string().nullable(),
    precio: z.number(),
    linkPago: z.string().nullable(),
    status: z.string(), // Ej: "activo", "inactivo"
    negocioPaqueteCategoriaId: z.string().cuid().nullable(),
    // No incluimos 'orden' aquí ya que se gestiona por separado (drag and drop en la lista)
    // No incluimos 'negocioId' ya que se conoce por el contexto
});
export type NegocioPaqueteParaEditar = z.infer<typeof NegocioPaqueteParaEditarSchema>;


// --- NUEVO: Esquema para los datos del formulario de ACTUALIZACIÓN de un NegocioPaquete ---
export const ActualizarNegocioPaqueteSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del paquete es obligatorio." }),
    descripcionCorta: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
    precio: z.number({ invalid_type_error: "El precio debe ser un número.", required_error: "El precio es obligatorio." })
        .positive({ message: "El precio debe ser un valor positivo." }),
    linkPago: z.string().nullable().optional(),
    status: z.string().min(1, { message: "El estado es obligatorio." }), // Ej: z.enum(["activo", "inactivo"])
    negocioPaqueteCategoriaId: z.string().cuid({ message: "ID de categoría inválido." }).optional().nullable(),
});
export type ActualizarNegocioPaqueteData = z.infer<typeof ActualizarNegocioPaqueteSchema>;

// --- NUEVO: Esquema para un ItemCatalogo cuando se lista para selección ---
// export const ItemCatalogoParaSeleccionSchema = z.object({
//     id: z.string().cuid(),
//     nombre: z.string(),
//     precio: z.number(),
//     // Podríamos añadir más campos si son útiles para la selección, ej: sku, stock
// });
// export type ItemCatalogoParaSeleccion = z.infer<typeof ItemCatalogoParaSeleccionSchema>;

// // --- NUEVO: Esquema para los datos que se envían al actualizar los ítems de un paquete ---
// // Se espera un array de IDs de los ItemCatalogo que deben estar en el paquete.
// export const ActualizarItemsDePaqueteSchema = z.object({
//     itemCatalogoIds: z.array(z.string().cuid()),
// });
// export type ActualizarItemsDePaqueteData = z.infer<typeof ActualizarItemsDePaqueteSchema>;


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
