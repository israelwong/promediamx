// app/admin/_lib/actions/crmCampoPersonalizado/crmCampoPersonalizado.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarCamposPersonalizadosCrmParamsSchema,
    ObtenerCamposPersonalizadosCrmResultData,
    CrmCampoPersonalizadoData,
    crearCampoPersonalizadoCrmParamsSchema,
    editarCampoPersonalizadoCrmParamsSchema,
    eliminarCampoPersonalizadoCrmParamsSchema,
    reordenarCamposPersonalizadosCrmParamsSchema,
} from './crmCampoPersonalizado.schemas';
import { z } from 'zod';
// import { revalidatePath } from 'next/cache'; // Para revalidar la UI

// Acción para obtener campos personalizados y el crmId a partir del negocioId
export async function listarCamposPersonalizadosCrmAction(
    params: z.infer<typeof listarCamposPersonalizadosCrmParamsSchema>
): Promise<ActionResult<ObtenerCamposPersonalizadosCrmResultData>> {
    const validation = listarCamposPersonalizadosCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                CampoPersonalizado: { // Relación en modelo CRM hacia CRMCampoPersonalizado
                    orderBy: { orden: 'asc' },
                },
            },
        });

        if (!crm) {
            return { success: true, data: { crmId: null, campos: [] } };
        }

        const camposData: CrmCampoPersonalizadoData[] = crm.CampoPersonalizado.map((cp, index) => ({
            ...cp,
            nombreCampo: cp.nombreCampo ?? '', // Asegurar que nombreCampo no sea null si el schema lo espera string
            orden: cp.orden ?? index + 1, // Default orden si es null
            descripcionParaIA: cp.descripcionParaIA ?? null,
            tipo: cp.tipo as "texto" | "numero" | "fecha" | "booleano", // Cast explícito para cumplir el tipo
        }));

        return { success: true, data: { crmId: crm.id, campos: camposData } };
    } catch (error) {
        console.error(`Error en listarCamposPersonalizadosCrmAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar los campos personalizados.' };
    }
}

// Acción para CREAR un nuevo CRMCampoPersonalizado
export async function crearCampoPersonalizadoCrmAction(
    params: z.infer<typeof crearCampoPersonalizadoCrmParamsSchema>
): Promise<ActionResult<CrmCampoPersonalizadoData | null>> {
    const validation = crearCampoPersonalizadoCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear el campo.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, nombre, nombreCampo, tipo, requerido, status } = validation.data;

    try {
        const ultimoCampo = await prisma.cRMCampoPersonalizado.findFirst({
            where: { crmId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoCampo?.orden ?? 0) + 1;

        const nuevoCampo = await prisma.cRMCampoPersonalizado.create({
            data: {
                crmId,
                nombre,
                nombreCampo,
                tipo,
                requerido: requerido ?? false,
                status: status || 'activo',
                orden: nuevoOrden,
                // descripcionParaIA: descripcionParaIA,
            },
        });
        // TODO: Revalidar path apropiado
        return { success: true, data: nuevoCampo as CrmCampoPersonalizadoData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // P2002 puede ser por 'nombre' o 'nombreCampo' si son unique en el crmId
            const target = error.meta?.target as string[];
            if (target?.includes('nombre')) {
                return { success: false, error: `El nombre de campo '${nombre}' ya existe para este CRM.`, data: null };
            }
            if (target?.includes('nombreCampo')) {
                return { success: false, error: `El nombre interno de campo '${nombreCampo}' ya existe para este CRM.`, data: null };
            }
        }
        return { success: false, error: 'No se pudo crear el campo personalizado.', data: null };
    }
}

// Acción para EDITAR un CRMCampoPersonalizado existente
export async function editarCampoPersonalizadoCrmAction(
    params: z.infer<typeof editarCampoPersonalizadoCrmParamsSchema>
): Promise<ActionResult<CrmCampoPersonalizadoData | null>> {
    const validation = editarCampoPersonalizadoCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar el campo.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { campoId, datos } = validation.data;

    try {
        const campoExistente = await prisma.cRMCampoPersonalizado.findUnique({ where: { id: campoId } });
        if (!campoExistente) {
            return { success: false, error: "Campo personalizado no encontrado.", data: null };
        }

        const campoActualizado = await prisma.cRMCampoPersonalizado.update({
            where: { id: campoId },
            data: {
                nombre: datos.nombre,
                // nombreCampo y tipo no se editan generalmente después de la creación
                requerido: datos.requerido,
                status: datos.status,
                // descripcionParaIA: datos.descripcionParaIA,
                updatedAt: new Date(),
            },
        });
        // TODO: Revalidar path
        return { success: true, data: campoActualizado as CrmCampoPersonalizadoData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Campo no encontrado.", data: null };
            if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('nombre')) return { success: false, error: `El nombre de campo '${datos.nombre}' ya existe.`, data: null };
        }
        return { success: false, error: 'No se pudo actualizar el campo personalizado.', data: null };
    }
}

// Acción para ELIMINAR un CRMCampoPersonalizado
export async function eliminarCampoPersonalizadoCrmAction(
    params: z.infer<typeof eliminarCampoPersonalizadoCrmParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarCampoPersonalizadoCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de campo inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { campoId } = validation.data;

    try {
        // Verificar si el campo está siendo usado por TareaCampoPersonalizado
        const tareasAsociadas = await prisma.tareaCampoPersonalizado.count({
            where: { crmCampoPersonalizadoId: campoId }
        });

        if (tareasAsociadas > 0) {
            return { success: false, error: `No se puede eliminar el campo porque está siendo utilizado en ${tareasAsociadas} tarea(s). Desasócialo primero.` };
        }

        const campoEliminado = await prisma.cRMCampoPersonalizado.delete({ where: { id: campoId }, select: { id: true } });
        // TODO: Revalidar path
        return { success: true, data: { id: campoEliminado.id } };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Campo no encontrado." };
        }
        return { success: false, error: 'No se pudo eliminar el campo personalizado.' };
    }
}

// Acción para REORDENAR CRMCampoPersonalizado
export async function reordenarCamposPersonalizadosCrmAction(
    params: z.infer<typeof reordenarCamposPersonalizadosCrmParamsSchema>
): Promise<ActionResult<null>> {
    const validation = reordenarCamposPersonalizadosCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para reordenar.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { crmId, camposOrdenados } = validation.data;

    if (camposOrdenados.length === 0) return { success: true, data: null };

    try {
        await prisma.$transaction(
            camposOrdenados.map((campo) =>
                prisma.cRMCampoPersonalizado.update({
                    where: { id: campo.id, crmId: crmId },
                    data: { orden: campo.orden },
                })
            )
        );
        // TODO: Revalidar path
        return { success: true, data: null };
    } catch (error) {
        console.error(`Error al reordenar campos para CRM ${crmId}:`, error);
        return { success: false, error: 'No se pudo actualizar el orden de los campos.' };
    }
}