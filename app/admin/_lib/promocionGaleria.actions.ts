'use server';

import prisma from './prismaClient'; // Ajusta la ruta a tu cliente Prisma
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Importa las acciones genéricas
import { Prisma } from '@prisma/client'; // Importa tipos de Prisma
import { PromocionGaleria } from './types'; // Importa el tipo específico de la galería de promociones
import { revalidatePath } from 'next/cache';

// --- TIPOS ESPECÍFICOS PARA LA GALERÍA DE PROMOCIONES ---

// Tipo para los datos al editar detalles de una imagen de la galería de promoción
export type ImagenPromocionGaleriaDetallesInput = Partial<Pick<PromocionGaleria, 'altText' | 'descripcion'>>;

// Tipo para la data de ordenamiento de imágenes de la galería de promoción
export interface ImagenPromocionOrdenData {
    id: string; // ID de PromocionGaleria
    orden: number;
}

// Tipo de retorno estándar para mutaciones (opcional pero recomendado)
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Límite de imágenes por promoción (ajusta según necesidad)
const MAX_IMAGES_PER_PROMOCION = 10;

// --- ACCIONES (FUNCIONES) ---

/**
 * Obtiene todas las imágenes de la galería para una Promoción específica, ordenadas.
 * @param promocionId - El ID de la promoción.
 * @returns Array de PromocionGaleria o null si hay error.
 */
export async function obtenerImagenesGaleriaPromocion(promocionId: string): Promise<PromocionGaleria[] | null> {
    if (!promocionId) return null;
    try {
        const imagenes = await prisma.promocionGaleria.findMany({
            where: { promocionId: promocionId },
            orderBy: { orden: 'asc' },
            select: {
                id: true,
                createdAt: true,
                descripcion: true,
                promocionId: true,
                imageUrl: true,
                altText: true,
                orden: true,
                tamañoBytes: true,
                promocion: true, // Include the required "promocion" field
            },
        });
        // Directamente retornamos, el tipo PromocionGaleria ya es correcto
        return imagenes;
    } catch (error) {
        console.error(`Error fetching gallery images for promotion ${promocionId}:`, error);
        // Lanzar error o devolver null según cómo quieras manejarlo en el frontend
        // throw new Error('No se pudieron obtener las imágenes de la galería.');
        return null;
    }
}

/**
 * Añade una nueva imagen a la galería de una Promoción.
 * @param promocionId - ID de la promoción a la que pertenece.
 * @param file - El archivo de imagen a subir.
 * @param altText - Texto alternativo opcional.
 * @param descripcion - Descripción opcional.
 * @returns Objeto ActionResult con la nueva imagen creada o un error.
 */
