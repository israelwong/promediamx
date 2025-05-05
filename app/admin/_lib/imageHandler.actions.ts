// Ruta: src/app/admin/_lib/imageHandler.actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
// import { Buffer } from 'buffer'; // Probablemente no necesario si usamos File directamente

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('!!! FALTAN VARIABLES DE ENTORNO SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY !!!');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    : null;

const BUCKET_NAME = 'ProMedia'; // Reemplaza con el nombre real de tu bucket

// --- Helper para extraer el path ---
function getPathFromUrl(url: string): string | null {
    if (!supabaseUrl) return null;
    try {
        const urlObject = new URL(url);
        const basePath = `/storage/v1/object/public/${BUCKET_NAME}/`;
        if (urlObject.pathname.startsWith(basePath)) {
            return decodeURIComponent(urlObject.pathname.substring(basePath.length));
        }
        console.warn("No se pudo extraer el path de la URL:", url);
        return null;
    } catch (error) {
        console.error("Error al parsear la URL de Supabase:", error);
        return null;
    }
}

/**
 * Sube un archivo de imagen a Supabase Storage.
 * Sobrescribe si ya existe un archivo en la misma ruta.
 */
export async function subirImagenStorage(
    file: File,
    filePath: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {

    if (!supabaseAdmin) {
        return { success: false, error: "Cliente Supabase no inicializado." };
    }
    if (!file || !filePath) {
        return { success: false, error: "Faltan datos (archivo o ruta)." };
    }

    try {
        console.log(`Subiendo/reemplazando imagen en: ${BUCKET_NAME}/${filePath}`);

        // --- CORRECCIÓN: No desestructurar 'data' si no se usa ---
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error(`Error al subir a ${filePath}:`, uploadError.message);
            throw new Error(`Error Supabase (subir): ${uploadError.message}`);
        }

        // Obtener la URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
            console.error(`Error obteniendo URL pública para: ${filePath}`);
            throw new Error(`Archivo subido pero no se pudo obtener URL.`);
        }

        const publicUrlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`;
        console.log('URL Pública generada:', publicUrlWithTimestamp);

        return { success: true, publicUrl: publicUrlWithTimestamp };

    } catch (error) {
        console.error(`Error en subirImagenStorage (${filePath}):`, error);
        return { success: false, error: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


/**
 * Elimina un archivo de imagen de Supabase Storage usando su URL pública.
 */
export async function eliminarImagenStorage(
    publicUrl: string | null | undefined
): Promise<{ success: boolean; error?: string }> {

    if (!supabaseAdmin) {
        return { success: false, error: "Cliente Supabase no inicializado." };
    }
    if (!publicUrl) {
        console.log("No se proporcionó URL para eliminar.");
        return { success: true };
    }

    const filePath = getPathFromUrl(publicUrl);

    if (!filePath) {
        console.warn(`No se pudo obtener ruta desde URL: ${publicUrl}.`);
        return { success: false, error: "No se pudo determinar la ruta del archivo." };
    }

    try {
        console.log(`Eliminando de Storage: ${BUCKET_NAME}/${filePath}`);

        // --- CORRECCIÓN: No desestructurar 'data' si no se usa ---
        const { error: deleteError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

        if (deleteError) {
            if (deleteError.message === 'The resource was not found') {
                console.log(`Archivo no encontrado (ya eliminado?): ${filePath}`);
                return { success: true }; // Éxito si no existía
            }
            console.error(`Error al eliminar ${filePath}:`, deleteError.message);
            throw new Error(`Error Supabase (eliminar): ${deleteError.message}`);
        }

        console.log(`Archivo ${filePath} eliminado.`);
        return { success: true };

    } catch (error) {
        console.error(`Error en eliminarImagenStorage (${filePath}):`, error);
        return { success: false, error: `Error al eliminar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
