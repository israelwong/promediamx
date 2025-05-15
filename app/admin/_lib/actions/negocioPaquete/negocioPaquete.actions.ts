// Ruta: app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import {
    NegocioPaqueteCreado,
    NegocioPaqueteListItem,
    NegocioPaqueteParaEditar,
    CrearNegocioPaqueteSchema,
    CrearNegocioPaqueteData,
    ActualizarNegocioPaqueteData,
    ActualizarNegocioPaqueteSchema,
    ActualizarItemsDePaqueteData,
    ActualizarItemsDePaqueteSchema,
    ItemCatalogoParaSeleccion,

} from './negocioPaquete.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma para errores

// Helper para construir la ruta a revalidar para la lista de paquetes
const getPathToListaPaquetes = (clienteId: string, negocioId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes`;

const getPathToPaqueteEdicion = (clienteId: string, negocioId: string, paqueteId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/${paqueteId}/editar`;

export async function crearNegocioPaqueteAction(
    negocioId: string,
    clienteId: string,
    data: CrearNegocioPaqueteData
): Promise<ActionResult<NegocioPaqueteCreado>> {
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };
    const validation = CrearNegocioPaqueteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { nombre, descripcionCorta, descripcion, precio, linkPago, negocioPaqueteCategoriaId } = validation.data;
    try {
        const ultimoPaquete = await prisma.negocioPaquete.findFirst({
            where: { negocioId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const proximoOrden = (ultimoPaquete?.orden ?? -1) + 1;
        const nuevoPaquete = await prisma.negocioPaquete.create({
            data: {
                nombre,
                descripcionCorta: descripcionCorta || null,
                descripcion: descripcion || null,
                precio,
                linkPago: linkPago || null,
                negocioId: negocioId,
                negocioPaqueteCategoriaId: negocioPaqueteCategoriaId || null,
                orden: proximoOrden,
                status: 'activo',
            },
            select: { /* ... campos de NegocioPaqueteCreadoSchema ... */
                id: true, nombre: true, descripcionCorta: true, descripcion: true, precio: true, linkPago: true, orden: true, status: true, negocioId: true, negocioPaqueteCategoriaId: true, createdAt: true, updatedAt: true,
            }
        });
        revalidatePath(getPathToListaPaquetes(clienteId, negocioId));
        return { success: true, data: nuevoPaquete };
    } catch (error: unknown) {
        console.error("Error crearNegocioPaqueteAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = error.meta?.target as string[] | undefined;
            if (target && target.includes('nombre')) { // Asumiendo unique(negocioId, nombre)
                return { success: false, error: "Ya existe un paquete con este nombre para este negocio." };
            }
        }
        return { success: false, error: "No se pudo crear el paquete." };
    }
}

// --- Acción para listar (del paso anterior, la mantenemos) ---
export async function obtenerPaquetesPorNegocioAction(
    negocioId: string
): Promise<ActionResult<NegocioPaqueteListItem[]>> {
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };
    try {
        const paquetesFromDb = await prisma.negocioPaquete.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true, nombre: true, descripcion: true, /* Usar descripcionCorta para la lista */ precio: true, orden: true, status: true, createdAt: true,
                negocioPaqueteCategoria: { select: { id: true, nombre: true } },
            },
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
        });
        const paquetesTyped: NegocioPaqueteListItem[] = paquetesFromDb.map(p => ({
            ...p,
            descripcion: p.descripcion ?? undefined, // O usar p.descripcionCorta
            orden: p.orden ?? undefined,
            negocioPaqueteCategoria: p.negocioPaqueteCategoria ?? undefined,
        }));
        return { success: true, data: paquetesTyped };
    } catch (error) {
        console.error("Error al obtener paquetes por negocio:", error);
        return { success: false, error: "No se pudieron obtener los paquetes." };
    }
}

