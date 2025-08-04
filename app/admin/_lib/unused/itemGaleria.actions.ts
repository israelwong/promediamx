// Ruta: src/app/admin/_lib/itemGaleria.actions.ts
'use server';

import prisma from '../prismaClient'; // Ajusta ruta
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Acciones genéricas
import { Prisma } from '@prisma/client';
// import { revalidatePath } from 'next/cache';
import { ImagenGaleriaDetallesInput, ImagenOrdenData, ItemCatalogoGaleria } from '../types'; // Importar tipos

const MAX_IMAGES_PER_ITEM = 10; // Límite máximo de imágenes

/**
 * Obtiene todas las imágenes de la galería para un ItemCatalogo específico, ordenadas.
 */
export async function obtenerImagenesGaleriaItem(itemId: string): Promise<ItemCatalogoGaleria[]> {
    if (!itemId) return [];
    try {
        const imagenes = await prisma.itemCatalogoGaleria.findMany({
            where: { itemCatalogoId: itemId },
            orderBy: { orden: 'asc' },
            include: { itemCatalogo: true }, // Include the missing property
        });
        return imagenes as ItemCatalogoGaleria[]; // Ensure the type matches
    } catch (error) {
        console.error(`Error fetching gallery images for item ${itemId}:`, error);
        throw new Error('No se pudieron obtener las imágenes de la galería.');
    }
}

/**
 * Añade una nueva imagen a la galería de un ItemCatalogo.
 */
export async function añadirImagenGaleriaItem(
    itemId: string,
    file: File,
    altText?: string | null,
    descripcion?: string | null
): Promise<{ success: boolean; data?: ItemCatalogoGaleria; error?: string }> {
    if (!itemId || !file) {
        return { success: false, error: "Faltan datos (ID de ítem o archivo)." };
    }

    try {
        // Verificar límite de imágenes
        const count = await prisma.itemCatalogoGaleria.count({ where: { itemCatalogoId: itemId } });
        if (count >= MAX_IMAGES_PER_ITEM) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_ITEM} imágenes máximo).` };
        }

        // Definir ruta en storage
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `ItemsCatalogo/${itemId}/Galeria/${uniqueFileName}`;

        // Subir usando handler genérico
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir imagen al storage.");
        }

        // Determinar el siguiente orden
        const ultimoOrden = await prisma.itemCatalogoGaleria.aggregate({
            _max: { orden: true }, where: { itemCatalogoId: itemId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        // Crear registro en la BD
        const nuevaImagen = await prisma.itemCatalogoGaleria.create({
            data: {
                itemCatalogoId: itemId,
                imageUrl: uploadResult.publicUrl,
                altText: altText?.trim() || null,
                descripcion: descripcion?.trim() || null,
                orden: nuevoOrden,
                tamañoBytes: file.size,
            },
            include: {
                itemCatalogo: true, // Include the related itemCatalogo
            },
        });

        // Revalidar path (ajusta según tu estructura de rutas)
        // revalidatePath(`/admin/..../item/${itemId}`);

        return { success: true, data: nuevaImagen };

    } catch (error) {
        console.error(`Error añadiendo imagen a galería del ítem ${itemId}:`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Actualiza los detalles (altText, descripcion) de una imagen de la galería.
 */
export async function actualizarDetallesImagenGaleria(
    imagenId: string,
    data: ImagenGaleriaDetallesInput
): Promise<{ success: boolean; data?: ItemCatalogoGaleria; error?: string }> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    try {
        const dataToUpdate: Prisma.ItemCatalogoGaleriaUpdateInput = {};
        if (data.altText !== undefined) dataToUpdate.altText = data.altText?.trim() || null;
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: true }; // No hay nada que actualizar
        }

        const imagenActualizada = await prisma.itemCatalogoGaleria.update({
            where: { id: imagenId },
            data: dataToUpdate
        });

        // Revalidar path si es necesario
        // revalidatePath(`/admin/..../item/${imagenActualizada.itemCatalogoId}`);

        return { success: true, data: imagenActualizada };

    } catch (error) {
        console.error(`Error actualizando detalles de imagen ${imagenId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


/**
 * Elimina una imagen de la galería (Storage y BD).
 */
export async function eliminarImagenGaleriaItem(
    imagenId: string
): Promise<{ success: boolean; error?: string }> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    let imageUrlToDelete: string | null = null;
    // let itemIdForRevalidation: string | null = null;

    try {
        // 1. Obtener URL e itemId antes de borrar de la BD (para borrar de storage y revalidar)
        const imagen = await prisma.itemCatalogoGaleria.findUnique({
            where: { id: imagenId },
            select: { imageUrl: true, itemCatalogoId: true }
        });

        if (imagen) {
            imageUrlToDelete = imagen.imageUrl;
            // itemIdForRevalidation = imagen.itemCatalogoId;
        } else {
            console.warn(`Imagen ${imagenId} no encontrada en BD para eliminar.`);
            // Si no está en BD, no hay nada que borrar en storage ni revalidar
            return { success: true };
        }

        // 2. Eliminar registro de la BD Prisma
        await prisma.itemCatalogoGaleria.delete({
            where: { id: imagenId },
        });
        console.log(`Registro de imagen ${imagenId} eliminado de la BD.`);

        // 3. Intentar eliminar de Supabase Storage
        if (imageUrlToDelete) {
            const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
            if (!deleteResult.success) {
                // Loggear pero considerar la operación general como exitosa
                // ya que el registro en BD se eliminó.
                console.warn(`Registro BD eliminado, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
            }
        }

        // 4. Revalidar path
        // if (itemIdForRevalidation) {
        //     revalidatePath(`/admin/..../item/${itemIdForRevalidation}`);
        // }

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando imagen de galería ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // El registro ya no existía
            console.warn(`Intento de eliminar imagen ${imagenId} que no fue encontrada (P2025).`);
            // Intentar borrar de storage por si acaso quedó huérfano
            if (imageUrlToDelete) await eliminarImagenStorage(imageUrlToDelete);
            return { success: true };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Actualiza el orden de las imágenes en la galería de un ítem.
 */
export async function actualizarOrdenGaleriaItem(
    itemId: string, // Necesario para revalidar
    imagenesOrdenadas: ImagenOrdenData[]
): Promise<{ success: boolean; error?: string }> {
    if (!itemId || !imagenesOrdenadas) {
        return { success: false, error: "Faltan datos para reordenar." };
    }
    try {
        await prisma.$transaction(
            imagenesOrdenadas.map((img) =>
                prisma.itemCatalogoGaleria.update({
                    where: { id: img.id },
                    data: { orden: img.orden },
                })
            )
        );
        // Revalidar
        // revalidatePath(`/admin/..../item/${itemId}`);
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería item ${itemId}:`, error);
        return { success: false, error: (error as Error).message || 'Error al guardar orden.' };
    }
}
