// Ruta: src/app/admin/_lib/asistenteImagenAvatar.actions.ts
'use server';

import prisma from './prismaClient'; // Ajusta ruta
import { subirImagenStorage, eliminarImagenStorage } from './imageHandler.actions'; // Importa las acciones genéricas
// import { Prisma } from '@prisma/client';
// import { revalidatePath } from 'next/cache';

/**
 * Actualiza o establece la imagen del avatar para un AsistenteVirtual.
 * Sube la nueva imagen a Supabase y actualiza la URL en la base de datos.
 * Elimina la imagen anterior de Supabase si existía.
 *
 * @param asistenteId - El ID del AsistenteVirtual a actualizar.
 * @param file - El nuevo archivo de imagen (objeto File).
 * @param urlImagenActual - La URL de la imagen actual (si existe) para poder eliminarla.
 * @returns Objeto con success, la nueva urlImagen o un mensaje de error.
 */
export async function actualizarAvatarAsistente(
    asistenteId: string,
    file: File,
    urlImagenActual: string | null | undefined
): Promise<{ success: boolean; urlImagen?: string; error?: string }> {

    if (!asistenteId || !file) {
        return { success: false, error: "Faltan datos requeridos (ID de asistente o archivo)." };
    }

    // 1. (Opcional) Eliminar imagen anterior del Storage ANTES de subir la nueva
    //    Esto puede ser útil si quieres asegurarte de que no queden archivos viejos
    //    si la actualización de la BD falla después de subir.
    if (urlImagenActual) {
        console.log(`Intentando eliminar avatar anterior: ${urlImagenActual}`);
        const deleteResult = await eliminarImagenStorage(urlImagenActual);
        if (!deleteResult.success) {
            // Loggear el error pero continuar, la subida es más importante
            console.warn(`No se pudo eliminar la imagen anterior del storage: ${deleteResult.error}`);
        }
    }

    // 2. Definir la ruta de almacenamiento específica para avatares de asistentes
    //    Usar una extensión común o extraerla del archivo. Usar timestamp para evitar caché.
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `Asistentes/${asistenteId}/avatar.${fileExtension}`;

    try {
        // 3. Subir la nueva imagen usando la acción genérica
        const uploadResult = await subirImagenStorage(file, filePath);

        if (!uploadResult.success || !uploadResult.publicUrl) {
            throw new Error(uploadResult.error || "Error desconocido al subir la nueva imagen.");
        }

        const nuevaUrlImagen = uploadResult.publicUrl;

        // 4. Actualizar la URL en la base de datos (Prisma)
        await prisma.asistenteVirtual.update({
            where: { id: asistenteId },
            data: { urlImagen: nuevaUrlImagen },
        });

        console.log(`Avatar actualizado para asistente ${asistenteId}`);

        // 5. Revalidar path (opcional, si la imagen se muestra en otras páginas)
        // Revalidate path para la página de edición donde está el componente
        // Asume una estructura de ruta, ajústala si es necesario
        // revalidatePath(`/admin/clientes/[clienteId]/negocios/[negocioId]/asistente/${asistenteId}`);

        return { success: true, urlImagen: nuevaUrlImagen };

    } catch (error) {
        console.error(`Error al actualizar avatar para asistente ${asistenteId}:`, error);
        // Si la subida funcionó pero la BD falló, intentar borrar la imagen recién subida? (Complejo)
        // Por ahora, solo devolvemos el error.
        return { success: false, error: `Error al actualizar avatar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


/**
 * Elimina la imagen del avatar de un AsistenteVirtual.
 * Elimina el archivo de Supabase y establece la URL a null en la base de datos.
 *
 * @param asistenteId - El ID del AsistenteVirtual.
 * @param urlImagenActual - La URL de la imagen actual a eliminar.
 * @returns Objeto con success o un mensaje de error.
 */
export async function eliminarAvatarAsistente(
    asistenteId: string,
    urlImagenActual: string | null | undefined
): Promise<{ success: boolean; error?: string }> {

    if (!asistenteId) {
        return { success: false, error: "Falta ID de asistente." };
    }
    if (!urlImagenActual) {
        console.log("No hay URL de imagen actual para eliminar.");
        // Asegurarse que la BD también esté limpia
        try {
            await prisma.asistenteVirtual.update({
                where: { id: asistenteId },
                data: { urlImagen: null },
            });
            return { success: true };
        } catch (dbError) {
            console.error(`Error limpiando URL en DB para asistente ${asistenteId}:`, dbError);
            return { success: false, error: "No había imagen, pero falló la limpieza en BD." };
        }
    }

    try {
        // 1. Eliminar imagen del Storage usando la acción genérica
        const deleteResult = await eliminarImagenStorage(urlImagenActual);

        // Si hubo un error Y NO fue porque el archivo no existía, retornar error
        if (!deleteResult.success && deleteResult.error && !deleteResult.error.includes("No se pudo determinar la ruta")) {
            throw new Error(deleteResult.error);
        }
        // Si tuvo éxito o el archivo no existía, continuar para limpiar la BD

        // 2. Actualizar la URL a null en la base de datos
        await prisma.asistenteVirtual.update({
            where: { id: asistenteId },
            data: { urlImagen: null },
        });

        console.log(`Avatar eliminado para asistente ${asistenteId}`);

        // 3. Revalidar path (opcional)
        // revalidatePath(`/admin/clientes/[clienteId]/negocios/[negocioId]/asistente/${asistenteId}`);

        return { success: true };

    } catch (error) {
        console.error(`Error al eliminar avatar para asistente ${asistenteId}:`, error);
        return { success: false, error: `Error al eliminar avatar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
