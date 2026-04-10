// @/app/admin/_lib/actions/negocioPagos/negocioTransaccion.actions.ts
'use server';
import { z } from 'zod';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma para WhereInput
import prisma from '@/app/admin/_lib/prismaClient'; // Importar instancia de Prisma
import { format } from 'date-fns'; // Para formatear fechas en la descripción
import { es } from 'date-fns/locale'; // Para formato en español

import {
    GetNegocioTransaccionesInputSchema,
    type NegocioTransaccion, // Importamos el tipo individual también
    NegocioTransaccionSchema,
} from './negocioTransaccion.schemas';
import { GetNegocioTransaccionesInput, GetNegocioTransaccionesOutputDataSchema } from './negocioTransaccion.schemas';
import { ActionResult } from '@/app/admin/_lib/types';


// Helper para generar la descripción del periodo
function generarDescripcionPeriodo(filtros?: GetNegocioTransaccionesInput['filtros']): string {
    if (!filtros || (!filtros.fechaInicio && !filtros.fechaFin)) {
        return "Todas las Transacciones"; // O un default como "Últimas Transacciones"
    }
    if (filtros.fechaInicio && !filtros.fechaFin) {
        return `Desde ${format(filtros.fechaInicio, 'dd MMM yyyy', { locale: es })}`;
    }
    if (!filtros.fechaInicio && filtros.fechaFin) {
        return `Hasta ${format(filtros.fechaFin, 'dd MMM yyyy', { locale: es })}`;
    }
    if (filtros.fechaInicio && filtros.fechaFin) {
        if (format(filtros.fechaInicio, 'yyyyMMdd') === format(filtros.fechaFin, 'yyyyMMdd')) {
            return `Del ${format(filtros.fechaInicio, 'dd MMM yyyy', { locale: es })}`;
        }
        return `Del ${format(filtros.fechaInicio, 'dd MMM yyyy', { locale: es })} al ${format(filtros.fechaFin, 'dd MMM yyyy', { locale: es })}`;
    }
    return "Periodo Personalizado";
}


export async function getNegocioTransaccionesAction(
    input: z.infer<typeof GetNegocioTransaccionesInputSchema>
): Promise<ActionResult<z.infer<typeof GetNegocioTransaccionesOutputDataSchema>>> {
    try {
        const validatedInput = GetNegocioTransaccionesInputSchema.safeParse(input);
        if (!validatedInput.success) {
            console.error("Input inválido en getNegocioTransaccionesAction:", validatedInput.error.flatten());
            return { success: false, error: 'Input inválido.' };
        }

        const { negocioId, page, pageSize, filtros } = validatedInput.data;

        const skip = (page - 1) * pageSize;

        // --- Construir Cláusula WHERE dinámicamente ---
        const whereClause: Prisma.NegocioTransaccionWhereInput = {
            negocioId: negocioId,
        };

        if (filtros?.fechaInicio || filtros?.fechaFin) {
            whereClause.fechaTransaccion = {};
            if (filtros.fechaInicio) {
                whereClause.fechaTransaccion.gte = filtros.fechaInicio;
            }
            if (filtros.fechaFin) {
                // Asegurarse de que la fechaFin incluya todo el día
                const finDeDia = new Date(filtros.fechaFin);
                finDeDia.setHours(23, 59, 59, 999);
                whereClause.fechaTransaccion.lte = finDeDia;
            }
        }
        // Aquí podrías añadir más filtros (estado, metodoPago, etc.) al whereClause
        // if (filtros?.estado) {
        //    whereClause.estado = filtros.estado;
        // }

        const [transaccionesFromDb, totalCount, agregaciones] = await prisma.$transaction([
            prisma.negocioTransaccion.findMany({
                where: whereClause,
                orderBy: {
                    fechaTransaccion: 'desc',
                },
                skip: skip,
                take: pageSize,
            }),
            prisma.negocioTransaccion.count({
                where: whereClause,
            }),
            prisma.negocioTransaccion.aggregate({ // Para calcular la suma
                _sum: {
                    montoBruto: true,
                },
                where: whereClause,
            }),
        ]);

        const sumaPeriodo = agregaciones._sum.montoBruto || 0;
        const descripcionPeriodo = generarDescripcionPeriodo(filtros);

        const parsedTransacciones: NegocioTransaccion[] = [];
        for (const tx of transaccionesFromDb) {
            const parsedTx = NegocioTransaccionSchema.safeParse(tx);
            if (parsedTx.success) {
                parsedTransacciones.push(parsedTx.data);
            } else {
                console.warn("Transacción con formato inesperado omitida:", parsedTx.error.flatten().fieldErrors, tx.id);
            }
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        const outputData = {
            transacciones: parsedTransacciones,
            totalCount,
            page,
            pageSize,
            totalPages,
            sumaPeriodo,
            descripcionPeriodo,
        };

        // Validar la salida completa con el schema actualizado
        const validatedOutput = GetNegocioTransaccionesOutputDataSchema.safeParse(outputData);
        if (!validatedOutput.success) {
            console.error("Error al parsear salida de transacciones:", validatedOutput.error.flatten());
            return { success: false, error: "Error interno al procesar la salida de transacciones." };
        }

        return { success: true, data: validatedOutput.data };

    } catch (error) {
        console.error('Error en getNegocioTransaccionesAction:', error);
        return { success: false, error: 'Error al obtener las transacciones del negocio.' };
    }
}