// --- NUEVA: Acción para obtener un paquete específico para edición ---
export async function obtenerNegocioPaqueteParaEditarAction(
    paqueteId: string
): Promise<ActionResult<NegocioPaqueteParaEditar>> {
    if (!paqueteId) return { success: false, error: "El ID del paquete es requerido." };
    try {
        const paquete = await prisma.negocioPaquete.findUnique({
            where: { id: paqueteId },
            select: {
                id: true,
                nombre: true,
                descripcionCorta: true,
                descripcion: true,
                precio: true,
                linkPago: true,
                status: true,
                negocioPaqueteCategoriaId: true,
            }
        });
        if (!paquete) return { success: false, error: "Paquete no encontrado." };
        return { success: true, data: paquete };
    } catch (error) {
        console.error("Error obtenerNegocioPaqueteParaEditarAction:", error);
        return { success: false, error: "No se pudo obtener el paquete para edición." };
    }
}

// --- NUEVA: Acción para actualizar un paquete ---
export async function actualizarNegocioPaqueteAction(
    paqueteId: string,
    clienteId: string, // Para revalidatePath
    negocioId: string, // Para revalidatePath y asegurar que se edita el correcto
    data: ActualizarNegocioPaqueteData
): Promise<ActionResult<NegocioPaqueteParaEditar>> { // Devuelve el paquete actualizado
    if (!paqueteId) return { success: false, error: "El ID del paquete es requerido." };

    const validation = ActualizarNegocioPaqueteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    const { nombre, descripcionCorta, descripcion, precio, linkPago, status, negocioPaqueteCategoriaId } = validation.data;

    try {
        const paqueteActualizado = await prisma.negocioPaquete.update({
            where: { id: paqueteId, negocioId: negocioId }, // Asegurar que el paquete pertenece al negocio
            data: {
                nombre,
                descripcionCorta: descripcionCorta, // Zod ya maneja optional().nullable()
                descripcion: descripcion,
                precio,
                linkPago: linkPago,
                status,
                negocioPaqueteCategoriaId: negocioPaqueteCategoriaId,
            },
            select: { // Devolver los mismos campos que obtenerNegocioPaqueteParaEditarAction
                id: true, nombre: true, descripcionCorta: true, descripcion: true, precio: true, linkPago: true, status: true, negocioPaqueteCategoriaId: true,
            }
        });
        revalidatePath(getPathToListaPaquetes(clienteId, negocioId));
        // También podrías querer revalidar la página de edición específica:
        // revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/${paqueteId}`);
        return { success: true, data: paqueteActualizado };
    } catch (error: unknown) {
        console.error("Error actualizarNegocioPaqueteAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') { // Conflicto de unicidad (ej. nombre)
                const target = error.meta?.target as string[] | undefined;
                if (target && target.includes('nombre')) {
                    return { success: false, error: "Ya existe otro paquete con este nombre para este negocio." };
                }
            } else if (error.code === 'P2025') { // Registro no encontrado
                return { success: false, error: "Paquete no encontrado o no pertenece a este negocio." };
            }
        }
        return { success: false, error: "No se pudo actualizar el paquete." };
    }
}

// --- NUEVA: Acción para eliminar un paquete ---
export async function eliminarNegocioPaqueteAction(
    paqueteId: string,
    clienteId: string, // Para revalidatePath
    negocioId: string  // Para revalidatePath y asegurar que se elimina el correcto
): Promise<ActionResult<void>> { // No devuelve datos, solo éxito/error
    if (!paqueteId) return { success: false, error: "El ID del paquete es requerido." };
    try {
        // Prisma se encargará de las eliminaciones en cascada (ej. NegocioPaqueteItem)
        // según lo definido en el schema.
        await prisma.negocioPaquete.delete({
            where: { id: paqueteId, negocioId: negocioId }, // Asegurar que el paquete pertenece al negocio
        });
        revalidatePath(getPathToListaPaquetes(clienteId, negocioId));
        return { success: true };
    } catch (error: unknown) {
        console.error("Error eliminarNegocioPaqueteAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Paquete no encontrado o no pertenece a este negocio." };
        }
        return { success: false, error: "No se pudo eliminar el paquete." };
    }
}


