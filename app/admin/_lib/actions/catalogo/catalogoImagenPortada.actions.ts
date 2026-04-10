// @/app/admin/_lib/actions/catalogo/catalogoImagenPortada.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions';

import { ActualizarImagenPortadaData } from './catalogoImagenPortada.schemas';

// Helper para obtener las rutas de revalidación
const getRevalidationPaths = (clienteId: string, negocioId: string, catalogoId: string) => {
    const basePathCatalogo = `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`;
    const basePathListaCatalogos = `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo`;
    return [basePathCatalogo, basePathListaCatalogos];
};

export async function actualizarImagenPortadaCatalogo(
    catalogoId: string,
    negocioId: string, // Necesario para actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string, // Necesario para revalidatePath
    formData: FormData
): Promise<ActionResult<ActualizarImagenPortadaData>> {
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: "No se proporcionó ningún archivo." };

    const maxSize = 10 * 1024 * 1024; // 10MB (el componente cliente puede tener una validación más estricta para el original)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.size > maxSize) return { success: false, error: `La imagen excede ${maxSize / 1024 / 1024}MB.` };
    if (!allowedTypes.includes(file.type)) return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP).' };

    let oldImageUrl: string | null = null;
    let oldImageSize = BigInt(0);

    try {
        const catalogoActual = await prisma.catalogo.findUnique({
            where: { id: catalogoId, negocioId: negocioId },
            select: {
                imagenPortadaUrl: true,
                imagenPortadaTamañoBytes: true, // Asumiendo que este campo existe
                negocioId: true, // Ya lo tenemos, pero para confirmar
            }
        });

        if (!catalogoActual) return { success: false, error: "Catálogo no encontrado o no pertenece al negocio." };

        oldImageUrl = catalogoActual.imagenPortadaUrl;
        oldImageSize = BigInt(catalogoActual.imagenPortadaTamañoBytes || 0);

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueFileName = `portada_${Date.now()}.${fileExtension}`;
        // Ruta en storage: Negocios/{negocioId}/Catalogos/{catalogoId}/Portada/{filename}
        const filePath = `Negocios/${negocioId}/Catalogos/${catalogoId}/Portada/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir nueva imagen de portada." };
        }
        const newImageUrl = uploadResult.publicUrl;
        const newImageSize = BigInt(file.size); // Tamaño del archivo subido (comprimido por el cliente)

        if (oldImageUrl && oldImageUrl !== newImageUrl) { // Si la URL es la misma, el archivo se sobrescribió
            const deleteOldResult = await eliminarImagenStorage(oldImageUrl);
            if (!deleteOldResult.success) {
                console.warn(`No se pudo eliminar la imagen de portada antigua (${oldImageUrl}) del storage: ${deleteOldResult.error}`);
            }
        }

        // Actualizar almacenamiento del negocio
        await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                almacenamientoUsadoBytes: {
                    // Decrementa el tamaño antiguo (si existía) y luego incrementa el nuevo
                    decrement: oldImageSize,
                }
            }
        });
        await prisma.negocio.update({ // Segunda actualización para el incremento para evitar problemas con decremento a negativo
            where: { id: negocioId },
            data: {
                almacenamientoUsadoBytes: {
                    increment: newImageSize
                }
            }
        });


        await prisma.catalogo.update({
            where: { id: catalogoId },
            data: {
                imagenPortadaUrl: newImageUrl,
                imagenPortadaTamañoBytes: Number(newImageSize), // Convertir bigint a number y guardar el tamaño del nuevo archivo
            },
        });

        const pathsToRevalidate = getRevalidationPaths(clienteId, negocioId, catalogoId);
        pathsToRevalidate.forEach(path => revalidatePath(path));
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}`); // Página del negocio

        return { success: true, data: { imageUrl: newImageUrl } };

    } catch (error) {
        console.error(`Error actualizando imagen portada catálogo ${catalogoId}:`, error);
        return { success: false, error: `Error al actualizar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarImagenPortadaCatalogo(
    catalogoId: string,
    negocioId: string, // Para actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string  // Para revalidatePath
): Promise<ActionResult<void>> {
    if (!catalogoId) return { success: false, error: "Falta ID de catálogo." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };

    try {
        const catalogoActual = await prisma.catalogo.findUnique({
            where: { id: catalogoId, negocioId: negocioId },
            select: {
                imagenPortadaUrl: true,
                imagenPortadaTamañoBytes: true, // Asumiendo que este campo existe
            }
        });

        if (!catalogoActual) return { success: false, error: "Catálogo no encontrado o no pertenece al negocio." };

        const imageUrlToDelete = catalogoActual.imagenPortadaUrl;
        const imageSizeToDelete = BigInt(catalogoActual.imagenPortadaTamañoBytes || 0);

        if (!imageUrlToDelete) return { success: true }; // No hay imagen que eliminar

        await prisma.catalogo.update({
            where: { id: catalogoId },
            data: {
                imagenPortadaUrl: null,
                imagenPortadaTamañoBytes: null,
            },
        });

        // Actualizar almacenamiento del negocio
        if (imageSizeToDelete > 0) {
            await prisma.negocio.update({
                where: { id: negocioId },
                data: {
                    almacenamientoUsadoBytes: {
                        decrement: imageSizeToDelete,
                    }
                }
            });
        }

        const deleteStorageResult = await eliminarImagenStorage(imageUrlToDelete);
        if (!deleteStorageResult.success) {
            console.warn(`URL de BD eliminada, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteStorageResult.error}`);
        }

        const pathsToRevalidate = getRevalidationPaths(clienteId, negocioId, catalogoId);
        pathsToRevalidate.forEach(path => revalidatePath(path));
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}`);

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando imagen portada catálogo ${catalogoId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "La imagen o el catálogo ya habían sido eliminados." };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
