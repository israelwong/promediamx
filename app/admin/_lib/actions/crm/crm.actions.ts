/* Ruta: app/admin/_lib/actions/crm/crm.actions.ts
*/
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
    obtenerEstadoManyChatParamsSchema,
    actualizarManyChatApiKeyParamsSchema
} from './crm.schemas';

/**
 * Obtiene el estado de la configuración de la API de ManyChat para un negocio.
 */
export async function obtenerEstadoManyChatAction(
    params: z.infer<typeof obtenerEstadoManyChatParamsSchema>
): Promise<ActionResult<{ configurado: boolean }>> {
    const validation = obtenerEstadoManyChatParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: validation.data.negocioId },
            select: { manychatApiKey: true },
        });

        const configurado = !!crm?.manychatApiKey;
        return { success: true, data: { configurado } };
    } catch (error) {
        console.error("Error en obtenerEstadoManyChatAction:", error);
        return { success: false, error: "No se pudo verificar la configuración." };
    }
}


/**
 * ✅ CORREGIDO: La acción ahora usa el esquema actualizado que incluye clienteId.
 */
export async function actualizarManyChatApiKeyAction(
    params: z.infer<typeof actualizarManyChatApiKeyParamsSchema>
): Promise<ActionResult<{ success: boolean }>> {
    const validation = actualizarManyChatApiKeyParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    const { clienteId, negocioId, apiKey } = validation.data;

    try {
        await prisma.cRM.update({
            where: { negocioId: negocioId },
            data: { manychatApiKey: apiKey },
        });

        const path = `/admin/clientes/${clienteId}/negocios/${negocioId}/configuracion`;
        revalidatePath(path, 'page');

        return { success: true, data: { success: true } };
    } catch (error) {
        console.error("Error en actualizarManyChatApiKeyAction:", error);
        return { success: false, error: "No se pudo guardar la API Key." };
    }
}