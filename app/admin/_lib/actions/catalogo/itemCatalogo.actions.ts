// // @/app/admin/_lib/actions/catalogo/itemCatalogo.actions.ts
// 'use server';

// import prisma from '@/app/admin/_lib/prismaClient';
// import { ActionResult } from '@/app/admin/_lib/types';
// import { Prisma, ItemCatalogo as PrismaItemCatalogo } from '@prisma/client';
// import { revalidatePath } from 'next/cache';
// import { eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';
// import { llamarGeminiParaMejorarTexto } from '@/scripts/gemini/gemini.actions'; // Asumiendo esta ruta

// import {
//     ItemParaGridCatalogoSchema,
//     type ItemParaGridCatalogoType,
//     ActualizarOrdenItemsDataSchema,
//     type ActualizarOrdenItemsData,
//     CrearItemBasicoDataSchema,
//     type CrearItemBasicoData,
//     ActualizarItemDataSchema,
//     type ActualizarItemData,
//     MejorarDescripcionItemIADataSchema,
//     type MejorarDescripcionItemIAData,
//     type SugerenciaDescripcionIAResponse
// } from './itemCatalogo.schemas';

// // Helper para la ruta de revalidación de la lista de ítems (página del catálogo)
// const getPathToCatalogoDetalle = (clienteId: string, negocioId: string, catalogoId: string) => {
//     return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`;
// };
// // Helper para la ruta de revalidación de un ítem específico
// const getPathToItemDetalle = (clienteId: string, negocioId: string, catalogoId: string, itemId: string) => {
//     return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`;
// };


// export async function obtenerItemsParaCatalogo(
//     catalogoId: string
// ): Promise<ActionResult<ItemParaGridCatalogoType[]>> {
//     if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };

//     try {
//         const items = await prisma.itemCatalogo.findMany({
//             where: { catalogoId: catalogoId },
//             select: {
//                 id: true, nombre: true, descripcion: true, tipoItem: true,
//                 stock: true, stockMinimo: true, esPromocionado: true,
//                 AquienVaDirigido: true, palabrasClave: true, videoUrl: true,
//                 linkPago: true, status: true, orden: true, categoriaId: true,
//                 categoria: { select: { id: true, nombre: true } },
//                 itemEtiquetas: {
//                     select: { etiqueta: { select: { id: true, nombre: true } } },
//                     orderBy: { etiqueta: { nombre: 'asc' } }
//                 },
//                 galeria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } },
//                 _count: { select: { galeria: true, itemCatalogoOfertas: true } }
//             },
//             orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
//         });

//         const itemsConPortada = items.map(item => ({
//             ...item,
//             imagenPortadaUrl: item.galeria?.[0]?.imageUrl || null,
//         }));

//         // Validar cada ítem con el schema (opcional, pero bueno para asegurar consistencia)
//         const validationResults = itemsConPortada.map(item => ItemParaGridCatalogoSchema.safeParse(item));
//         const validItems: ItemParaGridCatalogoType[] = [];
//         validationResults.forEach((res, index) => {
//             if (res.success) {
//                 validItems.push(res.data);
//             } else {
//                 console.warn(`Datos de ítem inválidos para ID ${itemsConPortada[index]?.id} en lista:`, res.error.flatten());
//                 // Podrías decidir omitir ítems inválidos o incluirlos tal cual.
//                 // Por seguridad, es mejor omitirlos si la validación falla.
//             }
//         });

//         return { success: true, data: validItems };
//     } catch (error) {
//         console.error("Error en obtenerItemsParaCatalogo:", error);
//         return { success: false, error: "Error al obtener ítems del catálogo." };
//     }
// }

// export async function actualizarOrdenItemsCatalogo(
//     catalogoId: string,
//     clienteId: string, // Para revalidación
//     negocioId: string, // Para revalidación
//     data: ActualizarOrdenItemsData
// ): Promise<ActionResult<void>> {
//     if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
//     if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };
//     if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

//     const validationResult = ActualizarOrdenItemsDataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return {
//             success: false,
//             error: "Datos de orden inválidos.",
//             errorDetails: Object.fromEntries(
//                 Object.entries(validationResult.error.flatten().fieldErrors).filter(([value]) => value !== undefined)
//             ) as Record<string, string[]>
//         };
//     }
//     const ordenesValidadas = validationResult.data;

