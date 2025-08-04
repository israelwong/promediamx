// @/app/admin/_lib/actions/catalogo/itemCatalogo.schemas.ts
import { z } from 'zod';

// Esquema para los niveles de creatividad de IA
export const NivelCreatividadIASchema = z.enum(['bajo', 'medio', 'alto']);
export type NivelCreatividadIA = z.infer<typeof NivelCreatividadIASchema>;


// Esquema para la categoría anidada
export const ItemCategoriaAnidadaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});

// Esquema para la etiqueta anidada
export const ItemEtiquetaAnidadaSchema = z.object({
    etiqueta: z.object({ // La estructura en Prisma es itemEtiquetas: { etiqueta: { ... } }
        id: z.string().cuid(),
        nombre: z.string(),
    }),
    // Podrías añadir etiquetaId directamente si lo prefieres:
    // etiquetaId: z.string().cuid(),
    // nombreEtiqueta: z.string() 
});

// Esquema para el conteo de relaciones
export const ItemCountSchema = z.object({
    galeria: z.number().int().nonnegative().optional(),
    itemCatalogoOfertas: z.number().int().nonnegative().optional(),
});

// Esquema para los datos de un ítem como se muestra en la cuadrícula/lista
export const ItemParaGridCatalogoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(1, "El nombre del ítem es obligatorio."),
    descripcion: z.string().nullish(),
    tipoItem: z.string().nullish(),
    stock: z.number().int().nullish(),
    stockMinimo: z.number().int().nullish(),
    esPromocionado: z.boolean().optional(),
    AquienVaDirigido: z.string().nullish(),
    palabrasClave: z.string().nullish(),
    // videoUrl: z.string().url().nullish().or(z.literal('')), // OMITIDO según requerimiento
    linkPago: z.string().url("URL de pago inválida.").nullish().or(z.literal('')),
    status: z.string(),
    orden: z.number().int().nullish(),
    categoriaId: z.string().cuid().nullish(),
    imagenPortadaUrl: z.string().url().nullish(),
    categoria: ItemCategoriaAnidadaSchema.nullish(),
    itemEtiquetas: z.array(ItemEtiquetaAnidadaSchema).optional(),
    _count: ItemCountSchema.optional(),
});
export type ItemParaGridCatalogoType = z.infer<typeof ItemParaGridCatalogoSchema>;

// Esquema para los datos de ordenamiento de ítems
export const ItemOrdenDataItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int(),
});
export const ActualizarOrdenItemsDataSchema = z.array(ItemOrdenDataItemSchema);
export type ActualizarOrdenItemsData = z.infer<typeof ActualizarOrdenItemsDataSchema>;

// Esquema para los datos mínimos al crear un ítem
export const CrearItemBasicoDataSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(150, "Máximo 150 caracteres."),
    precio: z.number()
        .min(0, "El precio no puede ser negativo.")
        .refine((val) => typeof val === "number", { message: "El precio debe ser un número." }),
    categoriaId: z.string().cuid().nullish(),
});
export type CrearItemBasicoData = z.infer<typeof CrearItemBasicoDataSchema>;

// Esquema para los datos completos al actualizar un ítem (desde ItemEditarForm)
export const ActualizarItemDataSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(150, "Máximo 150 caracteres.").optional(),
    descripcion: z.string().max(2000, "Máximo 2000 caracteres.").nullish().optional(),
    precio: z.number().optional(),
    tipoItem: z.string().nullish().optional(), // Podría ser z.enum(['PRODUCTO', 'SERVICIO']).optional(),
    sku: z.string().max(50, "Máximo 50 caracteres.").nullish().optional(),
    stock: z.number().int("El stock debe ser un número entero.").min(0, "El stock no puede ser negativo.").nullish().optional(),
    stockMinimo: z.number().int("El stock mínimo debe ser un número entero.").min(0, "El stock mínimo no puede ser negativo.").nullish().optional(),
    unidadMedida: z.string().max(50, "Máximo 50 caracteres.").nullish().optional(),
    linkPago: z.string().url("URL de pago inválida.").nullish().or(z.literal('')).optional(),
    funcionPrincipal: z.string().max(500, "Máximo 500 caracteres.").nullish().optional(),
    esPromocionado: z.boolean().optional(),
    AquienVaDirigido: z.string().max(1000, "Máximo 1000 caracteres.").nullish().optional(),
    palabrasClave: z.string().max(500, "Máximo 500 caracteres.").nullish().optional(),
    // videoUrl: z.string().url("URL de video inválida.").nullish().or(z.literal('')), // OMITIDO
    status: z.string().optional(), // Podría ser z.enum(['activo', 'inactivo', 'agotado', 'proximamente']).optional(),
    categoriaId: z.string().cuid().nullish().optional(),
    // etiquetaIds se maneja como un array separado en la action
});
export type ActualizarItemData = z.infer<typeof ActualizarItemDataSchema>;

// Esquema para los datos que devuelve `obtenerItemCatalogoPorId` para el formulario de edición
export const ItemParaEditarSchema = ActualizarItemDataSchema.extend({ // Basarse en ActualizarItemDataSchema para los campos editables
    id: z.string().cuid(), // Incluir ID para referencia
    // Incluir campos que no son directamente editables pero se muestran o usan
    catalogoId: z.string().cuid(),
    negocioId: z.string().cuid(),
    // Relaciones necesarias para el formulario
    itemEtiquetas: z.array(
        z.object({
            etiquetaId: z.string().cuid() // Solo necesitamos el ID para preseleccionar
            // etiqueta: ItemEtiquetaAnidadaSchema.shape.etiqueta // Opcional si quieres el nombre para mostrar
        })
    ).optional(),
    // No incluimos 'galeria' aquí, ya que se maneja por un componente separado.
    // 'orden', 'createdAt', 'updatedAt' no son editables en este formulario.
});
export type ItemParaEditarType = z.infer<typeof ItemParaEditarSchema>;


// Esquema para mejorar descripción con IA
export const MejorarDescripcionItemIADataSchema = z.object({
    itemId: z.string().cuid(),
    descripcionActual: z.string().nullish(),
    nivelCreatividad: z.enum(['bajo', 'medio', 'alto']).default('medio').optional(),
    maxCaracteres: z.number().int().positive().min(50).max(1000).default(200).optional(),
});
export type MejorarDescripcionItemIAData = z.infer<typeof MejorarDescripcionItemIADataSchema>;

export const SugerenciaDescripcionIAResponseSchema = z.object({
    sugerencia: z.string(),
});
export type SugerenciaDescripcionIAResponse = z.infer<typeof SugerenciaDescripcionIAResponseSchema>;

