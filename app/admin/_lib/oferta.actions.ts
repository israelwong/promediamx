'use server';

// import { Prisma, Oferta } from '@prisma/client'; // Asegúrate de importar Oferta
import prisma from './prismaClient'; // Asume importación correcta
import { Oferta } from './types'; // Asegúrate de importar Oferta
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Asegúrate de importar Prisma
import { eliminarImagenStorage } from './imageHandler.actions';
import { llamarGeminiParaMejorarTexto, llamarGeminiMultimodalParaGenerarDescripcion } from '@/scripts/gemini/gemini.actions'; // Ajusta la ruta
import { EditarOfertaInput } from './oferta.type'; // Asegúrate de importar el tipo correcto


// --- Tipos existentes (ActionResult, etc.) ---
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// --- NUEVO TIPO: Oferta con datos para la lista ---
export type OfertaParaLista = Pick<
    Oferta,
    'id' | 'nombre' | 'descripcion' | 'fechaInicio' | 'fechaFin' | 'status' | 'codigo' | 'tipoOferta' // Incluir tipoOferta y codigo
> & {
    imagenPortadaUrl?: string | null; // URL de la primera imagen de la galería
    // Podríamos añadir conteos si fueran necesarios en el futuro
    // _count?: { ItemCatalogoOferta?: number };
};

/**
 * Obtiene las ofertas de un negocio, incluyendo la URL de la primera imagen de su galería.
 * @param negocioId - El ID del negocio.
 * @returns Array de OfertaParaLista o null si hay error.
 */
export async function obtenerOfertasNegocio(negocioId: string): Promise<OfertaParaLista[] | null> {
    if (!negocioId) return null;
    try {
        const ofertas = await prisma.oferta.findMany({
            where: { negocioId: negocioId },
            select: { // Seleccionar solo los campos necesarios para la lista
                id: true,
                nombre: true,
                descripcion: true,
                fechaInicio: true,
                fechaFin: true,
                status: true,
                codigo: true, // Incluir el código
                tipoOferta: true, // Incluir el tipo
                // Obtener la primera imagen de la galería asociada
                OfertaGaleria: {
                    orderBy: { orden: 'asc' },
                    take: 1,
                    select: { imageUrl: true }
                }
                // Añadir conteos si son necesarios _count: { select: { ... } }
            },
            orderBy: { fechaInicio: 'desc' }, // Ordenar por más recientes primero
        });

        // Mapear para añadir la URL de la imagen de portada directamente
        const ofertasParaLista: OfertaParaLista[] = ofertas.map(oferta => ({
            ...oferta,
            imagenPortadaUrl: oferta.OfertaGaleria?.[0]?.imageUrl || null,
            // OfertaGaleria: undefined, // No necesitamos el array completo en la lista
        }));

        return ofertasParaLista;

    } catch (error) {
        console.error(`Error fetching ofertas for negocio ${negocioId}:`, error);
        return null;
    }
}


// --- OTRAS ACCIONES (obtenerOfertaPorId, crearOferta, editarOferta, eliminarOferta) ---
// ... (Asegúrate de tener estas acciones definidas o créalas según necesidad) ...

// Ejemplo rápido de obtenerOfertaPorId (necesaria para editar)
export async function obtenerOfertaPorId(ofertaId: string): Promise<Oferta | null> {
    if (!ofertaId) return null;
    try {
        const oferta = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            // Incluye relaciones si son necesarias para el form de edición
        });
        return oferta;
    } catch (error) {
        console.error(`Error fetching oferta ${ofertaId}:`, error);
        return null;
    }
}


/**
 * Crea una nueva oferta básica (solo nombre y descripción opcional).
 * Asigna valores por defecto para tipo, fechas y status.
 * @param data - Datos básicos de la nueva oferta (negocioId, nombre, descripcion?).
 * @returns Objeto ActionResult con el ID de la oferta creada o un error.
 */

// --- TIPO ACTUALIZADO: Input MUY simplificado para crear oferta ---
export type CrearOfertaBasicaInput = Pick<Oferta, 'negocioId' | 'nombre'>
    & Partial<Pick<Oferta, 'descripcion'>>;

