
// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/nuevo/page.tsx

'use server'
import prisma from '../prismaClient'
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache'
import { eliminarImagenStorage } from './imageHandler.actions';
import { llamarGeminiParaMejorarTexto } from '@/scripts/gemini/gemini.actions';


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
            },
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

/**
 * (Placeholder) Llama a Gemini para obtener una sugerencia de descripción para un ítem.
 * @param itemId - ID del ítem (para contexto, opcional).
 * @param descripcionActual - Descripción actual a mejorar.
 * @returns Una nueva descripción sugerida o null/error.
 */
export async function mejorarDescripcionItemConGemini(
    itemId: string,
    descripcionActual: string | null | undefined
): Promise<string | null> {
    console.log(`Mejorando descripción para item ${itemId}. Actual:`, descripcionActual);
    if (!descripcionActual?.trim()) {
        return null; // No mejorar si está vacío
    }
    // --- LÓGICA REAL CON GEMINI IRÍA AQUÍ ---
    // 1. Construir el prompt para Gemini pidiendo mejorar la descripción.
    // 2. Llamar a la API de Gemini.
    // 3. Procesar la respuesta y devolver la sugerencia.
    // --- Simulación ---
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular llamada API
    return `${descripcionActual}\n\n✨ Descripción mejorada por IA (simulación). ✨`;
    // ----------------
    // En caso de error: throw new Error("Mensaje de error");
}

//!

// --- TIPOS ESPECÍFICOS PARA LAS ACCIONES ---

// Tipo para los datos mínimos al crear un ítem desde ItemNuevoForm
export type CrearItemBasicoInput = {
    nombre: string;
    precio: number; // Asegurarse que el formulario lo envíe como número
    categoriaId?: string | null;
};

// Tipo para los datos al actualizar desde ItemEditarForm (ya definido en el form, pero bueno tenerlo aquí)
export type ActualizarItemInput = Partial<{
    nombre: string;
    descripcion: string | null;
    precio: number;
    tipoItem: string | null;
    sku: string | null;
    stock: number | null;
    stockMinimo: number | null;
    unidadMedida: string | null;
    linkPago: string | null;
    funcionPrincipal: string | null;
    esPromocionado: boolean; // Este campo aún existe en ItemCatalogo, ¿se usará distinto ahora? Considerar si mantenerlo.
    AquienVaDirigido: string | null;
    palabrasClave: string | null;
    videoUrl: string | null;
    status: string;
    categoriaId: string | null;
}>;

// Tipo para la data de ordenamiento recibida desde CatalogoItems
export interface ItemOrdenData {
    id: string;
    orden: number;
}

// Tipo de retorno estándar para mutaciones
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Tipo de retorno estándar para mutaciones (opcional pero recomendado)
// interface ActionResult<T = null> {
//     success: boolean;
//     error?: string | null;
//     data?: T; // Datos adicionales si son necesarios (ej. el ID creado)
// }

// --- ACCIONES (FUNCIONES) ---

/**
 * Obtiene los ítems de un catálogo específico con datos relacionados para la tabla.
 * @param catalogoId - El ID del catálogo.
 * @returns Array de ítems con datos para la tabla o null si hay error.
 */
