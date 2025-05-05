'use server';

import prisma from './prismaClient'; // Ajusta la ruta
import { Prisma, NegocioRedSocial } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// --- Tipo de retorno estándar ---
interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// --- Tipo para la data de ordenamiento ---
export interface RedSocialOrdenData {
    id: string;
    orden: number;
}

// --- Tipo para Crear/Editar ---
// Usamos Partial para la edición, pero hacemos negocioId y nombreRed/url requeridos para creación
export type UpsertRedSocialInput = Partial<Pick<NegocioRedSocial, 'nombreRed' | 'url' | 'icono' | 'orden'>> & {
    // Requeridos solo para creación, opcionales para actualización (se obtienen del ID)
    negocioId?: string;
};


// --- ACCIONES ---

/**
 * @description Obtiene todas las redes sociales de un negocio, ordenadas.
 * @param {string} negocioId - El ID del negocio.
 * @returns {Promise<NegocioRedSocial[] | null>} - Array de NegocioRedSocial o null si hay error.
 */
export async function obtenerRedesSocialesNegocio(negocioId: string): Promise<NegocioRedSocial[] | null> {
    if (!negocioId) return null;
    try {
        const redes = await prisma.negocioRedSocial.findMany({
            where: { negocioId: negocioId },
            orderBy: { orden: 'asc' }, // Ordenar según el campo 'orden'
        });
        return redes;
    } catch (error) {
        console.error(`Error fetching redes sociales for negocio ${negocioId}:`, error);
        return null;
    }
}

/**
 * @description Crea una nueva red social para un negocio.
 * @param {string} negocioId - ID del negocio.
 * @param {string} nombreRed - Nombre de la red social (ej. Facebook, Instagram).
 * @param {string} url - URL del perfil/página.
 * @param {string | null} [icono] - (Opcional) Nombre/clase del icono.
 * @returns {Promise<ActionResult<NegocioRedSocial>>} - Resultado con la nueva red creada o un error.
 */
export async function crearRedSocialNegocio(
    negocioId: string,
    nombreRed: string,
    url: string,
    icono?: string | null
): Promise<ActionResult<NegocioRedSocial>> {
    if (!negocioId || !nombreRed?.trim() || !url?.trim()) {
        return { success: false, error: "Faltan datos obligatorios (negocio, nombre red, URL)." };
    }
    // Validación simple de URL (puedes mejorarla)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { success: false, error: "La URL debe empezar con http:// o https://" };
    }

    try {
        // Calcular el siguiente orden
        const ultimoOrden = await prisma.negocioRedSocial.aggregate({
            _max: { orden: true }, where: { negocioId: negocioId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const nuevaRed = await prisma.negocioRedSocial.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombreRed: nombreRed.trim(),
                url: url.trim(),
                icono: icono?.trim() || null,
                orden: nuevoOrden,
            }
        });

        // Revalidar
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { clienteId: true } });
        const basePath = negocio?.clienteId ? `/admin/clientes/${negocio.clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        revalidatePath(`${basePath}/editar`); // Revalida la página de edición del negocio

        return { success: true, data: nuevaRed };

    } catch (error) {
        console.error(`Error creando red social para negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `Ya existe una entrada para "${nombreRed.trim()}" en este negocio.` };
        }
        return { success: false, error: "No se pudo añadir la red social." };
    }
}

/**
 * @description Actualiza una red social existente.
 * @param {string} id - ID del registro NegocioRedSocial a actualizar.
 * @param {UpsertRedSocialInput} data - Datos a actualizar (nombreRed?, url?, icono?).
 * @returns {Promise<ActionResult<NegocioRedSocial>>} - Resultado con la red actualizada o un error.
 */
