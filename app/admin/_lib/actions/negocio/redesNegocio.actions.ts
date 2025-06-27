'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';

import {
    CrearRedSocialNegocioSchema,
    ActualizarRedSocialNegocioSchema,
    ActualizarOrdenRedesSocialesSchema,
} from './redesNegocio.schemas';
import type {
    NegocioRedSocialType,
    CrearRedSocialNegocioType,
    ActualizarRedSocialNegocioType,
    ActualizarOrdenRedesSocialesType,
} from './redesNegocio.schemas';

// Helper para revalidar la ruta correcta
const revalidateNegocioPath = async (negocioId: string) => {
    const negocio = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: { clienteId: true }
    });
    if (negocio?.clienteId) {
        revalidatePath(`/admin/clientes/${negocio.clienteId}/negocios/${negocioId}/editar`);
    }
};

/**
 * Obtiene todas las redes sociales de un negocio.
 */
export async function obtenerRedesSocialesNegocio(negocioId: string): Promise<ActionResult<NegocioRedSocialType[]>> {
    try {
        const redes = await prisma.negocioRedSocial.findMany({
            where: { negocioId: negocioId },
            orderBy: { orden: 'asc' },
        });
        return { success: true, data: redes };
    } catch {
        return { success: false, error: "No se pudieron cargar las redes sociales." };
    }
}

/**
 * Crea una nueva red social para un negocio.
 */
export async function crearRedSocialNegocio(negocioId: string, data: CrearRedSocialNegocioType): Promise<ActionResult<NegocioRedSocialType>> {
    const validation = CrearRedSocialNegocioSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    try {
        const ultimoOrden = await prisma.negocioRedSocial.aggregate({
            _max: { orden: true }, where: { negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaRed = await prisma.negocioRedSocial.create({
            data: { ...validation.data, negocioId, orden: nuevoOrden }
        });

        await revalidateNegocioPath(negocioId);
        return { success: true, data: nuevaRed };
    } catch {
        return { success: false, error: "No se pudo añadir la red social." };
    }
}

/**
 * Actualiza una red social existente.
 */
export async function actualizarRedSocialNegocio(id: string, data: ActualizarRedSocialNegocioType): Promise<ActionResult<NegocioRedSocialType>> {
    const validation = ActualizarRedSocialNegocioSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    try {
        const redActualizada = await prisma.negocioRedSocial.update({
            where: { id },
            data: validation.data,
        });
        await revalidateNegocioPath(redActualizada.negocioId);
        return { success: true, data: redActualizada };
    } catch {
        return { success: false, error: "No se pudo actualizar la red social." };
    }
}

/**
 * Elimina una red social.
 */
export async function eliminarRedSocialNegocio(id: string): Promise<ActionResult<null>> {
    try {
        const red = await prisma.negocioRedSocial.findUnique({ where: { id }, select: { negocioId: true } });
        if (red) {
            await prisma.negocioRedSocial.delete({ where: { id } });
            await revalidateNegocioPath(red.negocioId);
        }
        return { success: true, data: null };
    } catch {
        return { success: false, error: "No se pudo eliminar la red social." };
    }
}

/**
 * Actualiza el orden de las redes sociales.
 */
export async function actualizarOrdenRedesSociales(data: ActualizarOrdenRedesSocialesType): Promise<ActionResult<null>> {
    // --- CORRECCIÓN AQUÍ ---
    // Se utiliza el nombre del schema importado correctamente.
    const validation = ActualizarOrdenRedesSocialesSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos de orden inválidos." };
    }
    if (validation.data.length === 0) return { success: true, data: null };

    try {
        await prisma.$transaction(
            validation.data.map(item =>
                prisma.negocioRedSocial.update({
                    where: { id: item.id },
                    data: { orden: item.orden },
                })
            )
        );
        // Revalidar después de la transacción
        const firstItem = await prisma.negocioRedSocial.findUnique({ where: { id: validation.data[0].id } });
        if (firstItem) await revalidateNegocioPath(firstItem.negocioId);

        return { success: true, data: null };
    } catch {
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}
