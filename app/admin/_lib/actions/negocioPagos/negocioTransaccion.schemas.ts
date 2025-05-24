// @/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas.ts
import { z } from 'zod';

// Coincide con el enum de Prisma, pero lo definimos aquí para desacoplar si es necesario
export const EstadoTransaccionEnumSchema = z.enum([
    'PENDIENTE',
    'COMPLETADA',
    'FALLIDA',
    'REEMBOLSADA',
    'PARCIALMENTE_REEMBOLSADA',
    'EN_PROCESO',
    'CANCELADA',
]);
export type EstadoTransaccionEnum = z.infer<typeof EstadoTransaccionEnumSchema>;

export const NegocioTransaccionSchema = z.object({
    id: z.string(),
    negocioId: z.string(),
    fechaTransaccion: z.date(),
    concepto: z.string(),
    montoBruto: z.number(),
    moneda: z.string(),
    comisionProcesadorPago: z.number(),
    comisionPlataforma: z.number(),
    montoNetoRecibido: z.number(),
    metodoPagoUtilizado: z.string(),
    referenciaProcesador: z.string().nullable(),
    emailComprador: z.string().email().nullable(),
    nombreComprador: z.string().nullable(),
    estado: EstadoTransaccionEnumSchema,
    origenPagoId: z.string().nullable(),
    origenPagoTipo: z.string().nullable(),
    metadata: z.any().nullable(), // Prisma usa Json?, Zod puede usar z.any() o un esquema más específico si conoces la estructura
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type NegocioTransaccion = z.infer<typeof NegocioTransaccionSchema>;

export const GetNegocioTransaccionesInputSchema = z.object({
    negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().positive().optional().default(10),
    // Podríamos añadir filtros por estado, fecha, etc. en el futuro
    // estado: EstadoTransaccionEnumSchema.optional(),
    // fechaDesde: z.date().optional(),
    // fechaHasta: z.date().optional(),
});

export const GetNegocioTransaccionesOutputSchema = z.object({
    transacciones: z.array(NegocioTransaccionSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
});
