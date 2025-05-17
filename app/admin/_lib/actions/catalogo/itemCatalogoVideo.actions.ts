// Sugerencia de Ruta: @/app/admin/_lib/actions/catalogo/itemCatalogoVideo.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions'; // Reutilizamos imageHandler para videos

import {
    ItemCatalogoVideoItemSchema,
    type ItemCatalogoVideoItemType,
    UpsertItemCatalogoVideoSchema,
    type UpsertItemCatalogoVideoData,
    TipoVideoEnumSchema
} from './itemCatalogoVideo.schemas';

const MAX_VIDEO_SIZE_MB_SERVER = 50; // Límite en servidor, el cliente puede tener uno igual o menor
const MAX_VIDEO_SIZE_BYTES_SERVER = MAX_VIDEO_SIZE_MB_SERVER * 1024 * 1024;

// Helper para la ruta de revalidación (página de edición del ítem)
const getPathToItemEdicion = (clienteId: string, negocioId: string, catalogoId: string, itemId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`;

export async function obtenerVideoDelItemAction(
    itemId: string // itemCatalogoId
): Promise<ActionResult<ItemCatalogoVideoItemType | null>> {
    if (!itemId) return { success: false, error: "ID de ítem de catálogo requerido." };
    try {
        const video = await prisma.itemCatalogoVideos.findFirst({
            where: { itemCatalogoId: itemId },
            orderBy: { orden: 'asc' }, // Aunque solo esperamos uno, por si acaso
        });

        if (!video) return { success: true, data: null };

        const validationResult = ItemCatalogoVideoItemSchema.safeParse(video);
        if (!validationResult.success) {
            console.error("Error de validación Zod para video de ítem obtenido:", validationResult.error.flatten());
            return { success: false, error: "Datos de video con formato inesperado." };
        }
        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error("Error obtenerVideoDelItemAction:", error);
        return { success: false, error: "No se pudo obtener el video del ítem." };
    }
}

export async function guardarVideoItemAction(
    itemId: string, // itemCatalogoId
    negocioId: string,
    clienteId: string,
    catalogoId: string, // Para revalidación
    data: UpsertItemCatalogoVideoData,
    file?: File // Archivo de video si tipoVideo es SUBIDO
): Promise<ActionResult<ItemCatalogoVideoItemType>> {
    if (!itemId || !negocioId || !clienteId || !catalogoId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    const validation = UpsertItemCatalogoVideoSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos de video inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const validatedData = validation.data;
    let videoUrlToSave = validatedData.videoUrl; // Puede ser null si es tipo SUBIDO y no hay archivo
    let tamañoBytesToSave: number | null = null;

    try {
        const existingVideo = await prisma.itemCatalogoVideos.findFirst({
            where: { itemCatalogoId: itemId },
            select: { id: true, videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });

        let oldVideoStoragePath: string | null = null;
        let oldVideoSize = BigInt(0);

        if (existingVideo) {
            if (existingVideo.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && existingVideo.videoUrl) {
                oldVideoStoragePath = existingVideo.videoUrl; // Asumimos que la URL nos sirve para identificar/eliminar
                oldVideoSize = BigInt(existingVideo.tamañoBytes || 0);
            }
        }

        if (validatedData.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO) {
            if (file) {
                if (file.size > MAX_VIDEO_SIZE_BYTES_SERVER) {
                    return { success: false, error: `El archivo de video excede el límite de ${MAX_VIDEO_SIZE_MB_SERVER}MB.` };
                }
                // Podríamos añadir validación de tipo de archivo de video aquí también si es necesario
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const uniqueFileName = `${Date.now()}_video.${fileExtension}`;
                const filePath = `Negocios/${negocioId}/Catalogos/${catalogoId}/Items/${itemId}/Video/${uniqueFileName}`;

                const uploadResult = await subirImagenStorage(file, filePath); // Usamos el mismo handler
                if (!uploadResult.success || !uploadResult.publicUrl) {
                    return { success: false, error: uploadResult.error || "Error al subir video al storage." };
                }
                videoUrlToSave = uploadResult.publicUrl;
                tamañoBytesToSave = file.size;

                // Si estamos subiendo un nuevo archivo y había uno antiguo de tipo SUBIDO, eliminar el antiguo del storage
                if (oldVideoStoragePath && oldVideoStoragePath !== videoUrlToSave) {
                    await eliminarImagenStorage(oldVideoStoragePath);
                }

            } else if (existingVideo && existingVideo.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO) {
                // Actualizando metadatos de un video SUBIDO existente, mantener URL y tamaño
                videoUrlToSave = existingVideo.videoUrl;
                tamañoBytesToSave = existingVideo.tamañoBytes;
            } else {
                // Tipo SUBIDO pero no hay archivo y no hay video SUBIDO existente (error)
                return { success: false, error: "Archivo de video no proporcionado para la subida." };
            }
        } else { // Para YOUTUBE, VIMEO, OTRO_URL
            if (!videoUrlToSave) { // Ya validado por Zod refine, pero doble check
                return { success: false, error: "URL de video requerida para este tipo." };
            }
            // Si antes había un video SUBIDO y ahora se cambia a URL, eliminar el archivo antiguo del storage
            if (oldVideoStoragePath) {
                await eliminarImagenStorage(oldVideoStoragePath);
            }
            tamañoBytesToSave = null; // No hay tamaño para URLs externas
        }

        const newVideoData = {
            itemCatalogoId: itemId,
            videoUrl: videoUrlToSave!, // Zod y la lógica anterior aseguran que no sea null si es necesario
            tipoVideo: validatedData.tipoVideo,
            titulo: validatedData.titulo,
            descripcion: validatedData.descripcion,
            orden: 0, // Asumiendo un solo video por ítem
            tamañoBytes: tamañoBytesToSave,
        };

        const savedVideo = await prisma.$transaction(async (tx) => {
            if (existingVideo) {
                await tx.itemCatalogoVideos.delete({ where: { id: existingVideo.id } });
            }
            const createdVideo = await tx.itemCatalogoVideos.create({ data: newVideoData });

            // Ajustar almacenamiento del negocio
            const storageDiff = (BigInt(tamañoBytesToSave || 0)) - oldVideoSize;
            if (storageDiff !== BigInt(0)) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { increment: Number(storageDiff) } } // Prisma espera number para increment
                });
            }
            return createdVideo;
        });

        const validationResultOutput = ItemCatalogoVideoItemSchema.parse(savedVideo);
        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true, data: validationResultOutput };

    } catch (error: unknown) {
        console.error(`Error guardarVideoItemAction (${itemId}):`, error);
        return { success: false, error: `Error al guardar el video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarVideoDelItemAction(
    videoItemId: string, // ID del registro ItemCatalogoVideos
    negocioId: string,
    clienteId: string,
    catalogoId: string,
    itemId: string      // itemCatalogoId para revalidación
): Promise<ActionResult<void>> {
    if (!videoItemId || !negocioId || !clienteId || !catalogoId || !itemId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }
    try {
        const video = await prisma.itemCatalogoVideos.findUnique({
            where: { id: videoItemId, itemCatalogoId: itemId }, // Asegurar que pertenece al ítem
            select: { videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });

        if (!video) return { success: false, error: "Video no encontrado o no pertenece a este ítem." };

        await prisma.$transaction(async (tx) => {
            await tx.itemCatalogoVideos.delete({ where: { id: videoItemId } });

            if (video.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && video.videoUrl) {
                await eliminarImagenStorage(video.videoUrl);
            }

            if (video.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && video.tamañoBytes && video.tamañoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: video.tamañoBytes } },
                });
            }
        });

        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error eliminando video del ítem ${videoItemId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "El video ya había sido eliminado." };
        }
        return { success: false, error: `Error al eliminar el video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
