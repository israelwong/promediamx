// Ruta: app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions'; // Ajusta ruta si es diferente
import {
    NegocioPaqueteGaleriaItem,
    // CrearNegocioPaqueteGaleriaItemMetadataSchema,
    ActualizarDetallesImagenGaleriaPaqueteSchema,
    ActualizarDetallesImagenGaleriaPaqueteData,
    ReordenarImagenesGaleriaPaqueteData,
    ReordenarImagenesGaleriaPaqueteSchema
} from './negocioPaqueteGaleria.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

const MAX_IMAGES_PER_PAQUETE_GALLERY = 10; // Límite de ejemplo

// Helper para la ruta de revalidación (página de edición del paquete)
const getPathToPaqueteEdicion = (clienteId: string, negocioId: string, paqueteId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquete/${paqueteId}`; // O la subruta específica donde está la galería

export async function obtenerImagenesGaleriaPaqueteAction(
    paqueteId: string
): Promise<ActionResult<NegocioPaqueteGaleriaItem[]>> {
    if (!paqueteId) return { success: false, error: "ID de paquete requerido." };
    try {
        const imagenes = await prisma.negocioPaqueteGaleria.findMany({
            where: { negocioPaqueteId: paqueteId },
            orderBy: { orden: 'asc' },
        });

        const formattedImagenes = imagenes.map(imagen => ({
            ...imagen,
            orden: imagen.orden ?? 0, // Ensure 'orden' is always a number
        }));

        return { success: true, data: formattedImagenes };
    } catch (error) {
        console.error("Error obtenerImagenesGaleriaPaqueteAction:", error);
        return { success: false, error: "No se pudieron obtener las imágenes de la galería." };
    }
}

export async function agregarImagenAGaleriaPaqueteAction(
    paqueteId: string,
    negocioId: string,
    clienteId: string,
    formData: FormData
): Promise<ActionResult<NegocioPaqueteGaleriaItem>> {
    if (!paqueteId || !negocioId) {
        return { success: false, error: "Faltan IDs (paquete o negocio)." };
    }

    const file = formData.get('file') as File | null;

    if (!file) return { success: false, error: "Archivo no encontrado en FormData." };

    try {
        // Verificar límite de imágenes
        const count = await prisma.negocioPaqueteGaleria.count({ where: { negocioPaqueteId: paqueteId } });
        if (count >= MAX_IMAGES_PER_PAQUETE_GALLERY) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_PAQUETE_GALLERY} imágenes máximo).` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Ruta más específica para paquetes de negocio
        const filePath = `Negocios/${negocioId}/Paquete/${paqueteId}/Galeria/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir imagen al storage." };
        }

        const tamañoBytes = file.size;

        // Determinar el siguiente orden
        const ultimoItem = await prisma.negocioPaqueteGaleria.findFirst({
            where: { negocioPaqueteId: paqueteId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        // Transacción: crear imagen en galería y actualizar almacenamiento del negocio
        const [nuevaImagen] = await prisma.$transaction([
            prisma.negocioPaqueteGaleria.create({
                data: {
                    negocioPaqueteId: paqueteId,
                    imageUrl: uploadResult.publicUrl,
                    // altText: validatedMetadata.altText || null,
                    // descripcion: validatedMetadata.descripcion || null,
                    orden: nuevoOrden,
                    tamañoBytes: tamañoBytes,
                }
            }),
            prisma.negocio.update({
                where: { id: negocioId },
                data: {
                    almacenamientoUsadoBytes: {
                        increment: tamañoBytes,
                    },
                },
            })
        ]);

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        return { success: true, data: { ...nuevaImagen, orden: nuevaImagen.orden ?? 0 } };

    } catch (error: unknown) {
        console.error(`Error agregarImagenAGaleriaPaqueteAction (${paqueteId}):`, error);
        // Si la subida a Supabase falló y se lanzó un error,
        // no se habrá creado el registro en Prisma ni actualizado el almacenamiento.
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesImagenGaleriaPaqueteAction(
    imagenGaleriaId: string,
    clienteId: string,
    negocioId: string,
    paqueteId: string, // Para revalidatePath
    data: ActualizarDetallesImagenGaleriaPaqueteData
): Promise<ActionResult<NegocioPaqueteGaleriaItem>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen." };

    const validation = ActualizarDetallesImagenGaleriaPaqueteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    try {
        const dataToUpdate: Prisma.NegocioPaqueteGaleriaUpdateInput = {};
        if (validation.data.altText !== undefined) dataToUpdate.altText = validation.data.altText || null;
        if (validation.data.descripcion !== undefined) dataToUpdate.descripcion = validation.data.descripcion || null;

        if (Object.keys(dataToUpdate).length === 0) {
            // Podríamos buscar y devolver la imagen actual si es necesario
            const imagenExistente = await prisma.negocioPaqueteGaleria.findUnique({ where: { id: imagenGaleriaId } });
            if (!imagenExistente) return { success: false, error: "Imagen no encontrada." };
            return { success: true, data: { ...imagenExistente, orden: imagenExistente.orden ?? 0 } };
        }

        const imagenActualizada = await prisma.negocioPaqueteGaleria.update({
            where: { id: imagenGaleriaId },
            data: dataToUpdate,
        });

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        return { success: true, data: { ...imagenActualizada, orden: imagenActualizada.orden ?? 0 } };
    } catch (error: unknown) {
        console.error(`Error actualizando detalles de imagen ${imagenGaleriaId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


export async function eliminarImagenDeGaleriaPaqueteAction(
    imagenGaleriaId: string,
    negocioId: string, // Para actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string, // Para revalidatePath
    paqueteId: string // Para revalidatePath
): Promise<ActionResult<void>> {
    if (!imagenGaleriaId || !negocioId) {
        return { success: false, error: "Faltan IDs (imagen o negocio)." };
    }

    try {
        const imagen = await prisma.negocioPaqueteGaleria.findUnique({
            where: { id: imagenGaleriaId },
            select: { imageUrl: true, tamañoBytes: true }
        });

        if (!imagen) {
            return { success: false, error: "Imagen no encontrada en la base de datos." };
        }

        // Transacción: eliminar de BD y storage, y actualizar almacenamiento del negocio
        await prisma.$transaction(async (tx) => {
            await tx.negocioPaqueteGaleria.delete({
                where: { id: imagenGaleriaId },
            });

            if (imagen.imageUrl) {
                const deleteStorageResult = await eliminarImagenStorage(imagen.imageUrl);
                if (!deleteStorageResult.success) {
                    // Loggear pero no necesariamente fallar la transacción,
                    // el registro de BD ya se eliminó. Podría ser una tarea de limpieza posterior.
                    console.warn(`Error eliminando de Supabase Storage (${imagen.imageUrl}): ${deleteStorageResult.error}`);
                }
            }

            if (imagen.tamañoBytes && imagen.tamañoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: {
                        almacenamientoUsadoBytes: {
                            decrement: imagen.tamañoBytes,
                        },
                    },
                });
            }
        });

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        return { success: true };

    } catch (error: unknown) {
        console.error(`Error eliminando imagen ${imagenGaleriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Imagen no encontrada (P2025)." };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenImagenesGaleriaPaqueteAction(
    paqueteId: string,
    negocioId: string, // Para revalidatePath y el scope de la query
    clienteId: string, // Para revalidatePath
    ordenes: ReordenarImagenesGaleriaPaqueteData
): Promise<ActionResult<void>> {
    if (!paqueteId) return { success: false, error: "ID de paquete requerido." };

    const validation = ReordenarImagenesGaleriaPaqueteSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: validation.error.flatten().fieldErrors as Record<string, string[]>
        };
    }

    try {
        await prisma.$transaction(
            validation.data.map((img) =>
                prisma.negocioPaqueteGaleria.update({
                    // Asegurarse que la imagen pertenezca al paquete correcto para seguridad
                    where: { id: img.id, negocioPaqueteId: paqueteId },
                    data: { orden: img.orden },
                })
            )
        );
        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería paquete ${paqueteId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