//     if (ordenesValidadas.length === 0) return { success: true };

//     try {
//         await prisma.$transaction(
//             ordenesValidadas.map(item =>
//                 prisma.itemCatalogo.update({
//                     where: { id: item.id, catalogoId: catalogoId }, // Asegurar que el ítem pertenece al catálogo
//                     data: { orden: item.orden }
//                 })
//             )
//         );
//         revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
//         return { success: true };
//     } catch (error) {
//         console.error("Error en actualizarOrdenItemsCatalogo:", error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
//             return { success: false, error: "Uno o más ítems no se encontraron para actualizar el orden." };
//         }
//         return { success: false, error: "No se pudo guardar el nuevo orden de los ítems." };
//     }
// }


// // --- OTRAS ACCIONES (se refactorizarán completamente cuando abordemos los formularios de Item) ---

// export async function obtenerItemCatalogoPorId(
//     itemId: string,
//     // clienteId: string, // Necesario para revalidar si hay acciones de edición en la misma página
//     // negocioId: string,
//     // catalogoId: string,
// ): Promise<ActionResult<PrismaItemCatalogo | null>> { // Devolver tipo Prisma por ahora
//     if (!itemId) return { success: false, error: "ID de ítem no proporcionado." };
//     try {
//         const item = await prisma.itemCatalogo.findUnique({
//             where: { id: itemId },
//             include: {
//                 // catalogo: { include: { negocio: { select: { clienteId: true } } } }, // Para revalidación
//                 categoria: true,
//                 itemEtiquetas: { include: { etiqueta: true } },
//                 galeria: { orderBy: { orden: 'asc' } } // Incluir galería completa
//             }
//         });
//         if (!item) return { success: false, error: "Ítem no encontrado." };
//         return { success: true, data: item };
//     } catch (error) {
//         console.error(`Error obteniendo ítem ${itemId}:`, error);
//         return { success: false, error: "Error al obtener detalles del ítem." };
//     }
// }

// export async function crearItemCatalogo(
//     catalogoId: string,
//     negocioId: string,
//     clienteId: string, // Para revalidación
//     data: CrearItemBasicoData
// ): Promise<ActionResult<{ id: string }>> {
//     if (!catalogoId || !negocioId || !clienteId) {
//         return { success: false, error: "Faltan IDs de contexto (catálogo, negocio, cliente)." };
//     }
//     const validationResult = CrearItemBasicoDataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos de creación inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
//     }
//     const { nombre, precio, categoriaId } = validationResult.data;

//     try {
//         const ultimoItem = await prisma.itemCatalogo.findFirst({ where: { catalogoId }, orderBy: { orden: 'desc' }, select: { orden: true } });
//         const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

//         const nuevoItem = await prisma.itemCatalogo.create({
//             data: {
//                 nombre: nombre,
//                 precio: precio,
//                 catalogo: { connect: { id: catalogoId } },
//                 negocio: { connect: { id: negocioId } },
//                 categoria: categoriaId ? { connect: { id: categoriaId } } : undefined,
//                 status: 'activo', // Default status
//                 orden: nuevoOrden,
//             },
//             select: { id: true }
//         });
//         revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
//         return { success: true, data: { id: nuevoItem.id } };
//     } catch (error) {
//         console.error("Error en crearItemCatalogo:", error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false, error: "Error: Ya existe un ítem con ese SKU o identificador único." };
//         return { success: false, error: "No se pudo crear el ítem." };
//     }
// }

// export async function actualizarItemCatalogo(
//     itemId: string,
//     catalogoId: string, // Para revalidación
//     negocioId: string,  // Para revalidación
//     clienteId: string,  // Para revalidación
//     data: ActualizarItemData, // Tipo Zod
//     etiquetaIds?: string[] // Opcional, si se manejan aquí
// ): Promise<ActionResult<PrismaItemCatalogo>> {
//     if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };

//     const validationResult = ActualizarItemDataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos de actualización inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
//     }
//     const validData = validationResult.data;

