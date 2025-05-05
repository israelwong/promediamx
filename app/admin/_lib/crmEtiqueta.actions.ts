// // Ejemplo en: @/app/admin/_lib/crmEtiqueta.actions.ts
// 'use server';
// import prisma from './prismaClient'; // Ajusta ruta
// import { EtiquetaCRM } from './types'; // Ajusta ruta
// import { Prisma } from '@prisma/client';

// // --- Obtener Etiquetas para un CRM (ordenadas) ---
// export async function obtenerEtiquetasCRM(negocioId: string): Promise<EtiquetaCRM[]> {
//     if (!negocioId) return [];
//     try {
//         // Obtener el crmId asociado al negocioId
//         const crm = await prisma.cRM.findUnique({
//             where: { negocioId },
//             select: { id: true },
//         });

//         if (!crm) {
//             console.error(`No se encontró un CRM para el negocioId ${negocioId}`);
//             return [];
//         }

//         const etiquetas = await prisma.etiquetaCRM.findMany({
//             where: { crmId: crm.id },
//             orderBy: { orden: 'asc' }, // Ordenar por 'orden'
//         });
//         return etiquetas as EtiquetaCRM[];
//     } catch (error) {
//         console.error(`Error fetching etiquetas for negocioId ${negocioId}:`, error);
//         throw new Error('No se pudieron obtener las etiquetas.');
//     }
// }

// // --- Crear una nueva Etiqueta ---
// export async function crearEtiquetaCRM(
//     data: Pick<EtiquetaCRM, 'crmId' | 'nombre' | 'color'> // Incluir color
// ): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
//     try {
//         if (!data.crmId || !data.nombre?.trim()) {
//             return { success: false, error: "crmId y nombre son requeridos." };
//         }
//         const ultimoOrden = await prisma.etiquetaCRM.aggregate({
//             _max: { orden: true },
//             where: { crmId: data.crmId },
//         });
//         const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

//         const newEtiqueta = await prisma.etiquetaCRM.create({
//             data: {
//                 crmId: data.crmId,
//                 nombre: data.nombre.trim(),
//                 color: data.color || null, // Guardar color o null
//                 orden: nuevoOrden,
//                 status: 'activo',
//             },
//         });
//         return { success: true, data: newEtiqueta as EtiquetaCRM };
//     } catch (error) {
//         console.error('Error creating etiqueta:', error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
//             return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
//         }
//         return { success: false, error: (error as Error).message || "Error desconocido al crear etiqueta." };
//     }
// }

// // --- Editar una Etiqueta (nombre, color, status) ---
// export async function editarEtiquetaCRM(
//     id: string,
//     data: Partial<Pick<EtiquetaCRM, 'nombre' | 'color' | 'status'>>
// ): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

//         const dataToUpdate: Prisma.EtiquetaCRMUpdateInput = {};
//         if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
//         if (data.color !== undefined) dataToUpdate.color = data.color || null; // Permitir quitar color
//         if (data.status !== undefined) dataToUpdate.status = data.status;

//         if (Object.keys(dataToUpdate).length === 0) {
//             return { success: false, error: "No hay datos para actualizar." };
//         }

//         const updatedEtiqueta = await prisma.etiquetaCRM.update({
//             where: { id },
//             data: dataToUpdate,
//         });
//         return { success: true, data: updatedEtiqueta as EtiquetaCRM };
//     } catch (error) {
//         console.error(`Error updating etiqueta ${id}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
//             return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
//         }
//         return { success: false, error: (error as Error).message || "Error desconocido al editar etiqueta." };
//     }
// }

// // --- Eliminar una Etiqueta (Cascade debería eliminar LeadEtiqueta) ---
// export async function eliminarEtiquetaCRM(id: string): Promise<{ success: boolean; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };
//         // La relación en LeadEtiqueta tiene onDelete: Cascade, por lo que se borrarán las asociaciones
//         await prisma.etiquetaCRM.delete({ where: { id } });
//         return { success: true };
//     } catch (error) {
//         console.error(`Error deleting etiqueta ${id}:`, error);
//         // Podría fallar si hay otras restricciones inesperadas
//         return { success: false, error: (error as Error).message || "Error desconocido al eliminar etiqueta." };
//     }
// }

// // --- Ordenar Etiquetas ---
// export async function ordenarEtiquetasCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
//     if (!items || items.length === 0) return { success: true };
//     try {
//         const updatePromises = items.map(item =>
//             prisma.etiquetaCRM.update({
//                 where: { id: item.id },
//                 data: { orden: item.orden },
//             })
//         );
//         await prisma.$transaction(updatePromises);
//         return { success: true };
//     } catch (error) {
//         console.error("Error updating etiqueta order:", error);
//         return { success: false, error: (error as Error).message || "Error desconocido al ordenar etiquetas." };
//     }
// }

