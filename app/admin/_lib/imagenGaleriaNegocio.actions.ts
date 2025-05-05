'use server';

import prisma from './prismaClient'; // Ajusta la ruta
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Acciones genéricas
import { Prisma, ImagenGaleriaNegocio } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// --- Tipos ---

// Tipo de retorno estándar
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Tipo para editar detalles
export type ImagenGaleriaNegocioDetallesInput = Partial<Pick<ImagenGaleriaNegocio, 'altText' | 'descripcion'>>;

// Tipo para reordenar
export interface ImagenGaleriaNegocioOrdenData {
    id: string; // ID de ImagenGaleriaNegocio
    orden: number;
}

const MAX_IMAGES_PER_GALERIA = 20; // Límite por galería específica (ajusta si es necesario)

// --- Acciones ---

/**
 * @description Obtiene todas las imágenes de una galería de negocio específica, ordenadas.
 * @param {string} galeriaId - El ID de la GaleriaNegocio.
 * @returns {Promise<ImagenGaleriaNegocio[] | null>} - Array de imágenes o null.
 */
export async function obtenerImagenesDeGaleria(galeriaId: string): Promise<ImagenGaleriaNegocio[] | null> {
    if (!galeriaId) return null;
    try {
        const imagenes = await prisma.imagenGaleriaNegocio.findMany({
            where: { galeriaNegocioId: galeriaId },
            orderBy: { orden: 'asc' },
        });
        return imagenes;
    } catch (error) {
        console.error(`Error fetching images for galeriaNegocio ${galeriaId}:`, error);
        return null;
    }
}

/**
 * @description Añade una nueva imagen a una galería de negocio.
 * @param {string} galeriaId - ID de la GaleriaNegocio.
 * @param {File} file - Archivo de imagen.
 * @param {string | null} [altText] - Texto alternativo.
 * @param {string | null} [descripcion] - Descripción.
 * @returns {Promise<ActionResult<ImagenGaleriaNegocio>>} - Resultado con la nueva imagen o error.
 */
