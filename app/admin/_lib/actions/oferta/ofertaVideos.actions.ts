// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/ofertaVideos.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';

import {
    OfertaVideoItemSchema,
    type OfertaVideoItemType,
    UpsertOfertaVideoSchema,
    type UpsertOfertaVideoData,
    // SharedTipoVideoEnumSchema as TipoVideoEnumSchema // Renombrar para claridad local
} from './ofertaVideos.schemas'; // Ajustar ruta si es necesario

// import { SharedTipoVideoEnumSchema } from '@/app/admin/components/shared/SharedVideoManager'; // Reutilizar el enum
// import { SharedTipoVideoEnumSchema } from '@/app/admin/components/shared/SharedVideoManager'; // Reutilizar el enum
import {
    SharedTipoVideoEnumSchema,
    // SharedTipoVideoType
} from '@/app/admin/_lib/schemas/sharedCommon.schemas'



const MAX_VIDEO_SIZE_MB_SERVER = 50;
const MAX_VIDEO_SIZE_BYTES_SERVER = MAX_VIDEO_SIZE_MB_SERVER * 1024 * 1024;

const getPathToOfertaEdicion = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;

export async function obtenerVideoDeOfertaAction(
    ofertaId: string
): Promise<ActionResult<OfertaVideoItemType | null>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    try {
        const video = await prisma.ofertaVideos.findFirst({
            where: { ofertaId: ofertaId },
            orderBy: { orden: 'asc' }, // Aunque solo esperamos uno
        });
        if (!video) return { success: true, data: null };

        const validationResult = OfertaVideoItemSchema.safeParse(video);
        if (!validationResult.success) {
            console.error("Error de validación Zod para video de oferta obtenido:", validationResult.error.flatten());
            return { success: false, error: "Datos de video con formato inesperado." };
        }
        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error("Error obtenerVideoDeOfertaAction:", error);
        return { success: false, error: "No se pudo obtener el video de la oferta." };
    }
}

export async function guardarVideoOfertaAction(
    ofertaId: string,
    negocioId: string,
    clienteId: string,
    data: UpsertOfertaVideoData,
    file?: File
): Promise<ActionResult<OfertaVideoItemType>> {
    if (!ofertaId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    const validation = UpsertOfertaVideoSchema.safeParse(data);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de video inválidos.",
            errorDetails: validation.error.flatten().fieldErrors,
            // errorMessage: validation.error.message, // Mensaje general del error
            // errorStack: validation.error.stack // Stack trace si está disponible
        };
    }
    const validatedData = validation.data;
    let videoUrlToSave = validatedData.videoUrl;
    let tamañoBytesToSave: number | null = null;

    try {
        const existingVideo = await prisma.ofertaVideos.findFirst({
            where: { ofertaId: ofertaId },
            select: { id: true, videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });

        let oldVideoStoragePath: string | null = null;
        let oldVideoSize = BigInt(0);

        if (existingVideo) {
            if (existingVideo.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO && existingVideo.videoUrl) {
                oldVideoStoragePath = existingVideo.videoUrl;
                oldVideoSize = BigInt(existingVideo.tamañoBytes || 0);
            }
        }

        if (validatedData.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO) {
            if (file) {
                if (file.size > MAX_VIDEO_SIZE_BYTES_SERVER) {
                    return { success: false, error: `El archivo excede ${MAX_VIDEO_SIZE_MB_SERVER}MB.` };
                }
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const uniqueFileName = `${Date.now()}_video.${fileExtension}`;
                const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Video/${uniqueFileName}`;

                const uploadResult = await subirImagenStorage(file, filePath);
                if (!uploadResult.success || !uploadResult.publicUrl) {
                    return { success: false, error: uploadResult.error || "Error al subir video." };
                }
                videoUrlToSave = uploadResult.publicUrl;
                tamañoBytesToSave = file.size;
                if (oldVideoStoragePath && oldVideoStoragePath !== videoUrlToSave) {
                    await eliminarImagenStorage(oldVideoStoragePath);
                }
            } else if (existingVideo && existingVideo.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO) {
                videoUrlToSave = existingVideo.videoUrl;
                tamañoBytesToSave = existingVideo.tamañoBytes;
            } else {
                return { success: false, error: "Archivo no proporcionado para subida." };
            }
        } else {
            if (!videoUrlToSave) return { success: false, error: "URL requerida." };
            if (oldVideoStoragePath) await eliminarImagenStorage(oldVideoStoragePath);
            tamañoBytesToSave = null;
        }

        const newVideoData = {
            ofertaId: ofertaId,
            videoUrl: videoUrlToSave!,
            tipoVideo: validatedData.tipoVideo,
            titulo: validatedData.titulo,
            descripcion: validatedData.descripcion,
            orden: 0,
            tamañoBytes: tamañoBytesToSave,
        };

        const savedVideo = await prisma.$transaction(async (tx) => {
            if (existingVideo) {
                await tx.ofertaVideos.delete({ where: { id: existingVideo.id } });
            }
            const createdVideo = await tx.ofertaVideos.create({ data: newVideoData });
            const storageDiff = (BigInt(tamañoBytesToSave ?? 0)) - oldVideoSize;
            if (storageDiff !== BigInt(0)) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { increment: Number(storageDiff) } }
                });
            }
            return createdVideo;
        });

        const validationResultOutput = OfertaVideoItemSchema.parse(savedVideo);
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true, data: validationResultOutput };

    } catch (error: unknown) {
        console.error(`Error guardarVideoOfertaAction (${ofertaId}):`, error);
        return { success: false, error: `Error al guardar video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarVideoDeOfertaAction(
    videoOfertaId: string, negocioId: string, clienteId: string, ofertaId: string
): Promise<ActionResult<void>> {
    if (!videoOfertaId || !negocioId) return { success: false, error: "Faltan IDs." };
    try {
        const video = await prisma.ofertaVideos.findUnique({
            where: { id: videoOfertaId, ofertaId: ofertaId },
            select: { videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });
        if (!video) return { success: false, error: "Video no encontrado." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaVideos.delete({ where: { id: videoOfertaId } });
            if (video.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO && video.videoUrl) {
                await eliminarImagenStorage(video.videoUrl);
            }
            if (video.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO && video.tamañoBytes && video.tamañoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: video.tamañoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error eliminando video de oferta ${videoOfertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: true, error: "El video ya había sido eliminado." };
        return { success: false, error: `Error al eliminar video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
