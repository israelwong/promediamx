// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/oferta.schemas.ts
import { z } from 'zod';
import {
    TipoPagoOferta as PrismaTipoPagoOferta,
    IntervaloRecurrenciaOferta as PrismaIntervaloRecurrenciaOferta,
    ObjetivoOferta as PrismaObjetivoOferta,
    TipoAnticipoOferta as PrismaTipoAnticipoOferta,
    EstadoOferta as PrismaEstadoOferta, // Enum que acabas de añadir a Prisma
    ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipoEnum, // Nuevo Enum que acabas de añadir a Prisma
} from '@prisma/client';

export const TipoPagoOfertaZodEnum = z.nativeEnum(PrismaTipoPagoOferta);
export const IntervaloRecurrenciaOfertaZodEnum = z.nativeEnum(PrismaIntervaloRecurrenciaOferta);
export const ObjetivoOfertaZodEnum = z.nativeEnum(PrismaObjetivoOferta);
export const TipoAnticipoOfertaZodEnum = z.nativeEnum(PrismaTipoAnticipoOferta);
export const OfertaStatusZodEnum = z.nativeEnum(PrismaEstadoOferta); // Asegúrate que PrismaEstadoOferta exista
export const ObjetivoCitaTipoZodEnum = z.nativeEnum(PrismaObjetivoCitaTipoEnum); // Nuevo Zod Enum
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
    'ACTIVO',
    'INACTIVO',
    'PROGRAMADA',
    'FINALIZADA',
    'BORRADOR'
], {
    required_error: "El estado de la oferta es requerido.",
    invalid_type_error: "Estado de oferta no válido.",
});
export type OfertaStatusType = z.infer<typeof OfertaStatusEnumSchema>;

// --- Esquema para cada item en la lista de ofertas (usado por OfertasLista.tsx) ---
export const OfertaParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(), // nombre es requerido en Prisma
    descripcion: z.string().nullable(),
    status: OfertaStatusZodEnum,
    fechaInicio: z.date().nullable(),
    fechaFin: z.date().nullable(),
    imagenPortadaUrl: z.string().url().nullable().optional(),
    // Podrías añadir precio u objetivos si los quieres mostrar en la lista
    // precio: z.number().nullable().optional(),
    // objetivos: z.array(ObjetivoOfertaZodEnum).optional(),
});
export type OfertaParaListaType = z.infer<typeof OfertaParaListaSchema>;

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

// --- Esquema para CREACIÓN SIMPLIFICADA de Oferta ---

export const CrearOfertaSimplificadoInputSchema = z.object({
    nombre: z.string()
        .trim()
        .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
        .max(150, { message: "El nombre no puede exceder los 150 caracteres." }),
    descripcion: z.string()
        .max(1000, { message: "La descripción no puede exceder los 1000 caracteres." })
        .nullable().optional()
        .transform(val => (val === "" ? null : val)),
});
export type CrearOfertaSimplificadoDataInputType = z.infer<typeof CrearOfertaSimplificadoInputSchema>;

// --- Esquema para la SALIDA de la acción crearOferta (simplificado) ---
export const OfertaCreadaOutputSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});
export type OfertaCreadaOutputType = z.infer<typeof OfertaCreadaOutputSchema>;





// --- Esquema para CREACIÓN MUY SIMPLIFICADA de Oferta ---
// Solo nombre y descripción opcional. El resto se configura al editar.
export const CrearOfertaSuperSimplificadoInputSchema = z.object({
    nombre: z.string()
        .trim()
        .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
        .max(150, { message: "El nombre no puede exceder los 150 caracteres." }),
    descripcion: z.string()
        .max(1000, { message: "La descripción no puede exceder los 1000 caracteres." })
        .nullable().optional()
        .transform(val => (val === "" ? null : val)), // Convertir string vacío a null
});
export type CrearOfertaSuperSimplificadoDataInputType = z.infer<typeof CrearOfertaSuperSimplificadoInputSchema>;

