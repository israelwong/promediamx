// Ruta: app/admin/_lib/actions/campana/campana.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { crearCampanaParamsSchema, type CampanaConEstadisticas } from './campana.schemas';
import { Prisma } from '@prisma/client';

/**
 * Lista todas las campañas publicitarias y cuenta cuántos leads tiene cada una.
 */
export async function listarCampanasConEstadisticasAction(
    negocioId: string
): Promise<ActionResult<CampanaConEstadisticas[]>> {
    try {
        // Esta consulta es un poco más compleja. Primero, obtenemos todas las campañas.
        // Luego, para cada campaña, contamos los leads que pertenecen al negocio correcto.
        // Esto asegura que no contamos leads de otros negocios si por alguna razón
        // se compartiera un ID de campaña (aunque no debería pasar).
        const campanas = await prisma.campanaPublicitaria.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        leads: {
                            where: { crm: { negocioId: negocioId } }
                        }
                    }
                }
            }
        });

        return { success: true, data: campanas };
    } catch (error) {
        console.error("Error en listarCampanasConEstadisticasAction:", error);
        return { success: false, error: "No se pudieron cargar las campañas." };
    }
}

/**
 * Crea una nueva campaña publicitaria manualmente.
 */
export async function crearCampanaAction(
    params: z.infer<typeof crearCampanaParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = crearCampanaParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    const { id, nombre, negocioId } = validation.data;

    try {
        await prisma.campanaPublicitaria.create({
            data: { id, nombre },
        });

        revalidatePath(`/admin/clientes/.*/negocios/${negocioId}/campanas`, 'page');
        return { success: true, data: true };

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: "Ya existe una campaña con ese ID." };
        }
        console.error("Error en crearCampanaAction:", error);
        return { success: false, error: "No se pudo crear la campaña." };
    }
}
