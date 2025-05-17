// Sugerencia de Ruta: @/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';

import {
    ItemCatalogoGaleriaItemSchema, // Para validar la salida si es necesario
    type ItemCatalogoGaleriaItemType,
    ActualizarDetallesImagenGaleriaItemSchema,
    type ActualizarDetallesImagenGaleriaItemData,
    ReordenarImagenesGaleriaItemSchema,
    type ReordenarImagenesGaleriaItemData
} from './itemCatalogoGaleria.schemas';

// Helper para la ruta de revalidación (página de edición del ítem)
const getPathToItemEdicion = (clienteId: string, negocioId: string, catalogoId: string, itemId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`;

export async function obtenerImagenesGaleriaItemAction(
    itemId: string
): Promise<ActionResult<ItemCatalogoGaleriaItemType[]>> {
    if (!itemId) return { success: false, error: "ID de ítem de catálogo requerido." };
    try {
        const imagenes = await prisma.itemCatalogoGaleria.findMany({
            where: { itemCatalogoId: itemId },
            orderBy: { orden: 'asc' },
        });

        // Validar cada imagen con el schema Zod antes de devolverla
        const validationResults = imagenes.map(img => ItemCatalogoGaleriaItemSchema.safeParse(img));
        const validImagenes: ItemCatalogoGaleriaItemType[] = [];
        validationResults.forEach((res, index) => {
            if (res.success) {
                validImagenes.push(res.data);
            } else {
                console.warn(`Datos de imagen de galería de ítem inválidos para ID ${imagenes[index]?.id}:`, res.error.flatten());
            }
        });

        return { success: true, data: validImagenes };
    } catch (error) {
        console.error("Error obtenerImagenesGaleriaItemAction:", error);
        return { success: false, error: "No se pudieron obtener las imágenes de la galería del ítem." };
    }
}

export async function agregarImagenAGaleriaItemAction(
    itemId: string,
    negocioId: string, // Necesario para la ruta de storage y actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string, // Para revalidatePath
    catalogoId: string, // Para revalidatePath
    formData: FormData,
    MAX_IMAGES_PER_ITEM_GALLERY: number // Límite de imágenes por ítem
): Promise<ActionResult<ItemCatalogoGaleriaItemType>> {
    if (!itemId || !negocioId || !clienteId || !catalogoId) {
        return { success: false, error: "Faltan IDs de contexto (ítem, negocio, cliente, catálogo)." };
    }

    const file = formData.get('file') as File | null;
    // Los metadatos como altText o descripción se pueden añadir aquí si se pasan en FormData
    // const altText = formData.get('altText') as string | null;
    // const descripcion = formData.get('descripcion') as string | null;

    if (!file) return { success: false, error: "Archivo no encontrado en FormData." };

    // Validación básica del archivo en el servidor
    const MAX_FILE_SIZE_MB = 5; // Límite por archivo
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP, GIF).' };
    }


    try {
        const count = await prisma.itemCatalogoGaleria.count({ where: { itemCatalogoId: itemId } });
        if (count >= MAX_IMAGES_PER_ITEM_GALLERY) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_ITEM_GALLERY} imágenes máximo por ítem).` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Catalogos/${catalogoId}/Items/${itemId}/Galeria/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir imagen al storage." };
        }

        const tamañoBytes = file.size; // Tamaño del archivo (comprimido por el cliente)

        const ultimoItem = await prisma.itemCatalogoGaleria.findFirst({
            where: { itemCatalogoId: itemId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const [nuevaImagen] = await prisma.$transaction([
            prisma.itemCatalogoGaleria.create({
                data: {
                    itemCatalogoId: itemId,
                    imageUrl: uploadResult.publicUrl,
                    // altText: altText, // Si se pasan
                    // descripcion: descripcion, // Si se pasan
                    orden: nuevoOrden,
                    tamañoBytes: tamañoBytes,
                }
            }),
            prisma.negocio.update({ // Actualizar almacenamiento del negocio
                where: { id: negocioId },
                data: {
                    almacenamientoUsadoBytes: {
                        increment: tamañoBytes,
                    },
                },
            })
        ]);

        // Validar la salida con Zod
        const validationResult = ItemCatalogoGaleriaItemSchema.safeParse(nuevaImagen);
        if (!validationResult.success) {
            console.error("Error de validación Zod para nueva imagen de galería de ítem:", validationResult.error.flatten());
            // Aquí podrías decidir si eliminar la imagen subida si la validación de BD falla, aunque es poco común si los tipos coinciden.
            return { success: false, error: "Datos de imagen creados con formato inesperado." };
        }

        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true, data: validationResult.data };

    } catch (error: unknown) {
        console.error(`Error agregarImagenAGaleriaItemAction (${itemId}):`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesImagenGaleriaItemAction(
    imagenGaleriaId: string,
    // IDs para revalidación y scope
    clienteId: string,
    negocioId: string,
    catalogoId: string,
    itemId: string,
    data: ActualizarDetallesImagenGaleriaItemData
): Promise<ActionResult<ItemCatalogoGaleriaItemType>> {
    if (!imagenGaleriaId) return { success: false, error: "Falta ID de imagen de galería." };

    const validation = ActualizarDetallesImagenGaleriaItemSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para actualizar detalles.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { altText, descripcion } = validation.data;

    try {
        // Asegurar que la imagen pertenezca al ítem correcto
        const imagenExistente = await prisma.itemCatalogoGaleria.findFirst({
            where: { id: imagenGaleriaId, itemCatalogoId: itemId }
        });
        if (!imagenExistente) return { success: false, error: "Imagen no encontrada o no pertenece a este ítem." };


        const dataToUpdate: Prisma.ItemCatalogoGaleriaUpdateInput = {};
        // Solo incluir campos si se proporcionaron (para no sobrescribir con undefined si el schema los permite)
        if (altText !== undefined) dataToUpdate.altText = altText; // Zod ya manejó si es string vacío a null si es .nullish()
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const validatedCurrent = ItemCatalogoGaleriaItemSchema.parse(imagenExistente);
            return { success: true, data: validatedCurrent, error: "No hay detalles para actualizar." };
        }

        const imagenActualizada = await prisma.itemCatalogoGaleria.update({
            where: { id: imagenGaleriaId },
            data: dataToUpdate,
        });

        const validatedData = ItemCatalogoGaleriaItemSchema.parse(imagenActualizada);
        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true, data: validatedData };
    } catch (error: unknown) {
        console.error(`Error actualizando detalles de imagen de galería de ítem ${imagenGaleriaId}:`, error);
        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: "Datos de imagen actualizados con formato inesperado.",
                errorDetails: Object.fromEntries(
                    Object.entries(error.flatten().fieldErrors).filter(([value]) => value !== undefined) as [string, string[]][]
                )
            };
        }
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarImagenDeGaleriaItemAction(
    imagenGaleriaId: string,
    negocioId: string,
    clienteId: string,
    catalogoId: string,
    itemId: string
): Promise<ActionResult<void>> {
    if (!imagenGaleriaId || !negocioId) {
        return { success: false, error: "Faltan IDs (imagen o negocio)." };
    }

    try {
        const imagen = await prisma.itemCatalogoGaleria.findUnique({
            where: { id: imagenGaleriaId, itemCatalogoId: itemId }, // Asegurar que pertenece al ítem
            select: { imageUrl: true, tamañoBytes: true }
        });

        if (!imagen) {
            return { success: false, error: "Imagen no encontrada o no pertenece a este ítem." };
        }

        await prisma.$transaction(async (tx) => {
            await tx.itemCatalogoGaleria.delete({
                where: { id: imagenGaleriaId },
            });

            if (imagen.imageUrl) {
                const deleteStorageResult = await eliminarImagenStorage(imagen.imageUrl);
                if (!deleteStorageResult.success) {
                    console.warn(`Error eliminando de Storage (${imagen.imageUrl}): ${deleteStorageResult.error}`);
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

        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true };

    } catch (error: unknown) {
        console.error(`Error eliminando imagen de galería de ítem ${imagenGaleriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "La imagen ya había sido eliminada." };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenImagenesGaleriaItemAction(
    itemId: string, // ID del ítem dueño de la galería
    negocioId: string,
    clienteId: string,
    catalogoId: string,
    ordenes: ReordenarImagenesGaleriaItemData
): Promise<ActionResult<void>> {
    if (!itemId) return { success: false, error: "ID de ítem requerido." };

    const validation = ReordenarImagenesGaleriaItemSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors).filter(([value]) => value !== undefined) as [string, string[]][]
            )
        };
    }
    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0) return { success: true }; // Nada que hacer

    try {
        await prisma.$transaction(
            ordenesValidadas.map((img) =>
                prisma.itemCatalogoGaleria.update({
                    where: { id: img.id, itemCatalogoId: itemId }, // Asegurar que la imagen pertenece al ítem
                    data: { orden: img.orden },
                })
            )
        );
        revalidatePath(getPathToItemEdicion(clienteId, negocioId, catalogoId, itemId));
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería ítem ${itemId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Una o más imágenes no se encontraron para actualizar el orden." };
        }
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