// --- Esquema para los datos que el formulario de EDICIÓN enviará a la action ---
// Define el objeto base sin efectos/refines
const EditarOfertaInputObjectSchema = z.object({
    nombre: z.string().trim().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }).max(150),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres.").nullable().optional().transform(val => val === '' ? null : val),

    precio: z.number({ invalid_type_error: "El precio debe ser un número." })
        .positive({ message: "El precio debe ser mayor que cero si se especifica." })
        .finite()
        .nullable().optional(),

    tipoPago: TipoPagoOfertaZodEnum,
    intervaloRecurrencia: IntervaloRecurrenciaOfertaZodEnum.nullable().optional(),

    objetivos: z.array(ObjetivoOfertaZodEnum).min(1, { message: "Debes seleccionar al menos un objetivo." }),

    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable().optional(),
    porcentajeAnticipo: z.number().min(1, "El % de anticipo debe ser entre 1 y 99.").max(99, "El % de anticipo debe ser entre 1 y 99.").nullable().optional(),
    anticipo: z.number().positive("El monto de anticipo fijo debe ser positivo.").finite().nullable().optional(), // Monto fijo

    // Nuevos campos para Objetivo CITA
    objetivoCitaTipo: ObjetivoCitaTipoZodEnum.nullable().optional(),
    objetivoCitaFecha: z.date({ invalid_type_error: 'Fecha inválida para el evento/cita.' }).nullable().optional(),
    objetivoCitaServicioId: z.string().cuid("ID de servicio para cita inválido.").nullable().optional(),
    objetivoCitaUbicacion: z.string().max(255, "Ubicación muy larga.").nullable().optional().transform(val => val === '' ? null : val),
    objetivoCitaDuracionMinutos: z.number().int("Duración debe ser un número entero.").positive("Duración debe ser positiva.").nullable().optional(),

    fechaInicio: z.date({ required_error: 'La fecha de inicio es requerida.', invalid_type_error: 'Fecha de inicio inválida.' }),
    fechaFin: z.date({ required_error: 'La fecha de fin es requerida.', invalid_type_error: 'Fecha de fin inválida.' }),
    status: OfertaStatusZodEnum,
});

// Aplica los efectos/refines sobre el objeto base
export const EditarOfertaInputSchema = EditarOfertaInputObjectSchema
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOferta.RECURRENTE && !data.intervaloRecurrencia) {
            return false;
        }
        return true;
    }, { message: 'El intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOferta.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo != null;
            const tieneMontoFijo = data.anticipo != null;

            if (tieneTipo) {
                if (data.tipoAnticipo === PrismaTipoAnticipoOferta.PORCENTAJE && !tienePorcentaje) {
                    return false; // Si tipo es PORCENTAJE, porcentajeAnticipo es requerido
                }
                if (data.tipoAnticipo === PrismaTipoAnticipoOferta.MONTO_FIJO && !tieneMontoFijo) {
                    return false; // Si tipo es MONTO_FIJO, anticipo (monto fijo) es requerido
                }
            } else if (tienePorcentaje || tieneMontoFijo) {
                // Si NO hay tipo, pero SÍ hay valor de porcentaje o monto, es un error
                return false;
            }
        }
        return true;
    }, { message: 'Si se define un tipo de anticipo, el valor correspondiente es requerido. Si se define un valor, el tipo es requerido.', path: ['tipoAnticipo'] }) // Path ajustado
    .refine(data => {
        if (
            data.tipoPago === PrismaTipoPagoOferta.UNICO &&
            data.tipoAnticipo === PrismaTipoAnticipoOferta.MONTO_FIJO &&
            data.precio != null &&
            data.anticipo != null &&
            data.anticipo >= data.precio
        ) {
            return false;
        }
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, {
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        path: ["fechaFin"]
    })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOferta.CITA);
        if (tieneObjetivoCita && !data.objetivoCitaTipo) {
            return false;
        }
        // Si no tiene objetivo CITA, los campos de cita no deben ser obligatorios
        if (!tieneObjetivoCita && (data.objetivoCitaTipo || data.objetivoCitaFecha || data.objetivoCitaServicioId || data.objetivoCitaUbicacion || data.objetivoCitaDuracionMinutos)) {
            // Opcional: podrías forzar que estos sean null si CITA no es un objetivo,
            // o simplemente no validarlos como requeridos. La acción de guardado los limpiará.
        }
        return true;
    }, { message: "Si el objetivo es 'CITA', debes especificar el 'Tipo de Objetivo de Cita'.", path: ['objetivoCitaTipo'] })
    .refine(data => {
        const esCitaDiaEspecifico = data.objetivos.includes(PrismaObjetivoOferta.CITA) && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO;
        if (esCitaDiaEspecifico && !data.objetivoCitaFecha) {
            return false;
        }
        return true;
    }, { message: "Si el objetivo de cita es para un 'Día Específico', la 'Fecha del Evento/Cita' es requerida.", path: ['objetivoCitaFecha'] });

