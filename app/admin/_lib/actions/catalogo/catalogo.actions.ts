// @/app/admin/_lib/actions/catalogo/catalogo.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, Catalogo as PrismaCatalogo } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions'; // Asumiendo que está aquí

import {
    CatalogoParaListaSchema,
    type CatalogoParaListaType,
    CrearCatalogoDataSchema,
    type CrearCatalogoData,
    ActualizarCatalogoDataSchema, // Importar para actualizar
    type ActualizarCatalogoData
} from './catalogo.schemas';

// Helper para la ruta de revalidación de la lista de catálogos
const getPathToCatalogoLista = (clienteId: string, negocioId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo`;
};
// Helper para la ruta de revalidación de un catálogo específico
const getPathToCatalogoDetalle = (clienteId: string, negocioId: string, catalogoId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`;
};

// --- OBTENER CATALOGOS PARA LISTA (ya refactorizada) ---
export async function obtenerCatalogosPorNegocioId(
    negocioId: string
): Promise<ActionResult<CatalogoParaListaType[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const catalogos = await prisma.catalogo.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                status: true,
                imagenPortadaUrl: true,
                _count: {
                    select: { ItemCatalogo: true }
                }
            },
            orderBy: { nombre: 'asc' },
        });
        const validationResults = catalogos.map(cat => CatalogoParaListaSchema.safeParse(cat));
        const validCatalogos: CatalogoParaListaType[] = [];
        validationResults.forEach((res, index) => {
            if (res.success) {
                validCatalogos.push(res.data);
            } else {
                console.warn(`Datos de catálogo inválidos para ID ${catalogos[index]?.id} en lista:`, res.error.flatten());
            }
        });
        return { success: true, data: validCatalogos };
    } catch (error) {
        console.error(`Error fetching catalogos for negocio ${negocioId}:`, error);
        return { success: false, error: "Error al obtener los catálogos del negocio." };
    }
}

// --- CREAR CATALOGO (ya refactorizada) ---
export async function crearCatalogoNegocio(
    negocioId: string,
    clienteId: string,
    data: CrearCatalogoData
): Promise<ActionResult<PrismaCatalogo>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado para revalidación." };

    const validationResult = CrearCatalogoDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, descripcion, status } = validationResult.data;

    try {
        const nuevoCatalogo = await prisma.catalogo.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombre: nombre,
                descripcion: descripcion,
                status: status || 'activo',
            },
        });
        revalidatePath(getPathToCatalogoLista(clienteId, negocioId));
        return { success: true, data: nuevoCatalogo };
    } catch (error) {
        console.error("Error al crear catálogo:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El catálogo "${nombre}" ya existe para este negocio.` };
        }
        return { success: false, error: "Error al crear el catálogo." };
    }
}

// --- OBTENER CATALOGO POR ID PARA EDICIÓN ---
export async function obtenerCatalogoPorId(
    catalogoId: string,
    negocioId: string // Para asegurar que pertenece al negocio
): Promise<ActionResult<PrismaCatalogo | null>> {
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    try {
        const catalogo = await prisma.catalogo.findUnique({
            where: {
                id: catalogoId,
                negocioId: negocioId // Asegurar que el catálogo pertenece al negocio correcto
            },
            // Incluir relaciones si el formulario de edición las necesita directamente
            // Por ahora, el form solo edita campos escalares del catálogo.
            // Los items se manejan por CatalogoItems.tsx
        });

        if (!catalogo) {
            return { success: false, error: `Catálogo con ID ${catalogoId} no encontrado o no pertenece al negocio.` };
        }
        return { success: true, data: catalogo };
    } catch (error) {
        console.error(`Error obteniendo catálogo ${catalogoId}:`, error);
        return { success: false, error: "Error al obtener los detalles del catálogo." };
    }
}

