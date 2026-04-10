'use server';
import prisma from '../prismaClient'; // Ajusta la ruta
import { Prisma, GaleriaNegocio } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { eliminarImagenStorage } from './imageHandler.actions';

// --- Tipos ---

// Tipo de retorno estándar
export interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Tipo para la lista de galerías en el dashboard
// Incluye la URL de la primera imagen y el conteo de imágenes
export type GaleriaNegocioParaLista = Pick<
    GaleriaNegocio,
    'id' | 'nombre' | 'descripcion' | 'status' | 'orden' // Incluir status y orden
> & {
    imagenPortadaUrl?: string | null;
    _count?: {
        imagenes: number; // Conteo de imágenes en la galería
    };
};

// Tipo para crear/editar una galería (solo campos básicos)
export type UpsertGaleriaNegocioInput = Pick<
    GaleriaNegocio,
    'nombre' // Nombre es requerido
> & Partial<Pick<GaleriaNegocio, 'descripcion' | 'status'>>; // Descripción y status opcionales al crear/editar

// Tipo para actualizar el orden de las galerías
export interface GaleriaNegocioOrdenData {
    id: string;
    orden: number;
}


// --- Acciones ---

/**
 * @description Obtiene las galerías de un negocio con su imagen de portada y conteo de imágenes.
 * @param {string} negocioId - El ID del negocio.
 * @returns {Promise<GaleriaNegocioParaLista[] | null>} - Array de galerías o null si hay error.
 */
export async function obtenerGaleriasNegocioConPortada(negocioId: string): Promise<GaleriaNegocioParaLista[] | null> {
    if (!negocioId) return null;
    try {
        const galerias = await prisma.galeriaNegocio.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                status: true,
                orden: true,
                // Obtener la primera imagen
                imagenes: {
                    orderBy: { orden: 'asc' },
                    take: 1,
                    select: { imageUrl: true }
                },
                // Contar imágenes
                _count: {
                    select: { imagenes: true }
                }
            },
            orderBy: { orden: 'asc' }, // Ordenar por el campo 'orden'
        });

        // Mapear para simplificar la estructura
        const galeriasParaLista: GaleriaNegocioParaLista[] = galerias.map(g => ({
            ...g,
            imagenPortadaUrl: g.imagenes?.[0]?.imageUrl || null,
            // imagenes: undefined, // No necesitamos el array de imagenes aquí
        }));

        return galeriasParaLista;

    } catch (error) {
        console.error(`Error fetching galerias for negocio ${negocioId}:`, error);
        return null;
    }
}

/**
 * @description Crea una nueva galería para un negocio.
 * @param {string} negocioId - ID del negocio.
 * @param {string} nombre - Nombre de la nueva galería.
 * @param {string | null} [descripcion] - Descripción opcional.
 * @returns {Promise<ActionResult<GaleriaNegocio>>} - Resultado con la nueva galería creada o un error.
 */
export async function crearGaleriaNegocio(
    negocioId: string,
    nombre: string,
    descripcion?: string | null
): Promise<ActionResult<GaleriaNegocio>> {
    if (!negocioId || !nombre?.trim()) {
        return { success: false, error: "Faltan datos obligatorios (negocio, nombre)." };
    }

    try {
        // Calcular siguiente orden
        const ultimoOrden = await prisma.galeriaNegocio.aggregate({
            _max: { orden: true }, where: { negocioId: negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaGaleria = await prisma.galeriaNegocio.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombre: nombre.trim(),
                descripcion: descripcion?.trim() || null,
                status: 'activo', // Default status
                orden: nuevoOrden,
            }
        });

        // Revalidar
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { clienteId: true } });
        const basePath = negocio?.clienteId ? `/admin/clientes/${negocio.clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        revalidatePath(`${basePath}/editar`); // Revalidar la página de edición del negocio

        return { success: true, data: nuevaGaleria };

    } catch (error) {
        console.error(`Error creando galería para negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `Ya existe una galería con el nombre "${nombre.trim()}" para este negocio.` };
        }
        return { success: false, error: "No se pudo crear la galería." };
    }
}

/**
 * @description Actualiza los detalles (nombre, descripción, status) de una galería.
 * @param {string} galeriaId - ID de la galería a actualizar.
 * @param {UpsertGaleriaNegocioInput} data - Datos a actualizar.
 * @returns {Promise<ActionResult<GaleriaNegocio>>} - Resultado con la galería actualizada o un error.
 */
