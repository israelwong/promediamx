'use server';
import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    obtenerEtiquetasCrmNegocioParamsSchema,
    EtiquetaCrmItemData,
    crearEtiquetaCrmParamsSchema,
    editarEtiquetaCrmParamsSchema,
    eliminarEtiquetaCrmParamsSchema,
    reordenarEtiquetasCrmParamsSchema,
    listarEtiquetasCrmParamsSchema,
    ObtenerEtiquetasCrmResultData,
    EtiquetaCrmData, // Para el tipo de retorno de crear/editar
} from './etiquetaCrm.schemas';
import { z } from 'zod';
// import { revalidatePath } from 'next/cache';


export async function obtenerEtiquetasCrmPorNegocioAction( // Renombrada para claridad
    params: z.infer<typeof obtenerEtiquetasCrmNegocioParamsSchema>
): Promise<ActionResult<EtiquetaCrmItemData[]>> {
    const validation = obtenerEtiquetasCrmNegocioParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;
    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });
        if (!crm) {
            return { success: false, error: 'CRM no encontrado para este negocio.', data: [] };
        }
        const etiquetas = await prisma.etiquetaCRM.findMany({
            where: { crmId: crm.id, status: 'activo' },
            select: { id: true, nombre: true, color: true },
            orderBy: { orden: 'asc' },
        });
        return { success: true, data: etiquetas };
    } catch (error) {
        console.error('Error en obtenerEtiquetasCrmPorNegocioAction:', error);
        return { success: false, error: 'No se pudieron cargar las etiquetas del CRM.' };
    }
}

// Acción para obtener etiquetas y el crmId a partir del negocioId
export async function listarEtiquetasCrmAction( // Renombrada desde tu obtenerEtiquetasCRM
    params: z.infer<typeof listarEtiquetasCrmParamsSchema>
): Promise<ActionResult<ObtenerEtiquetasCrmResultData>> {
    const validation = listarEtiquetasCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Etiqueta: { // Nombre de la relación en el modelo CRM hacia EtiquetaCRM
                    orderBy: { orden: 'asc' },
                },
            },
        });

        if (!crm) {
            return { success: true, data: { crmId: null, etiquetas: [] } };
        }

        // Asegurar que el campo 'orden' tenga un valor para el frontend si es null en BD
        const etiquetasData: EtiquetaCrmData[] = crm.Etiqueta.map((et, index) => ({
            ...et,
            color: et.color ?? null, // Asegurar que color sea null si no está definido
            orden: et.orden ?? index + 1, // Default orden si es null
        }));

        return { success: true, data: { crmId: crm.id, etiquetas: etiquetasData } };
    } catch (error) {
        console.error(`Error en listarEtiquetasCrmAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar las etiquetas.' };
    }
}

// Acción para CREAR una nueva EtiquetaCRM
export async function crearEtiquetaCrmAction(
    params: z.infer<typeof crearEtiquetaCrmParamsSchema>
): Promise<ActionResult<EtiquetaCrmData | null>> {
    const validation = crearEtiquetaCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear la etiqueta.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, nombre, color, status } = validation.data;

    try {
        const ultimaEtiqueta = await prisma.etiquetaCRM.findFirst({
            where: { crmId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimaEtiqueta?.orden ?? 0) + 1;

        const nuevaEtiqueta = await prisma.etiquetaCRM.create({
            data: {
                crmId,
                nombre,
                color: color || null, // Guardar null si no hay color
                status: status || 'activo',
                orden: nuevoOrden,
            },
        });
        // Revalidar path donde se listan las etiquetas
        // Ejemplo: revalidatePath(`/admin/ruta/a/configuracion/etiquetas`);
        return { success: true, data: nuevaEtiqueta as EtiquetaCrmData };
    } catch (error) {
        console.error(`Error al crear etiqueta CRM para CRM ${crmId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `La etiqueta '${nombre}' ya existe para este CRM.`, data: null };
        }
        return { success: false, error: 'No se pudo crear la etiqueta.', data: null };
    }
}

