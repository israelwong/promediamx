// Ruta: @/app/admin/_lib/actions/oferta/oferta.schemas.ts
import { z } from 'zod';
import {
    TipoPagoOferta as PrismaTipoPagoOfertaEnum,
    IntervaloRecurrenciaOferta as PrismaIntervaloRecurrenciaOfertaEnum,
    ObjetivoOferta as PrismaObjetivoOfertaEnum,
    TipoAnticipoOferta as PrismaTipoAnticipoOfertaEnum,
    EstadoOferta as PrismaEstadoOfertaEnum,
    ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipoEnum,
} from '@prisma/client';

// --- Zod Enums (derivados de los Enums de Prisma) ---
export const TipoPagoOfertaZodEnum = z.nativeEnum(PrismaTipoPagoOfertaEnum);
export const IntervaloRecurrenciaOfertaZodEnum = z.nativeEnum(PrismaIntervaloRecurrenciaOfertaEnum);
export const ObjetivoOfertaZodEnum = z.nativeEnum(PrismaObjetivoOfertaEnum);
export type ObjetivoOfertaZodEnumType = z.infer<typeof ObjetivoOfertaZodEnum>;
export const TipoAnticipoOfertaZodEnum = z.nativeEnum(PrismaTipoAnticipoOfertaEnum);
export const OfertaStatusZodEnum = z.nativeEnum(PrismaEstadoOfertaEnum);
export const ObjetivoCitaTipoZodEnum = z.nativeEnum(PrismaObjetivoCitaTipoEnum);

const BaseMultimediaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    tamañoBytes: z.number().int().positive().nullable().optional(),
});

export const DetalleGaleriaItemSchema = BaseMultimediaItemSchema.extend({
    imageUrl: z.string().url(),
    altText: z.string().max(255).nullable().optional(),
    descripcion: z.string().max(500).nullable().optional(),
    ofertaDetalleId: z.string().cuid(),
});
export type DetalleGaleriaItemType = z.infer<typeof DetalleGaleriaItemSchema>;

export const DetalleVideoItemSchema = BaseMultimediaItemSchema.extend({
    videoUrl: z.string().url(),
    tipoVideo: z.string().max(50).nullable().optional(), // Podrías usar un z.enum si tienes tipos fijos
    titulo: z.string().max(150).nullable().optional(), // Corresponde a 'titulo' en Prisma
    descripcion: z.string().max(500).nullable().optional(), // Corresponde a 'descripcion' en Prisma
    ofertaDetalleId: z.string().cuid({ message: "ID de detalle de oferta inválido en video." }),
    updatedAt: z.date(),
    // 'orden' ya está en BaseMultimediaItemSchema
});
export type DetalleVideoItemType = z.infer<typeof DetalleVideoItemSchema>;

export const DetalleDocumentoItemSchema = BaseMultimediaItemSchema.extend({
    documentoUrl: z.string().url(),
    documentoNombre: z.string().max(255).nullable().optional(),
    documentoTipo: z.string().max(100).nullable().optional(),
    documentoTamanoBytes: z.number().int().positive().nullable().optional(), // Corresponde
    descripcion: z.string().max(500).nullable().optional(),
    ofertaDetalleId: z.string().cuid(),
});
export type DetalleDocumentoItemType = z.infer<typeof DetalleDocumentoItemSchema>;

// Schema Base para campos comunes de Crear y Actualizar OfertaDetalle
const BaseOfertaDetalleSchema = z.object({
    tituloDetalle: z.string().min(3, "Título debe tener al menos 3 caracteres.").max(255),
    contenido: z.string().min(10, "Contenido debe tener al menos 10 caracteres."), // @db.Text
    tipoDetalle: z.string().max(100).nullable().optional().transform(val => val === '' ? null : val),
    palabrasClave: z.array(z.string().max(50)).max(10, "Máximo 10 palabras clave.").optional().default([]),
    estadoContenido: z.string().min(1, "El estado es requerido.").default("PUBLICADO"), // Debería ser un Enum
});

export const CreateOfertaDetalleInputSchema = BaseOfertaDetalleSchema.extend({
    ofertaId: z.string().cuid({ message: "ID de oferta inválido." }),
    resolverPreguntaId: z.string().cuid().nullable().optional(), // Asumiendo que es un CUID
});
export type CreateOfertaDetalleInputType = z.infer<typeof CreateOfertaDetalleInputSchema>;

