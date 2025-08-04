'use server';

import prisma from '../prismaClient'; // Ajusta la ruta a tu cliente Prisma
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Importa las acciones genéricas
import { Prisma, OfertaGaleria } from '@prisma/client'; // Importa tipos de Prisma
import { revalidatePath } from 'next/cache';

// --- TIPOS ESPECÍFICOS PARA LA GALERÍA DE OFERTAS ---

/**
 * @description Datos necesarios para actualizar los detalles (altText, descripcion) de una imagen de la galería de oferta.
 * @property {string | null} [altText] - Nuevo texto alternativo.
 * @property {string | null} [descripcion] - Nueva descripción.
 */
export type ImagenOfertaGaleriaDetallesInput = Partial<Pick<OfertaGaleria, 'altText' | 'descripcion'>>;

/**
 * @description Estructura de datos para actualizar el orden de las imágenes en la galería de oferta.
 * @property {string} id - ID del registro PromocionGaleria.
 * @property {number} orden - Nueva posición ordinal de la imagen.
 */
export interface ImagenOfertaOrdenData {
    id: string; // ID de OfertaGaleria
    orden: number;
}

/**
 * @description Tipo de retorno estándar para las acciones de mutación.
 * @template T - Tipo de datos opcionales devueltos en caso de éxito.
 * @property {boolean} success - Indica si la operación fue exitosa.
 * @property {string | null} [error] - Mensaje de error si la operación falló.
 * @property {T | null} [data] - Datos adicionales devueltos en caso de éxito (ej. la entidad creada/actualizada).
 */
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Límite de imágenes por oferta (ajusta según necesidad)
const MAX_IMAGES_PER_OFERTA = 10;

// --- ACCIONES (FUNCIONES) ---

/**
 * @description Obtiene todas las imágenes de la galería para una Oferta específica, ordenadas.
 * @param {string} ofertaId - El ID de la oferta.
 * @returns {Promise<OfertaGaleria[] | null>} - Array de OfertaGaleria o null si hay error.
 */
export async function obtenerImagenesGaleriaOferta(ofertaId: string): Promise<OfertaGaleria[] | null> {
    if (!ofertaId) {
        console.warn("obtenerImagenesGaleriaOferta: ID de oferta no proporcionado.");
        return null;
    }
    try {
        const imagenes = await prisma.ofertaGaleria.findMany({
            where: { ofertaId: ofertaId },
            orderBy: { orden: 'asc' },
        });
        return imagenes;
    } catch (error) {
        console.error(`Error fetching gallery images for oferta ${ofertaId}:`, error);
        return null;
    }
}

/**
 * @description Añade una nueva imagen a la galería de una Oferta.
 * @param {string} ofertaId - ID de la oferta a la que pertenece.
 * @param {File} file - El archivo de imagen a subir.
 * @param {string | null} [altText] - Texto alternativo opcional.
 * @param {string | null} [descripcion] - Descripción opcional.
 * @returns {Promise<ActionResult<OfertaGaleria>>} - Resultado de la operación con la nueva imagen creada o un error.
 */