export async function actualizarRedSocialNegocio(
    id: string,
    data: UpsertRedSocialInput
): Promise<ActionResult<NegocioRedSocial>> {
    if (!id) return { success: false, error: "Falta ID de la red social." };

    // Validar URL si se proporciona
    if (data.url && !data.url.startsWith('http://') && !data.url.startsWith('https://')) {
        return { success: false, error: "La URL debe empezar con http:// o https://" };
    }
    // Limpiar datos vacíos a null
    const dataToUpdate: Prisma.NegocioRedSocialUpdateInput = {};
    if (data.nombreRed !== undefined) dataToUpdate.nombreRed = data.nombreRed.trim() || undefined; // Evitar guardar nombre vacío
    if (data.url !== undefined) dataToUpdate.url = data.url.trim() || undefined; // Evitar guardar URL vacía
    if (data.icono !== undefined) dataToUpdate.icono = data.icono?.trim() || null;
    // No actualizamos orden aquí, se hace con otra acción

    if (Object.keys(dataToUpdate).length === 0) {
        // Si no hay nada que actualizar, obtener y devolver el actual
        const redActual = await prisma.negocioRedSocial.findUnique({ where: { id } });
        return { success: true, data: redActual ?? undefined };
    }
    // Validar que el nombre no quede vacío si se intenta actualizar
    if (dataToUpdate.nombreRed === '') return { success: false, error: "El nombre de la red no puede estar vacío." };
    if (dataToUpdate.url === '') return { success: false, error: "La URL no puede estar vacía." };


    try {
        const redActualizada = await prisma.negocioRedSocial.update({
            where: { id: id },
            data: dataToUpdate,
            select: { negocioId: true, negocio: { select: { clienteId: true } } } // Para revalidación
        });

        // Revalidar
        const basePath = redActualizada.negocio?.clienteId
            ? `/admin/clientes/${redActualizada.negocio.clienteId}/negocios/${redActualizada.negocioId}`
            : `/admin/negocios/${redActualizada.negocioId}`;
        revalidatePath(`${basePath}/editar`);

        // Devolver la red actualizada completa (opcional)
        const dataCompleta = await prisma.negocioRedSocial.findUnique({ where: { id } });
        return { success: true, data: dataCompleta ?? undefined };

    } catch (error) {
        console.error(`Error actualizando red social ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') return { success: false, error: `Ya existe otra entrada para "${data.nombreRed?.trim()}" en este negocio.` };
            if (error.code === 'P2025') return { success: false, error: "Red social no encontrada para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar la red social." };
    }
}


/**
 * @description Elimina una red social de un negocio.
 * @param {string} id - ID del registro NegocioRedSocial a eliminar.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function eliminarRedSocialNegocio(id: string): Promise<ActionResult> {
    if (!id) return { success: false, error: "Falta ID de la red social." };

    try {
        // Obtener datos para revalidación ANTES de eliminar
        const red = await prisma.negocioRedSocial.findUnique({
            where: { id: id },
            select: { negocioId: true, negocio: { select: { clienteId: true } } }
        });

        if (!red) {
            console.warn(`Intento de eliminar red social ${id} que no fue encontrada.`);
            return { success: true }; // Ya no existe
        }

        await prisma.negocioRedSocial.delete({ where: { id: id } });

        // Revalidar
        const basePath = red.negocio?.clienteId
            ? `/admin/clientes/${red.negocio.clienteId}/negocios/${red.negocioId}`
            : `/admin/negocios/${red.negocioId}`;
        revalidatePath(`${basePath}/editar`);

        return { success: true };

    } catch (error) {
        console.error(`Error eliminando red social ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: true }; // Ya no existía
        }
        return { success: false, error: "No se pudo eliminar la red social." };
    }
}

/**
 * @description Actualiza el orden de las redes sociales de un negocio.
 * @param {RedSocialOrdenData[]} ordenData - Array de objetos { id: string, orden: number }.
 * @returns {Promise<ActionResult>} - Resultado de la operación.
 */
export async function actualizarOrdenRedesSociales(
    ordenData: RedSocialOrdenData[]
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
                prisma.negocioRedSocial.update({
                    where: { id: item.id },
                    data: { orden: index }, // Usar índice del array como nuevo orden
                })
            )
        );

        // Obtener IDs para revalidación (desde el primer item, asumiendo que todas son del mismo negocio)
        if (ordenData[0]?.id) {
            const firstRed = await prisma.negocioRedSocial.findUnique({
                where: { id: ordenData[0].id },
                select: { negocioId: true, negocio: { select: { clienteId: true } } }
            });
            if (firstRed) {
                negocioId = firstRed.negocioId;
                clienteId = firstRed.negocio?.clienteId;
            }
        }

        // Revalidar si tenemos los IDs
        if (negocioId) {
            const basePath = clienteId
                ? `/admin/clientes/${clienteId}/negocios/${negocioId}`
                : `/admin/negocios/${negocioId}`;
            revalidatePath(`${basePath}/editar`);
        }

        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de redes sociales:", error);
        return { success: false, error: "No se pudo guardar el nuevo orden." };
    }
}