// --- ACTUALIZAR CATALOGO ---
export async function actualizarCatalogo(
    catalogoId: string,
    negocioId: string, // Para asegurar scope y revalidación
    clienteId: string, // Para revalidación
    data: ActualizarCatalogoData
): Promise<ActionResult<PrismaCatalogo>> {
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };

    const validationResult = ActualizarCatalogoDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const dataToUpdate = validationResult.data;

    if (Object.keys(dataToUpdate).length === 0) {
        // Si no hay datos para actualizar, podemos devolver la data actual o un mensaje.
        // Para este caso, es mejor devolver un error leve o la data actual si se obtiene.
        const currentCatalogo = await prisma.catalogo.findUnique({ where: { id: catalogoId, negocioId: negocioId } });
        if (!currentCatalogo) return { success: false, error: "Catálogo no encontrado." };
        return { success: true, data: currentCatalogo, error: "No se proporcionaron datos para actualizar." };
    }

    try {
        const catalogoActualizado = await prisma.catalogo.update({
            where: { id: catalogoId, negocioId: negocioId }, // Asegurar que el catálogo pertenece al negocio
            data: dataToUpdate,
        });

        revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
        revalidatePath(getPathToCatalogoLista(clienteId, negocioId)); // También la lista por si cambió nombre o status

        return { success: true, data: catalogoActualizado };
    } catch (error) {
        console.error(`Error actualizando catálogo ${catalogoId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && dataToUpdate.nombre) { // Conflicto de nombre único
                return { success: false, error: `El nombre de catálogo "${dataToUpdate.nombre}" ya existe.` };
            }
            if (error.code === 'P2025') { // Registro a actualizar no encontrado
                return { success: false, error: "Catálogo no encontrado para actualizar." };
            }
        }
        return { success: false, error: "No se pudo actualizar el catálogo." };
    }
}


// --- ELIMINAR CATALOGO (ya refactorizada, se mantiene) ---
export async function eliminarCatalogo(
    catalogoId: string,
    negocioId: string,
    clienteId: string
): Promise<ActionResult<void>> {
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };

    try {
        const catalogoConItemsYGaleria = await prisma.catalogo.findUnique({
            where: { id: catalogoId, negocioId: negocioId },
            select: {
                id: true,
                imagenPortadaUrl: true,
                ItemCatalogo: { select: { galeria: { select: { imageUrl: true } } } }
            }
        });

        if (!catalogoConItemsYGaleria) {
            return { success: false, error: "Catálogo no encontrado o no pertenece a este negocio." };
        }

        const urlsAEliminar: string[] = [];
        if (catalogoConItemsYGaleria.imagenPortadaUrl) {
            urlsAEliminar.push(catalogoConItemsYGaleria.imagenPortadaUrl);
        }
        catalogoConItemsYGaleria.ItemCatalogo.forEach(item => {
            item.galeria.forEach(imagen => {
                if (imagen.imageUrl) urlsAEliminar.push(imagen.imageUrl);
            });
        });

        if (urlsAEliminar.length > 0) {
            const deletePromises = urlsAEliminar.map(url => eliminarImagenStorage(url));
            const results = await Promise.allSettled(deletePromises);
            results.forEach((result, index) => {
                if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
                    console.warn(`Fallo al eliminar imagen ${urlsAEliminar[index]} del storage: ${result.status === 'rejected' ? result.reason : result.value.error}`);
                }
            });
        }

        // onDelete: Cascade en Prisma se encarga de ItemCatalogo y sus galerías.
        // CatalogoGaleria (si existe una relación directa con Catalogo) también se manejaría por cascade.
        await prisma.catalogo.delete({
            where: { id: catalogoId },
        });

        revalidatePath(getPathToCatalogoLista(clienteId, negocioId));
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}`);

        return { success: true };

    } catch (error) {
        console.error(`Error en eliminarCatalogo (${catalogoId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "El catálogo ya había sido eliminado." };
        }
        return { success: false, error: "No se pudo eliminar el catálogo." };
    }
}

// Acciones para CatalogoPortada (imagenPortadaUrl) se crearán en un archivo separado
// como catalogoPortada.actions.ts
