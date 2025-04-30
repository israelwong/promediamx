// Ruta: src/app/admin/_lib/descuentos.actions.ts (o donde corresponda)
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { Descuento } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Descuentos (Ordenados por fecha inicio DESC) ---
export async function obtenerDescuentosNegocio(negocioId: string): Promise<Descuento[]> {
    if (!negocioId) return [];
    try {
        const descuentos = await prisma.descuento.findMany({
            where: { negocioId: negocioId },
            orderBy: { fechaInicio: 'desc' }, // Más recientes primero
        });
        return descuentos as Descuento[];
    } catch (error) {
        console.error(`Error fetching descuentos for negocio ${negocioId}:`, error);
        throw new Error('No se pudieron obtener los descuentos.');
    }
}

// --- Crear Descuento ---
export async function crearDescuento(
    // Recibir solo los datos necesarios, incluyendo negocioId
    data: Pick<Descuento, 'negocioId' | 'nombre' | 'descripcion' | 'porcentaje' | 'monto' | 'fechaInicio' | 'fechaFin' | 'status'>
): Promise<{ success: boolean; data?: Descuento; error?: string }> {
    try {
        // Validaciones
        if (!data.negocioId) return { success: false, error: "ID de negocio es requerido." };
        if (!data.nombre?.trim()) return { success: false, error: "Nombre es requerido." };
        if (!data.fechaInicio) return { success: false, error: "Fecha de inicio es requerida." };
        if (!data.fechaFin) return { success: false, error: "Fecha de fin es requerida." };
        if (new Date(data.fechaInicio) >= new Date(data.fechaFin)) return { success: false, error: "Fecha fin debe ser posterior a fecha inicio." };
        // Validar que solo uno (porcentaje o monto) tenga valor > 0
        const hasPorcentaje = typeof data.porcentaje === 'number' && data.porcentaje > 0;
        const hasMonto = typeof data.monto === 'number' && data.monto > 0;
        if (hasPorcentaje && hasMonto) {
            return { success: false, error: "Define solo Porcentaje o Monto fijo, no ambos." };
        }
        if (!hasPorcentaje && !hasMonto) {
            return { success: false, error: "Debes definir un Porcentaje o un Monto fijo." };
        }


        const newDescuento = await prisma.descuento.create({
            data: {
                negocioId: data.negocioId,
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                // Guardar solo el valor que corresponde, el otro como null
                porcentaje: hasPorcentaje ? data.porcentaje! : 0,
                monto: hasMonto ? data.monto! : 0,
                fechaInicio: new Date(data.fechaInicio),
                fechaFin: new Date(data.fechaFin),
                status: data.status || 'activo',
            },
        });
        return { success: true, data: newDescuento as Descuento };
    } catch (error) {
        console.error('Error creating descuento:', error);
        return { success: false, error: (error as Error).message || "Error desconocido al crear descuento." };
    }
}

// --- Editar Descuento ---
export async function editarDescuento(
    id: string,
    data: Partial<Pick<Descuento, 'nombre' | 'descripcion' | 'porcentaje' | 'monto' | 'fechaInicio' | 'fechaFin' | 'status'>>
): Promise<{ success: boolean; data?: Descuento; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de descuento no proporcionado." };

        // Validar que solo uno (porcentaje o monto) tenga valor > 0 si ambos se editan
        const hasPorcentaje = typeof data.porcentaje === 'number' && data.porcentaje > 0;
        const hasMonto = typeof data.monto === 'number' && data.monto > 0;
        if (data.porcentaje !== undefined && data.monto !== undefined && hasPorcentaje && hasMonto) {
            return { success: false, error: "Define solo Porcentaje o Monto fijo, no ambos." };
        }
        // Si se intenta poner ambos a 0 o null, también podría ser un error
        if (data.porcentaje !== undefined && data.monto !== undefined && !hasPorcentaje && !hasMonto) {
            return { success: false, error: "Debes definir un Porcentaje o un Monto fijo." };
        }


        const dataToUpdate: Prisma.DescuentoUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.fechaInicio !== undefined && data.fechaInicio !== null) {
            dataToUpdate.fechaInicio = new Date(data.fechaInicio);
        }
        if (data.fechaFin !== undefined) dataToUpdate.fechaFin = data.fechaFin ? new Date(data.fechaFin) : undefined;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        // Actualizar porcentaje o monto, asegurando que el otro sea null
        if (data.porcentaje !== undefined) {
            dataToUpdate.porcentaje = hasPorcentaje ? data.porcentaje! : undefined;
            if (hasPorcentaje) dataToUpdate.monto = undefined; // Asegurar que monto sea undefined si se define porcentaje
        }
        if (data.monto !== undefined) {
            dataToUpdate.monto = hasMonto && data.monto !== null ? data.monto : undefined;
            if (hasMonto) dataToUpdate.porcentaje = undefined; // Asegurar que porcentaje sea undefined si se define monto
        }


        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }
        // Validar fechas si ambas se proporcionan
        const currentData = await prisma.descuento.findUnique({ where: { id }, select: { fechaInicio: true, fechaFin: true } });
        const finalFechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : currentData?.fechaInicio;
        const finalFechaFin = data.fechaFin ? new Date(data.fechaFin) : currentData?.fechaFin;
        if (finalFechaInicio && finalFechaFin && finalFechaInicio >= finalFechaFin) {
            return { success: false, error: "Fecha fin debe ser posterior a fecha inicio." };
        }


        const updatedDescuento = await prisma.descuento.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedDescuento as Descuento };
    } catch (error) {
        console.error(`Error updating descuento ${id}:`, error);
        return { success: false, error: (error as Error).message || "Error desconocido al editar descuento." };
    }
}

// --- Eliminar Descuento ---
export async function eliminarDescuento(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de descuento no proporcionado." };
        // Considerar ItemCatalogoDescuento: ¿Borrar asociaciones o impedir borrado?
        await prisma.descuento.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting descuento ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar porque está asociado a ítems del catálogo." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar descuento." };
    }
}