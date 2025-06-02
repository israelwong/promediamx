'use server';

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta tu ruta
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage as subirArchivoStorage, eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/imageHandler.actions'; // Reutilizando
// import { z } from 'zod';

import {
    OfertaDetalleGaleriaItemSchema,
    type OfertaDetalleGaleriaItemType,
    ActualizarDetallesImagenDetalleGaleriaSchema,
    type ActualizarDetallesImagenDetalleGaleriaData,
    ReordenarImagenesDetalleGaleriaSchema, // No es ReordenarImagenesGaleriaOfertaSchema
    type ReordenarImagenesDetalleGaleriaData
} from './ofertaDetalleGaleria.schemas';

const MAX_IMAGES_PER_DETALLE_GALLERY = 5; // Límite de ejemplo para galería de detalle

// Helper para la ruta de revalidación (página de edición del OFERTA DETALLE)
// Necesitamos ofertaId para construir la ruta completa.
const getPathToOfertaDetalleEdicion = (clienteId: string, negocioId: string, ofertaId: string, ofertaDetalleId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/editar/${ofertaDetalleId}`;

export async function obtenerImagenesGaleriaDetalleAction(
    ofertaDetalleId: string // Ahora es ofertaDetalleId
): Promise<ActionResult<OfertaDetalleGaleriaItemType[]>> {
    if (!ofertaDetalleId) return { success: false, error: "ID de detalle de oferta requerido." };
    try {
        const imagenesDb = await prisma.ofertaDetalleGaleria.findMany({
            where: { ofertaDetalleId: ofertaDetalleId }, // Cambiado
            orderBy: { orden: 'asc' },
        });

        const parseResults = imagenesDb.map(img => OfertaDetalleGaleriaItemSchema.safeParse(img));
        const validImagenes: OfertaDetalleGaleriaItemType[] = [];
        parseResults.forEach((res, index) => {
            if (res.success) {
                validImagenes.push(res.data);
            } else {
                console.warn(`Datos de imagen de galería de detalle inválidos para ID ${imagenesDb[index]?.id}:`, res.error.flatten());
            }
        });
        return { success: true, data: validImagenes };
    } catch (error) {
        console.error("Error en obtenerImagenesGaleriaDetalleAction:", error);
        return { success: false, error: "No se pudieron obtener las imágenes de la galería del detalle." };
    }
}

export async function agregarImagenAGaleriaDetalleAction(
    ofertaDetalleId: string, // ownerEntityId
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Necesario para el path de storage y revalidación
    formData: FormData
): Promise<ActionResult<OfertaDetalleGaleriaItemType>> {
    if (!ofertaDetalleId || !negocioId || !clienteId || !ofertaId) {
        return { success: false, error: "Faltan IDs de contexto (detalle, oferta, negocio, cliente)." };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: "Archivo no encontrado." };

    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']; // SVG opcional
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido.' };
    }

    try {
        const count = await prisma.ofertaDetalleGaleria.count({ where: { ofertaDetalleId: ofertaDetalleId } });
        if (count >= MAX_IMAGES_PER_DETALLE_GALLERY) {
            return { success: false, error: `Límite de ${MAX_IMAGES_PER_DETALLE_GALLERY} imágenes por detalle alcanzado.` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Ruta de almacenamiento más específica:
        const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Detalles/${ofertaDetalleId}/Galeria/${uniqueFileName}`;

        const uploadResult = await subirArchivoStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir imagen." };
        }

        const tamañoBytes = file.size;
        const ultimoItem = await prisma.ofertaDetalleGaleria.findFirst({
            where: { ofertaDetalleId: ofertaDetalleId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const [dbRecord] = await prisma.$transaction([
            prisma.ofertaDetalleGaleria.create({ // Cambiado
                data: {
                    ofertaDetalleId: ofertaDetalleId, // Cambiado
                    imageUrl: uploadResult.publicUrl,
                    orden: nuevoOrden,
                    tamañoBytes: tamañoBytes,
                }
            }),
            prisma.negocio.update({
                where: { id: negocioId },
                data: { almacenamientoUsadoBytes: { increment: tamañoBytes } },
            })
        ]);

        const validationResult = OfertaDetalleGaleriaItemSchema.parse(dbRecord);

        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true, data: validationResult };

    } catch (error: unknown) {
        console.error(`Error en agregarImagenAGaleriaDetalleAction (${ofertaDetalleId}):`, error);
        return { success: false, error: `Error al añadir imagen al detalle: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesImagenDetalleGaleriaAction(
    imagenGaleriaId: string, // ID del OfertaDetalleGaleriaItem
    clienteId: string,
    negocioId: string,
    ofertaId: string,      // Para revalidación de path
    ofertaDetalleId: string, // Para scope y revalidación
    data: ActualizarDetallesImagenDetalleGaleriaData
): Promise<ActionResult<OfertaDetalleGaleriaItemType>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen de galería." };

    const validation = ActualizarDetallesImagenDetalleGaleriaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { altText, descripcion } = validation.data;

    try {
        const imagenExistente = await prisma.ofertaDetalleGaleria.findFirst({ // Cambiado
            where: { id: imagenGaleriaId, ofertaDetalleId: ofertaDetalleId } // Verificación de pertenencia
        });
        if (!imagenExistente) return { success: false, error: "Imagen no encontrada o no pertenece a este detalle de oferta." };

        const dataToUpdate: Prisma.OfertaDetalleGaleriaUpdateInput = {}; // Cambiado
        if (altText !== undefined) dataToUpdate.altText = altText;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const parsedCurrent = OfertaDetalleGaleriaItemSchema.parse(imagenExistente);
            return { success: true, data: parsedCurrent, error: "No hay detalles para actualizar." };
        }

        const imagenActualizada = await prisma.ofertaDetalleGaleria.update({ // Cambiado
            where: { id: imagenGaleriaId }, data: dataToUpdate,
        });

        const parsedUpdated = OfertaDetalleGaleriaItemSchema.parse(imagenActualizada);
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true, data: parsedUpdated };
    } catch (error: unknown) {
        // ... (manejo de error similar)
        console.error(`Error actualizando detalles de imagen de detalle ${imagenGaleriaId}:`, error);
        return { success: false, error: `Error al actualizar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarImagenDeDetalleGaleriaAction(
    imagenGaleriaId: string,
    negocioId: string,
    clienteId: string,
    ofertaId: string,      // Para revalidación
    ofertaDetalleId: string  // Para scope y revalidación
): Promise<ActionResult<void>> {
    if (!imagenGaleriaId || !negocioId) return { success: false, error: "Faltan IDs." };
    try {
        const imagen = await prisma.ofertaDetalleGaleria.findUnique({ // Cambiado
            where: { id: imagenGaleriaId, ofertaDetalleId: ofertaDetalleId }, // Verificación de pertenencia
            select: { imageUrl: true, tamañoBytes: true }
        });
        if (!imagen) return { success: false, error: "Imagen no encontrada." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaDetalleGaleria.delete({ where: { id: imagenGaleriaId } }); // Cambiado
            if (imagen.imageUrl) {
                await eliminarArchivoStorage(imagen.imageUrl);
            }
            if (imagen.tamañoBytes && imagen.tamañoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: imagen.tamañoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true };
    } catch (error: unknown) {
        // ... (manejo de error similar)
        console.error(`Error eliminando imagen de detalle ${imagenGaleriaId}:`, error);
        return { success: false, error: `Error al eliminar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenImagenesDetalleGaleriaAction(
    ofertaDetalleId: string, // ownerEntityId
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Para revalidación
    ordenes: ReordenarImagenesDetalleGaleriaData // Tipo de datos específico
): Promise<ActionResult<void>> {
    if (!ofertaDetalleId) return { success: false, error: "ID de detalle de oferta requerido." };

    const validation = ReordenarImagenesDetalleGaleriaSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .filter(([key]) => isNaN(Number(key))) // keep only string keys
                    .map(([key, value]) => [key, value ?? []])
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0 && ordenes.length > 0) { // Si se pasó un array pero Zod lo limpió por errores
        return { success: false, error: "Formato de datos de orden inválido." };
    }
    if (ordenesValidadas.length === 0) return { success: true }; // Nada que hacer si el array validado está vacío


    try {
        await prisma.$transaction(
            ordenesValidadas.map((img) =>
                prisma.ofertaDetalleGaleria.update({ // Cambiado
                    where: { id: img.id, ofertaDetalleId: ofertaDetalleId }, // Verificación de pertenencia
                    data: { orden: img.orden },
                })
            )
        );
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true };
    } catch (error) {
        // ... (manejo de error similar)
        console.error(`Error actualizando orden galería detalle ${ofertaDetalleId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}