// Acción para EDITAR una EtiquetaCRM existente
export async function editarEtiquetaCrmAction(
    params: z.infer<typeof editarEtiquetaCrmParamsSchema>
): Promise<ActionResult<EtiquetaCrmData | null>> {
    const validation = editarEtiquetaCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar la etiqueta.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { etiquetaId, datos } = validation.data;

    try {
        const etiquetaActualizada = await prisma.etiquetaCRM.update({
            where: { id: etiquetaId },
            data: {
                nombre: datos.nombre,
                color: datos.color || null, // Guardar null si no hay color
                status: datos.status,
                updatedAt: new Date(),
            },
        });
        // Revalidar path
        return { success: true, data: etiquetaActualizada as EtiquetaCrmData };
    } catch (error) {
        console.error(`Error al editar etiqueta CRM ${etiquetaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Etiqueta no encontrada.", data: null };
            if (error.code === 'P2002') return { success: false, error: `El nombre de etiqueta '${datos.nombre}' ya existe.`, data: null };
        }
        return { success: false, error: 'No se pudo actualizar la etiqueta.', data: null };
    }
}

// Acción para ELIMINAR una EtiquetaCRM
export async function eliminarEtiquetaCrmAction(
    params: z.infer<typeof eliminarEtiquetaCrmParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarEtiquetaCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de etiqueta inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { etiquetaId } = validation.data;

    try {
        // En Prisma, si hay una relación muchos-a-muchos con LeadEtiqueta,
        // la eliminación de EtiquetaCRM podría fallar si hay registros en LeadEtiqueta que la referencian,
        // a menos que onDelete esté configurado como Cascade en LeadEtiqueta para el FK hacia EtiquetaCRM.
        // O, puedes eliminar manualmente los registros de LeadEtiqueta primero en una transacción:
        // await prisma.$transaction([
        //   prisma.leadEtiqueta.deleteMany({ where: { etiquetaId: etiquetaId } }),
        //   prisma.etiquetaCRM.delete({ where: { id: etiquetaId } })
        // ]);
        // Por simplicidad, intentamos borrar directamente y manejamos el error de FK constraint.

        const etiquetaEliminada = await prisma.etiquetaCRM.delete({
            where: { id: etiquetaId },
            select: { id: true }
        });
        // Revalidar path
        return { success: true, data: { id: etiquetaEliminada.id } };
    } catch (error) {
        console.error(`Error al eliminar etiqueta CRM ${etiquetaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Etiqueta no encontrada." };
            if (error.code === 'P2003') return { success: false, error: "No se puede eliminar la etiqueta porque está asignada a uno o más Leads. Quítala de los leads primero." };
        }
        return { success: false, error: 'No se pudo eliminar la etiqueta.' };
    }
}

// Acción para REORDENAR EtiquetasCRM
export async function reordenarEtiquetasCrmAction(
    params: z.infer<typeof reordenarEtiquetasCrmParamsSchema>
): Promise<ActionResult<null>> {
    const validation = reordenarEtiquetasCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para reordenar etiquetas.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { crmId, etiquetasOrdenadas } = validation.data;

    if (etiquetasOrdenadas.length === 0) return { success: true, data: null };

    try {
        await prisma.$transaction(
            etiquetasOrdenadas.map((et) =>
                prisma.etiquetaCRM.update({
                    where: { id: et.id, crmId: crmId }, // Asegurar que la etiqueta pertenezca al CRM
                    data: { orden: et.orden },
                })
            )
        );
        // Revalidar path
        return { success: true, data: null };
    } catch (error) {
        console.error(`Error al reordenar etiquetas para CRM ${crmId}:`, error);
        return { success: false, error: 'No se pudo actualizar el orden de las etiquetas.' };
    }
}