export async function crearOferta(data: CrearOfertaBasicaInput): Promise<ActionResult<{ id: string }>> {
    try {
        // --- Validación Mínima ---
        if (!data.negocioId || !data.nombre?.trim()) {
            return { success: false, error: "Faltan datos obligatorios (negocio, nombre)." };
        }

        // --- Valores por Defecto ---
        const defaultTipo = 'GENERAL'; // Tipo por defecto
        const defaultFechaInicio = new Date();
        defaultFechaInicio.setHours(0, 0, 0, 0); // Inicio del día
        const defaultFechaFin = new Date(defaultFechaInicio);
        defaultFechaFin.setDate(defaultFechaInicio.getDate() + 7); // 1 semana después
        defaultFechaFin.setHours(23, 59, 59, 999); // Fin del día
        const defaultStatus = 'inactivo'; // Iniciar como inactiva para forzar edición

        // --- Creación en BD ---
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocio: { connect: { id: data.negocioId } },
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                // Asignar defaults
                tipoOferta: defaultTipo,
                fechaInicio: defaultFechaInicio,
                fechaFin: defaultFechaFin,
                status: defaultStatus,
                // Otros campos (valor, codigo, condiciones) serán null por defecto
            },
            select: { id: true } // Solo necesitamos el ID
        });

        // --- Revalidación de Caché ---
        const negocio = await prisma.negocio.findUnique({ where: { id: data.negocioId }, select: { clienteId: true } });
        const basePath = negocio?.clienteId
            ? `/admin/clientes/${negocio.clienteId}/negocios/${data.negocioId}`
            : `/admin/negocios/${data.negocioId}`;
        revalidatePath(basePath); // Revalida la página del negocio donde se lista

        return { success: true, data: { id: nuevaOferta.id } };

    } catch (error) {
        console.error("Error creando oferta:", error);
        // Manejar errores específicos si es necesario (ej. código único si se añadiera)
        return { success: false, error: "No se pudo crear la oferta." };
    }
}

// --- NUEVO TIPO: Input para editar una oferta ---
// Similar a CrearOfertaInput pero todos los campos son opcionales excepto los IDs

/**
 * Actualiza una oferta existente.
 * @param ofertaId - ID de la oferta a actualizar.
 * @param data - Datos de la oferta a modificar.
 * @returns Objeto ActionResult indicando éxito o error.
 */
