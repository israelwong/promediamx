// @/app/admin/_lib/actions/negocio/negocioImagenLogo.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
// import { Prisma } from '@prisma/client';
// Asegúrate que la ruta a imageHandler.actions es correcta y que sus funciones
// devuelven un objeto con { success: boolean, ... }
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';

import { ActualizarImagenLogoData } from './negocioImagenLogo.schemas';

const getPathToNegocioEdicion = (clienteId: string | null | undefined, negocioId: string) => {
    if (clienteId) {
        return `/admin/clientes/${clienteId}/negocios/${negocioId}/editar`;
    }
    return `/admin/negocios/${negocioId}/editar`;
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

    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (file.size > maxSize) {
        return { success: false, error: `El logo excede ${maxSize / 1024 / 1024}MB.` };
    }
    if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP, SVG).' };
    }

    let oldLogoPath: string | null = null;
    let oldLogoSize = BigInt(0);
    let clienteIdForPath: string | null | undefined = null;
    let currentAlmacenamientoNegocio = BigInt(0);

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true, almacenamientoUsadoBytes: true, logoTamañoBytes: true }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }
        clienteIdForPath = negocio.clienteId;
        currentAlmacenamientoNegocio = BigInt(negocio.almacenamientoUsadoBytes || 0);

        if (negocio.logo) {
            oldLogoPath = negocio.logo;
            oldLogoSize = BigInt(negocio.logoTamañoBytes || 0);
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'tmp';
        const uniqueFileName = `logo_${Date.now()}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Logo/${uniqueFileName}`;

        // Llamada robusta a subirImagenStorage
        const uploadResult = await subirImagenStorage(file, filePath);
        if (!uploadResult || typeof uploadResult.success !== 'boolean') {
            console.error("Respuesta inesperada de subirImagenStorage:", uploadResult);
            return { success: false, error: "Error interno al procesar la subida de imagen." };
        }
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir nuevo logo." };
        }

        const newLogoSize = BigInt(file.size); // Tamaño del archivo (comprimido) que se subió

        if (oldLogoPath) {
            const deleteOldResult = await eliminarImagenStorage(oldLogoPath);
            if (!deleteOldResult || typeof deleteOldResult.success !== 'boolean') {
                console.warn(`Respuesta inesperada de eliminarImagenStorage para logo antiguo (${oldLogoPath})`);
            } else if (!deleteOldResult.success) {
                console.warn(`No se pudo eliminar el logo antiguo (${oldLogoPath}) del storage: ${deleteOldResult.error}`);
            }
        }

        currentAlmacenamientoNegocio = currentAlmacenamientoNegocio - oldLogoSize + newLogoSize;
        if (currentAlmacenamientoNegocio < 0) currentAlmacenamientoNegocio = BigInt(0);

        await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                logo: uploadResult.publicUrl,
                logoTamañoBytes: Number(newLogoSize),
                almacenamientoUsadoBytes: currentAlmacenamientoNegocio
            }
        });

        const pathToRevalidate = getPathToNegocioEdicion(clienteIdForPath, negocioId);
        revalidatePath(pathToRevalidate);
        if (clienteIdForPath) {
            revalidatePath(`/admin/clientes/${clienteIdForPath}/negocios`);
        }

        return { success: true, data: { imageUrl: uploadResult.publicUrl } };

    } catch (error) {
        console.error("Error crítico en actualizarImagenLogoNegocio:", error);
        let errorMessage = "Error desconocido al subir el logo.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function eliminarImagenLogoNegocio(
    negocioId: string
): Promise<ActionResult<void>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    let clienteIdForPath: string | null | undefined = null;

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { logo: true, clienteId: true, almacenamientoUsadoBytes: true, logoTamañoBytes: true }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }
        clienteIdForPath = negocio.clienteId;

        if (!negocio.logo) {
            return { success: true };
        }

        const logoPath = negocio.logo;
        const logoSize = BigInt(negocio.logoTamañoBytes || 0);

        const deleteStorageResult = await eliminarImagenStorage(logoPath);
        if (!deleteStorageResult || typeof deleteStorageResult.success !== 'boolean') {
            console.warn(`Respuesta inesperada de eliminarImagenStorage para logo (${logoPath})`);
            // Considerar si fallar o continuar. Si continuamos, el logo en DB se borrará pero podría quedar huérfano en storage.
        } else if (!deleteStorageResult.success) {
            console.warn(`Error eliminando logo del storage (${logoPath}): ${deleteStorageResult.error}`);
            // Igualmente, decidir si es un error fatal para la operación.
            // return { success: false, error: `Error en storage: ${deleteStorageResult.error}` };
        }

        let currentAlmacenamientoNegocio = BigInt(negocio.almacenamientoUsadoBytes || 0);
        currentAlmacenamientoNegocio -= logoSize;
        if (currentAlmacenamientoNegocio < 0) currentAlmacenamientoNegocio = BigInt(0);

        await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                logo: null,
                logoTamañoBytes: null,
                almacenamientoUsadoBytes: currentAlmacenamientoNegocio
            }
        });

        const pathToRevalidate = getPathToNegocioEdicion(clienteIdForPath, negocioId);
        revalidatePath(pathToRevalidate);
        if (clienteIdForPath) {
            revalidatePath(`/admin/clientes/${clienteIdForPath}/negocios`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error crítico en eliminarImagenLogoNegocio:", error);
        let errorMessage = "Error desconocido al eliminar el logo.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}