'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions'; // Tu manejador

import {
    TareaGaleriaItemSchema,
    type TareaGaleriaItemType,
    // CrearTareaGaleriaInputSchema, // El input se construye dentro de la acción de agregar
    ActualizarDetallesImagenGaleriaTareaSchema,
    type ActualizarDetallesImagenGaleriaTareaData,
    ReordenarImagenesGaleriaTareaSchema,
    type ReordenarImagenesGaleriaTareaData
} from './tareaGaleria.schemas'; // O desde tarea.schemas.ts

// Helper para la ruta de revalidación (página de edición de la Tarea)
const getPathToTareaEdicion = (tareaId: string) => `/admin/tareas/${tareaId}`;

// --- Obtener Imágenes de la Galería por Tarea ID ---
export async function obtenerImagenesGaleriaTareaAction(
    tareaId: string
): Promise<ActionResult<TareaGaleriaItemType[]>> {
    if (!tareaId) return { success: false, error: "ID de Tarea requerido." };
    try {
        const imagenesDb = await prisma.tareaGaleria.findMany({
            where: { tareaId: tareaId },
            orderBy: { orden: 'asc' },
        });

        // Validar cada imagen con el schema Zod
        const parseResult = z.array(TareaGaleriaItemSchema).safeParse(imagenesDb);
        if (!parseResult.success) {
            console.warn(`Datos de TareaGaleria inválidos para Tarea ID ${tareaId}:`, parseResult.error.flatten());
            // Devolver data vacía o parcial si algunas son válidas? Por ahora, error si alguna falla.
            return { success: false, error: "Error al procesar datos de la galería." };
        }
        return { success: true, data: parseResult.data };
    } catch (error: unknown) {
        console.error("Error obtenerImagenesGaleriaTareaAction:", error);
        return { success: false, error: "No se pudieron obtener las imágenes de la galería de la tarea." };
    }
}

