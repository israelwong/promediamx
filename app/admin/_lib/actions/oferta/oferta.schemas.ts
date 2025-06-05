// // Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/oferta.schemas.ts
import { z } from 'zod';

// Enums (sin cambios)
export const ObjetivoOfertaZodEnum = z.enum(['CITA', 'VENTA'], {
    errorMap: () => ({ message: "Debes seleccionar un objetivo válido." })
});
export type ObjetivoOfertaZodEnumType = z.infer<typeof ObjetivoOfertaZodEnum>;

export const TipoPagoOfertaEnumSchema = z.enum(['UNICO', 'RECURRENTE'], {
    errorMap: () => ({ message: "Selecciona un tipo de pago válido." })
});
export type TipoPagoOfertaType = z.infer<typeof TipoPagoOfertaEnumSchema>;

export const IntervaloRecurrenciaOfertaEnumSchema = z.enum([
    'SEMANAL', 'QUINCENAL', 'MENSUAL', 'BIMESTRAL',
    'TRIMESTRAL', 'SEMESTRAL', 'ANUAL',
], {
    errorMap: () => ({ message: "Selecciona un intervalo de recurrencia válido." })
});
export type IntervaloRecurrenciaOfertaType = z.infer<typeof IntervaloRecurrenciaOfertaEnumSchema>;



export interface tipoOferta {
    DESCUENTO_PORCENTAJE: "DESCUENTO_PORCENTAJE";
    DESCUENTO_MONTO: "DESCUENTO_MONTO";
    CODIGO_PROMOCIONAL: "CODIGO_PROMOCIONAL";
    ENVIO_GRATIS: "ENVIO_GRATIS";
    COMPRA_X_LLEVA_Y: "COMPRA_X_LLEVA_Y";
    GENERAL: "GENERAL";
}

export const TipoAnticipoOfertaEnumSchema = z.enum(['PORCENTAJE', 'MONTO_FIJO']);
export type TipoAnticipoOfertaType = z.infer<typeof TipoAnticipoOfertaEnumSchema>;

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

// Esquema para los datos de una oferta como se muestra en la lista.
export const OfertaParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(1, "El nombre de la oferta es obligatorio."),
    descripcion: z.string().nullish(),
    fechaInicio: z.date(),
    fechaFin: z.date(),
    status: OfertaStatusEnumSchema,
    imagenPortadaUrl: z.string().url().nullish(),
});
export type OfertaParaListaType = z.infer<typeof OfertaParaListaSchema>;

// // Esquema para los datos al crear una oferta (simplificado)
// export const CrearOfertaBasicaDataSchema = z.object({
//     nombre: z.string().min(1, "El nombre es obligatorio.").max(150, "Máximo 150 caracteres."),
//     descripcion: z.string().max(500, "Máximo 500 caracteres.").nullish(),
// });
// export type CrearOfertaBasicaData = z.infer<typeof CrearOfertaBasicaDataSchema>;

export const OfertaParaEditarSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    valor: z.number().nullable(),
    // codigo: z.string().nullable(),
    fechaInicio: z.date(), // Prisma devuelve Date
    fechaFin: z.date(),   // Prisma devuelve Date
    status: OfertaStatusEnumSchema, // Este campo es un string en Prisma, el enum Zod lo valida
    condiciones: z.string().nullable(),
    linkPago: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type OfertaParaEditarType = z.infer<typeof OfertaParaEditarSchema>;


