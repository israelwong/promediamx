// app/admin/_lib/actions/canalCrm/canalCrm.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarCanalesCrmParamsSchema,
    ObtenerCanalesCrmResultData,
    crearCanalCrmParamsSchema,
    CanalCrmData,
    editarCanalCrmParamsSchema,
    eliminarCanalCrmParamsSchema,
    reordenarCanalesCrmParamsSchema
} from './canalCrm.schemas';
import { z } from 'zod';
// import { revalidatePath } from 'next/cache'; // Para revalidar la UI

// Acción para obtener canales y el crmId a partir del negocioId
export async function listarCanalesCrmAction(
    params: z.infer<typeof listarCanalesCrmParamsSchema>
): Promise<ActionResult<ObtenerCanalesCrmResultData>> {
    const validation = listarCanalesCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Canal: { // Nombre de la relación en el modelo CRM hacia CanalCRM
                    orderBy: { orden: 'asc' }, // O por nombre si 'orden' no existe o no es prioritario
                },
            },
        });

        if (!crm) {
            return { success: true, data: { crmId: null, canales: [] } }; // CRM no existe, no hay canales
        }

        // Asegurar que los datos de canal se ajusten a CanalCrmData
        const canalesData: CanalCrmData[] = crm.Canal.map(canal => ({
            ...canal, // Incluye id, crmId, nombre, status, orden, createdAt, updatedAt
            orden: canal.orden ?? null, // Asegurar que orden sea null si no está definido
        }));


        return { success: true, data: { crmId: crm.id, canales: canalesData } };
    } catch (error) {
        console.error(`Error en listarCanalesCrmAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar los canales.' };
    }
}

// Acción para CREAR un nuevo CanalCRM
export async function crearCanalCrmAction(
    params: z.infer<typeof crearCanalCrmParamsSchema>
): Promise<ActionResult<CanalCrmData | null>> {
    const validation = crearCanalCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear el canal.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, nombre, status } = validation.data;

    try {
        // Calcular el siguiente 'orden'
        const ultimoCanal = await prisma.canalCRM.findFirst({
            where: { crmId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoCanal?.orden ?? 0) + 1;

        const nuevoCanal = await prisma.canalCRM.create({
            data: {
                crmId,
                nombre,
                status: status || 'activo', // Default si no se provee
                orden: nuevoOrden,
            },
        });

        // Revalidar el path donde se muestra la lista de canales
        // Necesitarás el clienteId y negocioId para construir este path.
        // Podrías pasarlos a la acción o tener una función helper para obtenerlos si es posible.
        // Ejemplo: revalidatePath(`/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/canales`);

        return { success: true, data: nuevoCanal as CanalCrmData }; // Cast si la selección coincide
    } catch (error) {
        console.error(`Error al crear canal CRM para CRM ${crmId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El canal '${nombre}' ya existe para este CRM.`, data: null };
        }
        return { success: false, error: 'No se pudo crear el canal.', data: null };
    }
}

// Acción para EDITAR un CanalCRM existente
export async function editarCanalCrmAction(
    params: z.infer<typeof editarCanalCrmParamsSchema>
): Promise<ActionResult<CanalCrmData | null>> {
    const validation = editarCanalCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar el canal.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { canalId, datos } = validation.data;

    try {
        const canalActualizado = await prisma.canalCRM.update({
            where: { id: canalId },
            data: {
                nombre: datos.nombre,
                status: datos.status,
                updatedAt: new Date(),
            },
        });

        // Revalidar path
        return { success: true, data: canalActualizado as CanalCrmData };
    } catch (error) {
        console.error(`Error al editar canal CRM ${canalId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Canal no encontrado.", data: null };
            if (error.code === 'P2002') return { success: false, error: `El nombre de canal '${datos.nombre}' ya existe.`, data: null };
        }
        return { success: false, error: 'No se pudo actualizar el canal.', data: null };
    }
}

// Acción para ELIMINAR un CanalCRM
export async function eliminarCanalCrmAction(
    params: z.infer<typeof eliminarCanalCrmParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarCanalCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de canal inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { canalId } = validation.data;

    try {
        // Antes de eliminar, verificar si hay Leads asociados.
        // Prisma por defecto restringirá si hay FK constraints.
        // Puedes desasociar Leads o advertir al usuario.
        const leadsAsociados = await prisma.lead.count({
            where: { canalId: canalId }
        });

        if (leadsAsociados > 0) {
            return { success: false, error: `No se puede eliminar el canal porque tiene ${leadsAsociados} lead(s) asociado(s). Reasigna o elimina esos leads primero.` };
        }

        const canalEliminado = await prisma.canalCRM.delete({
            where: { id: canalId },
            select: { id: true } // Solo necesitamos el ID para confirmar
        });

        // Revalidar path
        return { success: true, data: { id: canalEliminado.id } };
    } catch (error) {
        console.error(`Error al eliminar canal CRM ${canalId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Canal no encontrado." };
        }
        // P2003: Foreign key constraint failed (si Leads.canalId no es nullable y no se manejó antes)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return { success: false, error: "No se puede eliminar el canal porque tiene Leads asociados." };
        }
        return { success: false, error: 'No se pudo eliminar el canal.' };
    }
}

export async function reordenarCanalesCrmAction(
    params: z.infer<typeof reordenarCanalesCrmParamsSchema>
): Promise<ActionResult<null>> { // No necesita devolver datos, solo éxito/error
    const validation = reordenarCanalesCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para reordenar los canales.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { crmId, canalesOrdenados } = validation.data;

    if (canalesOrdenados.length === 0) {
        return { success: true, data: null }; // Nada que actualizar
    }

    try {
        // Actualizar el orden de cada canal en una transacción
        await prisma.$transaction(
            canalesOrdenados.map((canal) =>
                prisma.canalCRM.update({
                    where: {
                        id: canal.id,
                        crmId: crmId, // Importante: asegurar que el canal pertenezca al CRM correcto
                    },
                    data: { orden: canal.orden },
                })
            )
        );

        // Revalidar el path donde se muestra la lista de canales.
        // Necesitarás construir el path completo, ej. si tienes clienteId y negocioId disponibles en la sesión
        // o si los pasas a la acción. Por ahora, un ejemplo genérico:
        // revalidatePath(`/admin/ruta/a/configuracion/canales`); 
        // Es mejor que el componente que llama a esta acción gestione la revalidación si el path es muy dinámico.

        return { success: true, data: null };
    } catch (error) {
        console.error(`Error al reordenar canales CRM para CRM ${crmId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Uno o más canales no fueron encontrados o no pertenecen al CRM especificado." };
        }
        return { success: false, error: 'No se pudo actualizar el orden de los canales.' };
    }
}