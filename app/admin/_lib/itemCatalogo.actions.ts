'use server'
import prisma from './prismaClient'
import { ItemCatalogo } from './types'

export async function obtenerItemsCatalogoPorCatalogoId(catalogoId: string) {
    try {
        const items = await prisma.itemCatalogo.findMany({
            where: {
                catalogoId: catalogoId
            },
            include: {
                categoria: true, // Incluye el objeto NegocioCategoria relacionado
                itemEtiquetas: { // Incluye la tabla intermedia
                    include: {
                        etiqueta: true // Incluye el objeto NegocioEtiqueta relacionado a través de la tabla intermedia
                    }
                }
                // No necesitas incluir catalogo.negocio aquí si ya tienes negocioId
            },
            // Es crucial ordenar por 'orden' en la base de datos si es posible
            orderBy: {
                orden: 'asc' // O 'desc' según necesites. Maneja nulos si es necesario.
            }
        });
        return items;
    } catch (error) {
        console.error("Error en obtenerItemsCatalogoPorCatalogoId:", error);
        // Lanza el error para que el componente lo capture o devuelve un array vacío/null
        throw new Error("Error al obtener ítems del catálogo.");
    }
}

export async function crearItemCatalogo(data: ItemCatalogo) {
    const item = await prisma.itemCatalogo.create({
        data: {
            nombre: data.nombre,
            descripcion: data.descripcion,
            precio: data.precio,
            catalogoId: data.catalogoId,
            categoriaId: data.categoriaId,
            status: data.status,
        }
    });
    return item;
}

export async function obtenerItemCatalogoPorId(itemId: string) {
    const item = await prisma.itemCatalogo.findUnique({
        where: {
            id: itemId
        },
        include: {
            catalogo: {
                include: {
                    negocio: true
                }
            },
            categoria: true,
            itemEtiquetas: {
                include: {
                    etiqueta: true
                }
            }
        }
    });
    return item;
}

export async function actualizarItemCatalogo(itemId: string, data: Partial<ItemCatalogo>) {
    try {
        // Actualizar el ítem principal
        const item = await prisma.itemCatalogo.update({
            where: {
                id: itemId
            },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                precio: data.precio,
                status: data.status,
                categoriaId: data.categoriaId,
            }
        });

        // Actualizar las etiquetas asociadas si se proporcionan
        if (data.itemEtiquetas) {
            // Eliminar las etiquetas existentes
            await prisma.itemCatalogoEtiqueta.deleteMany({
                where: {
                    itemCatalogoId: itemId
                }
            });

            // Crear las nuevas etiquetas asociadas
            const etiquetasData = data.itemEtiquetas.map(etiqueta => ({
                itemCatalogoId: itemId,
                etiquetaId: etiqueta.etiquetaId
            }));

            await prisma.itemCatalogoEtiqueta.createMany({
                data: etiquetasData
            });
        }

        return item;
    } catch (error) {
        console.error("Error en actualizarItemCatalogo:", error);
        throw new Error("Error al actualizar el ítem del catálogo.");
    }
}

export async function eliminarItemCatalogo(itemId: string) {
    const item = await prisma.itemCatalogo.delete({
        where: {
            id: itemId
        }
    });
    return item;
}

export async function actualizarOrdenItemsCatalogo(itemsOrden: { id: string; orden: number }[]) {
    if (!itemsOrden || itemsOrden.length === 0) {
        return; // No hay nada que actualizar
    }
    try {
        // Usar una transacción para actualizar todos los ítems de forma atómica
        const updatePromises = itemsOrden.map(item =>
            prisma.itemCatalogo.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
    } catch (error) {
        console.error("Error en actualizarOrdenItemsCatalogo:", error);
        throw new Error("Error al actualizar el orden de los ítems.");
    }
}