export async function actualizarGaleriaNegocio(
    galeriaId: string,
    data: UpsertGaleriaNegocioInput
): Promise<ActionResult<GaleriaNegocio>> {
    if (!galeriaId) return { success: false, error: "Falta ID de la galería." };
    if (!data.nombre?.trim()) return { success: false, error: "El nombre no puede estar vacío." };

    try {
        const dataToUpdate: Prisma.GaleriaNegocioUpdateInput = {
            nombre: data.nombre.trim(),
            descripcion: data.descripcion?.trim() || null,
            status: data.status || 'inactivo', // Default a inactivo si no se especifica
        };

        const galeriaActualizada = await prisma.galeriaNegocio.update({
            where: { id: galeriaId },
            data: dataToUpdate,
            select: { negocioId: true, negocio: { select: { clienteId: true } } } // Para revalidación
        });

        // Revalidar
        const basePath = galeriaActualizada.negocio?.clienteId
            ? `/admin/clientes/${galeriaActualizada.negocio.clienteId}/negocios/${galeriaActualizada.negocioId}`
            : `/admin/negocios/${galeriaActualizada.negocioId}`;
        // Revalidar la página de edición del negocio y la página de gestión de esta galería (si existe)
        revalidatePath(`${basePath}/editar`);
        revalidatePath(`${basePath}/galeria/${galeriaId}`); // Asumiendo esta ruta

        // Devolver la galería completa actualizada
        const dataCompleta = await prisma.galeriaNegocio.findUnique({ where: { id: galeriaId } });
        return { success: true, data: dataCompleta ?? undefined };

    } catch (error) {
        console.error(`Error actualizando galería ${galeriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') return { success: false, error: `Ya existe otra galería con el nombre "${data.nombre?.trim()}" para este negocio.` };
            if (error.code === 'P2025') return { success: false, error: "Galería no encontrada para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar la galería." };
    }
}

/**
 * @description Elimina una galería de negocio y todas sus imágenes asociadas (storage y BD).
 * @param {string} galeriaId - ID de la galería a eliminar.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function eliminarGaleriaNegocio(galeriaId: string): Promise<ActionResult> {
    if (!galeriaId) return { success: false, error: "Falta ID de la galería." };

    try {
        // 1. Obtener galería, IDs para revalidación y URLs de imágenes ANTES de eliminar
        const galeriaConImagenes = await prisma.galeriaNegocio.findUnique({
            where: { id: galeriaId },
            select: {
                id: true,
                negocioId: true,
                negocio: { select: { clienteId: true } },
                imagenes: { // Obtener todas las imágenes
                    select: { id: true, imageUrl: true }
                }
            }
        });

        if (!galeriaConImagenes) {
            console.warn(`Intento de eliminar galería ${galeriaId} que no fue encontrada.`);
            return { success: true }; // Ya no existe
        }

        // 2. Intentar eliminar las imágenes del Storage
        const urlsAEliminar = galeriaConImagenes.imagenes.map(img => img.imageUrl).filter(url => !!url); // Filtrar nulos/vacíos
        if (urlsAEliminar.length > 0) {
            console.log(`Intentando eliminar ${urlsAEliminar.length} imágenes del storage asociadas a la galería ${galeriaId}...`);
            const deletePromises = urlsAEliminar.map(url => eliminarImagenStorage(url));
            const results = await Promise.allSettled(deletePromises);
            results.forEach((result, index) => { if (result.status === 'rejected') console.error(`Error al eliminar imagen ${urlsAEliminar[index]} del storage:`, result.reason); else if (result.value.success === false) console.warn(`Fallo controlado al eliminar imagen ${urlsAEliminar[index]} del storage: ${result.value.error}`); });
            console.log(`Intentos de eliminación de storage completados para galería ${galeriaId}.`);
        } else {
            console.log(`Galería ${galeriaId} no tenía imágenes asociadas en storage.`);
        }

        // 3. Eliminar la Galería de la Base de Datos
        // onDelete: Cascade configurado en ImagenGaleriaNegocio se encargará de los registros de imagen en BD.
        await prisma.galeriaNegocio.delete({
            where: { id: galeriaId },
        });
        console.log(`Galería ${galeriaId} y sus imágenes en BD eliminadas.`);

        // 4. Revalidar caché
        const basePath = galeriaConImagenes.negocio?.clienteId
            ? `/admin/clientes/${galeriaConImagenes.negocio.clienteId}/negocios/${galeriaConImagenes.negocioId}`
            : `/admin/negocios/${galeriaConImagenes.negocioId}`;
        revalidatePath(`${basePath}/editar`); // Revalida página de edición del negocio

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando galería ${galeriaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            console.warn(`Intento de eliminar galería ${galeriaId} que no fue encontrada (P2025).`);
            return { success: true };
        }
        return { success: false, error: "No se pudo eliminar la galería." };
    }
}

/**
 * @description Actualiza el orden de las galerías de un negocio.
 * @param {GaleriaNegocioOrdenData[]} ordenData - Array de objetos { id: string, orden: number }.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function actualizarOrdenGaleriasNegocio(
    ordenData: GaleriaNegocioOrdenData[]
): Promise<ActionResult> {
    if (!ordenData || ordenData.length === 0) {
        return { success: true }; // Nada que actualizar
    }

    let negocioId: string | undefined;
    let clienteId: string | null | undefined;

    try {
        // Usar transacción para actualizar todos los órdenes
        await prisma.$transaction(
            ordenData.map((item, index) =>
                prisma.galeriaNegocio.update({
                    where: { id: item.id },
                    data: { orden: index }, // Usar índice como nuevo orden
                })
            )
        );

        // Obtener IDs para revalidación desde el primer item
        if (ordenData[0]?.id) {
            const firstGal = await prisma.galeriaNegocio.findUnique({
                where: { id: ordenData[0].id },
                select: { negocioId: true, negocio: { select: { clienteId: true } } }
            });
            if (firstGal) { negocioId = firstGal.negocioId; clienteId = firstGal.negocio?.clienteId; }
        }

        // Revalidar si tenemos los IDs
        if (negocioId) {
            const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
            revalidatePath(`${basePath}/editar`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de galerías:", error);
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}

export async function obtenerGaleriaPorId(galeriaId: string): Promise<GaleriaNegocio | null> {
    if (!galeriaId) {
        console.warn("obtenerGaleriaPorId: galeriaId no proporcionado.");
        return null;
    }
    try {
        const galeria = await prisma.galeriaNegocio.findUnique({
            where: { id: galeriaId },
            // No necesitamos includes para este formulario simple
        });
        return galeria; // Prisma devuelve el tipo correcto
    } catch (error) {
        console.error(`Error obteniendo galería ${galeriaId}:`, error);
        return null;
    }
}