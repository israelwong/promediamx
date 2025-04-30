// Ejemplo en: @/app/admin/_lib/crmEtiqueta.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { EtiquetaCRM } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Etiquetas para un CRM (ordenadas) ---
export async function obtenerEtiquetasCRM(crmId: string): Promise<EtiquetaCRM[]> {
    if (!crmId) return [];
    try {
        const etiquetas = await prisma.etiquetaCRM.findMany({
            where: { crmId: crmId },
            orderBy: { orden: 'asc' }, // Ordenar por 'orden'
        });
        return etiquetas as EtiquetaCRM[];
    } catch (error) {
        console.error(`Error fetching etiquetas for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener las etiquetas.');
    }
}

// --- Crear una nueva Etiqueta ---
export async function crearEtiquetaCRM(
    data: Pick<EtiquetaCRM, 'crmId' | 'nombre' | 'color'> // Incluir color
): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim()) {
            return { success: false, error: "crmId y nombre son requeridos." };
        }
        const ultimoOrden = await prisma.etiquetaCRM.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        const newEtiqueta = await prisma.etiquetaCRM.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                color: data.color || null, // Guardar color o null
                orden: nuevoOrden,
                status: 'activo',
            },
        });
        return { success: true, data: newEtiqueta as EtiquetaCRM };
    } catch (error) {
        console.error('Error creating etiqueta:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear etiqueta." };
    }
}

// --- Editar una Etiqueta (nombre, color, status) ---
export async function editarEtiquetaCRM(
    id: string,
    data: Partial<Pick<EtiquetaCRM, 'nombre' | 'color' | 'status'>>
): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

        const dataToUpdate: Prisma.EtiquetaCRMUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.color !== undefined) dataToUpdate.color = data.color || null; // Permitir quitar color
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        const updatedEtiqueta = await prisma.etiquetaCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedEtiqueta as EtiquetaCRM };
    } catch (error) {
        console.error(`Error updating etiqueta ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar etiqueta." };
    }
}

// --- Eliminar una Etiqueta (Cascade debería eliminar LeadEtiqueta) ---
export async function eliminarEtiquetaCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };
        // La relación en LeadEtiqueta tiene onDelete: Cascade, por lo que se borrarán las asociaciones
        await prisma.etiquetaCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting etiqueta ${id}:`, error);
        // Podría fallar si hay otras restricciones inesperadas
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar etiqueta." };
    }
}

// --- Ordenar Etiquetas ---
export async function ordenarEtiquetasCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) return { success: true };
    try {
        const updatePromises = items.map(item =>
            prisma.etiquetaCRM.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating etiqueta order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar etiquetas." };
    }
}

// --- Tipo EtiquetaCRM (Asegúrate que coincida con tu schema) ---
/*
export interface EtiquetaCRM {
    id: string;
    crmId: string;
    crm?: CRM | null;
    orden?: number | null;
    nombre: string;
    color?: string | null; // Campo para color
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Leads?: LeadEtiqueta[]; // Relación con tabla intermedia
}
*/