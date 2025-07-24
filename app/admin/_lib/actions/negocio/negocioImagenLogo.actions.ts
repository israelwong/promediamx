//ruta actual app/admin/_lib/actions/negocio/negocioImagenLogo.actions.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types'; // Tu tipo global
import { revalidatePath } from 'next/cache';
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions';
import {
    ActualizarImagenLogoData,
    ActualizarImagenLogoDataSchema,
    ActualizarLogoNegocioResultData,
    actualizarLogoNegocioResultSchema
} from './negocioImagenLogo.schemas';
import { Prisma } from '@prisma/client'; // Para el tipo TransactionClient

// Función helper para obtener las rutas a revalidar de forma más segura y completa
async function getNegocioPathsToRevalidate(negocioId: string, tx: Prisma.TransactionClient = prisma): Promise<string[]> {
    const negocio = await tx.negocio.findUnique({
        where: { id: negocioId },
        select: { clienteId: true } // Solo necesitamos clienteId para construir los paths
    });

    const paths: string[] = [];
    const clienteId = negocio?.clienteId;

    const editarPath = clienteId
        ? `/admin/clientes/${clienteId}/negocios/${negocioId}/editar`
        : `/admin/plataforma/negocios/${negocioId}/editar`; // Asume una ruta si no hay clienteId
    paths.push(editarPath);

    if (clienteId) {
        paths.push(`/admin/clientes/${clienteId}/negocios`);
    }

    paths.push(`/admin/plataforma/negocios`); // Ajusta si tu ruta es diferente

    console.log("[RevalidatePaths] Paths a revalidar:", paths);
    return paths;
}

export async function actualizarImagenLogoNegocio(
    negocioId: string,
    formData: FormData
): Promise<ActionResult<ActualizarImagenLogoData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return { success: false, error: "No se proporcionó ningún archivo." };
    }

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { success: false, error: `El logo excede ${maxSizeMB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP, SVG).' };
    }

    try {
        console.log(`[LogoUpload] Iniciando subida para negocio ${negocioId}`);
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, logoTamañoBytes: true, almacenamientoUsadoBytes: true }
        });

        if (!negocio) {
            console.error(`[LogoUpload] Negocio ${negocioId} no encontrado.`);
            return { success: false, error: "Negocio no encontrado." };
        }

        const oldLogoUrl = negocio.logo;
        const oldLogoSize = BigInt(negocio.logoTamañoBytes || 0);
        let currentAlmacenamientoTotal = BigInt(negocio.almacenamientoUsadoBytes || 0);

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `logo_${Date.now()}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Logo/${uniqueFileName}`;

        console.log(`[LogoUpload] Subiendo a Supabase en ruta: ${filePath}`);
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            console.error("[LogoUpload] Error de Supabase al subir:", uploadResult.error);
            return { success: false, error: uploadResult.error || "Error al subir nuevo logo." };
        }
        console.log("[LogoUpload] Subida a Supabase exitosa. Nueva URL:", uploadResult.publicUrl);

        const newLogoSize = BigInt(file.size);

        if (oldLogoUrl && oldLogoUrl !== uploadResult.publicUrl) {
            console.log(`[LogoUpload] Intentando eliminar logo antiguo de Supabase: ${oldLogoUrl}`);
            const deleteOldResult = await eliminarImagenStorage(oldLogoUrl);
            if (!deleteOldResult.success) {
                console.warn(`[LogoUpload] No se pudo eliminar el logo antiguo (${oldLogoUrl}) del storage: ${deleteOldResult.error}`);
            } else {
                console.log(`[LogoUpload] Logo antiguo ${oldLogoUrl} eliminado de Supabase.`);
            }
        }

        // Calcular nuevo almacenamiento total
        currentAlmacenamientoTotal = (currentAlmacenamientoTotal - oldLogoSize) + newLogoSize;
        if (currentAlmacenamientoTotal < BigInt(0)) {
            currentAlmacenamientoTotal = BigInt(0);
        }

        const dataToUpdatePrisma = {
            logo: uploadResult.publicUrl,
            logoTamañoBytes: Number(newLogoSize), // Convertir BigInt a number
            almacenamientoUsadoBytes: Number(currentAlmacenamientoTotal),
        };
        console.log("[LogoUpload] Actualizando Prisma con:", dataToUpdatePrisma);
        await prisma.negocio.update({
            where: { id: negocioId },
            data: dataToUpdatePrisma,
        });
        console.log("[LogoUpload] Prisma actualizado exitosamente.");

        const pathsToRevalidate = await getNegocioPathsToRevalidate(negocioId);
        pathsToRevalidate.forEach(path => revalidatePath(path, 'page'));

        const validatedOutput = ActualizarImagenLogoDataSchema.parse({ imageUrl: uploadResult.publicUrl });
        return { success: true, data: validatedOutput };

    } catch (error) {
        console.error("Error crítico en actualizarImagenLogoNegocio:", error);
        return { success: false, error: `Error al subir el logo: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}