export async function añadirImagenGaleriaOferta(
    ofertaId: string,
    file: File,
    altText?: string | null,
    descripcion?: string | null
): Promise<ActionResult<OfertaGaleria>> {
    if (!ofertaId || !file) {
        return { success: false, error: "Faltan datos (ID de oferta o archivo)." };
    }

    try {
        // 1. Verificar límite de imágenes
        const count = await prisma.ofertaGaleria.count({ where: { ofertaId: ofertaId } });
        if (count >= MAX_IMAGES_PER_OFERTA) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_OFERTA} imágenes máximo).` };
        }

        // 2. Definir ruta en storage
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `Ofertas/${ofertaId}/Galeria/${uniqueFileName}`; // Carpeta específica para ofertas

        // 3. Subir usando handler genérico
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir imagen al storage.");
        }

        // 4. Determinar el siguiente orden
        const ultimoOrden = await prisma.ofertaGaleria.aggregate({
            _max: { orden: true }, where: { ofertaId: ofertaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        // 5. Crear registro en la BD
        const nuevaImagen = await prisma.ofertaGaleria.create({
            data: {
                ofertaId: ofertaId, // Conectar con la oferta
                imageUrl: uploadResult.publicUrl,
                altText: altText?.trim() || null,
                descripcion: descripcion?.trim() || null,
                orden: nuevoOrden,
                tamañoBytes: file.size,
            }
        });

        // 6. Revalidar path (ajusta la ruta a tu página de edición de oferta)
        const oferta = await prisma.oferta.findUnique({ where: { id: ofertaId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (oferta) {
            const basePath = oferta.negocio?.clienteId
                ? `/admin/clientes/${oferta.negocio.clienteId}/negocios/${oferta.negocioId}`
                : `/admin/negocios/${oferta.negocioId}`;
            revalidatePath(`${basePath}/oferta/${ofertaId}/editar`);
        }

        return { success: true, data: nuevaImagen };

    } catch (error) {
        console.error(`Error añadiendo imagen a galería de oferta ${ofertaId}:`, error);
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Actualiza los detalles (altText, descripcion) de una imagen de la galería de oferta.
 * @param {string} imagenId - ID del registro OfertaGaleria a actualizar.
 * @param {ImagenOfertaGaleriaDetallesInput} data - Datos a modificar (altText?, descripcion?).
 * @returns {Promise<ActionResult<OfertaGaleria>>} - Resultado con la imagen actualizada o un error.
 */
export async function actualizarDetallesImagenGaleriaOferta(
    imagenId: string,
    data: ImagenOfertaGaleriaDetallesInput
): Promise<ActionResult<OfertaGaleria>> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    try {
        const dataToUpdate: Prisma.OfertaGaleriaUpdateInput = {};
        if (data.altText !== undefined) dataToUpdate.altText = data.altText?.trim() || null;
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

        if (Object.keys(dataToUpdate).length === 0) {
            const imagenActual = await prisma.ofertaGaleria.findUnique({ where: { id: imagenId } });
            return { success: true, data: imagenActual || undefined };
        }

        const imagenActualizada = await prisma.ofertaGaleria.update({
            where: { id: imagenId },
            data: dataToUpdate
        });

        // Revalidar path
        const oferta = await prisma.oferta.findUnique({ where: { id: imagenActualizada.ofertaId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (oferta) {
            const basePath = oferta.negocio?.clienteId
                ? `/admin/clientes/${oferta.negocio.clienteId}/negocios/${oferta.negocioId}`
                : `/admin/negocios/${oferta.negocioId}`;
            revalidatePath(`${basePath}/oferta/${imagenActualizada.ofertaId}/editar`);
        }

        return { success: true, data: imagenActualizada };

    } catch (error) {
        console.error(`Error actualizando detalles de imagen de oferta ${imagenId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


/**
 * @description Elimina una imagen de la galería de oferta (Storage y BD).
 * @param {string} imagenId - ID del registro OfertaGaleria a eliminar.
 * @returns {Promise<ActionResult>} - Resultado de la operación (éxito o error).
 */
export async function eliminarImagenGaleriaOferta(
    imagenId: string
): Promise<ActionResult> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    let imageUrlToDelete: string | null = null;
    let ofertaIdForRevalidation: string | null = null;
    let negocioIdForRevalidation: string | null = null;
    let clienteIdForRevalidation: string | null = null;

    try {
        // 1. Obtener URL y IDs para revalidación ANTES de borrar de BD
        const imagen = await prisma.ofertaGaleria.findUnique({
            where: { id: imagenId },
            select: {
                imageUrl: true,
                ofertaId: true,
                oferta: {
                    select: {
                        negocioId: true,
                        negocio: { select: { clienteId: true } }
                    }
                }
            }
        });

        if (imagen) {
            imageUrlToDelete = imagen.imageUrl;
            ofertaIdForRevalidation = imagen.ofertaId;
            negocioIdForRevalidation = imagen.oferta.negocioId;
            clienteIdForRevalidation = imagen.oferta.negocio?.clienteId;
        } else {
            console.warn(`Imagen de oferta ${imagenId} no encontrada en BD para eliminar.`);
            return { success: true }; // Ya no existe
        }

        // 2. Eliminar registro de la BD Prisma
        await prisma.ofertaGaleria.delete({ where: { id: imagenId } });
        console.log(`Registro de imagen de oferta ${imagenId} eliminado de la BD.`);

        // 3. Intentar eliminar de Supabase Storage
        if (imageUrlToDelete) {
            const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
            if (!deleteResult.success) {
                console.warn(`Registro BD eliminado, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
            }
        }

        // 4. Revalidar path
        if (ofertaIdForRevalidation && negocioIdForRevalidation) {
            const basePath = clienteIdForRevalidation
                ? `/admin/clientes/${clienteIdForRevalidation}/negocios/${negocioIdForRevalidation}`
                : `/admin/negocios/${negocioIdForRevalidation}`;
            revalidatePath(`${basePath}/oferta/${ofertaIdForRevalidation}/editar`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando imagen de galería de oferta ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            console.warn(`Intento de eliminar imagen ${imagenId} que no fue encontrada (P2025).`);
            if (imageUrlToDelete) await eliminarImagenStorage(imageUrlToDelete);
            return { success: true };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Actualiza el orden de las imágenes en la galería de una oferta.
 * @param {string} ofertaId - ID de la oferta (para revalidación).
 * @param {ImagenOfertaOrdenData[]} imagenesOrdenadas - Array de objetos { id: string, orden: number }.
 * @returns {Promise<ActionResult>} - Resultado de la operación (éxito o error).
 */
export async function actualizarOrdenGaleriaOferta(
    ofertaId: string,
    imagenesOrdenadas: ImagenOfertaOrdenData[]
): Promise<ActionResult> {
    if (!ofertaId || !imagenesOrdenadas) {
        return { success: false, error: "Faltan datos para reordenar." };
    }
    try {
        // Usar transacción para asegurar atomicidad
        await prisma.$transaction(
            imagenesOrdenadas.map((img) =>
                prisma.ofertaGaleria.update({
                    where: { id: img.id },
                    data: { orden: img.orden },
                })
            )
        );

        // Revalidar path
        const oferta = await prisma.oferta.findUnique({ where: { id: ofertaId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (oferta) {
            const basePath = oferta.negocio?.clienteId
                ? `/admin/clientes/${oferta.negocio.clienteId}/negocios/${oferta.negocioId}`
                : `/admin/negocios/${oferta.negocioId}`;
            revalidatePath(`${basePath}/oferta/${ofertaId}/editar`);
        }

        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería oferta ${ofertaId}:`, error);
        return { success: false, error: (error as Error).message || 'Error al guardar orden.' };
    }
}