export type EditarOfertaDataInputType = z.infer<typeof EditarOfertaInputSchema>;

// --- Esquema para los datos COMPLETOS que se cargan en el formulario de edición ---
// Incluye todos los campos de EditarOfertaInputSchema más los de auditoría y IDs.
export const OfertaCompletaParaEdicionSchema = EditarOfertaInputObjectSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    // Si el formulario necesita mostrar el nombre del servicio de cita, se añadiría aquí:
    // objetivoCitaServicio: z.object({ 
    //    id: z.string().cuid(), 
    //    nombre: z.string() 
    // }).nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
}).refine(data => {
    if (data.tipoPago === PrismaTipoPagoOferta.RECURRENTE && !data.intervaloRecurrencia) {
        return false;
    }
    return true;
}, { message: 'El intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOferta.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo != null;
            const tieneMontoFijo = data.anticipo != null;

            if (tieneTipo) {
                if (data.tipoAnticipo === PrismaTipoAnticipoOferta.PORCENTAJE && !tienePorcentaje) {
                    return false; // Si tipo es PORCENTAJE, porcentajeAnticipo es requerido
                }
                if (data.tipoAnticipo === PrismaTipoAnticipoOferta.MONTO_FIJO && !tieneMontoFijo) {
                    return false; // Si tipo es MONTO_FIJO, anticipo (monto fijo) es requerido
                }
            } else if (tienePorcentaje || tieneMontoFijo) {
                // Si NO hay tipo, pero SÍ hay valor de porcentaje o monto, es un error
                return false;
            }
        }
        return true;
    }, { message: 'Si se define un tipo de anticipo, el valor correspondiente es requerido. Si se define un valor, el tipo es requerido.', path: ['tipoAnticipo'] }) // Path ajustado
    .refine(data => {
        if (
            data.tipoPago === PrismaTipoPagoOferta.UNICO &&
            data.tipoAnticipo === PrismaTipoAnticipoOferta.MONTO_FIJO &&
            data.precio != null &&
            data.anticipo != null &&
            data.anticipo >= data.precio
        ) {
            return false;
        }
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, {
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        path: ["fechaFin"]
    })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOferta.CITA);
        if (tieneObjetivoCita && !data.objetivoCitaTipo) {
            return false;
        }
        // Si no tiene objetivo CITA, los campos de cita no deben ser obligatorios
        if (!tieneObjetivoCita && (data.objetivoCitaTipo || data.objetivoCitaFecha || data.objetivoCitaServicioId || data.objetivoCitaUbicacion || data.objetivoCitaDuracionMinutos)) {
            // Opcional: podrías forzar que estos sean null si CITA no es un objetivo,
            // o simplemente no validarlos como requeridos. La acción de guardado los limpiará.
        }
        return true;
    }, { message: "Si el objetivo es 'CITA', debes especificar el 'Tipo de Objetivo de Cita'.", path: ['objetivoCitaTipo'] })
    .refine(data => {
        const esCitaDiaEspecifico = data.objetivos.includes(PrismaObjetivoOferta.CITA) && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO;
        if (esCitaDiaEspecifico && !data.objetivoCitaFecha) {
            return false;
        }
        return true;
    }, { message: "Si el objetivo de cita es para un 'Día Específico', la 'Fecha del Evento/Cita' es requerida.", path: ['objetivoCitaFecha'] });

export type OfertaParaEditarFormType = z.infer<typeof OfertaCompletaParaEdicionSchema>;