// Esquema base para los campos de una oferta (solo objeto, sin refine/transform)
const BaseOfertaObjectSchema = z.object({
    nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(150, { message: 'El nombre no puede exceder los 150 caracteres.' }),
    fechaInicio: z.date({
        required_error: 'La fecha de inicio es requerida.',
        invalid_type_error: 'Fecha de inicio inválida.'
    }),
    fechaFin: z.date({
        required_error: 'La fecha de fin es requerida.',
        invalid_type_error: 'Fecha de fin inválida.'
    }),
    status: OfertaStatusEnumSchema.optional(),
    descripcion: z.string().max(1000, { message: 'La descripción no puede exceder los 1000 caracteres.' }).nullable().optional(),
    // codigo: z.string().max(50, { message: "El código no puede exceder los 50 caracteres." }).regex(/^[a-zA-Z0-9_-]*$/, "Código solo puede contener letras, números, guiones y guiones bajos.").nullable().optional(),
    precio: z.number({ invalid_type_error: 'El precio debe ser un número.' })
        .positive({ message: 'Si se ingresa, el precio debe ser mayor a cero.' })
        .finite({ message: 'El precio debe ser un número finito.' })
        .nullable().optional(),
    tipoPago: TipoPagoOfertaEnumSchema.optional(),
    intervaloRecurrencia: IntervaloRecurrenciaOfertaEnumSchema.nullable().optional(),
    objetivos: z.array(ObjetivoOfertaZodEnum)
        .min(1, { message: "Debes seleccionar al menos un objetivo para la oferta." })
        .optional(),
});

// Ahora aplica transform/refine sobre el objeto base
const BaseOfertaSchema = BaseOfertaObjectSchema
    .transform(data => ({
        ...data,
        descripcion: data.descripcion === '' ? null : data.descripcion
    }))
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, {
        message: 'Se requiere un intervalo de recurrencia para pagos recurrentes.',
        path: ['intervaloRecurrencia'],
    })
    .refine(data => {
        if (data.fechaInicio && data.fechaFin && data.fechaFin < data.fechaInicio) {
            return false;
        }
        return true;
    }, {
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        path: ["fechaFin"],
    });

// Esquema para Crear Oferta
export const CrearOfertaInputSchema = BaseOfertaSchema;
export type CrearOfertaDataInputType = z.infer<typeof CrearOfertaInputSchema>;

// Esquema para Editar Oferta (se usará en OfertaEditarForm)
// export const EditarOfertaInputSchema = BaseOfertaSchema; // id se maneja por fuera del payload del form
// export type EditarOfertaDataInputType = z.infer<typeof EditarOfertaInputSchema>;

// Tipo para datos que carga el formulario de edición (puede incluir más campos no editables si es necesario)
// export type OfertaParaEditarFormType = EditarOfertaDataInputType & {
//     id: string;
//     negocioId: string;
//     // Ejemplo: si tuvieras campos que se muestran pero no se editan en ESTE form
//     // createdAt: Date; 
//     // updatedAt: Date;
// };

// Schemas para multimedia (estos se usarán en los managers de multimedia)
export const OfertaGaleriaItemSchema = z.object({
    id: z.string(),
    imageUrl: z.string().url(),
    altText: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    tamanoBytes: z.number().int().positive().nullable().optional(),
});
export type OfertaGaleriaItemType = z.infer<typeof OfertaGaleriaItemSchema>;

export const OfertaVideoItemSchema = z.object({
    id: z.string(),
    videoUrl: z.string().url(),
    tipoVideo: z.string().nullable().optional(), // Debería ser el SharedTipoVideoEnumSchema
    titulo: z.string().nullable().optional(), // Nombre correcto: tituloVideo en DB
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    tamanoBytes: z.number().int().positive().nullable().optional(),
});
export type OfertaVideoItemType = z.infer<typeof OfertaVideoItemSchema>;

export const OfertaDocumentoItemSchema = z.object({
    id: z.string(),
    documentoUrl: z.string().url(),
    documentoNombre: z.string().nullable().optional(),
    documentoTipo: z.string().nullable().optional(),
    documentoTamanoBytes: z.number().int().positive().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
});
export type OfertaDocumentoItemType = z.infer<typeof OfertaDocumentoItemSchema>;

// Tipo completo para la data que carga OfertaEditarManager
export const OfertaCompletaParaManagerSchema = BaseOfertaObjectSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    OfertaGaleria: z.array(OfertaGaleriaItemSchema).optional(),
    videos: z.array(OfertaVideoItemSchema).optional(),
    documentosOferta: z.array(OfertaDocumentoItemSchema).optional(),
})
    .transform(data => ({
        ...data,
        descripcion: data.descripcion === '' ? null : data.descripcion,
        // codigo: data.codigo === '' ? null : data.codigo,
    }))
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, {
        message: 'Se requiere un intervalo de recurrencia para pagos recurrentes.',
        path: ['intervaloRecurrencia'],
    })
    .refine(data => {
        if (data.fechaInicio && data.fechaFin && data.fechaFin < data.fechaInicio) {
            return false;
        }
        return true;
    }, {
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        path: ["fechaFin"],
    });