// --- Agregar una Nueva Imagen a la Galería de la Tarea ---
export async function agregarImagenAGaleriaTareaAction(
    tareaId: string,
    // negocioId, clienteId, catalogoId no son necesarios para TareaGaleria directamente,
    // pero SharedImageGalleryManager los pasa. Los aceptamos pero no los usamos si no es para storage path.
    _negocioId_o_similar_para_path: string | undefined, // Podría ser usado para construir el path de storage
    _clienteId_o_similar_para_path: string | undefined,
    _contextId_extra_para_path: string | undefined,
    formData: FormData,
    maxImages?: number // Recibido desde SharedImageGalleryManager
): Promise<ActionResult<TareaGaleriaItemType>> {
    if (!tareaId) return { success: false, error: "ID de Tarea requerido." };

    const file = formData.get('file') as File | null;
    const altText = formData.get('altText') as string | null; // Si SharedImageGalleryManager envía esto
    const descripcion = formData.get('descripcion') as string | null; // Si SharedImageGalleryManager envía esto

    if (!file) return { success: false, error: "Archivo no encontrado en FormData." };

    // Validaciones básicas (tamaño, tipo) - SharedImageGalleryManager debería hacerlas primero
    // pero una doble verificación no hace daño.
    const MAX_FILE_SIZE_MB_GALLERY = 5;
    if (file.size > MAX_FILE_SIZE_MB_GALLERY * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE_MB_GALLERY}MB.` };
    }
    // ... (otras validaciones de tipo si es necesario)

    try {
        if (maxImages !== undefined) {
            const count = await prisma.tareaGaleria.count({ where: { tareaId: tareaId } });
            if (count >= maxImages) {
                return { success: false, error: `Límite alcanzado (${maxImages} imágenes máximo por tarea).` };
            }
        }

        // Construir el path para Supabase Storage
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Path específico para Tareas
        const filePath = `Tareas/${tareaId}/Galeria/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir imagen al storage." };
        }

        const ultimoItem = await prisma.tareaGaleria.findFirst({
            where: { tareaId: tareaId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const nuevaImagen = await prisma.tareaGaleria.create({
            data: {
                tareaId: tareaId,
                imageUrl: uploadResult.publicUrl,
                altText: altText,
                descripcion: descripcion,
                orden: nuevoOrden,
                // tamañoBytes: file.size, // Omitido según requerimiento
            }
        });

        const validationResult = TareaGaleriaItemSchema.safeParse(nuevaImagen);
        if (!validationResult.success) {
            console.error("Error Zod para nueva imagen TareaGaleria:", validationResult.error.flatten());
            return { success: false, error: "Datos de imagen creados con formato inesperado." };
        }

        revalidatePath(getPathToTareaEdicion(tareaId));
        return { success: true, data: validationResult.data };

    } catch (error: unknown) {
        console.error(`Error agregarImagenAGaleriaTareaAction (${tareaId}):`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// --- Actualizar Detalles de una Imagen de la Galería de Tarea ---
export async function actualizarDetallesImagenGaleriaTareaAction(
    imagenGaleriaId: string, // Este es TareaGaleria.id
    // clienteId, negocioId, ownerEntityId (tareaId), catalogoId son pasados por SharedImageGalleryManager
    _clienteId: string,
    _negocioId: string,
    _ownerEntityId_tareaId: string, // Este debería coincidir con la tarea a la que pertenece la imagen
    _catalogoId: string | undefined,
    data: ActualizarDetallesImagenGaleriaTareaData
): Promise<ActionResult<TareaGaleriaItemType>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen de galería." };

    const validation = ActualizarDetallesImagenGaleriaTareaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para actualizar detalles.", validationErrors: validation.error.flatten().fieldErrors };
    }
    const { altText, descripcion } = validation.data;

    try {
        // Opcional: Verificar que la imagen pertenezca a la tarea correcta (_ownerEntityId_tareaId) si es necesario
        // const imagenExistente = await prisma.tareaGaleria.findFirst({
        //     where: { id: imagenGaleriaId, tareaId: _ownerEntityId_tareaId }
        // });
        // if (!imagenExistente) return { success: false, error: "Imagen no encontrada o no pertenece a esta tarea." };

        const dataToUpdate: Prisma.TareaGaleriaUpdateInput = {};
        if (altText !== undefined) dataToUpdate.altText = altText;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const imagenSinCambios = await prisma.tareaGaleria.findUnique({ where: { id: imagenGaleriaId } });
            if (!imagenSinCambios) return { success: false, error: "Imagen no encontrada." };
            const validatedCurrent = TareaGaleriaItemSchema.parse(imagenSinCambios); // Validar antes de devolver
            return { success: true, data: validatedCurrent, error: "No hay detalles para actualizar." };
        }

        const imagenActualizada = await prisma.tareaGaleria.update({
            where: { id: imagenGaleriaId },
            data: dataToUpdate,
        });

        const validatedData = TareaGaleriaItemSchema.parse(imagenActualizada);
        revalidatePath(getPathToTareaEdicion(_ownerEntityId_tareaId)); // Usar el ownerEntityId que es tareaId
        return { success: true, data: validatedData };
    } catch (error: unknown) {
        // ... (manejo de error similar al ejemplo, incluyendo ZodError)
        console.error(`Error actualizando detalles de imagen de galería de tarea ${imagenGaleriaId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// --- Eliminar una Imagen de la Galería de Tarea ---
export async function eliminarImagenDeGaleriaTareaAction(
    imagenGaleriaId: string, // TareaGaleria.id
    // negocioId, clienteId, ownerEntityId (tareaId), catalogoId son pasados por SharedImageGalleryManager
    _negocioId: string,
    _clienteId: string,
    ownerEntityId_tareaId: string, // Este es el tareaId
    // _catalogoId: string | undefined
): Promise<ActionResult<void>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen." };

    try {
        const imagen = await prisma.tareaGaleria.findUnique({
            where: { id: imagenGaleriaId, tareaId: ownerEntityId_tareaId }, // Asegurar que pertenece a la tarea
            select: { imageUrl: true }
        });

        if (!imagen) {
            return { success: false, error: "Imagen no encontrada o no pertenece a esta tarea." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.tareaGaleria.delete({
                where: { id: imagenGaleriaId },
            });
            if (imagen.imageUrl) { // Solo intentar borrar de storage si hay URL
                const deleteStorageResult = await eliminarImagenStorage(imagen.imageUrl);
                if (!deleteStorageResult.success) {
                    console.warn(`Error eliminando de Storage (${imagen.imageUrl}): ${deleteStorageResult.error}`);
                    // No necesariamente un error fatal para la operación de BD, pero loguear.
                }
            }
            // No hay manejo de almacenamientoUsadoBytes para Tarea
        });

        revalidatePath(getPathToTareaEdicion(ownerEntityId_tareaId));
        return { success: true };

    } catch (error: unknown) {
        // ... (manejo de error similar al ejemplo)
        console.error(`Error eliminando imagen de galería de tarea ${imagenGaleriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "La imagen ya había sido eliminada." }; // Considerar éxito si no se encontró
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// --- Actualizar Orden de Imágenes de la Galería de Tarea ---
export async function actualizarOrdenImagenesGaleriaTareaAction(
    tareaId: string, // ID de la Tarea dueña de la galería
    // negocioId, clienteId, catalogoId son pasados por SharedImageGalleryManager pero no usados directamente aquí
    _negocioId: string,
    _clienteId: string,
    _catalogoId: string | undefined,
    ordenes: ReordenarImagenesGaleriaTareaData
): Promise<ActionResult<void>> {
    if (!tareaId) return { success: false, error: "ID de Tarea requerido." };

    const validation = ReordenarImagenesGaleriaTareaSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            validationErrors: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors).map(([key, value]) => [String(key), value ?? []])
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0) return { success: true };

    try {
        await prisma.$transaction(
            ordenesValidadas.map((img) =>
                prisma.tareaGaleria.update({
                    where: { id: img.id, tareaId: tareaId }, // Asegurar que la imagen pertenece a la tarea
                    data: { orden: img.orden },
                })
            )
        );
        revalidatePath(getPathToTareaEdicion(tareaId));
        return { success: true };
    } catch (error: unknown) {
        // ... (manejo de error similar al ejemplo)
        console.error(`Error actualizando orden galería tarea ${tareaId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}