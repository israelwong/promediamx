'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import { ActionResult } from '@/app/admin/_lib/types'; // Tu tipo global
import {
    subirImagenStorage,
    eliminarImagenStorage
} from '@/app/admin/_lib/unused/imageHandler.actions'; // Asumiendo que este es tu manejador genérico
import {
    TareaIconoActualizadoOutputSchema,
    type TareaIconoActualizadoOutput
} from './tareaIcono.schemas'; // O desde tarea.schemas.ts
// import type { Tarea as TareaPrisma } from '@prisma/client';


// Acción unificada para subir/reemplazar el icono de una tarea
export async function gestionarSubidaIconoTarea(
    tareaId: string,
    formData: FormData
): Promise<ActionResult<TareaIconoActualizadoOutput>> {
    if (!tareaId) {
        return { success: false, error: "ID de tarea no proporcionado." };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return { success: false, error: "No se proporcionó ningún archivo." };
    }

    // Validaciones básicas (puedes ajustar o añadir más desde el cliente también)
    const maxSizeMB = 2; // Límite para iconos
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { success: false, error: `El icono excede ${maxSizeMB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido para icono (JPG, PNG, WEBP, SVG).' };
    }

    try {
        const tareaActual = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: { iconoUrl: true }
        });

        if (!tareaActual) {
            return { success: false, error: "Tarea no encontrada." };
        }
        const oldIconoUrl = tareaActual.iconoUrl;

        // Subir la nueva imagen
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
        const uniqueFileName = `icono_${Date.now()}.${fileExtension}`;
        // Usar una ruta específica para iconos de tareas
        const filePath = `Tareas/${tareaId}/Icono/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir el nuevo icono." };
        }
        const newIconoUrl = uploadResult.publicUrl;

        // Actualizar la Tarea en la base de datos con la nueva URL del icono
        const tareaActualizada = await prisma.tarea.update({
            where: { id: tareaId },
            data: { iconoUrl: newIconoUrl },
        });

        // Si la subida y actualización en BD fueron exitosas, y había un icono antiguo diferente, eliminarlo del storage
        if (oldIconoUrl && oldIconoUrl !== newIconoUrl) {
            const deleteOldResult = await eliminarImagenStorage(oldIconoUrl);
            if (!deleteOldResult.success) {
                // No es un error crítico si no se pudo borrar el antiguo, pero se debería loguear
                console.warn(`ADVERTENCIA: No se pudo eliminar el icono antiguo (${oldIconoUrl}) del storage: ${deleteOldResult.error}`);
            }
        }

        revalidatePath(`/admin/tareas/${tareaId}`); // Revalidar la página de edición de la tarea
        revalidatePath('/admin/tareas');         // Revalidar la lista de tareas

        const validatedOutput = TareaIconoActualizadoOutputSchema.parse({ iconoUrl: tareaActualizada.iconoUrl });
        return { success: true, data: validatedOutput };

    } catch (error: unknown) {
        console.error("Error en gestionarSubidaIconoTarea:", error);
        return { success: false, error: `Error al gestionar subida de icono: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// Acción unificada para eliminar el icono de una tarea
export async function gestionarEliminacionIconoTarea(
    tareaId: string
): Promise<ActionResult<TareaIconoActualizadoOutput>> {
    if (!tareaId) {
        return { success: false, error: "ID de tarea no proporcionado." };
    }

    try {
        const tareaActual = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: { iconoUrl: true }
        });

        if (!tareaActual) {
            return { success: false, error: "Tarea no encontrada." };
        }

        if (!tareaActual.iconoUrl) {
            // No hay icono que eliminar, considera esto un éxito o un no-op.
            return { success: true, data: { iconoUrl: null } };
        }

        const iconoUrlAEliminar = tareaActual.iconoUrl;

        // Eliminar de Supabase Storage
        const deleteStorageResult = await eliminarImagenStorage(iconoUrlAEliminar);
        if (!deleteStorageResult.success && deleteStorageResult.error && !deleteStorageResult.error.includes("No se pudo determinar la ruta")) {
            // Si el error no es porque el archivo no existe, lo consideramos un fallo
            return { success: false, error: `Error eliminando icono de Storage: ${deleteStorageResult.error}` };
        }

        // Actualizar la Tarea en la base de datos para quitar la URL del icono
        await prisma.tarea.update({
            where: { id: tareaId },
            data: { iconoUrl: null },
        });

        revalidatePath(`/admin/tareas/${tareaId}`);
        revalidatePath('/admin/tareas');

        // Devolvemos null para iconoUrl ya que fue eliminado
        const validatedOutput = TareaIconoActualizadoOutputSchema.parse({ iconoUrl: null });
        return { success: true, data: validatedOutput };

    } catch (error: unknown) {
        console.error("Error en gestionarEliminacionIconoTarea:", error);
        return { success: false, error: `Error al eliminar el icono: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}