export type OfertaCompletaParaManagerType = z.infer<typeof OfertaCompletaParaManagerSchema>;


export const TipoAnticipoOfertaZodEnum = z.enum(['PORCENTAJE', 'MONTO_FIJO'], {
    errorMap: () => ({ message: "Selecciona un tipo de anticipo válido." })
});
export type TipoAnticipoOfertaZodEnumType = z.infer<typeof TipoAnticipoOfertaZodEnum>;


export const CrearOfertaSimplificadoInputSchema = z.object({
    nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(150),
    descripcion: z.string().max(1000).nullable().optional() // El .transform() lo haremos en la action si es necesario
        .transform(val => (val === "" ? null : val)), // Opcional: mantener transform si se prefiere

    objetivos: z.array(ObjetivoOfertaZodEnum)
        .min(1, { message: "Debes seleccionar al menos un objetivo." }),
    // No .default() aquí para que el tipo de entrada (z.input) sea string[] y no string[] | undefined
    // El default lo manejaremos en los defaultValues del formulario.
    // Si Zod no tiene .default(), el campo es requerido en la entrada.

    tipoPago: TipoPagoOfertaEnumSchema, // Requerido en la entrada (el form le dará un default)

    precio: z.number({ invalid_type_error: "El precio debe ser un número" })
        .positive({ message: "El precio debe ser mayor a cero." })
        .finite()
        .nullable().optional(),

    intervaloRecurrencia: IntervaloRecurrenciaOfertaEnumSchema.nullable().optional(),
    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable().optional(),
    valorAnticipo: z.number({ invalid_type_error: "El valor del anticipo debe ser un número." })
        .positive({ message: "El valor del anticipo debe ser positivo." })
        .finite()
        .nullable().optional(),
})
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, {
        message: 'Se requiere un intervalo de recurrencia para pagos recurrentes.',
        path: ['intervaloRecurrencia'],
    })
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.valorAnticipo !== null && data.valorAnticipo !== undefined;
            // 'valorAnticipo' aquí es el input de monto fijo en el CrearOfertaSimplificadoInputSchema
            const tieneMontoFijo = data.valorAnticipo !== null && data.valorAnticipo !== undefined;

            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE && !tienePorcentaje) {
                return false; // Si tipo es PORCENTAJE, valorAnticipo es requerido
            }
            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO && !tieneMontoFijo) {
                return false; // Si tipo es MONTO_FIJO, valorAnticipo (monto fijo) es requerido
            }
            // ESTA ES LA CONDICIÓN QUE PROBABLEMENTE ESTÁ CAUSANDO EL ERROR:
            if ((tienePorcentaje || tieneMontoFijo) && !tieneTipo) {
                return false; // Si se provee un valor de anticipo (porcentaje o monto), el tipo es requerido
            }
        }
        return true;
    }, {
        message: 'Si defines un anticipo (tipo o valor), ambos son requeridos.',
        path: ['valorAnticipo'], // O un path más general si se prefiere
    })
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO &&
            data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE &&
            data.valorAnticipo !== null && data.valorAnticipo !== undefined && (data.valorAnticipo <= 0 || data.valorAnticipo >= 100)) {
            return false;
        }
        return true;
    }, { message: 'El porcentaje de anticipo debe estar entre 1 y 99.', path: ['valorAnticipo'] })
    .refine(data => {
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO &&
            data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO &&
            data.precio !== null &&
            data.precio !== undefined &&
            data.valorAnticipo !== null &&
            data.valorAnticipo !== undefined &&
            data.valorAnticipo >= data.precio) {
            return false;
        }
        return true;
    }, { message: 'El monto de anticipo fijo no puede ser mayor o igual al precio total.', path: ['valorAnticipo'] });

