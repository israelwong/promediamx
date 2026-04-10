
// app/admin/_lib/crmCanal.actions.ts
'use server';
import prisma from '../prismaClient'; // Ajusta ruta
import { CanalCRM } from '../types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Tipo de Retorno para obtenerCanalesCRM ---
interface ObtenerCanalesResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        canales: CanalCRM[];
    } | null;
    error?: string;
}

/**
 * Obtiene el ID del CRM asociado a un negocio y todos sus canales.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y la lista de canales.
 */
export async function obtenerCanalesCRM(negocioId: string): Promise<ObtenerCanalesResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        // Obtener el crmId y los canales en una consulta
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true, // ID del CRM
                        Canal: { // Canales asociados al CRM
                            orderBy: { nombre: 'asc' }, // Ordenar alfabéticamente
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;
        const canales = (negocioConCRM?.CRM?.Canal ?? []) as CanalCRM[];

        return {
            success: true,
            data: {
                crmId: crmId,
                canales: canales
            }
        };

    } catch (error) {
        console.error(`Error fetching canales for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los canales.' };
    }
}

/**
 * Crea un nuevo Canal para un CRM específico.
 * @param data - Datos del canal a crear (crmId, nombre).
 * @returns Objeto con el resultado de la operación y el canal creado si tuvo éxito.
 */
export async function crearCanalCRM(
    data: Pick<CanalCRM, 'crmId' | 'nombre'>
): Promise<{ success: boolean; data?: CanalCRM; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim()) {
            return { success: false, error: "crmId y nombre son requeridos." };
        }

        // Crear canal
        const newCanal = await prisma.canalCRM.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                status: 'activo', // Status por defecto
                // 'orden' se podría asignar si se implementa ordenamiento
            },
        });
        return { success: true, data: newCanal as CanalCRM };
    } catch (error) {
        console.error('Error creating canal:', error);
        // Manejar error de unicidad (asume índice unique(crmId, nombre))
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear canal." };
    }
}

/**
 * Edita un Canal existente (nombre y status).
 * @param id - ID del canal a editar.
 * @param data - Datos a actualizar (nombre, status).
 * @returns Objeto con el resultado de la operación y el canal actualizado si tuvo éxito.
 */
export async function editarCanalCRM(
    id: string,
    data: Partial<Pick<CanalCRM, 'nombre' | 'status'>>
): Promise<{ success: boolean; data?: CanalCRM; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de canal no proporcionado." };

        const dataToUpdate: Prisma.CanalCRMUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        // Actualizar canal
        const updatedCanal = await prisma.canalCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCanal as CanalCRM };
    } catch (error) {
        console.error(`Error updating canal ${id}:`, error);
        // Manejar error de unicidad si se edita el nombre
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if (Array.isArray(error.meta?.target) && (error.meta.target as string[]).includes('nombre')) {
                return { success: false, error: `El nombre de canal '${data.nombre}' ya existe para este CRM.` };
            }
            return { success: false, error: `Ya existe un canal con un nombre similar.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar canal." };
    }
}

/**
 * Elimina un Canal por su ID.
 * @param id - ID del canal a eliminar.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function eliminarCanalCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de canal no proporcionado." };

        // Asumiendo onDelete: SetNull en Lead.canalId
        await prisma.canalCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting canal ${id}:`, error);
        // Manejar error si hay Leads asociados y la FK no permite SetNull
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el canal porque tiene Leads asociados." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar canal." };
    }
}