// // --- Tipo EtiquetaCRM (Asegúrate que coincida con tu schema) ---
// /*
// export interface EtiquetaCRM {
//     id: string;
//     crmId: string;
//     crm?: CRM | null;
//     orden?: number | null;
//     nombre: string;
//     color?: string | null; // Campo para color
//     status: string;
//     createdAt: Date;
//     updatedAt: Date;
//     Leads?: LeadEtiqueta[]; // Relación con tabla intermedia
// }
// */


// app/admin/_lib/crmEtiqueta.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { EtiquetaCRM } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Tipo de Retorno para obtenerEtiquetasCRM ---
interface ObtenerEtiquetasResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        etiquetas: EtiquetaCRM[];
    } | null;
    error?: string;
}

/**
 * Obtiene el ID del CRM asociado a un negocio y todas sus etiquetas.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y la lista de etiquetas.
 */
export async function obtenerEtiquetasCRM(negocioId: string): Promise<ObtenerEtiquetasResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        // Obtener el crmId y las etiquetas en una consulta
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true, // ID del CRM
                        Etiqueta: { // Etiquetas asociadas al CRM
                            orderBy: { orden: 'asc' }, // Ordenar por 'orden'
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;
        const etiquetas = (negocioConCRM?.CRM?.Etiqueta ?? []) as EtiquetaCRM[];

        return {
            success: true,
            data: {
                crmId: crmId,
                etiquetas: etiquetas
            }
        };

    } catch (error) {
        console.error(`Error fetching etiquetas for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener las etiquetas.' };
    }
}

/**
 * Crea una nueva Etiqueta para un CRM específico.
 * @param data - Datos de la etiqueta a crear (crmId, nombre, color).
 * @returns Objeto con el resultado de la operación y la etiqueta creada si tuvo éxito.
 */
export async function crearEtiquetaCRM(
    // Incluir color opcional
    data: Pick<EtiquetaCRM, 'crmId' | 'nombre'> & { color?: string | null }
): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim()) {
            return { success: false, error: "crmId y nombre son requeridos." };
        }
        // Calcular el siguiente orden
        const ultimoOrden = await prisma.etiquetaCRM.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        // Crear etiqueta
        const newEtiqueta = await prisma.etiquetaCRM.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                color: data.color || null, // Guardar color o null
                orden: nuevoOrden,
                status: 'activo', // Status por defecto
            },
        });
        return { success: true, data: newEtiqueta as EtiquetaCRM };
    } catch (error) {
        console.error('Error creating etiqueta:', error);
        // Manejar error de unicidad (asume índice unique(crmId, nombre))
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear etiqueta." };
    }
}

/**
 * Edita una Etiqueta existente (nombre, color, status).
 * @param id - ID de la etiqueta a editar.
 * @param data - Datos a actualizar (nombre, color, status).
 * @returns Objeto con el resultado de la operación y la etiqueta actualizada si tuvo éxito.
 */
export async function editarEtiquetaCRM(
    id: string,
    data: Partial<Pick<EtiquetaCRM, 'nombre' | 'color' | 'status'>>
): Promise<{ success: boolean; data?: EtiquetaCRM; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

        const dataToUpdate: Prisma.EtiquetaCRMUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        // Permitir establecer color a null para quitarlo
        if (data.color !== undefined) dataToUpdate.color = data.color || null;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        // Actualizar etiqueta
        const updatedEtiqueta = await prisma.etiquetaCRM.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedEtiqueta as EtiquetaCRM };
    } catch (error) {
        console.error(`Error updating etiqueta ${id}:`, error);
        // Manejar error de unicidad si se edita el nombre
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if ((error.meta?.target as string[])?.includes('nombre')) {
                return { success: false, error: `El nombre de etiqueta '${data.nombre}' ya existe para este CRM.` };
            }
            return { success: false, error: `Ya existe una etiqueta con un nombre similar.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar etiqueta." };
    }
}

/**
 * Elimina una Etiqueta por su ID.
 * @param id - ID de la etiqueta a eliminar.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function eliminarEtiquetaCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de etiqueta no proporcionado." };

        // La relación en LeadEtiqueta tiene onDelete: Cascade por defecto en Prisma
        // si no se especifica lo contrario, por lo que las asociaciones se borrarán.
        await prisma.etiquetaCRM.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting etiqueta ${id}:`, error);
        // P2003/P2014 no deberían ocurrir si LeadEtiqueta es la única dependencia y usa Cascade.
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar etiqueta." };
    }
}

/**
 * Actualiza el orden de múltiples etiquetas.
 * @param items - Array de objetos con id y nuevo orden para cada etiqueta.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function ordenarEtiquetasCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || !Array.isArray(items)) {
        return { success: false, error: "Datos de ordenamiento inválidos." };
    }
    if (items.length === 0) {
        return { success: true }; // Nada que ordenar
    }
    try {
        const updatePromises = items.map(item => {
            if (!item.id || typeof item.orden !== 'number') {
                throw new Error(`Item de ordenamiento inválido: ${JSON.stringify(item)}`);
            }
            return prisma.etiquetaCRM.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        });
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating etiqueta order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar etiquetas." };
    }
}