//     try {
//         const itemActualizado = await prisma.$transaction(async (tx) => {
//             const updatedItem = await tx.itemCatalogo.update({
//                 where: { id: itemId, catalogoId: catalogoId }, // Asegurar que pertenece al catálogo
//                 data: {
//                     ...validData,
//                     // Asegurar que categoriaId sea null si no se provee o es string vacío
//                     categoriaId: validData.categoriaId === "" ? null : validData.categoriaId,
//                 }
//             });

//             if (etiquetaIds !== undefined) { // Solo modificar etiquetas si se provee el array
//                 const currentEtiquetas = await tx.itemCatalogoEtiqueta.findMany({ where: { itemCatalogoId: itemId }, select: { etiquetaId: true } });
//                 const currentEtiquetaIds = new Set(currentEtiquetas.map(et => et.etiquetaId));
//                 const etiquetasToAdd = etiquetaIds.filter(id => !currentEtiquetaIds.has(id));
//                 const etiquetasToRemove = Array.from(currentEtiquetaIds).filter(id => !etiquetaIds.includes(id));

//                 if (etiquetasToRemove.length > 0) {
//                     await tx.itemCatalogoEtiqueta.deleteMany({ where: { itemCatalogoId: itemId, etiquetaId: { in: etiquetasToRemove } } });
//                 }
//                 if (etiquetasToAdd.length > 0) {
//                     await tx.itemCatalogoEtiqueta.createMany({ data: etiquetasToAdd.map(etiquetaId => ({ itemCatalogoId: itemId, etiquetaId: etiquetaId })) });
//                 }
//             }
//             return updatedItem;
//         });

//         revalidatePath(getPathToItemDetalle(clienteId, negocioId, catalogoId, itemId));
//         revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId)); // Revalidar lista de ítems

//         return { success: true, data: itemActualizado };
//     } catch (error) {
//         console.error(`Error en actualizarItemCatalogo (${itemId}):`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError) {
//             if (error.code === 'P2002' && validData.sku) return { success: false, error: "Error: El SKU proporcionado ya está en uso por otro ítem." };
//             if (error.code === 'P2025') return { success: false, error: "Ítem no encontrado para actualizar." };
//         }
//         return { success: false, error: "No se pudo actualizar el ítem." };
//     }
// }

// export async function eliminarItemCatalogo(
//     itemId: string,
//     catalogoId: string, // Para revalidación
//     negocioId: string,  // Para revalidación y path de storage
//     clienteId: string   // Para revalidación
// ): Promise<ActionResult<void>> {
//     if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };

//     try {
//         const itemConGaleria = await prisma.itemCatalogo.findUnique({
//             where: { id: itemId, catalogoId: catalogoId }, // Asegurar que pertenece al catálogo
//             select: {
//                 galeria: { select: { imageUrl: true } }
//             }
//         });

//         if (!itemConGaleria) {
//             return { success: false, error: "Ítem no encontrado o no pertenece a este catálogo." };
//         }

//         const imagenesAEliminar = itemConGaleria.galeria;
//         if (imagenesAEliminar.length > 0) {
//             const deletePromises = imagenesAEliminar.map(img => eliminarImagenStorage(img.imageUrl));
//             const results = await Promise.allSettled(deletePromises);
//             results.forEach((result, index) => {
//                 if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
//                     console.warn(`Fallo al eliminar imagen ${imagenesAEliminar[index].imageUrl} del storage: ${result.status === 'rejected' ? result.reason : result.value.error}`);
//                 }
//             });
//         }

//         // onDelete: Cascade en Prisma se encarga de ItemCatalogoEtiqueta, ItemCatalogoOferta, ItemCatalogoGaleria, ItemInteraccion.
//         await prisma.itemCatalogo.delete({ where: { id: itemId } });

//         revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
//         return { success: true };

//     } catch (error) {
//         console.error(`Error en eliminarItemCatalogo (${itemId}):`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
//             return { success: true, error: "El ítem ya había sido eliminado." };
//         }
//         return { success: false, error: "No se pudo eliminar el ítem." };
//     }
// }