export async function añadirImagenGaleriaPromocion(
    promocionId: string,
    file: File,
    altText?: string | null,
    descripcion?: string | null
): Promise<ActionResult<PromocionGaleria>> {
    if (!promocionId || !file) {
        return { success: false, error: "Faltan datos (ID de promoción o archivo)." };
    }

    try {
        // 1. Verificar límite de imágenes
        const count = await prisma.promocionGaleria.count({ where: { promocionId: promocionId } });
        if (count >= MAX_IMAGES_PER_PROMOCION) {
            return { success: false, error: `Límite alcanzado (${MAX_IMAGES_PER_PROMOCION} imágenes máximo).` };
        }

        // 2. Definir ruta en storage (ajusta según tu estructura deseada)
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Usar una carpeta específica para promociones
        const filePath = `Promociones/${promocionId}/Galeria/${uniqueFileName}`;

        // 3. Subir usando handler genérico
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir imagen al storage.");
        }

        // 4. Determinar el siguiente orden
        const ultimoOrden = await prisma.promocionGaleria.aggregate({
            _max: { orden: true }, where: { promocionId: promocionId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        // 5. Crear registro en la BD
        const nuevaImagen = await prisma.promocionGaleria.create({
            data: {
                promocionId: promocionId, // Conectar con la promoción
                imageUrl: uploadResult.publicUrl,
                altText: altText?.trim() || null,
                descripcion: descripcion?.trim() || null,
                orden: nuevoOrden,
                tamañoBytes: file.size,
            },
            include: {
                promocion: true, // Incluir el campo requerido "promocion"
            },
        });

        // 6. Revalidar path (ajusta la ruta a tu página de edición de promoción)
        // Ejemplo: /admin/negocios/{negocioId}/promocion/{promocionId}/editar
        // Necesitaríamos el negocioId para revalidar correctamente.
        // Podríamos obtenerlo consultando la promoción o pasándolo como argumento si es posible.
        const promocion = await prisma.promocion.findUnique({ where: { id: promocionId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (promocion) {
            const basePath = promocion.negocio?.clienteId
                ? `/admin/clientes/${promocion.negocio.clienteId}/negocios/${promocion.negocioId}`
                : `/admin/negocios/${promocion.negocioId}`;
            revalidatePath(`${basePath}/promocion/${promocionId}`);
        }


        return { success: true, data: nuevaImagen };

    } catch (error) {
        console.error(`Error añadiendo imagen a galería de promoción ${promocionId}:`, error);
        // Si hubo un error después de subir, intentar borrar la imagen del storage
        // (Necesitaríamos la URL si se subió, lo cual complica el manejo aquí)
        return { success: false, error: `Error al añadir imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Actualiza los detalles (altText, descripcion) de una imagen de la galería de promoción.
 * @param imagenId - ID de la PromocionGaleria a actualizar.
 * @param data - Datos a modificar (altText?, descripcion?).
 * @returns Objeto ActionResult con la imagen actualizada o un error.
 */
export async function actualizarDetallesImagenGaleriaPromocion(
    imagenId: string,
    data: ImagenPromocionGaleriaDetallesInput
): Promise<ActionResult<PromocionGaleria>> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    try {
        const dataToUpdate: Prisma.PromocionGaleriaUpdateInput = {};
        // Solo incluir campos si se proporcionaron en la entrada
        if (data.altText !== undefined) dataToUpdate.altText = data.altText?.trim() || null;
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

        // Si no hay nada que actualizar, retornar éxito temprano
        if (Object.keys(dataToUpdate).length === 0) {
            // Podríamos obtener la imagen actual para devolverla si es necesario
            const imagenActual = await prisma.promocionGaleria.findUnique({
                where: { id: imagenId },
                include: { promocion: true }, // Include the required "promocion" field
            });
            return { success: true, data: imagenActual || undefined };
        }

        const imagenActualizada = await prisma.promocionGaleria.update({
            where: { id: imagenId },
            data: dataToUpdate,
            include: { promocion: true }, // Include the required "promocion" field
        });

        // Revalidar path si es necesario (usando promocionId de la imagen actualizada)
        const promocion = await prisma.promocion.findUnique({ where: { id: imagenActualizada.promocionId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (promocion) {
            const basePath = promocion.negocio?.clienteId
                ? `/admin/clientes/${promocion.negocio.clienteId}/negocios/${promocion.negocioId}`
                : `/admin/negocios/${promocion.negocioId}`;
            revalidatePath(`${basePath}/promocion/${imagenActualizada.promocionId}/editar`);
        }

        return { success: true, data: imagenActualizada };

    } catch (error) {
        console.error(`Error actualizando detalles de imagen de promoción ${imagenId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


/**
 * Elimina una imagen de la galería de promoción (Storage y BD).
 * @param imagenId - ID de la PromocionGaleria a eliminar.
 * @returns Objeto ActionResult indicando éxito o error.
 */
export async function eliminarImagenGaleriaPromocion(
    imagenId: string
): Promise<ActionResult> {
    if (!imagenId) return { success: false, error: "Falta ID de imagen." };

    let imageUrlToDelete: string | null = null;
    let promocionIdForRevalidation: string | null = null;
    let negocioIdForRevalidation: string | null = null;
    let clienteIdForRevalidation: string | null = null;


    try {
        // 1. Obtener URL y IDs para revalidación ANTES de borrar de BD
        const imagen = await prisma.promocionGaleria.findUnique({
            where: { id: imagenId },
            select: {
                imageUrl: true,
                promocionId: true,
                promocion: { // Incluir info para revalidación
                    select: {
                        negocioId: true,
                        negocio: {
                            select: { clienteId: true }
                        }
                    }
                }
            }
        });

        if (imagen) {
            imageUrlToDelete = imagen.imageUrl;
            promocionIdForRevalidation = imagen.promocionId;
            negocioIdForRevalidation = imagen.promocion.negocioId;
            clienteIdForRevalidation = imagen.promocion.negocio?.clienteId;
        } else {
            console.warn(`Imagen de promoción ${imagenId} no encontrada en BD para eliminar.`);
            return { success: true }; // Considerar éxito si no existe
        }

        // 2. Eliminar registro de la BD Prisma (onDelete: Cascade debería funcionar, pero por seguridad)
        await prisma.promocionGaleria.delete({
            where: { id: imagenId },
        });
        console.log(`Registro de imagen de promoción ${imagenId} eliminado de la BD.`);

        // 3. Intentar eliminar de Supabase Storage
        if (imageUrlToDelete) {
            const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
            if (!deleteResult.success) {
                console.warn(`Registro BD eliminado, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
                // No consideramos esto un error fatal para la operación general
            }
        }

        // 4. Revalidar path
        if (promocionIdForRevalidation && negocioIdForRevalidation) {
            const basePath = clienteIdForRevalidation
                ? `/admin/clientes/${clienteIdForRevalidation}/negocios/${negocioIdForRevalidation}`
                : `/admin/negocios/${negocioIdForRevalidation}`;
            revalidatePath(`${basePath}/promocion/${promocionIdForRevalidation}/editar`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando imagen de galería de promoción ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            console.warn(`Intento de eliminar imagen ${imagenId} que no fue encontrada (P2025).`);
            if (imageUrlToDelete) await eliminarImagenStorage(imageUrlToDelete); // Intenta limpiar storage
            return { success: true };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Actualiza el orden de las imágenes en la galería de una promoción.
 * @param promocionId - ID de la promoción (para revalidación).
 * @param imagenesOrdenadas - Array de objetos { id: string, orden: number }.
 * @returns Objeto ActionResult indicando éxito o error.
 */
export async function actualizarOrdenGaleriaPromocion(
    promocionId: string,
    imagenesOrdenadas: ImagenPromocionOrdenData[]
): Promise<ActionResult> {
    if (!promocionId || !imagenesOrdenadas) {
        return { success: false, error: "Faltan datos para reordenar." };
    }
    try {
        // Usar transacción para asegurar atomicidad
        await prisma.$transaction(
            imagenesOrdenadas.map((img) =>
                prisma.promocionGaleria.update({
                    where: { id: img.id },
                    data: { orden: img.orden },
                })
            )
        );

        // Revalidar path
        const promocion = await prisma.promocion.findUnique({ where: { id: promocionId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (promocion) {
            const basePath = promocion.negocio?.clienteId
                ? `/admin/clientes/${promocion.negocio.clienteId}/negocios/${promocion.negocioId}`
                : `/admin/negocios/${promocion.negocioId}`;
            revalidatePath(`${basePath}/promocion/${promocionId}/editar`);
        }

        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden galería promoción ${promocionId}:`, error);
        return { success: false, error: (error as Error).message || 'Error al guardar orden.' };
    }
}

