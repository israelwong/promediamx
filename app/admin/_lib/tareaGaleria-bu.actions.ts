// Ruta: src/app/admin/_lib/tareaGaleria.actions.ts
'use server';

import prisma from './prismaClient'; // Ajusta ruta
import { TareaGaleria, CrearImagenGaleriaInput } from './types'; // Importar tipos necesarios
import { Prisma } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache'; // Para refrescar UI

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('!!! FALTAN VARIABLES DE ENTORNO SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY !!!');
    throw new Error('Configuración de Supabase incompleta en el servidor.');
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        // Recomendado para clientes de servidor
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    }
});

// --- Helper para extraer el path del archivo desde la URL pública ---
function getPathFromUrl(url: string): string | null {
    if (!supabaseUrl) return null;
    try {
        const urlObject = new URL(url);
        const bucketName = 'ProMedia'; // Asegúrate que este es tu bucket
        const basePath = `/storage/v1/object/public/${bucketName}/`;
        if (urlObject.pathname.startsWith(basePath)) {
            // Decodificar URI por si hay caracteres especiales en el path/nombre
            return decodeURIComponent(urlObject.pathname.substring(basePath.length));
        }
        console.warn("No se pudo extraer el path de la URL:", url);
        return null;
    } catch (error) {
        console.error("Error al parsear la URL de Supabase:", error);
        return null;
    }
}

// --- Obtener Imágenes de la Galería por Tarea ID ---
export async function obtenerImagenesGaleriaPorTareaId(tareaId: string): Promise<TareaGaleria[]> {
    // ... (sin cambios) ...
    try {
        if (!tareaId) return [];
        const imagenes = await prisma.tareaGaleria.findMany({
            where: { tareaId: tareaId },
            orderBy: { orden: 'asc' },
        });
        return imagenes as TareaGaleria[];
    } catch (error) {
        console.error(`Error fetching gallery images for tarea ${tareaId}:`, error);
        throw new Error('No se pudieron obtener las imágenes de la galería.');
    }
}