export async function obtenerItemsParaCatalogo(catalogoId: string) {
    if (!catalogoId) return null;

    try {
        const items = await prisma.itemCatalogo.findMany({
            where: { catalogoId: catalogoId },
            select: {
                // Campos directos necesarios
                id: true,
                nombre: true,
                descripcion: true,
                tipoItem: true,
                stock: true,
                stockMinimo: true,
                esPromocionado: true, // Campo directo del ítem
                AquienVaDirigido: true,
                palabrasClave: true,
                videoUrl: true,
                linkPago: true,
                status: true,
                orden: true,
                categoriaId: true,
                // Relación con categoría (solo nombre)
                categoria: {
                    select: {
                        id: true,
                        nombre: true,
                    }
                },
                // Relación con etiquetas (solo nombre)
                itemEtiquetas: {
                    select: {
                        etiqueta: {
                            select: {
                                id: true,
                                nombre: true,
                            }
                        }
                    },
                    orderBy: { etiqueta: { nombre: 'asc' } }
                },
                // Obtener la primera imagen de la galería
                galeria: {
                    orderBy: { orden: 'asc' },
                    take: 1,
                    select: { imageUrl: true }
                },
                // Conteos para indicadores
                _count: {
                    select: {
                        galeria: true, // Conteo total de imágenes
                        // --- CORRECCIÓN: Usar la nueva relación ---
                        itemCatalogoOfertas: true // Contar cuántas ofertas tiene vinculadas
                        // ItemCatalogoPromocion: true, // <-- ELIMINADO
                        // ItemCatalogoDescuento: true, // <-- ELIMINADO
                    }
                }
            },
            orderBy: [
                // Ordenar por el campo 'orden' general
                { orden: 'asc' },
                { nombre: 'asc' } // Fallback por nombre
            ]
        });

        // Mapear para añadir la URL de la imagen de portada directamente
        const itemsConPortada = items.map(item => ({
            ...item,
            imagenPortadaUrl: item.galeria?.[0]?.imageUrl || null,
        }));

        // El tipo de retorno ahora debe incluir imagenPortadaUrl y el _count correcto
        // El componente frontend necesitará adaptarse a _count.ItemCatalogoOferta
        return itemsConPortada;

    } catch (error) {
        console.error("Error en obtenerItemsParaCatalogo:", error);
        return null;
    }
}