export const UpdateOfertaDetalleInputSchema = BaseOfertaDetalleSchema; // No necesita extenderse si el ID se pasa por separado
export type UpdateOfertaDetalleInputType = z.infer<typeof UpdateOfertaDetalleInputSchema>;

export const OfertaDetalleListItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    tituloDetalle: z.string(),
    // contenidoExtracto: z.string().optional(), // Podrías generarlo en la action si es necesario
    contenido: z.string(), // Devolver el contenido completo, el frontend puede truncarlo
    orden: z.number().int().nullable().optional(),
    estadoContenido: z.string(), // Debería ser un Enum
    updatedAt: z.date(),
    _count: z.object({
        galeriaDetalle: z.number().optional(),
        videoDetalle: z.number().optional(),
        documentosDetalle: z.number().optional(),
    }).optional(),
});
export type OfertaDetalleListItemType = z.infer<typeof OfertaDetalleListItemSchema>;

export const OfertaDetalleCompletoSchema = BaseOfertaDetalleSchema.extend({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    orden: z.number().int().nullable().optional(),
    preguntaOriginalUsuario: z.string().nullable().optional(),
    creadoPorHumano: z.boolean().optional(), // Prisma default es true
    notificacionEnviada: z.boolean().optional(), // Prisma default es false
    createdAt: z.date(),
    updatedAt: z.date(),
    galeriaDetalle: z.array(DetalleGaleriaItemSchema).optional().default([]),
    videoDetalle: DetalleVideoItemSchema.nullable().optional(),
    documentosDetalle: z.array(DetalleDocumentoItemSchema).optional().default([]),
    // PreguntaSinRespuestaOferta no se suele cargar aquí para edición del detalle
});
export type OfertaDetalleCompletoType = z.infer<typeof OfertaDetalleCompletoSchema>;


// --- Schemas para Creación Simplificada ---
export const CrearOfertaSuperSimplificadoInputSchema = z.object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(150),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres.").nullable().optional().transform(val => (val === "" ? null : val)),
});
export type CrearOfertaSuperSimplificadoDataInputType = z.infer<typeof CrearOfertaSuperSimplificadoInputSchema>;

export const OfertaCreadaOutputSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});
export type OfertaCreadaOutputType = z.infer<typeof OfertaCreadaOutputSchema>;

// --- Esquema para Lista de Ofertas ---
export const OfertaParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    status: OfertaStatusZodEnum,
    fechaInicio: z.date().nullable(),
    fechaFin: z.date().nullable(),
    imagenPortadaUrl: z.string().url().nullable().optional(),
});
export type OfertaParaListaType = z.infer<typeof OfertaParaListaSchema>;

// --- Esquema Base para los campos editables de una Oferta ---
// Este es el núcleo para EditarOfertaInputSchema y OfertaCompletaParaEdicionSchema/ManagerSchema
const EditarOfertaBaseObjectSchema = z.object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(150),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres.").nullable().optional().transform(val => val === '' ? null : val),
    precio: z.number({ invalid_type_error: "El precio debe ser un número." }).positive("El precio debe ser mayor que cero si se especifica.").finite().nullable().optional(),
    tipoPago: TipoPagoOfertaZodEnum,
    intervaloRecurrencia: IntervaloRecurrenciaOfertaZodEnum.nullable().optional(),
    objetivos: z.array(ObjetivoOfertaZodEnum).min(1, "Debes seleccionar al menos un objetivo."),
    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable().optional(),
    porcentajeAnticipo: z.number().min(1, "El % de anticipo debe ser entre 1 y 99.").max(99, "El % de anticipo debe ser entre 1 y 99.").nullable().optional(),
    anticipo: z.number().positive("El monto de anticipo fijo debe ser positivo.").finite().nullable().optional(),
    objetivoCitaTipo: ObjetivoCitaTipoZodEnum.nullable().optional(),
    objetivoCitaFecha: z.date({ invalid_type_error: 'Fecha inválida para el evento/cita.' }).nullable().optional(),
    objetivoCitaServicioId: z.string().cuid("ID de servicio para cita inválido.").nullable().optional(),
    objetivoCitaUbicacion: z.string().max(255, "Ubicación muy larga.").nullable().optional().transform(val => val === '' ? null : val),
    objetivoCitaDuracionMinutos: z.number().int("Duración debe ser un número entero.").positive("Duración debe ser positiva.").nullable().optional(),
    objetivoCitaLimiteConcurrencia: z.number().int("Límite de concurrencia debe ser un número entero.").positive("Límite debe ser positivo.").nullable().optional(),
    fechaInicio: z.date({ required_error: 'La fecha de inicio es requerida.', invalid_type_error: 'Fecha de inicio inválida.' }),
    fechaFin: z.date({ required_error: 'La fecha de fin es requerida.', invalid_type_error: 'Fecha de fin inválida.' }),
    status: OfertaStatusZodEnum,
});

