'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage as subirArchivoStorage, eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/imageHandler.actions'; // Reutilizando

import {
    OfertaDetalleVideoItemSchema,
    type OfertaDetalleVideoItemType,
    UpsertOfertaDetalleVideoSchema,
    type UpsertOfertaDetalleVideoData,
    TipoVideoEnumSchema // Usamos el exportado localmente o el compartido
} from './ofertaDetalleVideos.schemas';

const MAX_VIDEO_SIZE_MB_SERVER_DETALLE = 25; // Puedes definir un límite diferente para videos de detalle
const MAX_VIDEO_SIZE_BYTES_SERVER_DETALLE = MAX_VIDEO_SIZE_MB_SERVER_DETALLE * 1024 * 1024;

// Helper para la ruta de revalidación (página de edición del OFERTA DETALLE)
const getPathToOfertaDetalleEdicion = (clienteId: string, negocioId: string, ofertaId: string, ofertaDetalleId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/editar/${ofertaDetalleId}`;

export async function obtenerVideoDeDetalleOfertaAction(
    ofertaDetalleId: string // Ahora es ofertaDetalleId
): Promise<ActionResult<OfertaDetalleVideoItemType | null>> {
    if (!ofertaDetalleId) return { success: false, error: "ID de detalle de oferta requerido." };
    try {
        // Buscamos por ofertaDetalleId ya que es una relación 1:1 (o 1:0)
        const video = await prisma.ofertaDetalleVideo.findUnique({
            where: { ofertaDetalleId: ofertaDetalleId },
        });
        if (!video) return { success: true, data: null }; // No es un error si no hay video

        const validationResult = OfertaDetalleVideoItemSchema.safeParse(video);
        if (!validationResult.success) {
            console.error("Error de validación Zod para video de detalle de oferta:", validationResult.error.flatten());
            return { success: false, error: "Datos de video de detalle con formato inesperado." };
        }
        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error("Error obtenerVideoDeDetalleOfertaAction:", error);
        return { success: false, error: "No se pudo obtener el video del detalle de la oferta." };
    }
}

export async function guardarVideoDetalleOfertaAction(
    ofertaDetalleId: string, // ownerEntityId
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Necesario para el path de storage y revalidación
    data: UpsertOfertaDetalleVideoData,
    file?: File
): Promise<ActionResult<OfertaDetalleVideoItemType>> {
    if (!ofertaDetalleId || !negocioId || !clienteId || !ofertaId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    const validation = UpsertOfertaDetalleVideoSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos de video inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const validatedData = validation.data;
    let videoUrlToSave = validatedData.videoUrl; // Puede ser null si es tipo SUBIDO y no hay file ni existingVideo
    let tamañoBytesToSave: number | null = null;

    try {
        const existingVideo = await prisma.ofertaDetalleVideo.findUnique({
            where: { ofertaDetalleId: ofertaDetalleId },
            select: { id: true, videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });

        let oldVideoStoragePath: string | null = null;
        let oldVideoSize = BigInt(0);

        if (existingVideo) {
            if (existingVideo.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && existingVideo.videoUrl) {
                oldVideoStoragePath = existingVideo.videoUrl;
                oldVideoSize = BigInt(existingVideo.tamañoBytes || 0);
            }
        }

        if (validatedData.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO) {
            if (file) { // Si se proporciona un nuevo archivo para subir
                if (file.size > MAX_VIDEO_SIZE_BYTES_SERVER_DETALLE) {
                    return { success: false, error: `El archivo excede ${MAX_VIDEO_SIZE_MB_SERVER_DETALLE}MB.` };
                }
                // Lógica de subida (similar a la de ofertaVideos.actions)
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const uniqueFileName = `${Date.now()}_detalle_video.${fileExtension}`;
                const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Detalles/${ofertaDetalleId}/Video/${uniqueFileName}`;

                const uploadResult = await subirArchivoStorage(file, filePath);
                if (!uploadResult.success || !uploadResult.publicUrl) {
                    return { success: false, error: uploadResult.error || "Error al subir video." };
                }
                videoUrlToSave = uploadResult.publicUrl;
                tamañoBytesToSave = file.size;

                // Si estamos reemplazando un video subido previamente, eliminar el antiguo del storage
                if (oldVideoStoragePath && oldVideoStoragePath !== videoUrlToSave) {
                    await eliminarArchivoStorage(oldVideoStoragePath);
                }
            } else if (existingVideo && existingVideo.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO) {
                // No hay nuevo archivo, y el tipo actual es SUBIDO, se mantienen los datos del video existente
                videoUrlToSave = existingVideo.videoUrl; // Mantener la URL existente
                tamañoBytesToSave = existingVideo.tamañoBytes; // Mantener tamaño existente
            } else if (!existingVideo) {
                // Es un nuevo video de tipo SUBIDO, pero no se adjuntó archivo (error)
                return { success: false, error: "Archivo no proporcionado para subida de nuevo video." };
            }
            // Si es existingVideo pero se cambió el tipo a SUBIDO sin file, es un error que el schema debería pillar o aquí

        } else { // El tipo NO es SUBIDO (YouTube, Vimeo, Otro_URL)
            if (!videoUrlToSave || videoUrlToSave.trim() === '') {
                return { success: false, error: "URL de video externa requerida." };
            }
            // Si antes había un video SUBIDO y ahora se cambia a un tipo URL, eliminar el archivo antiguo del storage
            if (oldVideoStoragePath) {
                await eliminarArchivoStorage(oldVideoStoragePath);
                // oldVideoSize ya se capturó y se usará para ajustar el almacenamiento del negocio
            }
            tamañoBytesToSave = null; // Los videos enlazados no ocupan tu almacenamiento
        }

        // Si no hay URL para guardar (ej. tipo SUBIDO sin archivo nuevo ni existente), es un error.
        if (!videoUrlToSave) {
            return { success: false, error: "No se pudo determinar la URL del video para guardar." };
        }

        const videoDataForDb = {
            ofertaDetalleId: ofertaDetalleId,
            videoUrl: videoUrlToSave,
            tipoVideo: validatedData.tipoVideo,
            titulo: validatedData.titulo,
            descripcion: validatedData.descripcion,
            // orden: 0, // No es necesario para relación 1:1 si el modelo no lo tiene
            tamañoBytes: tamañoBytesToSave,
        };

        const savedVideo = await prisma.$transaction(async (tx) => {
            // Upsert: crea si no existe, actualiza si existe (basado en ofertaDetalleId que es unique)
            const upsertedVideo = await tx.ofertaDetalleVideo.upsert({
                where: { ofertaDetalleId: ofertaDetalleId },
                update: videoDataForDb,
                create: videoDataForDb,
            });

            // Ajustar el contador de almacenamiento del negocio
            const storageDiff = BigInt(tamañoBytesToSave ?? 0) - oldVideoSize;
            if (storageDiff !== BigInt(0)) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { increment: Number(storageDiff) } }
                });
            }
            return upsertedVideo;
        });

        const validationResultOutput = OfertaDetalleVideoItemSchema.parse(savedVideo);
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true, data: validationResultOutput };

    } catch (error: unknown) {
        console.error(`Error guardarVideoDetalleOfertaAction (${ofertaDetalleId}):`, error);
        return { success: false, error: `Error al guardar video del detalle: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarVideoDeDetalleOfertaAction(
    videoDetalleId: string, // ID del registro OfertaDetalleVideo
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Para revalidación de path
    ofertaDetalleId: string // Para revalidación y consistencia
): Promise<ActionResult<void>> {
    if (!videoDetalleId || !negocioId) return { success: false, error: "Faltan IDs." };
    try {
        // Buscamos por su ID único, pero también podemos asegurar que pertenezca al ofertaDetalleId
        const video = await prisma.ofertaDetalleVideo.findUnique({
            where: { id: videoDetalleId, ofertaDetalleId: ofertaDetalleId },
            select: { videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });
        if (!video) return { success: false, error: "Video del detalle no encontrado." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaDetalleVideo.delete({ where: { id: videoDetalleId } });
            if (video.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && video.videoUrl) {
                await eliminarArchivoStorage(video.videoUrl); // Usar la función genérica
            }
            if (video.tipoVideo === TipoVideoEnumSchema.enum.SUBIDO && video.tamañoBytes && video.tamañoBytes > 0) {
                await tx.negocio.update({ // Actualizar contador de almacenamiento
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: video.tamañoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error eliminando video de detalle ${videoDetalleId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
            return { success: true }; // Ya fue eliminado
        }
        return { success: false, error: `Error al eliminar video del detalle: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}