export async function crearItemCatalogo(
    catalogoId: string,
    negocioId: string,
    data: CrearItemBasicoInput
): Promise<ActionResult<{ id: string }>> {
    if (!catalogoId || !negocioId || !data.nombre || data.precio === null || data.precio === undefined) {
        return { success: false, error: "Faltan datos obligatorios (catálogo, negocio, nombre, precio)." };
    }
    try {
        const ultimoItem = await prisma.itemCatalogo.findFirst({ where: { catalogoId }, orderBy: { orden: 'desc' }, select: { orden: true } });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;
        const nuevoItem = await prisma.itemCatalogo.create({
            data: {
                nombre: data.nombre.trim(), precio: data.precio,
                catalogo: { connect: { id: catalogoId } }, negocio: { connect: { id: negocioId } },
                categoria: data.categoriaId ? { connect: { id: data.categoriaId } } : undefined,
                status: 'activo', orden: nuevoOrden,
            },
            select: { id: true }
        });
        const catalogo = await prisma.catalogo.findUnique({ where: { id: catalogoId }, select: { negocio: { select: { clienteId: true } } } });
        const basePath = catalogo?.negocio?.clienteId ? `/admin/clientes/${catalogo.negocio.clienteId}/negocios/${negocioId}/catalogo/${catalogoId}` : `/admin/negocios/${negocioId}/catalogo/${catalogoId}`;
        revalidatePath(basePath);
        return { success: true, data: { id: nuevoItem.id } };
    } catch (error) {
        console.error("Error en crearItemCatalogo:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false, error: "Error: Ya existe un ítem con ese SKU o identificador único." };
        return { success: false, error: "No se pudo crear el ítem." };
    }
}

/**
 * Actualiza un ítem existente y sus etiquetas asociadas.
 */
export async function actualizarItemCatalogo(
    itemId: string,
    data: ActualizarItemInput,
    etiquetaIds: string[]
    // Podrías añadir un parámetro opcional ofertaIds: string[] si decides gestionar ofertas aquí
): Promise<ActionResult> {
    if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Actualizar datos del ítem
            await tx.itemCatalogo.update({ where: { id: itemId }, data: { ...data, categoriaId: data.categoriaId || null } });
            // 2. Gestionar etiquetas
            const currentEtiquetas = await tx.itemCatalogoEtiqueta.findMany({ where: { itemCatalogoId: itemId }, select: { etiquetaId: true } });
            const currentEtiquetaIds = new Set(currentEtiquetas.map(et => et.etiquetaId));
            const etiquetasToAdd = etiquetaIds.filter(id => !currentEtiquetaIds.has(id));
            const etiquetasToRemove = Array.from(currentEtiquetaIds).filter(id => !etiquetaIds.includes(id));
            if (etiquetasToRemove.length > 0) await tx.itemCatalogoEtiqueta.deleteMany({ where: { itemCatalogoId: itemId, etiquetaId: { in: etiquetasToRemove } } });
            if (etiquetasToAdd.length > 0) await tx.itemCatalogoEtiqueta.createMany({ data: etiquetasToAdd.map(etiquetaId => ({ itemCatalogoId: itemId, etiquetaId: etiquetaId })) });
            // 3. Gestionar Ofertas (SI SE DECIDE HACER AQUÍ)
            // const currentOfertas = await tx.itemCatalogoOferta.findMany({ where: { itemCatalogoId: itemId }, select: { ofertaId: true } });
            // const currentOfertaIds = new Set(currentOfertas.map(of => of.ofertaId));
            // const ofertasToAdd = ofertaIds.filter(id => !currentOfertaIds.has(id));
            // const ofertasToRemove = Array.from(currentOfertaIds).filter(id => !ofertaIds.includes(id));
            // if (ofertasToRemove.length > 0) await tx.itemCatalogoOferta.deleteMany({ where: { itemCatalogoId: itemId, ofertaId: { in: ofertasToRemove } } });
            // if (ofertasToAdd.length > 0) await tx.itemCatalogoOferta.createMany({ data: ofertasToAdd.map(ofertaId => ({ itemCatalogoId: itemId, ofertaId: ofertaId })) });
        });
        // Invalidar caché
        const item = await prisma.itemCatalogo.findUnique({ where: { id: itemId }, select: { catalogoId: true, negocioId: true, negocio: { select: { clienteId: true } } } });
        if (item) {
            const basePath = item.negocio?.clienteId ? `/admin/clientes/${item.negocio.clienteId}/negocios/${item.negocioId}/catalogo/${item.catalogoId}` : `/admin/negocios/${item.negocioId}/catalogo/${item.catalogoId}`;
            revalidatePath(`${basePath}/item/${itemId}`); revalidatePath(basePath);
        }
        return { success: true };
    } catch (error) {
        console.error(`Error en actualizarItemCatalogo (${itemId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { success: false, error: "Error: El SKU proporcionado ya está en uso por otro ítem." };
        return { success: false, error: "No se pudo actualizar el ítem." };
    }
}

/**
 * Elimina un ítem del catálogo por su ID.
 */
/**
 * Elimina un ítem del catálogo por su ID, incluyendo sus imágenes asociadas del storage.
 * @param itemId - ID del ítem a eliminar.
 * @returns Objeto ActionResult indicando éxito o error.
 */
export async function eliminarItemCatalogo(itemId: string): Promise<ActionResult> {
    if (!itemId) return { success: false, error: "ID del ítem no proporcionado." };
    try {
        // 1. Obtener el ítem y sus imágenes asociadas ANTES de eliminar
        const itemConGaleria = await prisma.itemCatalogo.findUnique({
            where: { id: itemId },
            select: {
                catalogoId: true, // Para revalidación
                negocioId: true, // Para revalidación
                negocio: { select: { clienteId: true } }, // Para revalidación
                galeria: { // Obtener todas las imágenes de la galería
                    select: {
                        id: true, // ID del registro de galería
                        imageUrl: true // URL para borrar del storage
                    }
                }
            }
        });

        if (!itemConGaleria) {
            // Si no existe, la operación es técnicamente exitosa
            console.warn(`Intento de eliminar ítem ${itemId} que no fue encontrado.`);
            return { success: true };
        }

        // 2. Intentar eliminar las imágenes del Storage
        const imagenesAEliminar = itemConGaleria.galeria;
        if (imagenesAEliminar.length > 0) {
            console.log(`Intentando eliminar ${imagenesAEliminar.length} imágenes del storage para ítem ${itemId}...`);
            const deletePromises = imagenesAEliminar.map(img => eliminarImagenStorage(img.imageUrl));
            const results = await Promise.allSettled(deletePromises); // Esperar a que todas terminen

            // Loggear errores de eliminación de storage, pero no detener la eliminación del ítem
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error al eliminar imagen ${imagenesAEliminar[index].id} (${imagenesAEliminar[index].imageUrl}) del storage:`, result.reason);
                } else if (result.value.success === false) {
                    console.warn(`Fallo controlado al eliminar imagen ${imagenesAEliminar[index].id} (${imagenesAEliminar[index].imageUrl}) del storage: ${result.value.error}`);
                }
            });
        }

        // 3. Eliminar el ítem de la base de datos
        // onDelete: Cascade configurado en el schema se encargará de eliminar
        // los registros de ItemCatalogoEtiqueta, ItemCatalogoOferta, ItemCatalogoGaleria, ItemInteraccion
        await prisma.itemCatalogo.delete({ where: { id: itemId } });
        console.log(`Ítem ${itemId} y sus relaciones en BD eliminadas.`);

        // 4. Revalidar caché de la página del catálogo
        const basePath = itemConGaleria.negocio?.clienteId
            ? `/admin/clientes/${itemConGaleria.negocio.clienteId}/negocios/${itemConGaleria.negocioId}/catalogo/${itemConGaleria.catalogoId}`
            : `/admin/negocios/${itemConGaleria.negocioId}/catalogo/${itemConGaleria.catalogoId}`;
        revalidatePath(basePath);

        return { success: true };

    } catch (error) {
        console.error(`Error en eliminarItemCatalogo (${itemId}):`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Registro no encontrado
            console.warn(`Intento de eliminar ítem ${itemId} que no fue encontrado (P2025).`);
            return { success: true }; // Considerar éxito
        }
        // Considerar otros errores de FK si onDelete no está bien configurado
        return { success: false, error: "No se pudo eliminar el ítem." };
    }
}
/**
 * Actualiza el orden de múltiples ítems dentro de un catálogo (lista completa).
 */