// // --- NUEVA: Acción para obtener todos los ItemCatalogo de un negocio (para la lista de disponibles) ---
// export async function obtenerItemsCatalogoPorNegocioAction(
//     negocioId: string
// ): Promise<ActionResult<ItemCatalogoParaSeleccion[]>> {
//     if (!negocioId) {
//         return { success: false, error: "El ID del negocio es requerido." };
//     }
//     try {
//         const items = await prisma.itemCatalogo.findMany({
//             where: {
//                 negocioId: negocioId,
//                 // status: 'activo', // Opcional: filtrar solo ítems activos
//             },
//             select: {
//                 id: true,
//                 nombre: true,
//                 precio: true,
//             },
//             orderBy: {
//                 nombre: 'asc',
//             },
//         });
//         return { success: true, data: items };
//     } catch (error) {
//         console.error("Error obtenerItemsCatalogoPorNegocioAction:", error);
//         return { success: false, error: "No se pudieron obtener los ítems del catálogo." };
//     }
// }

// // --- NUEVA: Acción para obtener los IDs de los ItemCatalogo actualmente en un paquete ---
// export async function obtenerItemsPaqueteActualAction(
//     paqueteId: string
// ): Promise<ActionResult<string[]>> { // Devuelve un array de itemCatalogoId
//     if (!paqueteId) {
//         return { success: false, error: "El ID del paquete es requerido." };
//     }
//     try {
//         const paqueteItems = await prisma.negocioPaqueteItem.findMany({
//             where: {
//                 negocioPaqueteId: paqueteId,
//             },
//             select: {
//                 itemCatalogoId: true,
//             },
//         });
//         const itemIds = paqueteItems.map(pi => pi.itemCatalogoId);
//         return { success: true, data: itemIds };
//     } catch (error) {
//         console.error("Error obtenerItemsPaqueteActualAction:", error);
//         return { success: false, error: "No se pudieron obtener los ítems actuales del paquete." };
//     }
// }

// // --- NUEVA: Acción para actualizar/establecer los ItemCatalogo de un paquete ---
// export async function actualizarItemsDePaqueteAction(
//     paqueteId: string,
//     clienteId: string, // Para revalidatePath
//     negocioId: string, // Para revalidatePath
//     data: ActualizarItemsDePaqueteData
// ): Promise<ActionResult<void>> { // No devuelve datos, solo éxito/error
//     if (!paqueteId) {
//         return { success: false, error: "El ID del paquete es requerido." };
//     }

//     const validation = ActualizarItemsDePaqueteSchema.safeParse(data);
//     if (!validation.success) {
//         return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
//     }

//     const { itemCatalogoIds } = validation.data;

//     try {
//         // Usar una transacción para asegurar la atomicidad:
//         // 1. Eliminar todas las asociaciones existentes de NegocioPaqueteItem para este paquete.
//         // 2. Crear las nuevas asociaciones.
//         await prisma.$transaction(async (tx) => {
//             await tx.negocioPaqueteItem.deleteMany({
//                 where: {
//                     negocioPaqueteId: paqueteId,
//                 },
//             });

//             if (itemCatalogoIds.length > 0) {
//                 await tx.negocioPaqueteItem.createMany({
//                     data: itemCatalogoIds.map(itemId => ({
//                         negocioPaqueteId: paqueteId,
//                         itemCatalogoId: itemId,
//                     })),
//                 });
//             }
//         });

//         revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
//         return { success: true };
//     } catch (error: unknown) {
//         console.error("Error actualizarItemsDePaqueteAction:", error);
//         // Podrías añadir manejo específico para errores de FK si un itemCatalogoId no existe,
//         // aunque la UI debería prevenir esto.
//         return { success: false, error: "No se pudieron actualizar los ítems del paquete." };
//     }
// }