// export async function mejorarDescripcionItemIA(
//     data: MejorarDescripcionItemIAData
// ): Promise<ActionResult<SugerenciaDescripcionIAResponse>> {
//     const validationResult = MejorarDescripcionItemIADataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos para IA inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
//     }
//     const { itemId, descripcionActual, nivelCreatividad, maxCaracteres } = validationResult.data;

//     if (!descripcionActual?.trim()) return { success: false, error: "No hay descripción actual para mejorar." };

//     try {
//         const item = await prisma.itemCatalogo.findUnique({
//             where: { id: itemId },
//             select: { nombre: true, tipoItem: true, AquienVaDirigido: true, palabrasClave: true, categoria: { select: { nombre: true } }, itemEtiquetas: { select: { etiqueta: { select: { nombre: true } } } } }
//         });
//         if (!item) return { success: false, error: "Ítem no encontrado para contexto IA." };

//         const etiquetasStr = item.itemEtiquetas?.map(et => et.etiqueta.nombre).join(', ') || 'Ninguna';
//         const promptContexto = `Producto/Servicio: ${item.nombre}, Categoría: ${item.categoria?.nombre || 'N/A'}, Tipo: ${item.tipoItem || 'N/A'}, Etiquetas: ${etiquetasStr}. Público Objetivo: ${item.AquienVaDirigido || 'General'}. Palabras Clave: ${item.palabrasClave || 'Ninguna'}.`;
//         const promptMejora = `Eres un copywriter experto con creatividad ${nivelCreatividad}. Mejora la siguiente descripción (máx ${maxCaracteres} caracteres), destacando beneficios. Contexto (NO incluyas precio): ${promptContexto}. Descripción actual: "${descripcionActual.trim()}"\n\nFormato: Párrafos con \\n, listas con '- '. Descripción Mejorada:`;

//         let temperature: number;
//         switch (nivelCreatividad) { case 'bajo': temperature = 0.2; break; case 'alto': temperature = 0.8; break; case 'medio': default: temperature = 0.5; break; }

//         const descripcionMejorada = await llamarGeminiParaMejorarTexto(promptMejora, { temperature: temperature, maxOutputTokens: (maxCaracteres || 200) + 50 });
//         if (!descripcionMejorada) throw new Error("La IA no generó sugerencia.");

//         const sugerenciaFinal = descripcionMejorada.trim().slice(0, maxCaracteres);
//         return { success: true, data: { sugerencia: sugerenciaFinal } };
//     } catch (error) {
//         console.error(`Error en mejorarDescripcionItemIA (${itemId}):`, error);
//         return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
//     }
// }


// @/app/admin/_lib/actions/catalogo/itemCatalogo.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, ItemCatalogo as PrismaItemCatalogo } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';
import { llamarGeminiParaMejorarTexto } from '@/scripts/gemini/gemini.actions';

import {
    ItemParaGridCatalogoSchema,
    type ItemParaGridCatalogoType,
    ActualizarOrdenItemsDataSchema,
    type ActualizarOrdenItemsData,
    CrearItemBasicoDataSchema,
    type CrearItemBasicoData,
    ActualizarItemDataSchema,
    type ActualizarItemData,
    ItemParaEditarSchema, // Nuevo schema para la respuesta de obtener
    type ItemParaEditarType,
    MejorarDescripcionItemIADataSchema,
    type MejorarDescripcionItemIAData,
    type SugerenciaDescripcionIAResponse
} from './itemCatalogo.schemas';

// Helper para la ruta de revalidación de la lista de ítems (página del catálogo)
const getPathToCatalogoDetalle = (clienteId: string, negocioId: string, catalogoId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`;
};
// Helper para la ruta de revalidación de un ítem específico
const getPathToItemDetalle = (clienteId: string, negocioId: string, catalogoId: string, itemId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`;
};