// --- Esquema para los datos que el formulario de EDICIÓN envía a la action ---
export const EditarOfertaInputSchema = EditarOfertaBaseObjectSchema // No necesita refines aquí si son los mismos que OfertaCompletaParaEdicionSchema
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.RECURRENTE && !data.intervaloRecurrencia) return false;
        return true;
    }, { message: 'El intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo != null;
            const tieneMontoFijo = data.anticipo != null;
            if (tieneTipo) {
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.PORCENTAJE && !tienePorcentaje) return false;
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && !tieneMontoFijo) return false;
            } else if (tienePorcentaje || tieneMontoFijo) return false;
        }
        return true;
    }, { message: 'Si se define un tipo de anticipo, el valor es requerido. Si se define un valor, el tipo es requerido.', path: ['tipoAnticipo'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO && data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && data.precio != null && data.anticipo != null && data.anticipo >= data.precio) return false;
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, { message: "La fecha de fin no puede ser anterior.", path: ["fechaFin"] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        if (tieneObjetivoCita && !data.objetivoCitaTipo) return false;
        return true;
    }, { message: "Si el objetivo es 'CITA', especifica el 'Tipo de Objetivo de Cita'.", path: ['objetivoCitaTipo'] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        const esCitaDiaEspecifico = tieneObjetivoCita && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO;
        if (esCitaDiaEspecifico && !data.objetivoCitaFecha) return false;
        return true;
    }, { message: "Si la cita es para un 'Día Específico', la 'Fecha del Evento/Cita' es requerida.", path: ['objetivoCitaFecha'] });
export type EditarOfertaDataInputType = z.infer<typeof EditarOfertaInputSchema>;

// --- Esquemas para la multimedia de Oferta (usados en OfertaCompletaParaManagerSchema) ---
export const OfertaGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    imageUrl: z.string().url(),
    altText: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
    tamañoBytes: z.number().int().positive().nullable().optional(),
    createdAt: z.date(),
});
export type OfertaGaleriaItemType = z.infer<typeof OfertaGaleriaItemSchema>;

export const OfertaVideoItemSchema = z.object({
    id: z.string().cuid(),
    videoUrl: z.string().url(),
    tipoVideo: z.string().nullable().optional(),
    titulo: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
    tamañoBytes: z.number().int().positive().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type OfertaVideoItemType = z.infer<typeof OfertaVideoItemSchema>;

export const OfertaDocumentoItemSchema = z.object({
    id: z.string().cuid(),
    documentoUrl: z.string().url(),
    documentoNombre: z.string().nullable().optional(),
    documentoTipo: z.string().nullable().optional(),
    documentoTamanoBytes: z.number().int().positive().nullable().optional(),
    descripcion: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
});
export type OfertaDocumentoItemType = z.infer<typeof OfertaDocumentoItemSchema>;

// --- Esquema para los datos COMPLETOS que se cargan para el MANAGER (y que el FORMULARIO puede consumir) ---
// Este schema se usa para validar los datos que vienen de `obtenerOfertaParaEdicionAction`.
export const OfertaCompletaParaManagerSchema = EditarOfertaBaseObjectSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // Relaciones para los managers de multimedia
    OfertaGaleria: z.array(OfertaGaleriaItemSchema).optional().default([]),
    videos: z.array(OfertaVideoItemSchema).optional().default([]), // Nombre de relación en Prisma para OfertaVideos
    documentosOferta: z.array(OfertaDocumentoItemSchema).optional().default([]), // Nombre de relación en Prisma
    // Si necesitas mostrar el nombre del servicio de cita en el form de edición de oferta:
    // objetivoCitaServicio: z.object({ id: z.string().cuid(), nombre: z.string() }).nullable().optional(),
}).refine(data => { // Re-aplicar refines relevantes. El extend no los hereda automáticamente si se redefine el objeto base.
    if (data.tipoPago === PrismaTipoPagoOfertaEnum.RECURRENTE && !data.intervaloRecurrencia) return false;
    return true;
}, { message: 'El intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo != null;
            const tieneMontoFijo = data.anticipo != null;
            if (tieneTipo) {
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.PORCENTAJE && !tienePorcentaje) return false;
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && !tieneMontoFijo) return false;
            } else if (tienePorcentaje || tieneMontoFijo) return false;
        }
        return true;
    }, { message: 'Si se define un tipo de anticipo, el valor correspondiente es requerido...', path: ['tipoAnticipo'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO && data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && data.precio != null && data.anticipo != null && data.anticipo >= data.precio) return false;
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, { message: "La fecha de fin no puede ser anterior...", path: ["fechaFin"] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        if (tieneObjetivoCita && !data.objetivoCitaTipo) return false;
        return true;
    }, { message: "Si el objetivo es 'CITA', debes especificar el 'Tipo de Objetivo de Cita'.", path: ['objetivoCitaTipo'] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        const esCitaDiaEspecifico = tieneObjetivoCita && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO;
        if (esCitaDiaEspecifico && !data.objetivoCitaFecha) return false;
        return true;
    }, { message: "Si la cita es para un 'Día Específico', la 'Fecha del Evento/Cita' es requerida.", path: ['objetivoCitaFecha'] });

