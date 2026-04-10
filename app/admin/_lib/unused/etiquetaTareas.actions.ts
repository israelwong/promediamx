// Ruta: src/app/admin/_lib/etiquetaTarea.actions.ts (o donde corresponda)
'use server';
import prisma from '../prismaClient'; // Ajusta ruta
import { EtiquetaTarea } from '../types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Etiquetas de Tarea (Ordenadas) ---
export async function obtenerEtiquetasTarea(): Promise<EtiquetaTarea[]> {
    try {
        const etiquetas = await prisma.etiquetaTarea.findMany({
            orderBy: { orden: 'asc' }, // Asumiendo que añades 'orden' al schema
        });
        return etiquetas as EtiquetaTarea[];
    } catch (error) {
        console.error('Error al obtener las etiquetas de tarea:', error);
        throw new Error('No se pudieron obtener las etiquetas de tarea');
    }
}

// --- Crear Etiqueta de Tarea ---
export async function crearEtiquetaTarea(
    data: Pick<EtiquetaTarea, 'nombre' | 'descripcion'> // Solo nombre y descripción
): Promise<{ success: boolean; data?: EtiquetaTarea; error?: string }> {
    try {
        if (!data.nombre?.trim()) {
            return { success: false, error: "El nombre es obligatorio." };
        }
        // Calcular siguiente orden
        const ultimoOrden = await prisma.etiquetaTarea.aggregate({ _max: { orden: true } });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        const nuevaEtiqueta = await prisma.etiquetaTarea.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                orden: nuevoOrden,
                // status: 'activo', // Si añades status
            },
        });
        return { success: true, data: nuevaEtiqueta as EtiquetaTarea };
    } catch (error) {
        console.error('Error al crear la etiqueta de tarea:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear etiqueta." };
    }
}

// --- Actualizar Etiqueta de Tarea ---
export async function editarEtiquetaTarea(
    id: string,
    data: Partial<Pick<EtiquetaTarea, 'nombre' | 'descripcion'>> // Solo nombre y descripción
): Promise<{ success: boolean; data?: EtiquetaTarea; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

        const dataToUpdate: Prisma.EtiquetaTareaUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }
        if (!dataToUpdate.nombre) {
            return { success: false, error: "El nombre no puede estar vacío." };
        }

        const etiquetaActualizada = await prisma.etiquetaTarea.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: etiquetaActualizada as EtiquetaTarea };
    } catch (error) {
        console.error('Error al actualizar la etiqueta de tarea:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al actualizar etiqueta." };
    }
}

// --- Eliminar Etiqueta de Tarea (Validando asociaciones) ---
export async function eliminarEtiquetaTarea(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

        // Validar que no tenga tareas asociadas en la tabla de unión
        const tareasAsociadasCount = await prisma.tareaEtiqueta.count({
            where: { etiquetaTareaId: id },
        });

        if (tareasAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: ${tareasAsociadasCount} tarea(s) asociada(s).` };
        }

        await prisma.etiquetaTarea.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar la etiqueta de tarea:', error);
        return { success: false, error: (error as Error).message || 'Error desconocido al eliminar etiqueta.' };
    }
}

// --- Actualizar Orden de Etiquetas de Tarea ---
export async function ordenarEtiquetasTarea(
    items: { id: string; orden: number }[]
): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) return { success: true };
    try {
        const updatePromises = items.map(item =>
            prisma.etiquetaTarea.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el orden de las etiquetas de tarea:', error);
        return { success: false, error: (error as Error).message || "Error al actualizar el orden." };
    }
}

// --- Tipos (Asegúrate que coincidan con tu schema) ---
/*
export interface EtiquetaTarea {
    id: string;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null; // Necesario para ordenar
    // color?: string | null; // Opcional
    // status?: string; // Opcional
    createdAt: Date;
    updatedAt: Date;
    tareas?: TareaEtiqueta[]; // Relación inversa
}
*/