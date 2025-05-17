// @/app/admin/_lib/actions/negocio/redesNegocio.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, NegocioRedSocial as PrismaNegocioRedSocial } from '@prisma/client'; // Usar el tipo de Prisma
import { revalidatePath } from 'next/cache';

import {
    // NegocioRedSocialSchema, // Para validar la salida si es necesario
    // type NegocioRedSocialType, // Para tipar la respuesta
    CrearRedSocialNegocioDataSchema,
    type CrearRedSocialNegocioData,
    ActualizarRedSocialNegocioDataSchema,
    type ActualizarRedSocialNegocioData,
    ActualizarOrdenRedesSocialesDataSchema,
    type ActualizarOrdenRedesSocialesData
} from './redesNegocio.schemas';

// Helper para la ruta de revalidación
const getPathToNegocioEdicion = (clienteId: string | null | undefined, negocioId: string) => {
    if (clienteId) {
        return `/admin/clientes/${clienteId}/negocios/${negocioId}/editar`;
    }
    return `/admin/negocios/${negocioId}/editar`; // Ajusta si es necesario
};

export async function obtenerRedesSocialesNegocio(negocioId: string): Promise<PrismaNegocioRedSocial[]> {
    // Se devuelve el tipo Prisma directamente, el componente lo mapeará si es necesario.
    // No es estrictamente necesario validar la salida con Zod aquí, pero se podría.
    if (!negocioId) return [];
    try {
        const redes = await prisma.negocioRedSocial.findMany({
            where: { negocioId: negocioId },
            orderBy: { orden: 'asc' },
        });
        return redes;
    } catch (error) {
        console.error(`Error fetching redes sociales for negocio ${negocioId}:`, error);
        // En un escenario real, podrías querer que esto devuelva ActionResult para manejar el error en el cliente
        // pero el componente actual espera un array o null. Por consistencia, se podría cambiar.
        // Por ahora, para minimizar cambios en el componente, devolvemos array vacío en error.
        return [];
    }
}

export async function crearRedSocialNegocio(
    negocioId: string,
    data: CrearRedSocialNegocioData // Usamos el tipo Zod inferido
): Promise<ActionResult<PrismaNegocioRedSocial>> { // Devolvemos el tipo Prisma
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    const validationResult = CrearRedSocialNegocioDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombreRed, url, icono } = validationResult.data;

    try {
        const ultimoOrden = await prisma.negocioRedSocial.aggregate({
            _max: { orden: true }, where: { negocioId: negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaRed = await prisma.negocioRedSocial.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombreRed: nombreRed, // Ya validado y trim() no es necesario si el schema no lo permite
                url: url,
                icono: icono || null,
                orden: nuevoOrden,
            }
        });

        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { clienteId: true } });
        revalidatePath(getPathToNegocioEdicion(negocio?.clienteId, negocioId));

        return { success: true, data: nuevaRed };

    } catch (error) {
        console.error(`Error creando red social para negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `Ya existe una entrada para "${nombreRed}" en este negocio.` };
        }
        return { success: false, error: "No se pudo añadir la red social." };
    }
}

export async function actualizarRedSocialNegocio(
    id: string, // ID de NegocioRedSocial
    data: ActualizarRedSocialNegocioData // Usamos el tipo Zod inferido
): Promise<ActionResult<PrismaNegocioRedSocial>> {
    if (!id) return { success: false, error: "Falta ID de la red social." };

    const validationResult = ActualizarRedSocialNegocioDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }

    const dataToUpdate = validationResult.data;

    if (Object.keys(dataToUpdate).length === 0) {
        try {
            const redActual = await prisma.negocioRedSocial.findUnique({ where: { id } });
            if (!redActual) return { success: false, error: "Red social no encontrada." };
            return { success: true, data: redActual };
        } catch {
            return { success: false, error: "Error al obtener red social." }
        }
    }

    try {
        const redActualizada = await prisma.negocioRedSocial.update({
            where: { id: id },
            data: dataToUpdate, // Zod ya se aseguró que los campos son correctos
        });

        const negocio = await prisma.negocio.findUnique({ where: { id: redActualizada.negocioId }, select: { clienteId: true } });
        revalidatePath(getPathToNegocioEdicion(negocio?.clienteId, redActualizada.negocioId));

        return { success: true, data: redActualizada };

    } catch (error) {
        console.error(`Error actualizando red social ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && dataToUpdate.nombreRed) return { success: false, error: `Ya existe otra entrada para "${dataToUpdate.nombreRed}" en este negocio.` };
            if (error.code === 'P2025') return { success: false, error: "Red social no encontrada para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar la red social." };
    }
}

export async function eliminarRedSocialNegocio(id: string): Promise<ActionResult<void>> {
    if (!id) return { success: false, error: "Falta ID de la red social." };
    try {
        const red = await prisma.negocioRedSocial.findUnique({
            where: { id: id },
            select: { negocioId: true, negocio: { select: { clienteId: true } } }
        });

        if (!red) {
            // Si no se encuentra, podría considerarse un éxito silencioso o un error leve.
            // El componente actual no parece manejar un error aquí si la red ya no existe.
            console.warn(`Intento de eliminar red social ${id} que no fue encontrada.`);
            return { success: true }; // Ya no existe, operación "exitosa" en ese sentido
        }

        await prisma.negocioRedSocial.delete({ where: { id: id } });

        revalidatePath(getPathToNegocioEdicion(red.negocio?.clienteId, red.negocioId));
        return { success: true };

    } catch (error) {
        console.error(`Error eliminando red social ${id}:`, error);
        // P2025: "An operation failed because it depends on one or more records that were required but not found."
        // Esto puede ocurrir si se intenta eliminar algo que ya no existe.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true }; // Ya fue eliminada, se considera éxito.
        }
        return { success: false, error: "No se pudo eliminar la red social." };
    }
}

export async function actualizarOrdenRedesSociales(
    // negocioId: string, // El negocioId se infiere del primer item para revalidación.
    // clienteId: string | null | undefined, // Se infiere para revalidación.
    data: ActualizarOrdenRedesSocialesData // Usamos el tipo Zod inferido
): Promise<ActionResult<void>> {
    const validationResult = ActualizarOrdenRedesSocialesDataSchema.safeParse(data);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).filter(([value]) => value !== undefined)
            ) as Record<string, string[]>
        };
    }

    const ordenesValidadas = validationResult.data;
    if (ordenesValidadas.length === 0) {
        return { success: true }; // Nada que actualizar
    }

    try {
        await prisma.$transaction(
            ordenesValidadas.map((item) =>
                prisma.negocioRedSocial.update({
                    where: { id: item.id }, // Asumimos que el ID es suficiente y pertenece al negocio correcto (riesgo si no se valida)
                    data: { orden: item.orden },
                })
            )
        );

        // Obtener IDs para revalidación desde el primer ítem
        const firstItemForRevalidation = await prisma.negocioRedSocial.findUnique({
            where: { id: ordenesValidadas[0].id },
            select: { negocioId: true, negocio: { select: { clienteId: true } } }
        });

        if (firstItemForRevalidation) {
            revalidatePath(getPathToNegocioEdicion(firstItemForRevalidation.negocio?.clienteId, firstItemForRevalidation.negocioId));
        }

        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de redes sociales:", error);
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}