export type OfertaCompletaParaManagerType = z.infer<typeof OfertaCompletaParaManagerSchema>;

// Tipo que OfertaEditarForm espera para sus props `initialData`
// Debería ser compatible con OfertaCompletaParaManagerType o un subconjunto.
// En este caso, son casi idénticos si no se necesitan las relaciones de multimedia directamente en el form.
export type OfertaParaEditarFormType = z.infer<typeof EditarOfertaInputSchema> & {
    id: string;
    negocioId: string;
    createdAt: Date;
    updatedAt: Date;
    // objetivoCitaServicio?: { id: string; nombre: string; } | null; // Ejemplo
};

// No necesitamos aquí schemas de OfertaDetalle a menos que este archivo también los gestione.


export const OfertaCompletaParaEdicionSchema = EditarOfertaBaseObjectSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    // Si necesitas la relación con AgendaTipoCita para mostrar el nombre del servicio en el form:
    objetivoCitaServicio: z.object({
        id: z.string().cuid(),
        nombre: z.string(),
        // duracionMinutos: z.number().int().nullable().optional(), // Si lo necesitas
    }).nullable().optional(),
    // Otras relaciones (como _count) se pueden añadir si son necesarias para la lógica del formulario de edición.
}).refine(data => { // Re-aplicar refines cruciales si no se heredan o para mayor claridad
    if (data.tipoPago === PrismaTipoPagoOfertaEnum.RECURRENTE && !data.intervaloRecurrencia) return false;
    return true;
}, { message: 'El intervalo de recurrencia es obligatorio para pagos recurrentes.', path: ['intervaloRecurrencia'] })
    // ... (copiar todos los demás .refine relevantes de EditarOfertaInputSchema aquí)
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO) {
            const tieneTipo = !!data.tipoAnticipo;
            const tienePorcentaje = data.porcentajeAnticipo != null;
            const tieneMontoFijo = data.anticipo != null;
            if (tieneTipo) {
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.PORCENTAJE && !tienePorcentaje) return false;
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && !tieneMontoFijo) return false;
            } else if (tienePorcentaje || tieneMontoFijo) return false;
        }
        return true;
    }, { message: 'Si se define un tipo de anticipo, el valor correspondiente es requerido...', path: ['tipoAnticipo'] })
    .refine(data => {
        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO && data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && data.precio != null && data.anticipo != null && data.anticipo >= data.precio) return false;
        return true;
    }, { message: 'El anticipo (monto fijo) no puede ser mayor o igual al precio total.', path: ['anticipo'] })
    .refine(data => data.fechaFin >= data.fechaInicio, { message: "La fecha de fin no puede ser anterior...", path: ["fechaFin"] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        if (tieneObjetivoCita && !data.objetivoCitaTipo) return false;
        return true;
    }, { message: "Si el objetivo es 'CITA', debes especificar el 'Tipo de Objetivo de Cita'.", path: ['objetivoCitaTipo'] })
    .refine(data => {
        const tieneObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);
        const esCitaDiaEspecifico = tieneObjetivoCita && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO;
        if (esCitaDiaEspecifico && !data.objetivoCitaFecha) return false;
        return true;
    }, { message: "Si el objetivo de cita es para un 'Día Específico', la 'Fecha del Evento/Cita' es requerida.", path: ['objetivoCitaFecha'] });
// export type OfertaParaEditarFormType = z.infer<typeof OfertaCompletaParaEdicionSchema>;