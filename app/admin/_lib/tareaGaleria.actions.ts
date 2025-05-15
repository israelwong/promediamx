// Ruta: src/app/admin/_lib/tareaGaleria.actions.ts
'use server';

import prisma from './prismaClient';
import { TareaGaleria, CrearImagenGaleriaInput } from './types'; // Importar tipos necesarios
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// --- IMPORTAR funciones del imageHandler ---
import {
    // subirImagenStorage, // Ya no se llama directamente desde aquí para subir
    eliminarImagenStorage as eliminarImagenDeSupabase // Renombrar para claridad si es necesario
} from './imageHandler.actions';

// --- Obtener Imágenes de la Galería por Tarea ID ---
// Sin cambios en esta función, ya que solo consulta la BD.
export async function obtenerImagenesGaleriaPorTareaId(tareaId: string): Promise<TareaGaleria[]> {
    try {
        if (!tareaId) return [];
        const imagenes = await prisma.tareaGaleria.findMany({
            where: { tareaId: tareaId },
            orderBy: { orden: 'asc' },
        });
        return imagenes as TareaGaleria[];
    } catch (error) {
        console.error(`Error fetching gallery images for tarea ${tareaId}:`, error);
        throw new Error('No se pudieron obtener las imágenes de la galería.');
    }
}

// --- Crear Registro de Imagen en DB ---
// Esta función ahora solo crea el registro en la base de datos.
// La subida del archivo a Supabase debe ocurrir ANTES de llamar a esta función,
// y la publicUrl obtenida se pasa en 'data.imageUrl'.
export async function crearRegistroImagenGaleria(
    data: CrearImagenGaleriaInput // Este tipo ya espera imageUrl, altText, descripcion, etc.
): Promise<{ success: boolean; data?: TareaGaleria; error?: string }> {
    try {
        if (!data.tareaId || !data.imageUrl) {
            return { success: false, error: "Faltan datos requeridos (tareaId, imageUrl)." };
        }

        // Calcular el siguiente 'orden' para la nueva imagen en la galería de esta tarea
        const ultimoOrden = await prisma.tareaGaleria.aggregate({
            _max: { orden: true },
            where: { tareaId: data.tareaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaImagen = await prisma.tareaGaleria.create({
            data: {
                tareaId: data.tareaId,
                imageUrl: data.imageUrl,
                altText: data.altText || null,
                descripcion: data.descripcion || null,
                tamañoBytes: data.tamañoBytes || null,
                orden: nuevoOrden,
            }
        });
        revalidatePath(`/admin/tareas/${data.tareaId}`); // Ajusta la ruta según sea necesario
        return { success: true, data: nuevaImagen as TareaGaleria };
    } catch (error) {
        console.error('Error creating gallery image record:', error);
        return { success: false, error: `Error al guardar registro en BD: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}


// --- Eliminar una Imagen de la Galería (DB y Storage) ---
// Actualizado para usar eliminarImagenDeSupabase de imageHandler.actions.ts
export async function eliminarImagenGaleria(
    imagenId: string,
    tareaId: string // Necesario para revalidatePath
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!imagenId) {
            return { success: false, error: "ID de imagen no proporcionado." };
        }

        // 1. Obtener la URL de la imagen desde la BD para pasarla al imageHandler
        const imagenEnDb = await prisma.tareaGaleria.findUnique({
            where: { id: imagenId },
            select: { imageUrl: true }
        });

        if (!imagenEnDb || !imagenEnDb.imageUrl) {
            console.warn(`Registro de imagen ${imagenId} o su URL no encontrado en BD. Procediendo a intentar eliminar solo de BD si existe.`);
            // Si no hay URL, no podemos intentar borrar de Supabase, pero sí de la BD.
        } else {
            // 2. Intentar eliminar de Supabase Storage usando la función centralizada
            console.log(`Intentando eliminar de Supabase Storage usando imageHandler para URL: ${imagenEnDb.imageUrl}`);
            const resultadoStorage = await eliminarImagenDeSupabase(imagenEnDb.imageUrl);

            if (!resultadoStorage.success) {
                // Loguear el error pero considerar continuar para eliminar de la BD de todas formas,
                // o retornar el error si la eliminación del storage es crítica.
                console.error(`Error al eliminar imagen de Supabase Storage (manejado por imageHandler): ${resultadoStorage.error}`);
                // Podrías decidir retornar aquí si la eliminación del storage es mandatoria:
                // return { success: false, error: `Error en Storage: ${resultadoStorage.error}` };
            } else {
                console.log(`Imagen eliminada (o no encontrada) de Supabase Storage según imageHandler.`);
            }
        }

        // 3. Eliminar el registro de la base de datos Prisma
        // Esto se intentará incluso si la imagen no se encontró en la BD (findUnique devolvió null)
        // o si hubo un problema menor en la eliminación del storage.
        await prisma.tareaGaleria.delete({
            where: { id: imagenId },
        });
        console.log(`Registro de imagen ${imagenId} eliminado de la BD.`);

        // 4. Revalidar path
        revalidatePath(`/admin/tareas/${tareaId}`);

        return { success: true };
    } catch (error) {
        console.error(`Error en eliminarImagenGaleria para ID ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Este error significa "An operation failed because it depends on one or more records that were required but not found."
            // En el contexto de delete, significa que el registro ya no existía.
            console.warn(`Registro de imagen ${imagenId} ya no existía en BD (P2025). Considerado como éxito parcial.`);
            // Revalidar por si acaso, aunque el registro ya no estaba.
            revalidatePath(`/admin/tareas/${tareaId}`);
            return { success: true, error: "La imagen ya había sido eliminada de la base de datos." };
        }
        return { success: false, error: `Error al eliminar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}

// --- Actualizar Orden de Imágenes de la Galería ---
// Sin cambios en esta función, ya que solo interactúa con la BD.
export async function actualizarOrdenImagenesGaleria(
    tareaId: string,
    imagenesOrdenadas: { id: string; orden: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tareaId) return { success: false, error: "ID de tarea no proporcionado." };
        if (!imagenesOrdenadas || imagenesOrdenadas.length === 0) {
            return { success: true };
        }

        console.log(`Actualizando orden para tarea ${tareaId}:`, imagenesOrdenadas);

        await prisma.$transaction(
            imagenesOrdenadas.map((img, index) =>
                prisma.tareaGaleria.update({
                    where: {
                        id: img.id,
                        tareaId: tareaId, // Asegurar que solo se actualicen imágenes de esta tarea
                    },
                    data: { orden: index },
                })
            )
        );

        revalidatePath(`/admin/tareas/${tareaId}`);

        console.log(`Orden de galería para tarea ${tareaId} actualizado.`);
        return { success: true };
    } catch (error) {
        console.error(`Error updating gallery image order for tarea ${tareaId}:`, error);
        return { success: false, error: (error as Error).message || 'Error desconocido al actualizar el orden.' };
    }
}

// Las funciones 'subirImagen' y 'eliminarImagenStorage' (helper) que estaban aquí
// han sido eliminadas porque su funcionalidad ahora es provista por 'imageHandler.actions.ts'.
// El componente de UI que maneja la subida de archivos deberá:
// 1. Importar y usar 'subirImagenStorage' de 'imageHandler.actions.ts'.
// 2. Si la subida es exitosa, tomar la 'publicUrl' y los metadatos del archivo.
// 3. Llamar a 'crearRegistroImagenGaleria' (de este archivo) con esos datos.