export async function actualizarOrdenItemsCatalogo(
    catalogoId: string,
    ordenData: ItemOrdenData[]
): Promise<ActionResult> {
    if (!ordenData) return { success: true };
    try {
        await prisma.$transaction(ordenData.map(item => prisma.itemCatalogo.update({ where: { id: item.id }, data: { orden: item.orden } })));
        const catalogo = await prisma.catalogo.findUnique({ where: { id: catalogoId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (catalogo) {
            const basePath = catalogo.negocio?.clienteId ? `/admin/clientes/${catalogo.negocio.clienteId}/negocios/${catalogo.negocioId}/catalogo/${catalogoId}` : `/admin/negocios/${catalogo.negocioId}/catalogo/${catalogoId}`;
            revalidatePath(basePath);
        }
        return { success: true };
    } catch (error) {
        console.error("Error en actualizarOrdenItemsCatalogo:", error);
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}


// --- ACCIÓN IA ACTUALIZADA PARA MEJORAR DESCRIPCIÓN DE ITEM ---

// --- NUEVO TIPO: Niveles de Creatividad ---
export type NivelCreatividadIA = 'bajo' | 'medio' | 'alto';
/**
 * @description Llama a la IA para mejorar la descripción de un ítem existente, ajustando creatividad y longitud.
 * @param {string} itemId - ID del ítem para obtener contexto.
 * @param {string} descripcionActual - La descripción actual a mejorar.
 * @param {NivelCreatividadIA} [nivelCreatividad='medio'] - Nivel de creatividad deseado ('bajo', 'medio', 'alto').
 * @param {number} [maxCaracteres=200] - Límite máximo de caracteres para la sugerencia.
 * @returns {Promise<ActionResult<{ sugerencia: string }>>} - Resultado con la descripción sugerida o un error.
 */
export async function mejorarDescripcionItemIA(
    itemId: string,
    descripcionActual: string | null | undefined,
    nivelCreatividad: NivelCreatividadIA = 'medio',
    maxCaracteres: number = 200
): Promise<ActionResult<{ sugerencia: string }>> {
    console.log(`Solicitud de mejora IA para ítem ID: ${itemId} (Creatividad: ${nivelCreatividad}, Máx Chars: ${maxCaracteres})`);
    if (!itemId) return { success: false, error: "ID de ítem no proporcionado." };
    if (!descripcionActual?.trim()) return { success: false, error: "No hay descripción actual para mejorar." };

    const maxCharsValidado = Math.max(50, Math.min(maxCaracteres || 200, 500));

    try {
        // 1. Obtener contexto del ítem (Excluyendo precio)
        const item = await prisma.itemCatalogo.findUnique({
            where: { id: itemId },
            select: { // Seleccionar campos relevantes EXCEPTO precio
                nombre: true,
                // precio: true, // <-- ELIMINADO
                tipoItem: true,
                stock: true,
                unidadMedida: true,
                funcionPrincipal: true,
                AquienVaDirigido: true,
                palabrasClave: true,
                categoria: { select: { nombre: true } },
                itemEtiquetas: { select: { etiqueta: { select: { nombre: true } } } }
            }
        });
        if (!item) { console.error(`Ítem ${itemId} no encontrado para mejora IA.`); return { success: false, error: "Ítem no encontrado." }; }
        console.log(`Contexto obtenido para mejora del ítem:`, item);

        // 2. Preparar datos y construir prompt (sin precio, con formato)
        const etiquetasStr = item.itemEtiquetas?.map(et => et.etiqueta.nombre).join(', ') || 'Ninguna';

        // --- Contexto SIN precio ---
        const promptContexto = `Producto/Servicio: ${item.nombre}, Categoría: ${item.categoria?.nombre || 'N/A'}, Tipo: ${item.tipoItem || 'N/A'}, Stock: ${item.stock ?? 'N/A'}, Unidad: ${item.unidadMedida || 'N/A'}, Etiquetas: ${etiquetasStr}. Público Objetivo: ${item.AquienVaDirigido || 'General'}. Palabras Clave: ${item.palabrasClave || 'Ninguna'}. Función Principal (para IA): ${item.funcionPrincipal || 'No definida'}.`;

        // --- Prompt actualizado con instrucciones de formato ---
        const promptMejora = `Eres un copywriter experto en eCommerce con un nivel de creatividad ${nivelCreatividad}. Mejora la siguiente descripción de producto/servicio para que sea más atractiva, clara y concisa (máximo ${maxCharsValidado} caracteres), destacando beneficios clave basados en su contexto. Contexto adicional (NO incluyas el precio en la descripción): ${promptContexto}. Descripción actual a mejorar: "${descripcionActual.trim()}"\n\n**Instrucciones de Formato:**\n- Separa los párrafos distintos con un salto de línea (\\n).\n- Si creas una lista de características o beneficios, usa un guion (-) al inicio de cada punto, seguido de un espacio.\n\nDescripción Mejorada:`;

        console.log("Enviando a llamarGeminiParaMejorarTexto...");

        // 3. Determinar temperatura (sin cambios)
        let temperature: number;
        switch (nivelCreatividad) { case 'bajo': temperature = 0.2; break; case 'alto': temperature = 0.8; break; case 'medio': default: temperature = 0.5; break; }

        // 4. Llamar a Gemini (sin cambios en la llamada, asume que devuelve string)
        const descripcionMejorada = await llamarGeminiParaMejorarTexto(promptMejora, { temperature: temperature, maxOutputTokens: maxCharsValidado + 50 });

        if (!descripcionMejorada) { console.warn("llamarGeminiParaMejorarTexto devolvió null o vacío."); throw new Error("La IA no generó una sugerencia."); }
        console.log("Sugerencia recibida de Gemini:", descripcionMejorada);

        // 5. Devolver resultado (sin post-procesamiento aquí, asumimos que Gemini siguió las instrucciones)
        // El frontend usará whitespace-pre-wrap para mostrar los \n y los guiones
        const sugerenciaFinal = descripcionMejorada.trim().slice(0, maxCharsValidado);
        return { success: true, data: { sugerencia: sugerenciaFinal } };

    } catch (error) {
        console.error(`Error en mejorarDescripcionItemIA (${itemId}):`, error);
        return { success: false, error: `Error al mejorar con IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}