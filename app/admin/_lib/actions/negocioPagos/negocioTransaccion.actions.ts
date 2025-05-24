// @/app/admin/_lib/actions/negocioPagos/negocioTransaccion.actions.ts
'use server';
import { z } from 'zod';

import prisma from '@/app/admin/_lib/prismaClient';
import {
    GetNegocioTransaccionesInputSchema,
    GetNegocioTransaccionesOutputSchema,
    type NegocioTransaccion, // Importamos el tipo individual también
    NegocioTransaccionSchema,
} from './negocioTransaccion.schemas';
import { ActionResult } from '@/app/admin/_lib/types';

export async function getNegocioTransaccionesAction(
    input: z.infer<typeof GetNegocioTransaccionesInputSchema>
): Promise<ActionResult<z.infer<typeof GetNegocioTransaccionesOutputSchema>>> {
    try {
        const validatedInput = GetNegocioTransaccionesInputSchema.safeParse(input);
        if (!validatedInput.success) {
            return { success: false, error: 'Input inválido.' };
        }

        const { negocioId, page, pageSize } = validatedInput.data;

        const skip = (page - 1) * pageSize;

        const [transacciones, totalCount] = await prisma.$transaction([
            prisma.negocioTransaccion.findMany({
                where: {
                    negocioId: negocioId,
                    // Aquí podrías añadir más filtros si los implementas en el input schema
                },
                orderBy: {
                    fechaTransaccion: 'desc', // Mostrar las más recientes primero
                },
                skip: skip,
                take: pageSize,
            }),
            prisma.negocioTransaccion.count({
                where: {
                    negocioId: negocioId,
                    // Mismos filtros que en findMany
                },
            }),
        ]);

        // Validar cada transacción individualmente (buena práctica aunque vengan de Prisma)
        const parsedTransacciones: NegocioTransaccion[] = [];
        for (const tx of transacciones) {
            const parsedTx = NegocioTransaccionSchema.safeParse(tx);
            if (parsedTx.success) {
                parsedTransacciones.push(parsedTx.data);
            } else {
                console.warn("Transacción con formato inesperado omitida:", parsedTx.error, tx.id);
                // Podrías decidir si incluirla parcialmente o no. Por ahora la omitimos.
            }
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        const outputData = {
            transacciones: parsedTransacciones,
            totalCount,
            page,
            pageSize,
            totalPages,
        };

        // Validar la salida completa
        const validatedOutput = GetNegocioTransaccionesOutputSchema.safeParse(outputData);
        if (!validatedOutput.success) {
            console.error("Error al parsear salida de transacciones:", validatedOutput.error.issues);
            return { success: false, error: "Error interno al procesar la salida de transacciones." };
        }

        return { success: true, data: validatedOutput.data };

    } catch (error) {
        console.error('Error en getNegocioTransaccionesAction:', error);
        return { success: false, error: 'Error al obtener las transacciones del negocio.' };
    }
}