export type CrearOfertaSimplificadoDataInputType = z.infer<typeof CrearOfertaSimplificadoInputSchema>;




// Schemas para multimedia (Galería, Video, Documento específicos de OfertaDetalle)
// Estos schemas son para definir la estructura de los datos cuando se recuperan o se listan.
// Las acciones CRUD para estos elementos multimedia serían separadas.

const BaseMultimediaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    tamanoBytes: z.number().int().positive().nullable().optional(),
});

export const DetalleGaleriaItemSchema = BaseMultimediaItemSchema.extend({
    imageUrl: z.string().url(),
    altText: z.string().max(255).nullable().optional(),
    descripcion: z.string().max(500).nullable().optional(),
    ofertaDetalleId: z.string().cuid(), // Referencia al padre
});
export type DetalleGaleriaItemType = z.infer<typeof DetalleGaleriaItemSchema>;

export const DetalleVideoItemSchema = BaseMultimediaItemSchema.extend({
    videoUrl: z.string().url(),
    tipoVideo: z.string().max(50).nullable().optional(), // Podrías usar tu SharedTipoVideoEnumSchema aquí
    tituloVideo: z.string().max(150).nullable().optional(),
    descripcionVideo: z.string().max(500).nullable().optional(),
    ofertaDetalleId: z.string().cuid({ message: "ID de detalle de oferta inválido en video." }), // Referencia al padre y es @unique
    updatedAt: z.date(), // El modelo OfertaDetalleVideo tiene updatedAt
});
export type DetalleVideoItemType = z.infer<typeof DetalleVideoItemSchema>;

export const DetalleDocumentoItemSchema = BaseMultimediaItemSchema.extend({
    documentoUrl: z.string().url(),
    documentoNombre: z.string().max(255).nullable().optional(),
    documentoTipo: z.string().max(100).nullable().optional(),
    descripcion: z.string().max(500).nullable().optional(),
    ofertaDetalleId: z.string().cuid(), // Referencia al padre
});
export type DetalleDocumentoItemType = z.infer<typeof DetalleDocumentoItemSchema>;


// Schema Base para campos comunes de Crear y Actualizar OfertaDetalle (sin 'orden')
const BaseOfertaDetalleSchema = z.object({
    tituloDetalle: z.string().min(3, "Título debe tener al menos 3 caracteres.").max(255),
    contenido: z.string().min(10, "Contenido debe tener al menos 10 caracteres."),
    tipoDetalle: z.string().max(100).nullable().optional().transform(val => val === '' ? null : val),
    palabrasClave: z.array(z.string().max(50)).max(10, "Máximo 10 palabras clave.").optional().default([]),
    estadoContenido: z.string().min(1, "El estado es requerido.").default("PUBLICADO"), // Asegurar que siempre haya un valor
});

// Schema para crear un OfertaDetalle
export const CreateOfertaDetalleInputSchema = BaseOfertaDetalleSchema.extend({
    ofertaId: z.string().cuid({ message: "ID de oferta inválido." }),
    resolverPreguntaId: z.string().cuid().nullable().optional(),
});
export type CreateOfertaDetalleInputType = z.infer<typeof CreateOfertaDetalleInputSchema>;

// Schema para actualizar un OfertaDetalle
export const UpdateOfertaDetalleInputSchema = BaseOfertaDetalleSchema.extend({
    // id se pasará como parámetro a la action, no en el payload de datos del formulario
});
export type UpdateOfertaDetalleInputType = z.infer<typeof UpdateOfertaDetalleInputSchema>;


// Schema para el item en la lista (puede incluir 'orden' ya que la DB lo tiene)
export const OfertaDetalleListItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    tituloDetalle: z.string(),
    contenidoExtracto: z.string().optional(),
    orden: z.number().int().nullable().optional(), // 'orden' viene de la DB para mostrar
    estadoContenido: z.string(),
    updatedAt: z.date(),
    _count: z.object({ // Para mostrar si tiene multimedia asociada en la lista
        galeriaDetalle: z.number().optional(),
        videoDetalle: z.number().optional(), // Será 0 o 1
        documentosDetalle: z.number().optional(),
    }).optional(),
});
export type OfertaDetalleListItemType = z.infer<typeof OfertaDetalleListItemSchema>;