// --- Crear Registro de Imagen en DB ---
export async function crearRegistroImagenGaleria(
    data: CrearImagenGaleriaInput
): Promise<{ success: boolean; data?: TareaGaleria; error?: string }> {
    try {
        if (!data.tareaId || !data.imageUrl) {
            return { success: false, error: "Faltan datos requeridos (tareaId, imageUrl)." };
        }

        const ultimoOrden = await prisma.tareaGaleria.aggregate({
            _max: { orden: true }, where: { tareaId: data.tareaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;
        const nuevaImagen = await prisma.tareaGaleria.create({
            data: {
                tareaId: data.tareaId, imageUrl: data.imageUrl,
                altText: data.altText || null, descripcion: data.descripcion || null,
                tamañoBytes: data.tamañoBytes || null, orden: nuevoOrden,
            }
        });
        revalidatePath(`/admin/tareas/${data.tareaId}`); // Ajusta ruta
        return { success: true, data: nuevaImagen as TareaGaleria };
    } catch (error) {
        console.error('Error creating gallery image record:', error);
        return { success: false, error: `Error al guardar registro: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}


// --- Eliminar una Imagen de la Galería (DB y Storage) ---
export async function eliminarImagenGaleria(
    imagenId: string,
    tareaId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!imagenId) return { success: false, error: "ID de imagen no proporcionado." };

        // 1. Obtener la URL de la imagen desde la BD
        const imagen = await prisma.tareaGaleria.findUnique({
            where: { id: imagenId },
            select: { imageUrl: true }
        });

        if (!imagen) {
            console.warn(`Registro de imagen ${imagenId} no encontrado en BD para eliminar.`);
            return { success: true };
        }

        // 2. Intentar eliminar de Supabase Storage usando el cliente Admin
        const filePath = getPathFromUrl(imagen.imageUrl);
        if (filePath) {
            console.log('Intentando eliminar de Supabase Storage:', filePath);
            // Usar supabaseAdmin
            const { error: storageError } = await supabaseAdmin.storage
                .from('ProMedia') // Nombre de tu Bucket
                .remove([filePath]);

            if (storageError) {
                console.error(`Error al eliminar ${filePath} de Supabase Storage:`, storageError.message);
                // Considerar si continuar o retornar error
            } else {
                console.log(`Archivo ${filePath} eliminado de Supabase Storage.`);
            }
        } else {
            console.warn(`No se pudo obtener la ruta del archivo desde la URL: ${imagen.imageUrl}`);
        }

        // 3. Eliminar el registro de la base de datos Prisma
        await prisma.tareaGaleria.delete({
            where: { id: imagenId },
        });
        console.log(`Registro de imagen ${imagenId} eliminado de la BD.`);

        // 4. Revalidar path
        revalidatePath(`/admin/tareas/${tareaId}`); // Ajusta la ruta

        return { success: true };
    } catch (error) {
        console.error(`Error deleting gallery image ${imagenId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            console.warn(`Registro de imagen ${imagenId} ya no existía en BD (P2025).`);
            return { success: true };
        }
        return { success: false, error: `Error al eliminar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}


// --- Subir Imagen a Supabase Storage (CORREGIDO y SIMPLIFICADO) ---
// Usa el cliente Admin y una lógica similar a tu original (remove + upload simple)
export async function subirImagen(file: File, filePath: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    try {
        console.log('Subiendo imagen a Supabase (Admin):', filePath);

        // 1. Intentar eliminar el archivo existente (si lo hay) - Opcional pero similar a tu lógica
        // Esto evita errores si la RLS no permite 'update' pero sí 'delete' e 'insert'
        // Comenta esta parte si prefieres que falle si el archivo ya existe
        console.log('Intentando eliminar archivo existente (si existe):', filePath);
        const { error: errorDelete } = await supabaseAdmin.storage
            .from('ProMedia') // Nombre de tu Bucket
            .remove([filePath]);
        if (errorDelete && errorDelete.message !== 'The resource was not found') {
            // Loguear si hubo un error diferente a "no encontrado"
            console.warn('Error al intentar eliminar archivo existente:', errorDelete.message);
        } else if (!errorDelete) {
            console.log('Archivo existente eliminado.');
        }

        // 2. Subir el nuevo archivo
        console.log('Subiendo nuevo archivo:', filePath);
        const { error: uploadError } = await supabaseAdmin.storage
            .from('ProMedia') // Nombre de tu Bucket
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false // Usar 'false' ya que eliminamos antes (o quitar esta línea)
            });

        if (uploadError) {
            console.error('Error al subir la imagen:', uploadError.message);
            // Verificar si el error es por RLS
            if (uploadError.message.includes('security policy')) {
                return { success: false, error: `Error subiendo: Política de seguridad (RLS) violada. Verifica permisos.` };
            }
            return { success: false, error: `Error subiendo: ${uploadError.message}` };
        }

        console.log('Imagen subida exitosamente, obteniendo URL pública...');

        // 3. Obtener la URL pública (usando el cliente Admin también)
        const { data } = supabaseAdmin.storage
            .from('ProMedia') // Nombre de tu Bucket
            .getPublicUrl(filePath);

        if (!data?.publicUrl) {
            console.error(`Error obteniendo la URL pública para: ${filePath}`);
            // Considerar borrar el archivo recién subido si no podemos obtener la URL?
            return { success: false, error: `Archivo subido pero no se pudo obtener URL pública.` };
        }

        console.log('URL Pública obtenida:', data.publicUrl);
        return { success: true, publicUrl: data.publicUrl };

    } catch (error) {
        console.error('Error inesperado en subirImagen:', error);
        return { success: false, error: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}


// --- Eliminar Imagen de Supabase Storage (Helper) ---
// ACTUALIZADO: Usar cliente Admin
export async function eliminarImagenStorage(filePath: string): Promise<{ success: boolean; error?: string }> {
    console.log('Eliminando de Supabase Storage (Admin):', filePath);
    try {
        // Usar supabaseAdmin
        const { error } = await supabaseAdmin.storage
            .from('ProMedia') // Nombre de tu Bucket
            .remove([filePath]);

        if (error) {
            console.error('Error al eliminar la imagen de Storage:', error.message);
            return { success: false, error: `Error eliminando de Storage: ${error.message}` };
        } else {
            console.log('Imagen eliminada de Storage exitosamente');
            return { success: true };
        }

    } catch (error) {
        console.error('Error inesperado en eliminarImagenStorage:', error);
        return { success: false, error: `Error inesperado: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// --- *** NUEVA ACCIÓN: Actualizar Orden de Imágenes de la Galería *** ---
export async function actualizarOrdenImagenesGaleria(
    tareaId: string, // Necesitamos saber a qué tarea pertenecen
    imagenesOrdenadas: { id: string; orden: number }[] // Array de {id, nuevoOrden}
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tareaId) return { success: false, error: "ID de tarea no proporcionado." };
        if (!imagenesOrdenadas || imagenesOrdenadas.length === 0) {
            return { success: true }; // Nada que actualizar
        }

        console.log(`Actualizando orden para tarea ${tareaId}:`, imagenesOrdenadas);

        // Usar una transacción para actualizar todos los órdenes
        await prisma.$transaction(
            imagenesOrdenadas.map((img, index) =>
                prisma.tareaGaleria.update({
                    where: {
                        id: img.id,
                        // Opcional: añadir tareaId al where por seguridad extra
                        // tareaId: tareaId,
                    },
                    data: { orden: index }, // Asignar el índice del array como nuevo orden
                })
            )
        );

        // Revalidar path para refrescar la galería en la UI
        revalidatePath(`/admin/tareas/${tareaId}`); // Ajusta la ruta si es necesario

        console.log(`Orden de galería para tarea ${tareaId} actualizado.`);
        return { success: true };
    } catch (error) {
        console.error(`Error updating gallery image order for tarea ${tareaId}:`, error);
        // Manejar error si una imagen no se encuentra (P2025) podría ser necesario
        return { success: false, error: (error as Error).message || 'Error desconocido al actualizar el orden.' };
    }
}