// --- OBTENER ITEMS PARA LISTA (ya refactorizada) ---
export async function obtenerItemsParaCatalogo(
    catalogoId: string
): Promise<ActionResult<ItemParaGridCatalogoType[]>> {
    // ... (código existente sin cambios)
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    try {
        const items = await prisma.itemCatalogo.findMany({
            where: { catalogoId: catalogoId },
            select: {
                id: true, nombre: true, descripcion: true, tipoItem: true,
                stock: true, stockMinimo: true, esPromocionado: true,
                AquienVaDirigido: true, palabrasClave: true, /* videoUrl: true, OMITIDO */
                linkPago: true, status: true, orden: true, categoriaId: true,
                categoria: { select: { id: true, nombre: true } },
                itemEtiquetas: {
                    select: { etiqueta: { select: { id: true, nombre: true } } },
                    orderBy: { etiqueta: { nombre: 'asc' } }
                },
                galeria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } },
                _count: { select: { galeria: true, itemCatalogoOfertas: true } }
            },
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
        });
        const itemsConPortada = items.map(item => ({
            ...item,
            imagenPortadaUrl: item.galeria?.[0]?.imageUrl || null,
        }));
        const validationResults = itemsConPortada.map(item => ItemParaGridCatalogoSchema.safeParse(item));
        const validItems: ItemParaGridCatalogoType[] = [];
        validationResults.forEach((res, index) => {
            if (res.success) { validItems.push(res.data); }
            else { console.warn(`Datos de ítem inválidos para ID ${itemsConPortada[index]?.id} en lista:`, res.error.flatten()); }
        });
        return { success: true, data: validItems };
    } catch (error) {
        console.error("Error en obtenerItemsParaCatalogo:", error);
        return { success: false, error: "Error al obtener ítems del catálogo." };
    }
}

// --- ACTUALIZAR ORDEN DE ITEMS (ya refactorizada) ---
export async function actualizarOrdenItemsCatalogo(
    catalogoId: string, clienteId: string, negocioId: string, data: ActualizarOrdenItemsData
): Promise<ActionResult<void>> {
    // ... (código existente sin cambios)
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!clienteId) return { success: false, error: "ID de cliente no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    const validationResult = ActualizarOrdenItemsDataSchema.safeParse(data);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validationResult.error.flatten().fieldErrors).filter(([value]) => value !== undefined)
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validationResult.data;
    if (ordenesValidadas.length === 0) return { success: true };
    try {
        await prisma.$transaction(
            ordenesValidadas.map(item =>
                prisma.itemCatalogo.update({
                    where: { id: item.id, catalogoId: catalogoId },
                    data: { orden: item.orden }
                })
            )
        );
        revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
        return { success: true };
    } catch (error) {
        console.error("Error en actualizarOrdenItemsCatalogo:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Uno o más ítems no se encontraron para actualizar el orden." };
        }
        return { success: false, error: "No se pudo guardar el nuevo orden de los ítems." };
    }
}

// --- CREAR ITEM (ya refactorizada) ---
export async function crearItemCatalogo(
    catalogoId: string, negocioId: string, clienteId: string, data: CrearItemBasicoData
): Promise<ActionResult<{ id: string }>> {
    // ... (código existente sin cambios)
    if (!catalogoId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto (catálogo, negocio, cliente)." };
    }
    const validationResult = CrearItemBasicoDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos de creación inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, precio, categoriaId } = validationResult.data;
    try {
        const ultimoItem = await prisma.itemCatalogo.findFirst({ where: { catalogoId }, orderBy: { orden: 'desc' }, select: { orden: true } });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;
        const nuevoItem = await prisma.itemCatalogo.create({
            data: {
                nombre: nombre, precio: precio,
                catalogo: { connect: { id: catalogoId } }, negocio: { connect: { id: negocioId } },
                categoria: categoriaId ? { connect: { id: categoriaId } } : undefined,
                status: 'activo', orden: nuevoOrden,
            },
            select: { id: true }
        });
        revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
        return { success: true, data: { id: nuevoItem.id } };
    } catch (error) {
        console.error("Error en crearItemCatalogo:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false, error: "Error: Ya existe un ítem con ese SKU o identificador único." };
        return { success: false, error: "No se pudo crear el ítem." };
    }
}