// Schema para el OfertaDetalle completo para edición (incluye 'orden' de la DB y multimedia)
export const OfertaDetalleCompletoSchema = BaseOfertaDetalleSchema.extend({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    orden: z.number().int().nullable().optional(), // 'orden' de la DB
    // Campos no editables directamente en este form, pero útiles
    preguntaOriginalUsuario: z.string().nullable().optional(),
    creadoPorHumano: z.boolean().optional(),
    notificacionEnviada: z.boolean().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // Multimedia específica (tipos completos para la data inicial)
    galeriaDetalle: z.array(DetalleGaleriaItemSchema).optional().default([]),
    videoDetalle: DetalleVideoItemSchema.nullable().optional(),
    documentosDetalle: z.array(DetalleDocumentoItemSchema).optional().default([]),
});
export type OfertaDetalleCompletoType = z.infer<typeof OfertaDetalleCompletoSchema>;




// Esquema Zod para los datos que el formulario de EDICIÓN enviará a la action
export const EditarOfertaInputSchema = z.object({
    nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(150),
    descripcion: z.string().max(1000).nullable().optional().transform(val => val === '' ? null : val),
    // 'codigo' fue omitido en la creación, pero podría ser editable si existe. Por ahora lo omito del form de edición también.
    // Si quieres añadirlo, sería:
    // codigo: z.string().max(50).regex(/^[a-zA-Z0-9_-]*$/, "Código inválido.").nullable().optional().transform(val => val === '' ? null : val),

    precio: z.number({ invalid_type_error: "El precio debe ser un número" })
        .positive({ message: "El precio debe ser mayor a cero." })
        .finite()
        .nullable().optional(),

    tipoPago: TipoPagoOfertaEnumSchema, // En edición, es probable que ya tenga un valor
    intervaloRecurrencia: IntervaloRecurrenciaOfertaEnumSchema.nullable().optional(),

    objetivos: z.array(ObjetivoOfertaZodEnum)
        .min(1, { message: "Debes seleccionar al menos un objetivo." }),

    // Campos de Anticipo (para tipoPago UNICO)
    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable().optional(),
    porcentajeAnticipo: z.number().min(1).max(99, "Porcentaje entre 1 y 99").nullable().optional(), // Este es el % (ej. 20 para 20%)
    anticipo: z.number().positive("Monto de anticipo debe ser positivo.").finite().nullable().optional(), // Este es el monto fijo o el calculado

    // Campos de Vigencia y Estado (se editan aquí)
    fechaInicio: z.date({ required_error: 'La fecha de inicio es requerida.', invalid_type_error: 'Fecha inválida.' }),
    fechaFin: z.date({ required_error: 'La fecha de fin es requerida.', invalid_type_error: 'Fecha inválida.' }),
    status: OfertaStatusEnumSchema,
})
    .refine(data => { // Validación para pago RECURRENTE
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, { message: 'Intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => { // Validación para ANTICIPO en pago ÚNICO
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo !== null && data.porcentajeAnticipo !== undefined;
            // 'anticipo' aquí es el input de monto fijo en el EditarOfertaInputSchema
            const tieneMontoFijo = data.anticipo !== null && data.anticipo !== undefined;

            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE && !tienePorcentaje) {
                return false; // Si tipo es PORCENTAJE, porcentajeAnticipo es requerido
            }
            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO && !tieneMontoFijo) {
                return false; // Si tipo es MONTO_FIJO, anticipo (monto fijo) es requerido
            }
            // ESTA ES LA CONDICIÓN QUE PROBABLEMENTE ESTÁ CAUSANDO EL ERROR:
            if ((tienePorcentaje || tieneMontoFijo) && !tieneTipo) {
                return false; // Si se provee un valor de anticipo (porcentaje o monto), el tipo es requerido
            }
        }
        return true;
    }, { message: 'Si defines un anticipo, debes especificar el tipo y el valor correspondiente.', path: ['tipoAnticipo'] }) // Path genérico
    .refine(data => { // Anticipo no puede ser mayor que el precio total
        if (
            data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO &&
            data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO &&
            data.precio !== null &&
            data.precio !== undefined &&
            data.anticipo !== null &&
            data.anticipo !== undefined &&
            data.anticipo >= data.precio
        ) {
            return false;
        }
        // Para porcentaje, el `porcentajeAnticipo` ya está validado entre 1-99.
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, { message: "La fecha de fin no puede ser anterior a la fecha de inicio.", path: ["fechaFin"] });

export type EditarOfertaDataInputType = z.infer<typeof EditarOfertaInputSchema>;

// Tipo para los datos completos que carga la página de edición, incluyendo ID y relaciones
// Primero, extrae el objeto base de EditarOfertaInputSchema (antes de efectos/refines)
const EditarOfertaInputObjectSchema = z.object({
    nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(150),
    descripcion: z.string().max(1000).nullable().optional().transform(val => val === '' ? null : val),
    precio: z.number({ invalid_type_error: "El precio debe ser un número" })
        .positive({ message: "El precio debe ser mayor a cero." })
        .finite()
        .nullable().optional(),
    tipoPago: TipoPagoOfertaEnumSchema,
    intervaloRecurrencia: IntervaloRecurrenciaOfertaEnumSchema.nullable().optional(),
    objetivos: z.array(ObjetivoOfertaZodEnum)
        .min(1, { message: "Debes seleccionar al menos un objetivo." }),
    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable().optional(),
    porcentajeAnticipo: z.number().min(1).max(99, "Porcentaje entre 1 y 99").nullable().optional(),
    anticipo: z.number().positive("Monto de anticipo debe ser positivo.").finite().nullable().optional(),
    fechaInicio: z.date({ required_error: 'La fecha de inicio es requerida.', invalid_type_error: 'Fecha inválida.' }),
    fechaFin: z.date({ required_error: 'La fecha de fin es requerida.', invalid_type_error: 'Fecha inválida.' }),
    status: OfertaStatusEnumSchema,
});

// Ahora extiende el objeto base y luego aplica los efectos/refines
export const OfertaCompletaParaEdicionSchema = EditarOfertaInputObjectSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // Los campos de multimedia se cargarán por separado en sus respectivos managers/tabs
    // OfertaGaleria: z.array(OfertaGaleriaItemSchema).optional(),
    // videos: z.array(OfertaVideoItemSchema).optional(),
    // documentosOferta: z.array(OfertaDocumentoItemSchema).optional(),
})
    .refine(data => { // Validación para pago RECURRENTE
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, { message: 'Intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => { // Validación para ANTICIPO en pago ÚNICO
        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo !== null && data.porcentajeAnticipo !== undefined;
            // 'anticipo' aquí es el input de monto fijo en el EditarOfertaInputSchema
            const tieneMontoFijo = data.anticipo !== null && data.anticipo !== undefined;

            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE && !tienePorcentaje) {
                return false; // Si tipo es PORCENTAJE, porcentajeAnticipo es requerido
            }
            if (tieneTipo && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO && !tieneMontoFijo) {
                return false; // Si tipo es MONTO_FIJO, anticipo (monto fijo) es requerido
            }
            // ESTA ES LA CONDICIÓN QUE PROBABLEMENTE ESTÁ CAUSANDO EL ERROR:
            if ((tienePorcentaje || tieneMontoFijo) && !tieneTipo) {
                return false; // Si se provee un valor de anticipo (porcentaje o monto), el tipo es requerido
            }
        }
        return true;
    }, { message: 'Si defines un anticipo, debes especificar el tipo y el valor correspondiente.', path: ['tipoAnticipo'] })
    .refine(data => {
        if (
            data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO &&
            data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO &&
            data.precio !== null &&
            data.precio !== undefined &&
            data.anticipo !== null &&
            data.anticipo !== undefined &&
            data.anticipo >= data.precio
        ) {
            return false;
        }
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, { message: "La fecha de fin no puede ser anterior a la fecha de inicio.", path: ["fechaFin"] });

export type OfertaParaEditarFormType = z.infer<typeof OfertaCompletaParaEdicionSchema>;