export async function añadirImagenAGaleria(
    galeriaId: string,
    file: File,
    altText?: string | null,
    descripcion?: string | null
): Promise<ActionResult<ImagenGaleriaNegocio>> {
    if (!galeriaId || !file) {
        return { success: false, error: "Faltan datos (ID de galería o archivo)." };
    }

    try {
        // Verificar límite
        const count = await prisma.imagenGaleriaNegocio.count({ where: { galeriaNegocioId: galeriaId } });
        if (count >= MAX_IMAGES_PER_GALERIA) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_GALERIA} imágenes máximo).` };
        }

        // Obtener negocioId para la ruta y revalidación
        const galeria = await prisma.galeriaNegocio.findUnique({
            where: { id: galeriaId },
            select: { negocioId: true, negocio: { select: { clienteId: true } } }
        });
        if (!galeria?.negocioId) return { success: false, error: "Galería o negocio asociado no encontrado." };
        const { negocioId, negocio } = galeria;

        // Definir ruta (usar negocioId y galeriaId)
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Galerias/${galeriaId}/${uniqueFileName}`; // Ruta más específica

        // Subir
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir imagen al storage.");
        }

        // Determinar orden
        const ultimoOrden = await prisma.imagenGaleriaNegocio.aggregate({
            _max: { orden: true }, where: { galeriaNegocioId: galeriaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        // Crear registro BD
        const nuevaImagen = await prisma.imagenGaleriaNegocio.create({
            data: {
                galeriaNegocioId: galeriaId,
                imageUrl: uploadResult.publicUrl,
                altText: altText?.trim() || null,
                descripcion: descripcion?.trim() || null,
                orden: nuevoOrden,
                tamañoBytes: file.size,
            }
        });

        // Revalidar
        const basePath = negocio?.clienteId ? `/admin/clientes/${negocio.clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        revalidatePath(`${basePath}/galeria/${galeriaId}`); // Revalida la página de gestión de esta galería

        return { success: true, data: nuevaImagen };

    } catch (error) {
        console.error(`Error añadiendo imagen a galería ${galeriaId}:`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Actualiza los detalles (altText, descripcion) de una imagen de galería de negocio.
 * @param {string} imagenId - ID del registro ImagenGaleriaNegocio.
 * @param {ImagenGaleriaNegocioDetallesInput} data - Datos a actualizar.
 * @returns {Promise<ActionResult<ImagenGaleriaNegocio>>} - Resultado con la imagen actualizada o error.
 */
export async function actualizarDetallesImagenGaleriaNegocio(
    imagenId: string,
    data: ImagenGaleriaNegocioDetallesInput
): Promise<ActionResult<ImagenGaleriaNegocio>> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };
    try {
        const dataToUpdate: Prisma.ImagenGaleriaNegocioUpdateInput = {};
        if (data.altText !== undefined) dataToUpdate.altText = data.altText?.trim() || null;
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (Object.keys(dataToUpdate).length === 0) {
            const imgActual = await prisma.imagenGaleriaNegocio.findUnique({ where: { id: imagenId } });
            return { success: true, data: imgActual ?? undefined };
        }
        const imagenActualizada = await prisma.imagenGaleriaNegocio.update({
            where: { id: imagenId },
            data: dataToUpdate,
            select: { galeriaNegocio: { select: { negocioId: true, negocio: { select: { clienteId: true } } } }, galeriaNegocioId: true } // Para revalidar
        });
        // Revalidar
        const basePath = imagenActualizada.galeriaNegocio.negocio?.clienteId
            ? `/admin/clientes/${imagenActualizada.galeriaNegocio.negocio.clienteId}/negocios/${imagenActualizada.galeriaNegocio.negocioId}`
            : `/admin/negocios/${imagenActualizada.galeriaNegocio.negocioId}`;
        revalidatePath(`${basePath}/galeria/${imagenActualizada.galeriaNegocioId}`);

        const dataCompleta = await prisma.imagenGaleriaNegocio.findUnique({ where: { id: imagenId } });
        return { success: true, data: dataCompleta ?? undefined };
    } catch (error) {
        console.error(`Error actualizando detalles de imagen ${imagenId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Elimina una imagen de una galería de negocio (Storage y BD).
 * @param {string} imagenId - ID del registro ImagenGaleriaNegocio.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function eliminarImagenDeGaleria(imagenId: string): Promise<ActionResult> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };
    let imageUrlToDelete: string | null = null;
    let galeriaId: string | null = null;
    let negocioId: string | null = null;
    let clienteId: string | null | undefined = null;
    try {
        // Obtener URL y IDs antes de borrar
        const imagen = await prisma.imagenGaleriaNegocio.findUnique({
            where: { id: imagenId },
            select: { imageUrl: true, galeriaNegocioId: true, galeriaNegocio: { select: { negocioId: true, negocio: { select: { clienteId: true } } } } }
        });
        if (imagen) {
            imageUrlToDelete = imagen.imageUrl;
            galeriaId = imagen.galeriaNegocioId;
            negocioId = imagen.galeriaNegocio.negocioId;
            clienteId = imagen.galeriaNegocio.negocio?.clienteId;
        } else { return { success: true }; } // Ya no existe

        // Eliminar de BD (Cascade NO aplica aquí si se borra la imagen individual)
        await prisma.imagenGaleriaNegocio.delete({ where: { id: imagenId } });
        console.log(`Registro de imagen ${imagenId} eliminado de la BD.`);

        // Eliminar de Storage
        if (imageUrlToDelete) {
            const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
            if (!deleteResult.success) console.warn(`Registro BD eliminado, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
        }

        // Revalidar
        if (galeriaId && negocioId) {
            const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
            revalidatePath(`${basePath}/galeria/${galeriaId}`);
        }
        return { success: true };
    } catch (error) {
        console.error(`Error eliminando imagen de galería ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: true };
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Actualiza el orden de las imágenes en una galería de negocio.
 * @param {string} galeriaId - ID de la GaleriaNegocio.
 * @param {ImagenGaleriaNegocioOrdenData[]} ordenData - Array de objetos { id: string, orden: number }.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function actualizarOrdenImagenesGaleriaNegocio(
    galeriaId: string,
    ordenData: ImagenGaleriaNegocioOrdenData[]
): Promise<ActionResult> {
    if (!galeriaId || !ordenData) return { success: false, error: "Faltan datos para reordenar." };
    try {
        await prisma.$transaction(
            ordenData.map((img, index) =>
                prisma.imagenGaleriaNegocio.update({ where: { id: img.id }, data: { orden: index } })
            )
        );
        // Revalidar
        const galeria = await prisma.galeriaNegocio.findUnique({ where: { id: galeriaId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (galeria) {
            const basePath = galeria.negocio?.clienteId ? `/admin/clientes/${galeria.negocio.clienteId}/negocios/${galeria.negocioId}` : `/admin/negocios/${galeria.negocioId}`;
            revalidatePath(`${basePath}/galeria/${galeriaId}`);
        }
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería ${galeriaId}:`, error);
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}
