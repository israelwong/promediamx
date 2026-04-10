'use server';

import prisma from '../prismaClient'; // Ajusta la ruta a tu cliente Prisma
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Importa las acciones genéricas
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Tipo de retorno estándar
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T; // Puede contener la nueva URL o la entidad actualizada
}

/**
 * @description Actualiza o establece la imagen de portada de un catálogo.
 * Sube la nueva imagen al storage, elimina la anterior si existe, y actualiza la URL en la BD.
 * @param {string} catalogoId - ID del catálogo a actualizar.
 * @param {File} file - El nuevo archivo de imagen a subir.
 * @returns {Promise<ActionResult<{ imageUrl: string }>>} - Resultado con la nueva URL pública o un error.
 */
export async function actualizarImagenPortadaCatalogo(
    catalogoId: string,
    file: File
): Promise<ActionResult<{ imageUrl: string }>> {
    if (!catalogoId || !file) {
        return { success: false, error: "Faltan datos (ID de catálogo o archivo)." };
    }

    let oldImageUrl: string | null = null;

    try {
        // 1. Obtener la URL de la imagen antigua (si existe) ANTES de actualizar
        const catalogoActual = await prisma.catalogo.findUnique({
            where: { id: catalogoId },
            select: { imagenPortadaUrl: true, negocioId: true, negocio: { select: { clienteId: true } } } // Incluir IDs para revalidación
        });

        if (!catalogoActual) {
            return { success: false, error: "Catálogo no encontrado." };
        }
        oldImageUrl = catalogoActual.imagenPortadaUrl;

        // 2. Definir la ruta en storage (consistente)
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        // Usar un nombre predecible para la portada, sobrescribiendo el anterior
        const filePath = `Catalogos/${catalogoId}/portada.${fileExtension}`;

        // 3. Subir la nueva imagen usando el handler genérico (sobrescribe si ya existe)
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir nueva imagen de portada.");
        }
        const newImageUrl = uploadResult.publicUrl;

        // 4. Actualizar la URL en la base de datos
        await prisma.catalogo.update({
            where: { id: catalogoId },
            data: { imagenPortadaUrl: newImageUrl },
        });

        // 5. Intentar eliminar la imagen antigua del storage *después* de actualizar la BD
        //    (Solo si la URL antigua es diferente de la nueva, aunque con nombre fijo no debería pasar)
        if (oldImageUrl && oldImageUrl !== newImageUrl) {
            console.log(`Intentando eliminar imagen de portada antigua: ${oldImageUrl}`);
            await eliminarImagenStorage(oldImageUrl); // No bloqueamos si falla la eliminación antigua
        }

        // 6. Revalidar path de la página de edición del catálogo (si existe) y del negocio
        const basePath = catalogoActual.negocio?.clienteId
            ? `/admin/clientes/${catalogoActual.negocio.clienteId}/negocios/${catalogoActual.negocioId}`
            : `/admin/negocios/${catalogoActual.negocioId}`;
        // Asumiendo una ruta como /.../catalogo/[catalogoId]/editar
        revalidatePath(`${basePath}/catalogo/${catalogoId}/editar`);
        revalidatePath(basePath); // Revalidar la página del negocio también

        return { success: true, data: { imageUrl: newImageUrl } };

    } catch (error) {
        console.error(`Error actualizando imagen portada catálogo ${catalogoId}:`, error);
        return { success: false, error: `Error al actualizar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Elimina la imagen de portada de un catálogo (del storage y de la BD).
 * @param {string} catalogoId - ID del catálogo cuya imagen de portada se eliminará.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function eliminarImagenPortadaCatalogo(
    catalogoId: string
): Promise<ActionResult> {
    if (!catalogoId) {
        return { success: false, error: "Falta ID de catálogo." };
    }

    let imageUrlToDelete: string | null = null;

    try {
        // 1. Obtener la URL actual y datos para revalidación
        const catalogoActual = await prisma.catalogo.findUnique({
            where: { id: catalogoId },
            select: { imagenPortadaUrl: true, negocioId: true, negocio: { select: { clienteId: true } } }
        });

        if (!catalogoActual) {
            return { success: false, error: "Catálogo no encontrado." };
        }
        imageUrlToDelete = catalogoActual.imagenPortadaUrl;

        // Si no hay URL para borrar, simplemente retornar éxito
        if (!imageUrlToDelete) {
            console.log(`Catálogo ${catalogoId} no tiene imagen de portada para eliminar.`);
            return { success: true };
        }

        // 2. Actualizar la BD para quitar la URL *primero*
        await prisma.catalogo.update({
            where: { id: catalogoId },
            data: { imagenPortadaUrl: null },
        });
        console.log(`URL de imagen portada eliminada de BD para catálogo ${catalogoId}.`);

        // 3. Intentar eliminar la imagen del Storage
        const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
        if (!deleteResult.success) {
            // Loggear pero considerar la operación exitosa porque la BD se actualizó
            console.warn(`URL de BD eliminada, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
        }

        // 4. Revalidar path
        const basePath = catalogoActual.negocio?.clienteId
            ? `/admin/clientes/${catalogoActual.negocio.clienteId}/negocios/${catalogoActual.negocioId}`
            : `/admin/negocios/${catalogoActual.negocioId}`;
        revalidatePath(`${basePath}/catalogo/${catalogoId}/editar`);
        revalidatePath(basePath);

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando imagen portada catálogo ${catalogoId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // El catálogo ya no existía (raro si se llamó desde el form)
            console.warn(`Intento de eliminar imagen de catálogo ${catalogoId} que no fue encontrado (P2025).`);
            if (imageUrlToDelete) await eliminarImagenStorage(imageUrlToDelete); // Intenta limpiar
            return { success: true };
        }
        return { success: false, error: `Error al eliminar imagen: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