// --- ACTUALIZADA: Acción para obtener todos los ItemCatalogo de un negocio ---
export async function obtenerItemsCatalogoPorNegocioAction(
    negocioId: string
): Promise<ActionResult<ItemCatalogoParaSeleccion[]>> {
    if (!negocioId) {
        return { success: false, error: "El ID del negocio es requerido." };
    }
    try {
        const itemsFromDb = await prisma.itemCatalogo.findMany({
            where: {
                negocioId: negocioId,
                // status: 'activo', // Opcional: filtrar solo ítems activos
            },
            select: {
                id: true,
                nombre: true,
                precio: true,
                descripcion: true,
                catalogo: { // Incluir la relación con Catalogo
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
                categoria: { // Incluir la relación con NegocioCategoria (categoría del ítem)
                    select: {
                        nombre: true,
                    },
                },
                galeria: { // Incluir la galería para obtener la imagen de portada
                    select: {
                        imageUrl: true,
                    },
                    orderBy: {
                        orden: 'asc',
                    },
                    take: 1,
                },
            },
            orderBy: [ // Ordenar primero por nombre del catálogo, luego por nombre del ítem
                {
                    catalogo: {
                        nombre: 'asc',
                    },
                },
                {
                    nombre: 'asc',
                },
            ],
        });

        // Mapear los datos al schema ItemCatalogoParaSeleccion
        const itemsTyped: ItemCatalogoParaSeleccion[] = itemsFromDb.map(item => ({
            id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            descripcion: item.descripcion,
            imagenPortadaUrl: item.galeria && item.galeria.length > 0 ? item.galeria[0].imageUrl : null,
            catalogoId: item.catalogo.id, // Se asume que un ItemCatalogo siempre tiene un Catalogo
            catalogoNombre: item.catalogo.nombre, // Se asume que un ItemCatalogo siempre tiene un Catalogo
            itemCategoriaNombre: item.categoria ? item.categoria.nombre : null,
        }));

        return { success: true, data: itemsTyped };
    } catch (error) {
        console.error("Error obtenerItemsCatalogoPorNegocioAction:", error);
        return { success: false, error: "No se pudieron obtener los ítems del catálogo." };
    }
}

// --- (Mantener obtenerItemsPaqueteActualAction y actualizarItemsDePaqueteAction) ---
export async function obtenerItemsPaqueteActualAction(
    paqueteId: string
): Promise<ActionResult<string[]>> {
    if (!paqueteId) {
        return { success: false, error: "El ID del paquete es requerido." };
    }
    try {
        const paqueteItems = await prisma.negocioPaqueteItem.findMany({
            where: {
                negocioPaqueteId: paqueteId,
            },
            select: {
                itemCatalogoId: true,
            },
        });
        const itemIds = paqueteItems.map(pi => pi.itemCatalogoId);
        return { success: true, data: itemIds };
    } catch (error) {
        console.error("Error obtenerItemsPaqueteActualAction:", error);
        return { success: false, error: "No se pudieron obtener los ítems actuales del paquete." };
    }
}

export async function actualizarItemsDePaqueteAction(
    paqueteId: string,
    clienteId: string,
    negocioId: string,
    data: ActualizarItemsDePaqueteData
): Promise<ActionResult<void>> {
    if (!paqueteId) {
        return { success: false, error: "El ID del paquete es requerido." };
    }

    const validation = ActualizarItemsDePaqueteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    const { itemCatalogoIds } = validation.data;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.negocioPaqueteItem.deleteMany({
                where: {
                    negocioPaqueteId: paqueteId,
                },
            });

            if (itemCatalogoIds.length > 0) {
                await tx.negocioPaqueteItem.createMany({
                    data: itemCatalogoIds.map(itemId => ({
                        negocioPaqueteId: paqueteId,
                        itemCatalogoId: itemId,
                    })),
                });
            }
        });

        revalidatePath(getPathToPaqueteEdicion(clienteId, negocioId, paqueteId));
        return { success: true };
    } catch (error: unknown) {
        console.error("Error actualizarItemsDePaqueteAction:", error);
        return { success: false, error: "No se pudieron actualizar los ítems del paquete." };
    }
}
