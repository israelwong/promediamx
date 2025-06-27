import { z } from 'zod';
import {
    TipoPagoOferta as PrismaTipoPagoOfertaEnum,
    IntervaloRecurrenciaOferta as PrismaIntervaloRecurrenciaOfertaEnum,
    ObjetivoOferta as PrismaObjetivoOfertaEnum,
    TipoAnticipoOferta as PrismaTipoAnticipoOfertaEnum,
    EstadoOferta as PrismaEstadoOfertaEnum,
    ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipoEnum,
} from '@prisma/client';

// --- Zod Enums (derivados de los Enums de Prisma para consistencia) ---
export const TipoPagoOfertaZodEnum = z.nativeEnum(PrismaTipoPagoOfertaEnum);
export const IntervaloRecurrenciaOfertaZodEnum = z.nativeEnum(PrismaIntervaloRecurrenciaOfertaEnum);
export const ObjetivoOfertaZodEnum = z.nativeEnum(PrismaObjetivoOfertaEnum);
export const TipoAnticipoOfertaZodEnum = z.nativeEnum(PrismaTipoAnticipoOfertaEnum);
export const EstadoOfertaZodEnum = z.nativeEnum(PrismaEstadoOfertaEnum);
export const ObjetivoCitaTipoZodEnum = z.nativeEnum(PrismaObjetivoCitaTipoEnum);

// --- Esquema para CREACIÓN SIMPLIFICADA de Ofertas ---
export const CrearOfertaSimplificadoSchema = z.object({
    nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres.").max(150),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres.").nullable().optional(),
});
export const OfertaCreadaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});

// --- Esquema para LISTAR Ofertas ---
export const OfertaParaListaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    status: EstadoOfertaZodEnum,
    fechaInicio: z.date(),
    fechaFin: z.date(),
    imagenPortadaUrl: z.string().url().nullable(),
});

// --- Esquemas para MULTIMEDIA ---
export const OfertaGaleriaItemSchema = z.object({
    id: z.string().cuid(),
    imageUrl: z.string().url(),
    orden: z.number().int().nullable().optional(),
});
export const OfertaVideoItemSchema = z.object({
    id: z.string().cuid(),
    videoUrl: z.string().url(),
    titulo: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
});
export const OfertaDocumentoItemSchema = z.object({
    id: z.string().cuid(),
    documentoUrl: z.string().url(),
    documentoNombre: z.string().nullable().optional(),
    orden: z.number().int().nullable().optional(),
});

// --- Esquema para EDICIÓN de Ofertas ---
const ofertaBaseSchema = z.object({
    nombre: z.string().trim().min(3, "El nombre es muy corto.").max(150),
    descripcion: z.string().max(1000, "La descripción es muy larga.").nullable(),
    precio: z.number().positive("El precio debe ser positivo.").nullable().optional(),
    tipoPago: TipoPagoOfertaZodEnum,
    intervaloRecurrencia: IntervaloRecurrenciaOfertaZodEnum.nullable(),
    objetivos: z.array(ObjetivoOfertaZodEnum),
    tipoAnticipo: TipoAnticipoOfertaZodEnum.nullable(),
    porcentajeAnticipo: z.number().min(1).max(99).nullable().optional(),
    anticipo: z.number().positive().nullable().optional(),
    objetivoCitaTipo: ObjetivoCitaTipoZodEnum.nullable(),
    objetivoCitaFecha: z.date().nullable().optional(),
    serviciosDeCitaIds: z.array(z.string().cuid()).default([]),
    objetivoCitaUbicacion: z.string().max(255).nullable().optional(),
    objetivoCitaDuracionMinutos: z.number().int().positive().nullable().optional(),
    objetivoCitaLimiteConcurrencia: z.number().int().positive().nullable().optional(),
    fechaInicio: z.date({ required_error: 'La fecha de inicio es requerida.' }),
    fechaFin: z.date({ required_error: 'La fecha de fin es requerida.' }),
    status: EstadoOfertaZodEnum,
});

export const EditarOfertaInputSchema = ofertaBaseSchema
    .extend({
        objetivos: z.array(ObjetivoOfertaZodEnum).min(1, "Debes seleccionar al menos un objetivo."),
    })
    .refine(data => data.fechaFin >= data.fechaInicio, {
        message: "La fecha de fin no puede ser anterior a la de inicio.",
        path: ["fechaFin"],
    })
    .refine(data => {
        if (data.tipoPago === 'RECURRENTE') return !!data.intervaloRecurrencia;
        return true;
    }, { message: "El intervalo es requerido para pagos recurrentes.", path: ["intervaloRecurrencia"] })
    .refine(data => {
        if (data.objetivos.includes('CITA')) return !!data.objetivoCitaTipo;
        return true;
    }, { message: "El tipo de cita es requerido si el objetivo es agendar.", path: ["objetivoCitaTipo"] })
    .refine(data => {
        if (data.tipoPago === 'UNICO' && data.tipoAnticipo) {
            if (data.tipoAnticipo === 'PORCENTAJE') return data.porcentajeAnticipo != null;
            if (data.tipoAnticipo === 'MONTO_FIJO') return data.anticipo != null;
        }
        return true;
    }, { message: "El valor del anticipo es requerido si se selecciona un tipo.", path: ["tipoAnticipo"] });

// --- Esquema para el MANAGER (Incluye multimedia) ---
export const OfertaCompletaParaManagerSchema = ofertaBaseSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    OfertaGaleria: z.array(OfertaGaleriaItemSchema).optional(),
    videos: z.array(OfertaVideoItemSchema).optional(),
    documentosOferta: z.array(OfertaDocumentoItemSchema).optional(),
});

// --- Esquema para los datos COMPLETOS que se cargan en el formulario de EDICIÓN ---
export const OfertaCompletaParaEdicionSchema = ofertaBaseSchema.extend({
    id: z.string().cuid(),
    negocioId: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
});


// --- Tipos Inferidos para uso en el código ---
export type CrearOfertaSimplificadoType = z.infer<typeof CrearOfertaSimplificadoSchema>;
export type OfertaCreadaType = z.infer<typeof OfertaCreadaSchema>;
export type OfertaParaListaType = z.infer<typeof OfertaParaListaSchema>;
export type EditarOfertaInputType = z.infer<typeof EditarOfertaInputSchema>;
export type OfertaParaEditarFormType = z.infer<typeof OfertaCompletaParaEdicionSchema>;
export type OfertaCompletaParaManagerType = z.infer<typeof OfertaCompletaParaManagerSchema>;