export async function eliminarImagenLogoNegocio(
    negocioId: string
): Promise<ActionResult<null>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    try {
        console.log(`[LogoDelete] Iniciando eliminación para negocio ${negocioId}`);
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, logoTamañoBytes: true, almacenamientoUsadoBytes: true }
        });

        if (!negocio) {
            console.error(`[LogoDelete] Negocio ${negocioId} no encontrado.`);
            return { success: false, error: "Negocio no encontrado." };
        }
        if (!negocio.logo) {
            console.log(`[LogoDelete] Negocio ${negocioId} no tiene logo para eliminar.`);
            return { success: true, data: null };
        }

        const logoPath = negocio.logo;
        const logoSize = BigInt(negocio.logoTamañoBytes || 0);
        let currentAlmacenamientoTotal = BigInt(negocio.almacenamientoUsadoBytes || 0);

        console.log(`[LogoDelete] Eliminando de Supabase: ${logoPath}`);
        const deleteStorageResult = await eliminarImagenStorage(logoPath);
        if (!deleteStorageResult.success && deleteStorageResult.error && !deleteStorageResult.error.includes("No se pudo determinar la ruta")) {
            // Si el error no es "ruta no encontrada" o "archivo no encontrado", es un problema.
            // Si el archivo no estaba en Supabase, igual queremos limpiar la BD.
            console.error(`[LogoDelete] Error de Supabase al eliminar ${logoPath}: ${deleteStorageResult.error}`);
            // Decidir si retornar error o continuar para limpiar DB. Por ahora continuamos.
        } else {
            console.log(`[LogoDelete] Logo ${logoPath} eliminado de Supabase o no encontrado allí.`);
        }

        currentAlmacenamientoTotal -= logoSize;
        if (currentAlmacenamientoTotal < BigInt(0)) {
            currentAlmacenamientoTotal = BigInt(0);
        }

        const dataToUpdatePrisma = {
            logo: null,
            logoTamañoBytes: null,
            almacenamientoUsadoBytes: Number(currentAlmacenamientoTotal),
        };
        console.log("[LogoDelete] Actualizando Prisma con:", dataToUpdatePrisma);
        await prisma.negocio.update({
            where: { id: negocioId },
            data: dataToUpdatePrisma,
        });
        console.log("[LogoDelete] Prisma actualizado exitosamente.");

        const pathsToRevalidate = await getNegocioPathsToRevalidate(negocioId);
        pathsToRevalidate.forEach(path => revalidatePath(path, 'page'));

        return { success: true, data: null };
    } catch (error) {
        console.error("Error crítico en eliminarImagenLogoNegocio:", error);
        return { success: false, error: `Error al eliminar el logo: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}




// Helper para la ruta de revalidación
const getPathToNegocioEdicion = (clienteId: string | null | undefined, negocioId: string) => {
    // Asumiendo que tienes una ruta genérica de edición de negocio si no hay clienteId
    // o que el componente que llama siempre está en un contexto de cliente.
    // Ajusta esto según tu estructura de rutas real.
    if (clienteId) {
        return `/admin/clientes/${clienteId}/negocios/${negocioId}/editar`;
    }
    // Fallback si no hay clienteId, o podrías lanzar un error si siempre se espera.
    return `/admin/negocios/${negocioId}/editar`; // O una ruta de admin global de negocios
};

export async function actualizarImagenLogoAction(
    negocioId: string,
    formData: FormData
): Promise<ActionResult<ActualizarLogoNegocioResultData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return { success: false, error: "No se proporcionó ningún archivo." };
    }

    // Validaciones básicas (el componente ya las hace, pero es bueno tenerlas en el servidor)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { success: false, error: `El logo excede ${maxSizeMB}MB.` };
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP, SVG).' };
    }

    let oldLogoSize = BigInt(0);
    let clienteIdForPath: string | null | undefined = null;

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true, almacenamientoUsadoBytes: true, logoTamañoBytes: true }
        });

        if (!negocio) return { success: false, error: "Negocio no encontrado." };

        clienteIdForPath = negocio.clienteId;
        const currentAlmacenamientoNegocioDB = BigInt(negocio.almacenamientoUsadoBytes || 0);

        if (negocio.logo) {
            oldLogoSize = BigInt(negocio.logoTamañoBytes || 0);
            // No eliminamos el archivo viejo de Supabase aún, lo hacemos después de subir el nuevo
            // para evitar quedarnos sin logo si la subida falla.
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `logo_${Date.now()}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Logo/${uniqueFileName}`;

        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir nuevo logo." };
        }

        // Si había un logo antiguo, ahora sí lo eliminamos del storage
        if (negocio.logo) {
            const deleteOldResult = await eliminarImagenStorage(negocio.logo);
            if (!deleteOldResult.success) {
                console.warn(`No se pudo eliminar el logo antiguo (${negocio.logo}) del storage: ${deleteOldResult.error}`);
                // Continuamos igualmente, ya que el nuevo logo está subido.
            }
        }

        const newLogoSize = BigInt(file.size);
        const nuevoAlmacenamientoTotal = currentAlmacenamientoNegocioDB - oldLogoSize + newLogoSize;

        await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                logo: uploadResult.publicUrl,
                logoTamañoBytes: Number(newLogoSize), // Prisma espera Number para BigInt? o convertir a BigInt si el campo es BigInt
                almacenamientoUsadoBytes: nuevoAlmacenamientoTotal < 0 ? BigInt(0) : nuevoAlmacenamientoTotal,
            }
        });

        const pathToRevalidate = getPathToNegocioEdicion(clienteIdForPath, negocioId);
        revalidatePath(pathToRevalidate);
        // Podrías añadir más revalidaciones si el logo se muestra en otras partes.

        const validatedOutput = actualizarLogoNegocioResultSchema.parse({ imageUrl: uploadResult.publicUrl });
        return { success: true, data: validatedOutput };

    } catch (error) {
        console.error("Error crítico en actualizarImagenLogoAction:", error);
        return { success: false, error: `Error al subir el logo: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}

export async function eliminarImagenLogoAction(
    negocioId: string
): Promise<ActionResult<null>> { // Se devuelve null en data si es exitoso
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    let clienteIdForPath: string | null | undefined = null;

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true, almacenamientoUsadoBytes: true, logoTamañoBytes: true }
        });

        if (!negocio) return { success: false, error: "Negocio no encontrado." };

        clienteIdForPath = negocio.clienteId;

        if (!negocio.logo) { // No hay logo que eliminar
            return { success: true, data: null };
        }

        const logoPath = negocio.logo;
        const logoSize = BigInt(negocio.logoTamañoBytes || 0);

        const deleteStorageResult = await eliminarImagenStorage(logoPath);
        if (!deleteStorageResult.success && deleteStorageResult.error && !deleteStorageResult.error.includes("No se pudo determinar la ruta")) {
            // Si el error no es porque no se encontró el archivo o ruta inválida, lo consideramos un fallo.
            return { success: false, error: `Error eliminando de Storage: ${deleteStorageResult.error}` };
        }
        // Si tuvo éxito o el archivo no existía/ruta inválida, continuamos para limpiar la BD.

        const currentAlmacenamientoNegocioDB = BigInt(negocio.almacenamientoUsadoBytes || 0);
        const nuevoAlmacenamientoTotal = currentAlmacenamientoNegocioDB - logoSize;

        await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                logo: null,
                logoTamañoBytes: null,
                almacenamientoUsadoBytes: nuevoAlmacenamientoTotal < 0 ? BigInt(0) : nuevoAlmacenamientoTotal,
            }
        });

        const pathToRevalidate = getPathToNegocioEdicion(clienteIdForPath, negocioId);
        revalidatePath(pathToRevalidate);
        // Más revalidaciones si es necesario

        return { success: true, data: null };
    } catch (error) {
        console.error("Error crítico en eliminarImagenLogoAction:", error);
        return { success: false, error: `Error al eliminar el logo: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}
