// Ruta: src/app/admin/_lib/promocion.actions.ts (o donde corresponda)
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { Promocion } from './types'; // Ajusta ruta
import { revalidatePath } from 'next/cache'; // Importar revalidatePath para revalidar rutas


// --- NUEVO TIPO: Promoción con Imagen de Portada ---
export type PromocionConPortada = Promocion & {
    imagenPortadaUrl?: string | null; // URL de la primera imagen de la galería
};

// --- ACCIÓN ACTUALIZADA ---

/**
 * Obtiene las promociones de un negocio, incluyendo la URL de la primera imagen de su galería.
 * @param negocioId - El ID del negocio.
 * @returns Array de PromocionConPortada o null si hay error.
 */
export async function obtenerPromocionesNegocio(negocioId: string): Promise<PromocionConPortada[] | null> {
    if (!negocioId) return null;
    try {
        const promociones = await prisma.promocion.findMany({
            where: { negocioId: negocioId },
            include: {
                // Incluir la primera imagen de la galería asociada
                PromocionGaleria: {
                    orderBy: { orden: 'asc' }, // Ordenar para obtener la primera
                    take: 1,                   // Tomar solo una
                    select: {
                        imageUrl: true        // Seleccionar solo la URL
                    }
                }
            },
            orderBy: { fechaInicio: 'desc' }, // Más recientes primero
        });

        // Mapear para añadir la URL de la imagen de portada directamente
        const promocionesConPortada = promociones.map(promo => {
            const { PromocionGaleria, ...rest } = promo; // Exclude PromocionGaleria
            return {
                ...rest,
                imagenPortadaUrl: PromocionGaleria?.[0]?.imageUrl || null,
            };
        });

        return promocionesConPortada;

    } catch (error) {
        console.error(`Error fetching promociones for negocio ${negocioId}:`, error);
        // Devolver null o array vacío según prefieras manejar errores en el frontend
        return null;
        // throw new Error('No se pudieron obtener las promociones.'); // O lanzar error
    }
}

// --- OTRAS ACCIONES (crear, editar, eliminar) ---
// Estas acciones probablemente se moverán a archivos específicos para
// PromocionNuevaForm y PromocionEditarForm, pero las dejamos aquí como referencia por ahora.

interface CrearPromocionInput {
    negocioId: string;
    nombre: string;
    descripcion?: string | null;
    fechaInicio: Date;
    fechaFin: Date;
    status?: string;
}

interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

export async function crearPromocion(data: CrearPromocionInput): Promise<ActionResult<{ id: string }>> {
    // ... (Lógica de validación y creación) ...
    try {
        const nuevaPromo = await prisma.promocion.create({
            data: {
                negocio: { connect: { id: data.negocioId } },
                nombre: data.nombre,
                descripcion: data.descripcion,
                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                status: data.status || 'activo',
            },
            select: { id: true }
        });
        // Revalidar ruta del dashboard de negocios
        revalidatePath(`/admin/negocios/${data.negocioId}`); // Ajusta la ruta
        // Si tienes ruta por cliente:
        // const negocio = await prisma.negocio.findUnique({where: {id: data.negocioId}, select: {clienteId: true}});
        // if (negocio?.clienteId) revalidatePath(`/admin/clientes/${negocio.clienteId}/negocios/${data.negocioId}`);
        return { success: true, data: { id: nuevaPromo.id } };
    } catch (error) {
        console.error("Error creando promoción:", error);
        return { success: false, error: "No se pudo crear la promoción." };
    }
}

export async function editarPromocion(promocionId: string, data: Omit<CrearPromocionInput, 'negocioId'>): Promise<ActionResult> {
    // ... (Lógica de validación y actualización) ...
    try {
        const promo = await prisma.promocion.update({
            where: { id: promocionId },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                status: data.status || 'activo',
            },
            select: { negocioId: true, negocio: { select: { clienteId: true } } } // Obtener IDs para revalidar
        });
        // Revalidar rutas relevantes
        const basePath = promo.negocio?.clienteId
            ? `/admin/clientes/${promo.negocio.clienteId}/negocios/${promo.negocioId}`
            : `/admin/negocios/${promo.negocioId}`;
        revalidatePath(basePath); // Dashboard negocio
        revalidatePath(`${basePath}/promocion/${promocionId}/editar`); // Página editar (si existe)

        return { success: true };
    } catch (error) {
        console.error("Error editando promoción:", error);
        return { success: false, error: "No se pudo editar la promoción." };
    }
}

export async function eliminarPromocion(promocionId: string): Promise<ActionResult> {
    // ... (Lógica de eliminación) ...
    try {
        const promo = await prisma.promocion.findUnique({ where: { id: promocionId }, select: { negocioId: true, negocio: { select: { clienteId: true } } } });
        if (!promo) return { success: true }; // O error si no se encontró

        await prisma.promocion.delete({
            where: { id: promocionId },
        });

        // Revalidar ruta del dashboard de negocios
        const basePath = promo.negocio?.clienteId
            ? `/admin/clientes/${promo.negocio.clienteId}/negocios/${promo.negocioId}`
            : `/admin/negocios/${promo.negocioId}`;
        revalidatePath(basePath);

        return { success: true };
    } catch (error) {
        console.error("Error eliminando promoción:", error);
        return { success: false, error: "No se pudo eliminar la promoción." };
    }
}

export async function obtenerPromocionPorId(promocionId: string): Promise<Promocion | null> {
    if (!promocionId) {
        console.error("obtenerPromocionPorId: ID no proporcionado.");
        return null;
    }
    try {
        const promocion = await prisma.promocion.findUnique({
            where: { id: promocionId },
            // No necesitamos incluir relaciones para el formulario actual,
            // pero podrías añadir 'include' si fuera necesario.
            // include: { negocio: true } // Ejemplo
        });

        if (!promocion) {
            console.warn(`Promoción con ID ${promocionId} no encontrada.`);
            return null;
        }

        return promocion; // Prisma devuelve el tipo Promocion directamente

    } catch (error) {
        console.error(`Error en obtenerPromocionPorId (${promocionId}):`, error);
        return null; // Devolver null en caso de error de base de datos
    }
}
