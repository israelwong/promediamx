// Ejemplo en: @/app/admin/_lib/crmCanal.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { CanalCRM } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Canales para un CRM (ordenados por nombre) ---
export async function obtenerCanalesCRM(crmId: string): Promise<CanalCRM[]> {
    if (!crmId) return [];
    try {
        const canales = await prisma.canalCRM.findMany({
            where: { crmId: crmId },
            orderBy: { nombre: 'asc' }, // Ordenar alfabéticamente
        });
        return canales as CanalCRM[];
    } catch (error) {
        console.error(`Error fetching canales for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener los canales.');
    }
}

// --- Crear un nuevo Canal ---
export async function crearCanalCRM(
    data: Pick<CanalCRM, 'crmId' | 'nombre'> // Solo crmId y nombre son necesarios
): Promise<{ success: boolean; data?: CanalCRM; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim()) {
            return { success: false, error: "crmId y nombre son requeridos." };
        }
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear canal." };
    }
}

// --- Editar un Canal (nombre y status) ---
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

        const updatedCanal = await prisma.canalCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCanal as CanalCRM };
    } catch (error) {
        console.error(`Error updating canal ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar canal." };
    }
}

// --- Eliminar un Canal (Considerar qué pasa con los Leads) ---
export async function eliminarCanalCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de canal no proporcionado." };

        // **IMPORTANTE**: ¿Qué hacer con los Leads de este canal?
        // Opción 1: Poner canalId a null (requiere que sea opcional en Lead)
        // await prisma.lead.updateMany({ where: { canalId: id }, data: { canalId: null } });
        // Opción 2: Impedir borrado si hay leads

        // Asumiendo Opción 1 o que no hay restricción fuerte:
        await prisma.canalCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting canal ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el canal porque tiene Leads asociados." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar canal." };
    }
}

// --- Tipo CanalCRM (Asegúrate que coincida con tu schema) ---
/*
export interface CanalCRM {
    id: string;
    crmId: string;
    crm?: CRM | null;
    orden?: number | null; // Aunque no lo usemos para ordenar UI, puede estar en el modelo
    nombre: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Lead?: Lead[];
}
*/