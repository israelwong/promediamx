// @/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas.ts
import { z } from 'zod';

// Coincide con el enum de Prisma, pero lo definimos aquí para desacoplar si es necesario
// export const EstadoTransaccionEnumSchema = z.enum([
//     'PENDIENTE',
//     'COMPLETADA',
//     'FALLIDA',
//     'REEMBOLSADA',
//     'PARCIALMENTE_REEMBOLSADA',
//     'EN_PROCESO',
//     'CANCELADA',
// ]);
// export type EstadoTransaccionEnum = z.infer<typeof EstadoTransaccionEnumSchema>;

// export const NegocioTransaccionSchema = z.object({
//     id: z.string(),
//     negocioId: z.string(),
//     fechaTransaccion: z.date(),
//     concepto: z.string(),
//     montoBruto: z.number(),
//     moneda: z.string(),
//     comisionProcesadorPago: z.number(),
//     comisionPlataforma: z.number(),
//     montoNetoRecibido: z.number(),
//     metodoPagoUtilizado: z.string(),
//     referenciaProcesador: z.string().nullable(),
//     emailComprador: z.string().email().nullable(),
//     nombreComprador: z.string().nullable(),
//     estado: EstadoTransaccionEnumSchema,
//     origenPagoId: z.string().nullable(),
//     origenPagoTipo: z.string().nullable(),
//     metadata: z.any().nullable(), // Prisma usa Json?, Zod puede usar z.any() o un esquema más específico si conoces la estructura
//     createdAt: z.date(),
//     updatedAt: z.date(),
// });

// export type NegocioTransaccion = z.infer<typeof NegocioTransaccionSchema>;

// export const GetNegocioTransaccionesInputSchema = z.object({
//     negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
//     page: z.number().int().positive().optional().default(1),
//     pageSize: z.number().int().positive().optional().default(10),
//     // Podríamos añadir filtros por estado, fecha, etc. en el futuro
//     // estado: EstadoTransaccionEnumSchema.optional(),
//     // fechaDesde: z.date().optional(),
//     // fechaHasta: z.date().optional(),
// });

// export const GetNegocioTransaccionesOutputSchema = z.object({
//     transacciones: z.array(NegocioTransaccionSchema),
//     totalCount: z.number().int(),
//     page: z.number().int(),
//     pageSize: z.number().int(),
//     totalPages: z.number().int(),
// });



// @/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas.ts
// import { z } from 'zod';

// Esquema base para una transacción individual (sin cambios mayores aquí)
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
    emailComprador: z.string().nullable(),
    nombreComprador: z.string().nullable(),
    estado: z.enum([ // Asegúrate que este enum coincida con tu Prisma Enum EstadoTransaccion
        "PENDIENTE",
        "COMPLETADA",
        "FALLIDA",
        "REEMBOLSADA",
        "PARCIALMENTE_REEMBOLSADA",
        "EN_PROCESO",
        "CANCELADA"
    ]),
    origenPagoId: z.string().nullable(),
    origenPagoTipo: z.string().nullable(),
    metadata: z.any().nullable(), // O un schema más específico para metadata si lo tienes
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioTransaccion = z.infer<typeof NegocioTransaccionSchema>;

// Tipo Enum para el estado (para usar en el frontend si es necesario)
export type EstadoTransaccionEnum = z.infer<typeof NegocioTransaccionSchema.shape.estado>;


// Esquema para la ENTRADA de la acción getNegocioTransaccionesAction
export const GetNegocioTransaccionesInputSchema = z.object({
    negocioId: z.string().cuid({ message: "ID de negocio inválido." }),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().default(10),
    filtros: z.object({
        fechaInicio: z.date().optional(),
        fechaFin: z.date().optional(),
        // Aquí podrías añadir más filtros en el futuro, ej: estado, metodoPago
    }).optional(),
});
export type GetNegocioTransaccionesInput = z.infer<typeof GetNegocioTransaccionesInputSchema>;


// Esquema para la SALIDA (el campo 'data') de la acción getNegocioTransaccionesAction
export const GetNegocioTransaccionesOutputDataSchema = z.object({
    transacciones: z.array(NegocioTransaccionSchema),
    totalCount: z.number().int(), // Total de transacciones que coinciden con el filtro (no solo en la página actual)
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
    sumaPeriodo: z.number().default(0), // Suma de montoBruto para el periodo filtrado
    descripcionPeriodo: z.string(),   // Descripción del periodo filtrado
});
export type GetNegocioTransaccionesOutputData = z.infer<typeof GetNegocioTransaccionesOutputDataSchema>;

// Esquema para la respuesta completa de la acción (ActionResult)
export const GetNegocioTransaccionesOutputSchema = z.object({ // Este es el que envuelve ActionResult
    success: z.boolean(),
    data: GetNegocioTransaccionesOutputDataSchema.optional(),
    error: z.string().optional(),
    issues: z.any().optional(), // Para errores de validación de Zod
});
