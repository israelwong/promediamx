// Ruta: src/app/admin/_lib/tareaIcono.actions.ts
'use server';

import prisma from '../prismaClient'; // Ajusta ruta si es necesario
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Configuración de Supabase (igual que en tareaGaleria.actions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('!!! FALTAN VARIABLES DE ENTORNO SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY !!!');
    throw new Error('Configuración de Supabase incompleta en el servidor.');
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const BUCKET_NAME = 'ProMedia'; // Asegúrate que sea el nombre correcto de tu bucket

// --- Helper para extraer el path del archivo desde la URL pública ---
function getPathFromUrl(url: string): string | null {
    if (!supabaseUrl) return null;
    try {
        const urlObject = new URL(url);
        const basePath = `/storage/v1/object/public/${BUCKET_NAME}/`;
        if (urlObject.pathname.startsWith(basePath)) {
            return decodeURIComponent(urlObject.pathname.substring(basePath.length));
        }
        console.warn("No se pudo extraer el path de la URL del icono:", url);
        return null;
    } catch (error) {
        console.error("Error al parsear la URL de Supabase:", error);
        return null;
    }
}

/**
 * Sube (o reemplaza) la imagen del icono para una Tarea específica.
 * @param tareaId - El ID de la Tarea.
 * @param file - El archivo de imagen a subir.
 * @returns Objeto con el resultado de la subida (success, publicUrl, error).
 */
export async function subirImagenIcono(
    tareaId: string,
    file: File
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
        if (!tareaId || !file) {
            return { success: false, error: "Faltan datos requeridos (tareaId, file)." };
        }

        // Validaciones básicas (puedes añadir más si es necesario)
        const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return { success: false, error: "Tipo de archivo no válido para el icono." };
        }
        const maxSize = 2 * 1024 * 1024; // Límite de 2MB para iconos
        if (file.size > maxSize) {
            return { success: false, error: `Archivo demasiado grande (Máx: 2MB).` };
        }

        // Definir una ruta fija para el icono de la tarea (sobrescribirá si ya existe)
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `Tareas/${tareaId}/icono/icono.${fileExtension}`; // Ruta fija

        console.log('Subiendo/reemplazando icono en Supabase (Admin):', filePath);

        // Subir el nuevo archivo usando upsert: true para reemplazar si existe
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600', // Cache por 1 hora
                upsert: true // Importante: Sobrescribe el archivo si ya existe en la misma ruta
            });

        if (uploadError) {
            console.error('Error al subir/reemplazar el icono:', uploadError.message);
            return { success: false, error: `Error subiendo icono: ${uploadError.message}` };
        }

        console.log('Icono subido/reemplazado exitosamente, obteniendo URL pública...');

        // Obtener la URL pública
        const { data } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        if (!data?.publicUrl) {
            console.error(`Error obteniendo la URL pública para el icono: ${filePath}`);
            return { success: false, error: `Icono subido pero no se pudo obtener URL pública.` };
        }

        // Añadir un timestamp a la URL para forzar la actualización de caché del navegador si es necesario
        const publicUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;
        console.log('URL Pública del icono obtenida:', publicUrlWithTimestamp);

        return { success: true, publicUrl: publicUrlWithTimestamp };

    } catch (error) {
        console.error('Error inesperado en subirImagenIcono:', error);
        return { success: false, error: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Elimina la imagen del icono de Supabase Storage.
 * @param iconoUrl - La URL pública actual del icono a eliminar.
 * @returns Objeto con el resultado de la eliminación (success, error).
 */
export async function eliminarImagenIcono(
    iconoUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!iconoUrl) {
            return { success: true }; // No hay URL, nada que eliminar
        }

        const filePath = getPathFromUrl(iconoUrl);
        if (!filePath) {
            // Si no se puede obtener el path, no se puede eliminar, pero no es un error crítico
            console.warn(`No se pudo obtener la ruta del archivo desde la URL del icono: ${iconoUrl}`);
            return { success: true, error: "No se pudo determinar la ruta del archivo para eliminar." };
        }

        console.log('Eliminando icono de Supabase Storage (Admin):', filePath);

        const { error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (error && error.message !== 'The resource was not found') {
            // Si hubo un error y NO fue "no encontrado"
            console.error('Error al eliminar el icono de Storage:', error.message);
            return { success: false, error: `Error eliminando icono de Storage: ${error.message}` };
        }

        console.log('Icono eliminado de Storage (o no existía).');
        return { success: true };

    } catch (error) {
        console.error('Error inesperado en eliminarImagenIcono:', error);
        return { success: false, error: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * Actualiza el campo iconoUrl de una Tarea en la base de datos.
 * @param tareaId - El ID de la Tarea a actualizar.
 * @param iconoUrl - La nueva URL del icono (o null para eliminarla).
 * @returns Objeto con el resultado de la actualización (success, error).
 */
export async function actualizarIconoTarea(
    tareaId: string,
    iconoUrl: string | null
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tareaId) {
            return { success: false, error: "ID de tarea no proporcionado." };
        }

        await prisma.tarea.update({
            where: { id: tareaId },
            data: { iconoUrl: iconoUrl }, // Actualiza el campo iconoUrl
        });

        console.log(`IconoUrl actualizado para tarea ${tareaId}.`);

        // Revalidar el path donde se muestra la tarea para refrescar la UI
        revalidatePath(`/admin/tareas/${tareaId}`); // Ajusta si la ruta de edición es diferente
        revalidatePath('/admin/tareas'); // Revalidar también la lista general

        return { success: true };
    } catch (error) {
        console.error(`Error updating iconoUrl for tarea ${tareaId}:`, error);
        return { success: false, error: `Error al actualizar icono en DB: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}
