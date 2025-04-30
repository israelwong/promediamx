// Ruta: src/app/admin/_lib/promocion.actions.ts (o donde corresponda)
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { Promocion } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Promociones (Ordenadas por fecha inicio DESC) ---
export async function obtenerPromocionesNegocio(negocioId: string): Promise<Promocion[]> {
    if (!negocioId) return [];
    try {
        const promociones = await prisma.promocion.findMany({
            where: { negocioId: negocioId },
            orderBy: { fechaInicio: 'desc' }, // Más recientes primero
            // Seleccionar solo campos necesarios si quieres optimizar
            // select: { id: true, nombre: true, ... }
        });
        return promociones as Promocion[]; // Castear si usas select parcial
    } catch (error) {
        console.error(`Error fetching promociones for negocio ${negocioId}:`, error);
        throw new Error('No se pudieron obtener las promociones.');
    }
}

// --- Crear Promoción ---
export async function crearPromocion(
    // Recibir solo los datos necesarios para crear
    data: Pick<Promocion, 'negocioId' | 'nombre' | 'descripcion' | 'fechaInicio' | 'fechaFin' | 'status'>
): Promise<{ success: boolean; data?: Promocion; error?: string }> {
    try {
        // Validaciones
        if (!data.negocioId) return { success: false, error: "ID de negocio es requerido." };
        if (!data.nombre?.trim()) return { success: false, error: "Nombre es requerido." };
        if (!data.fechaInicio) return { success: false, error: "Fecha de inicio es requerida." };
        if (!data.fechaFin) return { success: false, error: "Fecha de fin es requerida." };
        if (new Date(data.fechaInicio) >= new Date(data.fechaFin)) return { success: false, error: "Fecha fin debe ser posterior a fecha inicio." };

        const newPromocion = await prisma.promocion.create({
            data: {
                negocioId: data.negocioId,
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                fechaInicio: new Date(data.fechaInicio), // Asegurar objeto Date
                fechaFin: new Date(data.fechaFin),       // Asegurar objeto Date
                status: data.status || 'activo',
            },
        });
        return { success: true, data: newPromocion as Promocion };
    } catch (error) {
        console.error('Error creating promocion:', error);
        // Manejar errores específicos si es necesario (ej: nombre duplicado si fuera unique)
        return { success: false, error: (error as Error).message || "Error desconocido al crear promoción." };
    }
}

// --- Editar Promoción ---
export async function editarPromocion(
    id: string,
    data: Partial<Pick<Promocion, 'nombre' | 'descripcion' | 'fechaInicio' | 'fechaFin' | 'status'>>
): Promise<{ success: boolean; data?: Promocion; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de promoción no proporcionado." };

        const dataToUpdate: Prisma.PromocionUpdateInput = {};
        if (data.nombre !== undefined && data.nombre !== null) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.fechaInicio !== undefined && data.fechaInicio) dataToUpdate.fechaInicio = new Date(data.fechaInicio);
        if (data.fechaFin !== undefined && data.fechaFin) dataToUpdate.fechaFin = new Date(data.fechaFin);
        if (data.status !== undefined && data.status !== null) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }
        // Validar fechas si ambas se proporcionan
        const currentData = await prisma.promocion.findUnique({ where: { id }, select: { fechaInicio: true, fechaFin: true } });
        const finalFechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : currentData?.fechaInicio;
        const finalFechaFin = data.fechaFin ? new Date(data.fechaFin) : currentData?.fechaFin;
        if (finalFechaInicio && finalFechaFin && finalFechaInicio >= finalFechaFin) {
            return { success: false, error: "Fecha fin debe ser posterior a fecha inicio." };
        }


        const updatedPromocion = await prisma.promocion.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedPromocion as Promocion };
    } catch (error) {
        console.error(`Error updating promocion ${id}:`, error);
        return { success: false, error: (error as Error).message || "Error desconocido al editar promoción." };
    }
}

// --- Eliminar Promoción ---
export async function eliminarPromocion(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de promoción no proporcionado." };
        // Considerar ItemCatalogoPromocion: ¿Borrar asociaciones o impedir borrado?
        // Por simplicidad, asumimos que se puede borrar (o que onDelete está configurado)
        await prisma.promocion.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting promocion ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar porque está asociada a ítems del catálogo." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar promoción." };
    }
}

// --- Tipos (Asegúrate que coincidan con tu schema) ---
/*
export interface Promocion {
    id: string;
    negocioId: string;
    negocio?: Negocio | null;
    nombre: string;
    descripcion?: string | null;
    fechaInicio: Date;
    fechaFin: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    ItemCatalogoPromocion?: ItemCatalogoPromocion[];
}
*/