export async function editarOferta(ofertaId: string, data: EditarOfertaInput): Promise<ActionResult> {
    try {
        // --- Validaciones ---
        if (!ofertaId) {
            return { success: false, error: "ID de oferta no proporcionado." };
        }
        if (!data.nombre?.trim()) {
            return { success: false, error: "El nombre es obligatorio." };
        }
        if (!data.tipoOferta) {
            return { success: false, error: "El tipo de oferta es obligatorio." };
        }
        if (!data.fechaInicio || !data.fechaFin) {
            return { success: false, error: "Las fechas de inicio y fin son obligatorias." };
        }

        const inicio = new Date(data.fechaInicio);
        const fin = new Date(data.fechaFin);

        if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || inicio >= fin) {
            return { success: false, error: "Fechas inválidas o fecha de fin no posterior a inicio." };
        }

        // Validación específica por tipo
        const tipoSeleccionado = data.tipoOferta; // Asumiendo que viene en data
        if (tipoSeleccionado === 'CODIGO_PROMOCIONAL' && !data.codigo?.trim()) {
            return { success: false, error: "Se requiere un código para este tipo de oferta." };
        }
        if ((tipoSeleccionado === 'DESCUENTO_PORCENTAJE' || tipoSeleccionado === 'DESCUENTO_MONTO') && (data.valor === null || data.valor === undefined || data.valor < 0)) {
            return { success: false, error: "Se requiere un valor positivo para este tipo de descuento." };
        }

        // Limpiar valor si no es descuento
        const valorFinal = (tipoSeleccionado === 'DESCUENTO_PORCENTAJE' || tipoSeleccionado === 'DESCUENTO_MONTO') ? data.valor : null;

        // Limpiar código si no es de tipo código
        const codigoFinal = tipoSeleccionado === 'CODIGO_PROMOCIONAL' ? data.codigo?.trim().toUpperCase() : null;

        // --- Actualización en BD ---
        const ofertaActualizada = await prisma.oferta.update({
            where: { id: ofertaId },
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                tipoOferta: data.tipoOferta,
                valor: valorFinal,
                codigo: codigoFinal,
                fechaInicio: inicio, // Usar fechas validadas
                fechaFin: fin,       // Usar fechas validadas
                status: data.status || 'inactivo',
                condiciones: data.condiciones?.trim() || null,
                linkPago: data.linkPago?.trim() || null,
            },
            select: { negocioId: true, negocio: { select: { clienteId: true } } } // Para revalidación
        });

        // --- Revalidación de Caché ---
        const basePath = ofertaActualizada.negocio?.clienteId
            ? `/admin/clientes/${ofertaActualizada.negocio.clienteId}/negocios/${ofertaActualizada.negocioId}`
            : `/admin/negocios/${ofertaActualizada.negocioId}`;
        revalidatePath(basePath); // Dashboard negocio (lista)
        revalidatePath(`${basePath}/oferta/${ofertaId}/editar`); // Página de edición

        return { success: true };

    } catch (error) {
        console.error(`Error editando oferta ${ofertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && error.meta?.target === 'Oferta_codigo_key') {
                return { success: false, error: "Error: El código promocional ya está en uso." };
            }
            if (error.code === 'P2025') { // Registro no encontrado
                return { success: false, error: "Oferta no encontrada para editar." };
            }
        }
        return { success: false, error: "No se pudo actualizar la oferta." };
    }
}

// --- ACCIÓN ACTUALIZADA: Eliminar Oferta y sus Imágenes ---
/**
 * Elimina una oferta por su ID, incluyendo sus imágenes asociadas del storage.
 * @param ofertaId - ID de la oferta a eliminar.
 * @returns Objeto ActionResult indicando éxito o error.
 */
export async function eliminarOferta(ofertaId: string): Promise<ActionResult> {
    try {
        if (!ofertaId) {
            return { success: false, error: "ID de oferta no proporcionado." };
        }

        // 1. Obtener la oferta y sus imágenes asociadas ANTES de eliminar
        const ofertaConGaleria = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            select: {
                negocioId: true, // Para revalidación
                negocio: { select: { clienteId: true } }, // Para revalidación
                OfertaGaleria: { // Obtener todas las imágenes
                    select: {
                        id: true, // ID del registro de galería
                        imageUrl: true // URL para borrar del storage
                    }
                }
            }
        });

        if (!ofertaConGaleria) {
            // Si no existe, la operación es técnicamente exitosa (ya no está)
            console.warn(`Intento de eliminar oferta ${ofertaId} que no fue encontrada.`);
            return { success: true };
        }

        // 2. Intentar eliminar las imágenes del Storage
        const imagenesAEliminar = ofertaConGaleria.OfertaGaleria;
        if (imagenesAEliminar.length > 0) {
            console.log(`Intentando eliminar ${imagenesAEliminar.length} imágenes del storage para oferta ${ofertaId}...`);
            const deletePromises = imagenesAEliminar.map(img => eliminarImagenStorage(img.imageUrl));
            const results = await Promise.allSettled(deletePromises); // Esperar a que todas terminen

            // Loggear errores de eliminación de storage, pero no detener la eliminación de la oferta
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Error al eliminar imagen ${imagenesAEliminar[index].id} (${imagenesAEliminar[index].imageUrl}) del storage:`, result.reason);
                } else if (result.value.success === false) {
                    console.warn(`Fallo controlado al eliminar imagen ${imagenesAEliminar[index].id} (${imagenesAEliminar[index].imageUrl}) del storage: ${result.value.error}`);
                }
            });
        }

        // 3. Eliminar la oferta de la base de datos
        // onDelete: Cascade se encargará de eliminar los registros de OfertaGaleria y ItemCatalogoOferta
        await prisma.oferta.delete({
            where: { id: ofertaId },
        });
        console.log(`Oferta ${ofertaId} y sus relaciones en BD eliminadas.`);

        // 4. Revalidar caché de la página del negocio
        const basePath = ofertaConGaleria.negocio?.clienteId
            ? `/admin/clientes/${ofertaConGaleria.negocio.clienteId}/negocios/${ofertaConGaleria.negocioId}`
            : `/admin/negocios/${ofertaConGaleria.negocioId}`;
        revalidatePath(basePath);

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando oferta ${ofertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Registro no encontrado (podría pasar si hay concurrencia)
            console.warn(`Intento de eliminar oferta ${ofertaId} que no fue encontrada (P2025).`);
            return { success: true }; // Considerar éxito
        }
        // Considerar otros errores de FK si onDelete no está bien configurado
        return { success: false, error: "No se pudo eliminar la oferta." };
    }
}

