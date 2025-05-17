// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/oferta.schemas.ts
import { z } from 'zod';

export type EditarOfertaData = z.infer<typeof EditarOfertaDataSchema>;

export interface tipoOferta {
    DESCUENTO_PORCENTAJE: "DESCUENTO_PORCENTAJE";
    DESCUENTO_MONTO: "DESCUENTO_MONTO";
    CODIGO_PROMOCIONAL: "CODIGO_PROMOCIONAL";
    ENVIO_GRATIS: "ENVIO_GRATIS";
    COMPRA_X_LLEVA_Y: "COMPRA_X_LLEVA_Y";
    GENERAL: "GENERAL";
}

// Enum para los posibles status de una oferta
export const OfertaStatusEnumSchema = z.enum([
    'activo',
    'inactivo',
    'programada',
    'finalizada',
    'borrador'
], {
    required_error: "El estado de la oferta es requerido.",
    invalid_type_error: "Estado de oferta no válido.",
});
export type OfertaStatusType = z.infer<typeof OfertaStatusEnumSchema>;

// Enum para los tipos de oferta
export const TipoOfertaEnumSchema = z.enum([
    'DESCUENTO_PORCENTAJE',
    'DESCUENTO_MONTO',
    'CODIGO_PROMOCIONAL',
    'ENVIO_GRATIS',
    'COMPRA_X_LLEVA_Y',
    'GENERAL',
], {
    required_error: "El tipo de oferta es requerido.",
    invalid_type_error: "Tipo de oferta no válido.",
});
export type TipoOfertaType = z.infer<typeof TipoOfertaEnumSchema>;

// Esquema para los datos de una oferta como se muestra en la lista.
export const OfertaParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(1, "El nombre de la oferta es obligatorio."),
    descripcion: z.string().nullish(),
    fechaInicio: z.date(),
    fechaFin: z.date(),
    status: OfertaStatusEnumSchema,
    codigo: z.string().nullish(),
    tipoOferta: TipoOfertaEnumSchema,
    imagenPortadaUrl: z.string().url().nullish(),
});
export type OfertaParaListaType = z.infer<typeof OfertaParaListaSchema>;

// Esquema para los datos al crear una oferta (simplificado)
export const CrearOfertaBasicaDataSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(150, "Máximo 150 caracteres."),
    descripcion: z.string().max(500, "Máximo 500 caracteres.").nullish(),
});
export type CrearOfertaBasicaData = z.infer<typeof CrearOfertaBasicaDataSchema>;

// Esquema para los datos que se envían al actualizar una oferta
export const EditarOfertaDataSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(150, "Máximo 150 caracteres."),
    descripcion: z.string().max(1000, "La descripción no puede exceder los 1000 caracteres.").nullish(),
    tipoOferta: TipoOfertaEnumSchema,
    valor: z.number().nonnegative("El valor no puede ser negativo.").nullable().optional(),
    codigo: z.string().max(50, "El código no debe exceder los 50 caracteres.").toUpperCase().nullish(),
    fechaInicio: z.coerce.date({ // coerce.date para convertir string del input date a Date
        required_error: "La fecha de inicio es requerida.",
        invalid_type_error: "Fecha de inicio inválida."
    }),
    fechaFin: z.coerce.date({ // coerce.date para convertir string del input date a Date
        required_error: "La fecha de fin es requerida.",
        invalid_type_error: "Fecha de fin inválida."
    }),
    status: OfertaStatusEnumSchema,
    condiciones: z.string().max(1000, "Las condiciones no pueden exceder los 1000 caracteres.").nullish(),
    linkPago: z.string().url("URL de pago inválida.").nullish().or(z.literal('')),
}).refine(data => {
    if (data.fechaFin < data.fechaInicio) return false;
    return true;
}, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
    path: ["fechaFin"],
}).refine(data => {
    if (data.tipoOferta === 'CODIGO_PROMOCIONAL' && (!data.codigo || data.codigo.trim() === '')) return false;
    return true;
}, {
    message: "Se requiere un código para el tipo 'Código Promocional'.",
    path: ["codigo"],
}).refine(data => {
    if ((data.tipoOferta === 'DESCUENTO_PORCENTAJE' || data.tipoOferta === 'DESCUENTO_MONTO') && (data.valor === null || data.valor === undefined || data.valor < 0)) return false;
    return true;
}, {
    message: "Se requiere un valor positivo para ofertas de descuento.",
    path: ["valor"],
});
// Este tipo es para los DATOS QUE SE ENVÍAN en la actualización.
// Los campos son requeridos según el schema, pero el Partial<> se aplicaría en el componente si no todos los campos se envían siempre.
// Sin embargo, para la validación de un formulario completo, es mejor que el schema defina los campos como el formulario los presenta.
export type EditarOfertaDataInputType = z.infer<typeof EditarOfertaDataSchema>;


// Esquema para los datos que DEVUELVE obtenerOfertaPorId para poblar el formulario de edición.
// Los campos aquí deben ser consistentes con lo que la DB tiene y el formulario necesita.
// Las fechas serán objetos Date de Prisma.
export const OfertaParaEditarSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    tipoOferta: TipoOfertaEnumSchema, // Este campo es un string en Prisma, el enum Zod lo valida
    valor: z.number().nullable(),
    codigo: z.string().nullable(),
    fechaInicio: z.date(), // Prisma devuelve Date
    fechaFin: z.date(),   // Prisma devuelve Date
    status: OfertaStatusEnumSchema, // Este campo es un string en Prisma, el enum Zod lo valida
    condiciones: z.string().nullable(),
    linkPago: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // variantesNombre: z.array(z.string()).optional(), // Si lo añades al modelo y lo necesitas
    // OfertaGaleria: z.array(z.object({ imageUrl: z.string().url() })).optional(), // Ejemplo si se cargara aquí
});
export type OfertaParaEditarType = z.infer<typeof OfertaParaEditarSchema>;



