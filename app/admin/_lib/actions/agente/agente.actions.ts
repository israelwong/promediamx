'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    obtenerAgentesCrmNegocioParamsSchema,
    AgenteBasicoData, // Asegúrate que AgenteBasicoData esté definido aquí o importado
} from './agente.schemas';
import { z } from 'zod';

export async function obtenerAgentesCrmPorNegocioAction( // Renombrada para claridad
    params: z.infer<typeof obtenerAgentesCrmNegocioParamsSchema>
): Promise<ActionResult<AgenteBasicoData[]>> {
    const validation = obtenerAgentesCrmNegocioParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true },
        });
        if (!crm) {
            return { success: false, error: 'CRM no encontrado para este negocio.', data: [] };
        }
        const agentes = await prisma.agente.findMany({
            where: { crmId: crm.id, status: 'activo' },
            select: { id: true, nombre: true },
            orderBy: { nombre: 'asc' },
        });
        const data: AgenteBasicoData[] = agentes.map(agente => ({
            id: agente.id,
            nombre: agente.nombre ?? null, // El schema permite null
        }));
        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerAgentesCrmPorNegocioAction:', error);
        return { success: false, error: 'No se pudieron cargar los agentes del CRM.' };
    }
}