// --- ACCIONES IA ACTUALIZADAS ---

/**
 * @description Llama a la IA para mejorar una descripción de oferta existente.
 * @param {string} ofertaId - ID de la oferta para obtener contexto.
 * @param {string} descripcionActual - La descripción actual a mejorar.
 * @returns {Promise<ActionResult<{ sugerencia: string }>>} - Resultado con la descripción sugerida o un error.
 */
export async function mejorarDescripcionOfertaIA(
    ofertaId: string,
    descripcionActual: string | null | undefined
): Promise<ActionResult<{ sugerencia: string }>> {
    console.log(`Solicitud de mejora IA para oferta ID: ${ofertaId}`);
    if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };
    if (!descripcionActual?.trim()) return { success: false, error: "No hay descripción actual para mejorar." };

    try {
        // 1. Obtener contexto de la oferta
        const oferta = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            select: { nombre: true, tipoOferta: true, valor: true, codigo: true, condiciones: true } // Campos relevantes para contexto
        });
        if (!oferta) {
            console.error(`Oferta ${ofertaId} no encontrada para mejora IA.`);
            return { success: false, error: "Oferta no encontrada." };
        }
        console.log(`Contexto obtenido para mejora:`, oferta);

        // 2. Preparar datos y construir prompt
        const dataParaGemini = {
            nombre_oferta: oferta.nombre,
            tipo_oferta: oferta.tipoOferta,
            valor: oferta.valor,
            codigo: oferta.codigo,
            condiciones: oferta.condiciones,
            descripcion_a_mejorar: descripcionActual.trim()
        };
        // Crear un prompt claro
        const promptContexto = `Oferta: ${dataParaGemini.nombre_oferta}, Tipo: ${dataParaGemini.tipo_oferta}${dataParaGemini.valor ? `, Valor: ${dataParaGemini.valor}` : ''}${dataParaGemini.codigo ? `, Código: ${dataParaGemini.codigo}` : ''}${dataParaGemini.condiciones ? `. Condiciones: ${dataParaGemini.condiciones}` : ''}.`;
        const promptMejora = `Eres un copywriter experto en marketing. Mejora la siguiente descripción de oferta para que sea más atractiva, clara y concisa (máximo 150 caracteres), manteniendo la información esencial. Contexto adicional: ${promptContexto}. Descripción actual a mejorar: "${dataParaGemini.descripcion_a_mejorar}"\n\nDescripción Mejorada:`;

        console.log("Enviando a llamarGeminiParaMejorarTexto...");
        // 3. Llamar a la función helper de Gemini (asume que devuelve string)
        const descripcionMejorada = await llamarGeminiParaMejorarTexto(promptMejora);

        if (!descripcionMejorada) {
            console.warn("llamarGeminiParaMejorarTexto devolvió null o vacío.");
            throw new Error("La IA no generó una sugerencia.");
        }
        console.log("Sugerencia recibida de Gemini:", descripcionMejorada);

        // 4. Devolver resultado
        return { success: true, data: { sugerencia: descripcionMejorada.trim() } }; // Asegurar trim

    } catch (error) {
        console.error(`Error en mejorarDescripcionOfertaIA (${ofertaId}):`, error);
        return { success: false, error: `Error al mejorar con IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

/**
 * @description Llama a la IA multimodal para generar una descripción basada en datos de la oferta y su imagen de portada.
 * @param {string} ofertaId - ID de la oferta.
 * @returns {Promise<ActionResult<{ sugerencia: string }>>} - Resultado con la descripción generada o un error.
 */
export async function generarDescripcionOfertaIA(
    ofertaId: string
): Promise<ActionResult<{ sugerencia: string }>> {
    console.log(`Solicitud de generación IA para oferta ID: ${ofertaId}`);
    if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };

    try {
        // 1. Obtener datos relevantes de la oferta Y la imagen de portada
        const ofertaConPortada = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            select: {
                nombre: true, tipoOferta: true, valor: true, codigo: true, condiciones: true, fechaInicio: true, fechaFin: true,
                OfertaGaleria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } }
            }
        });

        if (!ofertaConPortada) {
            console.error(`Oferta ${ofertaId} no encontrada para generación IA.`);
            return { success: false, error: "Oferta no encontrada." };
        }

        const imageUrl = ofertaConPortada.OfertaGaleria?.[0]?.imageUrl;
        if (!imageUrl) {
            console.warn(`Oferta ${ofertaId} no tiene imagen de portada para generación IA.`);
            return { success: false, error: "La oferta no tiene imagen de portada para generar descripción." };
        }
        console.log(`Contexto obtenido para generación:`, { ...ofertaConPortada, imagenUrl: imageUrl });

        // 2. Preparar datos y construir prompt multimodal
        const inicioStr = ofertaConPortada.fechaInicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const finStr = ofertaConPortada.fechaFin.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const dataParaGemini = {
            nombre_oferta: ofertaConPortada.nombre,
            tipo_oferta: ofertaConPortada.tipoOferta,
            valor: ofertaConPortada.valor,
            codigo: ofertaConPortada.codigo,
            condiciones: ofertaConPortada.condiciones,
            vigencia: `Del ${inicioStr} al ${finStr}`,
            imagen_url: imageUrl
        };
        const longitudMaxima = 300; // Longitud máxima de la descripción
        const promptTexto = `Eres un copywriter experto en marketing. Observa la imagen adjunta y usa la siguiente información para generar una descripción atractiva y concisa (máximo ${longitudMaxima} caracteres) para esta oferta:\n` +
            `- Nombre: ${dataParaGemini.nombre_oferta}\n` +
            `- Tipo: ${dataParaGemini.tipo_oferta}\n` +
            `${dataParaGemini.valor ? `- Valor: ${dataParaGemini.valor}${dataParaGemini.tipo_oferta.includes('PORCENTAJE') ? '%' : '$'}\n` : ''}` +
            `${dataParaGemini.codigo ? `- Código: ${dataParaGemini.codigo}\n` : ''}` +
            `- Vigencia: ${dataParaGemini.vigencia}\n` +
            `${dataParaGemini.condiciones ? `- Condiciones: ${dataParaGemini.condiciones}\n` : ''}` +
            `Enfócate en lo visual de la imagen y el beneficio principal de la oferta. Descripción generada:`;

        console.log("Enviando a llamarGeminiMultimodalParaGenerarDescripcion...");
        // 3. Llamar a la función helper de Gemini (multimodal, asume devuelve string)
        const descripcionGenerada = await llamarGeminiMultimodalParaGenerarDescripcion(promptTexto, dataParaGemini.imagen_url);

        if (typeof descripcionGenerada !== 'string' || !descripcionGenerada.trim()) {
            console.warn("llamarGeminiMultimodalParaGenerarDescripcion devolvió null o vacío.");
            throw new Error("La IA no generó una descripción.");
        }
        console.log("Descripción generada por IA:", descripcionGenerada);

        // 4. Devolver resultado
        return { success: true, data: { sugerencia: descripcionGenerada.trim() } }; // Asegurar trim

    } catch (error) {
        console.error(`Error generando descripción IA para oferta ${ofertaId}:`, error);
        return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}



