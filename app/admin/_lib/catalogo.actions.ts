'use server'
import prisma from './prismaClient'
import { Catalogo } from './types'

interface CatalogoConConteo extends Catalogo {
    _count: {
        ItemCatalogo: number;
    };
}

export async function obtenerCatalogoNegocio(negocioId: string) {
    const catalogo = await prisma.catalogo.findFirst({
        where: {
            negocioId: negocioId
        }
    })
    return catalogo
}

export async function obtenerCatalogoPorId(catalogoId: string) {
    const catalogo = await prisma.catalogo.findUnique({
        where: {
            id: catalogoId
        },
        include: {
            negocio: true,
            ItemCatalogo: {
                select: {
                    id: true,
                    nombre: true,
                    precio: true,
                    descripcion: true,
                    status: true,
                    categoriaId: true,
                    itemEtiquetas: {
                        include: {
                            etiqueta: true
                        }
                    }
                }
            },
        }
    });

    if (catalogo && catalogo.ItemCatalogo) {
        catalogo.ItemCatalogo = catalogo.ItemCatalogo.map(item => ({
            ...item,
            createdAt: new Date(), // Provide default values for missing fields
            updatedAt: new Date(),
        }));
    }

    return catalogo;
}

export async function actualizarCatalogo(catalogoId: string, data: Partial<Catalogo>) {
    const catalogoActualizado = await prisma.catalogo.update({
        where: {
            id: catalogoId
        },
        data: {
            nombre: data.nombre,
            descripcion: data.descripcion,
            status: data.status,
            // catalogoNivelId: data.catalogoNivelId ?? null,
        },
    });
    return catalogoActualizado;
}

export async function eliminarCatalogo(catalogoId: string) {
    const tieneItemsAsociados = await prisma.itemCatalogo.count({
        where: {
            catalogoId: catalogoId
        }
    });

    if (tieneItemsAsociados > 0) {
        throw new Error("No se puede eliminar el catálogo porque tiene items asociados.");
    }

    const catalogoEliminado = await prisma.catalogo.delete({
        where: {
            id: catalogoId
        }
    });

    return catalogoEliminado;
}

export async function obtenerItemsCatalogoPorId(catalogoId: string) {
    const items = await prisma.itemCatalogo.findMany({
        where: {
            catalogoId: catalogoId
        }
    });
    return items;
}

export async function obtenerCatalogosPorNegocioId(negocioId: string): Promise<CatalogoConConteo[]> {
    if (!negocioId) {
        console.warn("obtenerCatalogosPorNegocioId llamado sin negocioId");
        return []; // O lanzar un error si prefieres
    }
    try {
        const catalogos = await prisma.catalogo.findMany({
            where: {
                negocioId: negocioId,
            },
            include: {
                // Incluir el conteo de la relación ItemCatalogo
                _count: {
                    select: { ItemCatalogo: true },
                },
                // Puedes incluir otros campos necesarios aquí, como 'nombre', 'descripcion', 'status'
                // No incluyas 'ItemCatalogo: true' si solo necesitas el conteo.
            },
            orderBy: {
                // Opcional: Ordenar los catálogos, por ejemplo por nombre
                nombre: 'asc',
            },
        });
        // Asegurarse que TypeScript entienda el tipo de retorno con _count
        return catalogos as CatalogoConConteo[];
    } catch (error) {
        console.error(`Error al obtener catálogos para el negocio ${negocioId}:`, error);
        // Lanza el error para que el componente lo capture o devuelve array vacío
        throw new Error("Error al obtener los catálogos del negocio.");
        // Opcionalmente: return [];
    }
}
export async function crearCatalogoNegocio(negocioId: string, data: Catalogo) {
    const nuevoCatalogo = await prisma.catalogo.create({
        data: {
            negocioId: negocioId,
            nombre: data.nombre,
            descripcion: data.descripcion,
            status: data.status || "activo",
            // catalogoNivelId: data.catalogoNivelId ?? null,
        },
        include: {
            ItemCatalogo: {
                select: {
                    id: true,
                    nombre: true,
                }
            }
        }
    });
    return nuevoCatalogo
}