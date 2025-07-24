// Ruta: app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions';
import {
    NegocioPaqueteVideoItem,
    UpsertNegocioPaqueteVideoSchema,
    UpsertNegocioPaqueteVideoData,
    TipoVideoEnum,
    TipoVideo
} from './negocioPaqueteVideo.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';

const getPathToPaqueteEdicion = (clienteId: string, negocioId: string, paqueteId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/${paqueteId}`;

const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

export async function obtenerVideoDelPaqueteAction(
    paqueteId: string
): Promise<ActionResult<NegocioPaqueteVideoItem | null>> {
    console.log(`[SA:obtenerVideo] Iniciando para paqueteId: ${paqueteId}`);
    if (!paqueteId) return { success: false, error: "ID de paquete requerido." };
    try {
        const video = await prisma.negocioPaqueteVideos.findFirst({
            where: { negocioPaqueteId: paqueteId },
            orderBy: { orden: 'asc' },
        });
        console.log(`[SA:obtenerVideo] Video encontrado:`, video);
        if (video) {
            const typedVideo: NegocioPaqueteVideoItem = {
                ...video,
                tipoVideo: video.tipoVideo as TipoVideo,
                orden: video.orden ?? 0,
                tamañoBytes: video.tamañoBytes ?? null,
                titulo: video.titulo ?? null,
                descripcion: video.descripcion ?? null,
            };
            return { success: true, data: typedVideo };
        }
        return { success: true, data: null };
    } catch (error) {
        console.error("[SA:obtenerVideo] Error:", error);
        return { success: false, error: "No se pudo obtener el video del paquete." };
    }
}

export async function guardarVideoPaqueteAction(
    paqueteId: string,
    negocioId: string,
    clienteId: string,
    data: UpsertNegocioPaqueteVideoData,
    file?: File
): Promise<ActionResult<NegocioPaqueteVideoItem>> {
    console.log(`[SA:guardarVideo] Iniciando. PaqueteId: ${paqueteId}, NegocioId: ${negocioId}`);
    console.log("[SA:guardarVideo] Datos recibidos (metadata):", data);
    if (file) {
        console.log(`[SA:guardarVideo] Archivo recibido: ${file.name}, Tamaño: ${file.size}, Tipo: ${file.type}`);
    } else {
        console.log("[SA:guardarVideo] No se recibió archivo (posiblemente URL externa o solo actualización de metadatos).");
    }

    if (!paqueteId || !negocioId) {
        return { success: false, error: "Faltan IDs (paquete o negocio)." };
    }

    const validation = UpsertNegocioPaqueteVideoSchema.safeParse(data);
    if (!validation.success) {
        console.error("[SA:guardarVideo] Validación de metadatos fallida:", validation.error.flatten());
        return { success: false, error: "Datos de video inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const validatedData = validation.data;
    let videoUrlToSave = validatedData.videoUrl;
    let tamañoBytesToSave: number | null = null;

    try {
        console.log("[SA:guardarVideo] Buscando video existente...");
        const existingVideo = await prisma.negocioPaqueteVideos.findFirst({
            where: { negocioPaqueteId: paqueteId },
            select: { id: true, videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });
        console.log("[SA:guardarVideo] Video existente:", existingVideo);

        if (validatedData.tipoVideo === TipoVideoEnum.enum.SUBIDO) {
            if (!file) {
                // Si es tipo SUBIDO y no hay archivo, Y NO hay un video existente de tipo SUBIDO que solo se esté actualizando en metadatos
                if (!existingVideo || existingVideo.tipoVideo !== TipoVideoEnum.enum.SUBIDO) {
                    console.error("[SA:guardarVideo] Error: Tipo SUBIDO pero no se proporcionó archivo y no hay video existente de tipo SUBIDO.");
                    return { success: false, error: "Archivo de video no proporcionado para la subida." };
                }
                // Si hay existingVideo y es SUBIDO, y no se envió 'file', es una actualización de metadatos.
                // En este caso, videoUrlToSave debería ser la URL existente.
                if (existingVideo && existingVideo.tipoVideo === TipoVideoEnum.enum.SUBIDO && !file) {
                    videoUrlToSave = existingVideo.videoUrl;
                    tamañoBytesToSave = existingVideo.tamañoBytes; // Mantener tamañoBytes existente
                    console.log("[SA:guardarVideo] Actualización de metadatos para video SUBIDO existente. URL:", videoUrlToSave);
                }
            }

            // Si hay un archivo (nuevo o para reemplazar)
            if (file) {
                console.log("[SA:guardarVideo] Procesando subida de nuevo archivo...");
                if (file.size > MAX_VIDEO_SIZE_BYTES) {
                    console.error(`[SA:guardarVideo] Error: Archivo excede límite de ${MAX_VIDEO_SIZE_MB}MB.`);
                    return { success: false, error: `El archivo de video excede el límite de ${MAX_VIDEO_SIZE_MB}MB.` };
                }
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const uniqueFileName = `${Date.now()}_video.${fileExtension}`;
                const filePath = `Negocios/${negocioId}/Paquetes/${paqueteId}/Video/${uniqueFileName}`;
                console.log(`[SA:guardarVideo] Subiendo a Supabase en ruta: ${filePath}`);

                const uploadResult = await subirImagenStorage(file, filePath);
                console.log("[SA:guardarVideo] Resultado de Supabase Storage:", uploadResult);
                if (!uploadResult.success || !uploadResult.publicUrl) {
                    return { success: false, error: uploadResult.error || "Error al subir video al storage." };
                }
                videoUrlToSave = uploadResult.publicUrl;
                tamañoBytesToSave = file.size;
            }
        } else { // Para URLs externas
            console.log("[SA:guardarVideo] Procesando URL externa:", videoUrlToSave);
            if (!videoUrlToSave || (!videoUrlToSave.startsWith('http://') && !videoUrlToSave.startsWith('https://'))) {
                console.error("[SA:guardarVideo] Error: URL externa inválida.");
                return { success: false, error: "La URL del video externo no es válida." };
            }
        }

        console.log("[SA:guardarVideo] Iniciando transacción Prisma...");
        const [newVideoRecordFromTx] = await prisma.$transaction(async (tx) => {
            let storageChange = 0;
            if (existingVideo) {
                console.log("[SA:guardarVideo] Video existente encontrado. Eliminando si es necesario...");
                // Si el video existente era SUBIDO y se está reemplazando o cambiando de tipo
                if (existingVideo.tipoVideo === TipoVideoEnum.enum.SUBIDO && existingVideo.tamañoBytes) {
                    // Solo decrementar y eliminar de storage si el nuevo video es diferente o tipo diferente
                    if ((validatedData.tipoVideo === TipoVideoEnum.enum.SUBIDO && file) || validatedData.tipoVideo !== TipoVideoEnum.enum.SUBIDO) {
                        storageChange -= existingVideo.tamañoBytes;
                        if (existingVideo.videoUrl) {
                            console.log(`[SA:guardarVideo] Eliminando video anterior de storage: ${existingVideo.videoUrl}`);
                            await eliminarImagenStorage(existingVideo.videoUrl);
                        }
                    }
                }
                console.log(`[SA:guardarVideo] Eliminando registro de video anterior de BD: ${existingVideo.id}`);
                await tx.negocioPaqueteVideos.delete({ where: { id: existingVideo.id } });
            }

            if (validatedData.tipoVideo === TipoVideoEnum.enum.SUBIDO && tamañoBytesToSave !== null) { // Asegurar que tamañoBytesToSave no sea null
                storageChange += tamañoBytesToSave;
            }

            console.log("[SA:guardarVideo] Creando nuevo registro de video en BD...");
            const createdVideo = await tx.negocioPaqueteVideos.create({
                data: {
                    negocioPaqueteId: paqueteId,
                    videoUrl: videoUrlToSave ?? '',
                    tipoVideo: validatedData.tipoVideo,
                    titulo: validatedData.titulo,
                    descripcion: validatedData.descripcion,
                    orden: 0,
                    tamañoBytes: tamañoBytesToSave,
                }
            });
            console.log("[SA:guardarVideo] Nuevo registro de video creado:", createdVideo);

            if (storageChange !== 0) {
                console.log(`[SA:guardarVideo] Actualizando almacenamiento del negocio. Cambio: ${storageChange}`);
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { increment: storageChange } },
                });
            }
            return [createdVideo, null];
        });
        console.log("[SA:guardarVideo] Transacción Prisma completada.");

        const savedVideo: NegocioPaqueteVideoItem = {
            ...newVideoRecordFromTx,
            tipoVideo: newVideoRecordFromTx.tipoVideo as TipoVideo,
            orden: newVideoRecordFromTx.orden ?? 0,
            tamañoBytes: newVideoRecordFromTx.tamañoBytes ?? null,
            titulo: newVideoRecordFromTx.titulo ?? null,
            descripcion: newVideoRecordFromTx.descripcion ?? null,
        };

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        console.log("[SA:guardarVideo] Acción completada con éxito. Video guardado:", savedVideo);
        return { success: true, data: savedVideo };

    } catch (error: unknown) {
        console.error(`[SA:guardarVideo] Error catch general (${paqueteId}):`, error);
        return { success: false, error: `Error al guardar el video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarVideoDelPaqueteAction(
    videoPaqueteId: string,
    negocioId: string,
    clienteId: string,
    paqueteId: string
): Promise<ActionResult<void>> {
    console.log(`[SA:eliminarVideo] Iniciando. VideoPaqueteId: ${videoPaqueteId}, NegocioId: ${negocioId}`);
    if (!videoPaqueteId || !negocioId) {
        return { success: false, error: "Faltan IDs (video o negocio)." };
    }
    try {
        const video = await prisma.negocioPaqueteVideos.findUnique({
            where: { id: videoPaqueteId },
            select: { videoUrl: true, tipoVideo: true, tamañoBytes: true }
        });
        console.log("[SA:eliminarVideo] Video a eliminar:", video);

        if (!video) return { success: false, error: "Video no encontrado." };

        await prisma.$transaction(async (tx) => {
            console.log("[SA:eliminarVideo] Eliminando registro de video de BD...");
            await tx.negocioPaqueteVideos.delete({
                where: { id: videoPaqueteId }
            });

            if (video.tipoVideo === TipoVideoEnum.enum.SUBIDO && video.videoUrl) {
                console.log(`[SA:eliminarVideo] Eliminando video de storage: ${video.videoUrl}`);
                await eliminarImagenStorage(video.videoUrl);
            }

            if (video.tipoVideo === TipoVideoEnum.enum.SUBIDO && video.tamañoBytes && video.tamañoBytes > 0) {
                console.log(`[SA:eliminarVideo] Actualizando almacenamiento del negocio. Decremento: ${video.tamañoBytes}`);
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: video.tamañoBytes } },
                });
            }
        });
        console.log("[SA:eliminarVideo] Transacción Prisma completada.");

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        console.log("[SA:eliminarVideo] Acción completada con éxito.");
        return { success: true };
    } catch (error: unknown) {
        console.error(`[SA:eliminarVideo] Error catch general (${videoPaqueteId}):`, error);
        return { success: false, error: `Error al eliminar el video: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
