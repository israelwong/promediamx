// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/ofertaGaleria.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';
import { z } from 'zod';

import {
    OfertaGaleriaItemSchema,
    type OfertaGaleriaItemType,
    ActualizarDetallesImagenGaleriaOfertaSchema,
    type ActualizarDetallesImagenGaleriaOfertaData,
    ReordenarImagenesGaleriaOfertaSchema,
    type ReordenarImagenesGaleriaOfertaData
} from './ofertaGaleria.schemas'; // Ajustar ruta si es necesario

const MAX_IMAGES_PER_OFERTA_GALLERY = 8; // Límite de ejemplo

// Helper para la ruta de revalidación (página de edición de la oferta)
const getPathToOfertaEdicion = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;

export async function obtenerImagenesGaleriaOfertaAction(
    ofertaId: string
): Promise<ActionResult<OfertaGaleriaItemType[]>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    try {
        const imagenesDb = await prisma.ofertaGaleria.findMany({
            where: { ofertaId: ofertaId },
            orderBy: { orden: 'asc' },
        });

        const parseResults = imagenesDb.map(img => OfertaGaleriaItemSchema.safeParse(img));
        const validImagenes: OfertaGaleriaItemType[] = [];
        parseResults.forEach((res, index) => {
            if (res.success) {
                validImagenes.push(res.data);
            } else {
                console.warn(`Datos de imagen de galería de oferta inválidos para ID ${imagenesDb[index]?.id}:`, res.error.flatten());
            }
        });
        return { success: true, data: validImagenes };
    } catch (error) {
        console.error("Error en obtenerImagenesGaleriaOfertaAction:", error);
        return { success: false, error: "No se pudieron obtener las imágenes de la galería de la oferta." };
    }
}

export async function agregarImagenAGaleriaOfertaAction(
    ofertaId: string,
    negocioId: string, // Para la ruta de storage y actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string, // Para revalidatePath
    formData: FormData
): Promise<ActionResult<OfertaGaleriaItemType>> {
    if (!ofertaId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto (oferta, negocio, cliente)." };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: "Archivo no encontrado." };

    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido.' };
    }

    try {
        const count = await prisma.ofertaGaleria.count({ where: { ofertaId: ofertaId } });
        if (count >= MAX_IMAGES_PER_OFERTA_GALLERY) {
            return { success: false, error: `Límite de ${MAX_IMAGES_PER_OFERTA_GALLERY} imágenes alcanzado.` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Ruta de almacenamiento: Negocios/{negocioId}/Ofertas/{ofertaId}/Galeria/{filename}
        const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Galeria/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir imagen." };
        }

        const tamañoBytes = file.size;
        const ultimoItem = await prisma.ofertaGaleria.findFirst({
            where: { ofertaId: ofertaId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const [dbRecord] = await prisma.$transaction([
            prisma.ofertaGaleria.create({
                data: {
                    ofertaId: ofertaId,
                    imageUrl: uploadResult.publicUrl,
                    orden: nuevoOrden,
                    tamañoBytes: tamañoBytes,
                    // altText y descripcion se pueden añadir/editar después
                }
            }),
            prisma.negocio.update({
                where: { id: negocioId },
                data: { almacenamientoUsadoBytes: { increment: tamañoBytes } },
            })
        ]);

        const validationResult = OfertaGaleriaItemSchema.parse(dbRecord);

        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true, data: validationResult };

    } catch (error: unknown) {
        console.error(`Error en agregarImagenAGaleriaOfertaAction (${ofertaId}):`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesImagenGaleriaOfertaAction(
    imagenGaleriaId: string,
    clienteId: string, negocioId: string, ofertaId: string, // IDs para revalidación y scope
    data: ActualizarDetallesImagenGaleriaOfertaData
): Promise<ActionResult<OfertaGaleriaItemType>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen." };

    const validation = ActualizarDetallesImagenGaleriaOfertaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { altText, descripcion } = validation.data;

    try {
        const imagenExistente = await prisma.ofertaGaleria.findFirst({
            where: { id: imagenGaleriaId, ofertaId: ofertaId }
        });
        if (!imagenExistente) return { success: false, error: "Imagen no encontrada o no pertenece a esta oferta." };

        const dataToUpdate: Prisma.OfertaGaleriaUpdateInput = {};
        if (altText !== undefined) dataToUpdate.altText = altText;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const parsedCurrent = OfertaGaleriaItemSchema.parse(imagenExistente);
            return { success: true, data: parsedCurrent, error: "No hay detalles para actualizar." };
        }

        const imagenActualizada = await prisma.ofertaGaleria.update({
            where: { id: imagenGaleriaId }, data: dataToUpdate,
        });

        const parsedUpdated = OfertaGaleriaItemSchema.parse(imagenActualizada);
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true, data: parsedUpdated };
    } catch (error: unknown) {
        console.error(`Error actualizando detalles de imagen ${imagenGaleriaId}:`, error);
        if (error && typeof error === 'object' && 'flatten' in error && error instanceof z.ZodError) {
            // Filtrar los undefined para cumplir con Record<string, string[]>
            const filteredFieldErrors = Object.fromEntries(
                Object.entries(error.flatten().fieldErrors).filter(([v]) => Array.isArray(v))
                    .map(([k, v]) => [k, v ?? []])
            );
            return { success: false, error: "Datos de imagen con formato inesperado.", errorDetails: filteredFieldErrors };
        }
        return { success: false, error: `Error al actualizar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarImagenDeGaleriaOfertaAction(
    imagenGaleriaId: string, negocioId: string, clienteId: string, ofertaId: string
): Promise<ActionResult<void>> {
    if (!imagenGaleriaId || !negocioId) return { success: false, error: "Faltan IDs." };
    try {
        const imagen = await prisma.ofertaGaleria.findUnique({
            where: { id: imagenGaleriaId, ofertaId: ofertaId },
            select: { imageUrl: true, tamañoBytes: true }
        });
        if (!imagen) return { success: false, error: "Imagen no encontrada." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaGaleria.delete({ where: { id: imagenGaleriaId } });
            if (imagen.imageUrl) {
                const delRes = await eliminarImagenStorage(imagen.imageUrl);
                if (!delRes.success) console.warn(`Error eliminando de Storage (${imagen.imageUrl}): ${delRes.error}`);
            }
            if (imagen.tamañoBytes && imagen.tamañoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: imagen.tamañoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error eliminando imagen ${imagenGaleriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: true, error: "La imagen ya había sido eliminada." };
        return { success: false, error: `Error al eliminar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenImagenesGaleriaOfertaAction(
    ofertaId: string, negocioId: string, clienteId: string,
    ordenes: ReordenarImagenesGaleriaOfertaData
): Promise<ActionResult<void>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    const validation = ReordenarImagenesGaleriaOfertaSchema.safeParse(ordenes);
    if (!validation.success) {
        const filteredFieldErrors: Record<string, string[]> = Object.fromEntries(
            Object.entries(validation.error.flatten().fieldErrors)
                .map(([k, v]) => [k, v ?? []])
        );
        return { success: false, error: "Datos de orden inválidos.", errorDetails: filteredFieldErrors };
    }

    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0) return { success: true };

    try {
        await prisma.$transaction(
            ordenesValidadas.map((img) =>
                prisma.ofertaGaleria.update({
                    where: { id: img.id, ofertaId: ofertaId },
                    data: { orden: img.orden },
                })
            )
        );
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería oferta ${ofertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: false, error: "Una o más imágenes no se encontraron." };
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
