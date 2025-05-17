// Ruta actual desde app/: admin/_lib/catalogo.actions.ts
'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client'
import { Catalogo } from './types'
import { eliminarImagenStorage } from './imageHandler.actions'
import { revalidatePath } from 'next/cache'


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

// --- Tipo de retorno estándar ---
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

export async function eliminarCatalogo(catalogoId: string): Promise<ActionResult> {
    if (!catalogoId) {
        return { success: false, error: "ID de catálogo no proporcionado." };
    }

    try {
        // 1. Obtener el catálogo, su negocioId/clienteId (para revalidación)
        //    y TODAS las URLs de imágenes de sus ítems ANTES de eliminar.
        const catalogoConItemsYGaleria = await prisma.catalogo.findUnique({
            where: { id: catalogoId },
            select: {
                id: true,
                negocioId: true, // Necesario para revalidar
                negocio: { select: { clienteId: true } }, // Necesario para revalidar
                ItemCatalogo: { // Obtener todos los ítems del catálogo
                    select: {
                        id: true, // ID del ítem (opcional, para logging)
                        galeria: { // Galería de cada ítem
                            select: {
                                id: true, // ID de la imagen (opcional, para logging)
                                imageUrl: true // URL a eliminar del storage
                            }
                        }
                    }
                }
            }
        });

        if (!catalogoConItemsYGaleria) {
            console.warn(`Intento de eliminar catálogo ${catalogoId} que no fue encontrado.`);
            return { success: true }; // Ya no existe, operación exitosa
        }

        // 2. Recopilar todas las URLs de imágenes a eliminar del storage
        const urlsAEliminar: string[] = [];
        catalogoConItemsYGaleria.ItemCatalogo.forEach(item => {
            item.galeria.forEach(imagen => {
                if (imagen.imageUrl) {
                    urlsAEliminar.push(imagen.imageUrl);
                }
            });
        });

        // 3. Intentar eliminar las imágenes del Storage
        if (urlsAEliminar.length > 0) {
            console.log(`Intentando eliminar ${urlsAEliminar.length} imágenes del storage asociadas al catálogo ${catalogoId}...`);
            const deletePromises = urlsAEliminar.map(url => eliminarImagenStorage(url));
            const results = await Promise.allSettled(deletePromises);

            // Loggear errores/fallos controlados de eliminación de storage
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error al eliminar imagen ${urlsAEliminar[index]} del storage:`, result.reason);
                } else if (result.value.success === false) {
                    console.warn(`Fallo controlado al eliminar imagen ${urlsAEliminar[index]} del storage: ${result.value.error}`);
                }
            });
            console.log(`Intentos de eliminación de storage completados para catálogo ${catalogoId}.`);
        } else {
            console.log(`Catálogo ${catalogoId} no tenía imágenes asociadas en storage para eliminar.`);
        }

        // 4. Eliminar el Catálogo de la Base de Datos
        // onDelete: Cascade configurado en el schema se encargará de eliminar
        // los ItemCatalogo, ItemCatalogoGaleria, etc. relacionados en la BD.
        await prisma.catalogo.delete({
            where: { id: catalogoId },
        });

        console.log(`Catálogo ${catalogoId} y sus relaciones en BD eliminadas.`);

        // 5. Revalidar caché de la página del negocio (donde se listan catálogos)
        const basePath = `/admin/clientes/${catalogoConItemsYGaleria.negocio.clienteId}/negocios/${catalogoConItemsYGaleria.negocioId}`
        revalidatePath(basePath); // Revalida la página del negocio

        return { success: true };

    } catch (error) {
        console.error(`Error en eliminarCatalogo (${catalogoId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Registro no encontrado
            console.warn(`Intento de eliminar catálogo ${catalogoId} que no fue encontrado (P2025).`);
            return { success: true }; // Considerar éxito
        }
        // Podrías tener errores si hay relaciones que bloquean la eliminación y no tienen onDelete: Cascade
        return { success: false, error: "No se pudo eliminar el catálogo." };
    }
}

export async function obtenerItemsCatalogoPorId(catalogoId: string) {
    const items = await prisma.itemCatalogo.findMany({
        where: {
            catalogoId: catalogoId
        }
    });
    return items;
}

// export async function obtenerCatalogosPorNegocioId(negocioId: string): Promise<CatalogoConConteo[]> {
//     if (!negocioId) {
//         console.warn("obtenerCatalogosPorNegocioId llamado sin negocioId");
//         return []; // O lanzar un error si prefieres
//     }
//     try {
//         const catalogos = await prisma.catalogo.findMany({
//             where: {
//                 negocioId: negocioId,
//             },
//             include: {
//                 // Incluir el conteo de la relación ItemCatalogo
//                 _count: {
//                     select: { ItemCatalogo: true },
//                 },
//                 // Puedes incluir otros campos necesarios aquí, como 'nombre', 'descripcion', 'status'
//                 // No incluyas 'ItemCatalogo: true' si solo necesitas el conteo.
//             },
//             orderBy: {
//                 // Opcional: Ordenar los catálogos, por ejemplo por nombre
//                 nombre: 'asc',
//             },
//         });
//         // Asegurarse que TypeScript entienda el tipo de retorno con _count
//         return catalogos as CatalogoConConteo[];
//     } catch (error) {
//         console.error(`Error al obtener catálogos para el negocio ${negocioId}:`, error);
//         // Lanza el error para que el componente lo capture o devuelve array vacío
//         throw new Error("Error al obtener los catálogos del negocio.");
//         // Opcionalmente: return [];
//     }
// }

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

// --- NUEVO TIPO: Catálogo con datos para la lista (incluye portada y conteo) ---
export type CatalogoParaLista = Pick<Catalogo,
    'id' | 'nombre' | 'descripcion' | 'status' | 'imagenPortadaUrl' // Incluir imagenPortadaUrl
> & {
    _count?: {
        ItemCatalogo: number; // Conteo de ítems
    };
};

// --- ACCIÓN ACTUALIZADA ---
/**
 * Obtiene los catálogos de un negocio, incluyendo la URL de portada y el conteo de ítems.
 * @param negocioId - El ID del negocio.
 * @returns Array de CatalogoParaLista o null si hay error.
 */
export async function obtenerCatalogosPorNegocioId(negocioId: string): Promise<CatalogoParaLista[] | null> {
    if (!negocioId) return null;
    try {
        const catalogos = await prisma.catalogo.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                status: true,
                imagenPortadaUrl: true, // <-- SELECCIONAR IMAGEN PORTADA
                _count: { // <-- INCLUIR CONTEO
                    select: { ItemCatalogo: true }
                }
            },
            orderBy: { nombre: 'asc' }, // Ordenar alfabéticamente por nombre
        });
        // El tipo devuelto ya coincide con CatalogoParaLista si el tipo base Catalogo incluye _count
        // Si no, se necesitaría un casteo o mapeo. Asumimos que el tipo base lo maneja.
        return catalogos;
    } catch (error) {
        console.error(`Error fetching catalogos for negocio ${negocioId}:`, error);
        return null;
    }
}