// --- OBTENER ITEM POR ID PARA EDICIÓN (REFACTORIZADA) ---
export async function obtenerItemCatalogoPorId(
    itemId: string,
    catalogoId: string, // Para scope
    negocioId: string   // Para scope
): Promise<ActionResult<ItemParaEditarType | null>> {
    if (!itemId) return { success: false, error: "ID de ítem no proporcionado." };
    if (!catalogoId) return { success: false, error: "ID de catálogo no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    try {
        const item = await prisma.itemCatalogo.findUnique({
            where: {
                id: itemId,
                catalogoId: catalogoId, // Asegurar que pertenece al catálogo
                negocioId: negocioId    // Asegurar que pertenece al negocio
            },
            select: { // Seleccionar campos definidos en ItemParaEditarSchema
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                tipoItem: true,
                sku: true,
                stock: true,
                stockMinimo: true,
                unidadMedida: true,
                linkPago: true,
                funcionPrincipal: true,
                esPromocionado: true,
                AquienVaDirigido: true,
                palabrasClave: true,
                // videoUrl: true, // OMITIDO
                status: true,
                categoriaId: true,
                catalogoId: true, // Para referencia
                negocioId: true,  // Para referencia
                itemEtiquetas: { // Solo necesitamos el ID de la etiqueta para preseleccionar
                    select: {
                        etiquetaId: true
                    }
                },
                // No necesitamos 'galeria' aquí, se maneja por ItemGaleria.tsx
                // No necesitamos 'orden', 'createdAt', 'updatedAt' para el formulario de edición directa
            }
        });

        if (!item) return { success: false, error: "Ítem no encontrado o no pertenece al contexto especificado." };

        // Validar la salida con Zod (opcional pero recomendado)
        const validationResult = ItemParaEditarSchema.safeParse(item);
        if (!validationResult.success) {
            console.error("Error de validación de datos del ítem obtenido:", validationResult.error.flatten());
            return { success: false, error: "Datos del ítem inconsistentes." };
        }

        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error(`Error obteniendo ítem ${itemId}:`, error);
        return { success: false, error: "Error al obtener detalles del ítem." };
    }
}

// --- ACTUALIZAR ITEM (REFACTORIZADA) ---
export async function actualizarItemCatalogo(
    itemId: string,
    catalogoId: string,
    negocioId: string,
    clienteId: string,
    data: ActualizarItemData,
    etiquetaIds?: string[] // Mantener como array de strings
): Promise<ActionResult<PrismaItemCatalogo>> { // Devolver el ítem completo de Prisma
    if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };

    const validationResult = ActualizarItemDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos de actualización inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const validData = validationResult.data;
    // Omitir videoUrl si estuviera presente en validData (aunque el schema ya lo omite)
    // if ('videoUrl' in validData) {
    //     delete (validData as any).videoUrl;
    // }

    try {
        const itemActualizado = await prisma.$transaction(async (tx) => {
            const updatedItem = await tx.itemCatalogo.update({
                where: { id: itemId, catalogoId: catalogoId, negocioId: negocioId }, // Scope completo
                data: {
                    ...validData,
                    categoriaId: validData.categoriaId === "" ? null : validData.categoriaId, // Manejar string vacío para categoriaId
                }
            });

            if (etiquetaIds !== undefined) {
                // Eliminar todas las etiquetas existentes para este ítem
                await tx.itemCatalogoEtiqueta.deleteMany({
                    where: { itemCatalogoId: itemId }
                });
                // Crear las nuevas asociaciones de etiquetas si hay alguna
                if (etiquetaIds.length > 0) {
                    await tx.itemCatalogoEtiqueta.createMany({
                        data: etiquetaIds.map(etiquetaId => ({
                            itemCatalogoId: itemId,
                            etiquetaId: etiquetaId
                        }))
                    });
                }
            }
            return updatedItem;
        });

        revalidatePath(getPathToItemDetalle(clienteId, negocioId, catalogoId, itemId));
        revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));

        return { success: true, data: itemActualizado };
    } catch (error) {
        console.error(`Error en actualizarItemCatalogo (${itemId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && validData.sku) return { success: false, error: "Error: El SKU proporcionado ya está en uso por otro ítem." };
            if (error.code === 'P2025') return { success: false, error: "Ítem no encontrado para actualizar o no pertenece al catálogo/negocio especificado." };
        }
        return { success: false, error: "No se pudo actualizar el ítem." };
    }
}

// --- ELIMINAR ITEM (ya refactorizada, se mantiene) ---
export async function eliminarItemCatalogo(
    itemId: string, catalogoId: string, negocioId: string, clienteId: string
): Promise<ActionResult<void>> {
    // ... (código existente sin cambios significativos, solo asegurar que el scope es correcto)
    if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };
    try {
        const itemConGaleria = await prisma.itemCatalogo.findUnique({
            where: { id: itemId, catalogoId: catalogoId, negocioId: negocioId },
            select: { galeria: { select: { imageUrl: true } } }
        });
        if (!itemConGaleria) return { success: false, error: "Ítem no encontrado o no pertenece al contexto." };
        const imagenesAEliminar = itemConGaleria.galeria;
        if (imagenesAEliminar.length > 0) {
            const deletePromises = imagenesAEliminar.map(img => eliminarImagenStorage(img.imageUrl));
            const results = await Promise.allSettled(deletePromises);
            results.forEach((result, index) => {
                if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
                    console.warn(`Fallo al eliminar imagen ${imagenesAEliminar[index].imageUrl} del storage: ${result.status === 'rejected' ? result.reason : result.value.error}`);
                }
            });
        }
        await prisma.itemCatalogo.delete({ where: { id: itemId } });
        revalidatePath(getPathToCatalogoDetalle(clienteId, negocioId, catalogoId));
        return { success: true };
    } catch (error) {
        console.error(`Error en eliminarItemCatalogo (${itemId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true, error: "El ítem ya había sido eliminado." };
        }
        return { success: false, error: "No se pudo eliminar el ítem." };
    }
}

