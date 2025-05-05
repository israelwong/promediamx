'use server';

import prisma from './prismaClient'; // Ajusta la ruta a tu cliente Prisma
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Importa las acciones genéricas
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Tipo de retorno estándar (puedes importarlo si lo tienes global)
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

/**
 * @description Actualiza o establece el logo de un negocio.
 * Sube la nueva imagen al storage, elimina la anterior si existe, y actualiza la URL en la BD.
 * @param {string} negocioId - ID del negocio a actualizar.
 * @param {File} file - El nuevo archivo de imagen (logo) a subir.
 * @returns {Promise<ActionResult<{ imageUrl: string }>>} - Resultado con la nueva URL pública o un error.
 */
export async function actualizarImagenLogoNegocio(
    negocioId: string,
    file: File
): Promise<ActionResult<{ imageUrl: string }>> {
    if (!negocioId || !file) {
        return { success: false, error: "Faltan datos (ID de negocio o archivo)." };
    }

    console.log(`Subiendo nuevo logo para negocio ${negocioId}...`);

    let oldImageUrl: string | null = null;

    try {
        // 1. Obtener la URL del logo antiguo (si existe) y clienteId para revalidación
        const negocioActual = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true } // Seleccionar URL actual y clienteId
        });

        if (!negocioActual) {
            return { success: false, error: "Negocio no encontrado." };
        }
        oldImageUrl = negocioActual.logo;

        // 2. Definir la ruta en storage (usar nombre fijo 'logo' para reemplazo fácil)
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `Negocios/${negocioId}/logo.${fileExtension}`; // Ruta estándar

        // 3. Subir la nueva imagen usando el handler genérico (sobrescribe si ya existe)
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error al subir nuevo logo.");
        }
        const newImageUrl = uploadResult.publicUrl;

        // 4. Actualizar la URL en la base de datos
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { logo: newImageUrl }, // Actualizar el campo 'logo'
        });

        // 5. Intentar eliminar la imagen antigua del storage (si la URL cambió)
        //    Aunque con nombre fijo, la extensión podría cambiar.
        if (oldImageUrl && oldImageUrl !== newImageUrl) {
            console.log(`Intentando eliminar logo antiguo: ${oldImageUrl}`);
            await eliminarImagenStorage(oldImageUrl); // No bloqueamos si falla
        }

        // 6. Revalidar path de la página del negocio y/o edición
        const basePath = negocioActual.clienteId
            ? `/admin/clientes/${negocioActual.clienteId}/negocios/${negocioId}`
            : `/admin/negocios/${negocioId}`;
        revalidatePath(basePath); // Página principal del negocio
        revalidatePath(`${basePath}/editar`); // Página de edición (si existe)

        return { success: true, data: { imageUrl: newImageUrl } };

    } catch (error) {
        console.error(`Error actualizando logo negocio ${negocioId}:`, error);
        return { success: false, error: `Error al actualizar logo: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Elimina el logo de un negocio (del storage y de la BD).
 * @param {string} negocioId - ID del negocio cuyo logo se eliminará.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function eliminarImagenLogoNegocio(
    negocioId: string
): Promise<ActionResult> {
    if (!negocioId) {
        return { success: false, error: "Falta ID de negocio." };
    }

    let imageUrlToDelete: string | null = null;

    try {
        // 1. Obtener la URL actual y clienteId para revalidación
        const negocioActual = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true }
        });

        if (!negocioActual) {
            return { success: false, error: "Negocio no encontrado." };
        }
        imageUrlToDelete = negocioActual.logo;

        // Si no hay URL para borrar, simplemente retornar éxito
        if (!imageUrlToDelete) {
            console.log(`Negocio ${negocioId} no tiene logo para eliminar.`);
            return { success: true };
        }

        // 2. Actualizar la BD para quitar la URL *primero*
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { logo: null }, // Establecer logo a null
        });
        console.log(`URL de logo eliminada de BD para negocio ${negocioId}.`);

        // 3. Intentar eliminar la imagen del Storage
        const deleteResult = await eliminarImagenStorage(imageUrlToDelete);
        if (!deleteResult.success) {
            console.warn(`URL de BD eliminada, pero error al borrar de Storage (${imageUrlToDelete}): ${deleteResult.error}`);
            // Considerar si devolver un error parcial o solo loggear
        }

        // 4. Revalidar path
        const basePath = negocioActual.clienteId
            ? `/admin/clientes/${negocioActual.clienteId}/negocios/${negocioId}`
            : `/admin/negocios/${negocioId}`;
        revalidatePath(basePath);
        revalidatePath(`${basePath}/editar`);

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando logo negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            console.warn(`Intento de eliminar logo de negocio ${negocioId} que no fue encontrado (P2025).`);
            if (imageUrlToDelete) await eliminarImagenStorage(imageUrlToDelete); // Intenta limpiar
            return { success: true };
        }
        return { success: false, error: `Error al eliminar logo: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