// --- MEJORAR DESCRIPCIÓN CON IA (ya refactorizada) ---
export async function mejorarDescripcionItemIA(
    data: MejorarDescripcionItemIAData
): Promise<ActionResult<SugerenciaDescripcionIAResponse>> {
    // ... (código existente sin cambios significativos)
    const validationResult = MejorarDescripcionItemIADataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos para IA inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { itemId, descripcionActual, nivelCreatividad, maxCaracteres } = validationResult.data;
    if (!descripcionActual?.trim()) return { success: false, error: "No hay descripción actual para mejorar." };
    try {
        const item = await prisma.itemCatalogo.findUnique({
            where: { id: itemId },
            select: { nombre: true, tipoItem: true, AquienVaDirigido: true, palabrasClave: true, categoria: { select: { nombre: true } }, itemEtiquetas: { select: { etiqueta: { select: { nombre: true } } } } }
        });
        if (!item) return { success: false, error: "Ítem no encontrado para contexto IA." };
        const etiquetasStr = item.itemEtiquetas?.map(et => et.etiqueta.nombre).join(', ') || 'Ninguna';
        const promptContexto = `Producto/Servicio: ${item.nombre}, Categoría: ${item.categoria?.nombre || 'N/A'}, Tipo: ${item.tipoItem || 'N/A'}, Etiquetas: ${etiquetasStr}. Público Objetivo: ${item.AquienVaDirigido || 'General'}. Palabras Clave: ${item.palabrasClave || 'Ninguna'}.`;
        const promptMejora = `Eres un copywriter experto con creatividad ${nivelCreatividad}. Mejora la siguiente descripción (máx ${maxCaracteres} caracteres), destacando beneficios. Contexto (NO incluyas precio): ${promptContexto}. Descripción actual: "${descripcionActual.trim()}"\n\nFormato: Párrafos con \\n, listas con '- '. Descripción Mejorada:`;
        let temperature: number;
        switch (nivelCreatividad) { case 'bajo': temperature = 0.2; break; case 'alto': temperature = 0.8; break; case 'medio': default: temperature = 0.5; break; }
        const descripcionMejorada = await llamarGeminiParaMejorarTexto(promptMejora, { temperature: temperature, maxOutputTokens: (maxCaracteres || 200) + 50 });
        if (!descripcionMejorada) throw new Error("La IA no generó sugerencia.");
        const sugerenciaFinal = descripcionMejorada.trim().slice(0, maxCaracteres);
        return { success: true, data: { sugerencia: sugerenciaFinal } };
    } catch (error) {
        console.error(`Error en mejorarDescripcionItemIA (${itemId}):`, error);
        return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
