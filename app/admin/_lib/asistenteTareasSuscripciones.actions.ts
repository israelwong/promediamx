'use server'
import prisma from './prismaClient'

import { AsistenteTareaSuscripcion, TareaSuscripcionDetalles, EtiquetaTarea } from './types'
import { revalidatePath } from 'next/cache';


// --- Acción obtenerSuscripcionesAsistenteTareas (Asegúrate que incluya tarea) ---
export async function obtenerSuscripcionesAsistenteTareas(asistenteId: string): Promise<AsistenteTareaSuscripcion[]> {
    if (!asistenteId) return [];
    try {
        const suscripciones = await prisma.asistenteTareaSuscripcion.findMany({
            where: {
                asistenteVirtualId: asistenteId,
                // status: 'activo' // Puedes filtrar aquí o en el frontend
            },
            include: {
                tarea: { // Asegúrate de incluir los detalles de la tarea
                    select: { id: true, nombre: true, descripcion: true, precio: true }
                }
            },
            orderBy: { // Ordenar opcionalmente
                tarea: { nombre: 'asc' }
            }
        });
        return suscripciones as AsistenteTareaSuscripcion[]; // Ajustar tipo si es necesario
    } catch (error) {
        console.error(`Error fetching suscripciones for asistente ${asistenteId}:`, error);
        throw new Error('No se pudieron obtener las suscripciones.');
    }
}

export async function crearSuscripcionAsistenteTarea(asistenteTareaSuscripcion: AsistenteTareaSuscripcion) {
    //necesitamos crear la logica para automarizar el calculo de la fecha de fechaDesuscripcion
    const nuevoAsistenteTareaSuscripcion = await prisma.asistenteTareaSuscripcion.create({
        data: {
            asistenteVirtualId: asistenteTareaSuscripcion.asistenteVirtualId,
            tareaId: asistenteTareaSuscripcion.tareaId,
            fechaSuscripcion: asistenteTareaSuscripcion.fechaSuscripcion ?? new Date(),
            fechaDesuscripcion: asistenteTareaSuscripcion.fechaDesuscripcion ?? null,
            montoSuscripcion: asistenteTareaSuscripcion.montoSuscripcion ?? null,
            status: asistenteTareaSuscripcion.status ?? 'activo',
        }
    })
    return nuevoAsistenteTareaSuscripcion
}

// --- Acción para Cancelar una Suscripción ---
export async function cancelarSuscripcionAsistenteTarea(
    suscripcionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!suscripcionId) {
            return { success: false, error: "ID de suscripción no proporcionado." };
        }

        // Actualizar el status y la fecha de desuscripción
        await prisma.asistenteTareaSuscripcion.update({
            where: { id: suscripcionId },
            data: {
                status: 'inactivo', // O 'cancelado' según tu lógica
                fechaDesuscripcion: new Date(),
            },
        });

        return { success: true };
    } catch (error) {
        console.error(`Error cancelling subscription ${suscripcionId}:`, error);
        return { success: false, error: (error as Error).message || "Error desconocido al cancelar suscripción." };
    }
}

export async function actualizarSuscripcionAsistenteTarea(asistenteTareaSuscripcionId: string, asistenteTareaSuscripcion: AsistenteTareaSuscripcion) {
    const asistenteTareaSuscripcionActualizado = await prisma.asistenteTareaSuscripcion.update({
        where: {
            id: asistenteTareaSuscripcionId
        },
        data: {
            fechaSuscripcion: asistenteTareaSuscripcion.fechaSuscripcion,
            fechaDesuscripcion: asistenteTareaSuscripcion.fechaDesuscripcion,
            montoSuscripcion: asistenteTareaSuscripcion.montoSuscripcion,
            status: asistenteTareaSuscripcion.status
        }
    })
    return asistenteTareaSuscripcionActualizado
}
export async function validarSuscripcion(asistenteVirtualId: string, tareaId: string) {
    const suscripcionExistente = await prisma.asistenteTareaSuscripcion.findFirst({
        where: {
            asistenteVirtualId,
            tareaId
        },
        select: {
            id: true
        }
    })
    return suscripcionExistente ? suscripcionExistente.id : null
}


export interface TareaSuscritaDetalle {
    suscripcionId: string; // ID de AsistenteTareaSuscripcion
    tarea: {
        id: string;
        nombre: string;
        descripcion: string | null;
        precio: number | null; // Precio original de la tarea
    };
    montoSuscripcion: number | null; // Monto específico de esta suscripción (puede ser 0)
    ejecuciones: number; // Conteo de TareaEjecutada
}

export async function obtenerTareasSuscritasDetalladas(asistenteId: string): Promise<TareaSuscritaDetalle[]> {
    if (!asistenteId) return [];
    try {
        const suscripciones = await prisma.asistenteTareaSuscripcion.findMany({
            where: {
                asistenteVirtualId: asistenteId,
                status: 'activo', // Solo suscripciones activas
            },
            select: {
                id: true,
                montoSuscripcion: true,
                tarea: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcion: true,
                        precio: true, // Seleccionar precio original para referencia
                        // Contar las ejecuciones para esta tarea y este asistente
                        _count: {
                            select: {
                                TareaEjecutada: {
                                    where: { asistenteVirtualId: asistenteId }
                                }
                            }
                        }
                    }
                }
            },
            // Opcional: Ordenar por nombre de tarea
            orderBy: {
                tarea: {
                    nombre: 'asc'
                }
            }
        });

        // Mapear el resultado al formato deseado
        return suscripciones.map(s => ({
            suscripcionId: s.id,
            tarea: {
                id: s.tarea.id,
                nombre: s.tarea.nombre,
                descripcion: s.tarea.descripcion,
                precio: s.tarea.precio,
            },
            montoSuscripcion: s.montoSuscripcion,
            ejecuciones: s.tarea._count.TareaEjecutada,
        }));

    } catch (error) {
        console.error(`Error al obtener tareas suscritas para asistente ${asistenteId}:`, error);
        return []; // Devolver vacío en caso de error
    }
}


/**
 * Obtiene los detalles de una Tarea y el estado de suscripción
 * específico para un Asistente Virtual.
 */
// export async function obtenerDetallesSuscripcionTarea(
//     asistenteId: string,
//     tareaId: string
// ): Promise<TareaSuscripcionDetalles | null> {
//     if (!asistenteId || !tareaId) {
//         console.error("obtenerDetallesSuscripcionTarea: Faltan IDs.");
//         return null;
//     }

//     try {
//         const tarea = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 iconoUrl: true,
//             }
//         });

//         if (!tarea) {
//             console.error(`Tarea con ID ${tareaId} no encontrada.`);
//             return null; // O lanzar error 'Tarea no encontrada'
//         }

//         const suscripcion = await prisma.asistenteTareaSuscripcion.findUnique({
//             where: {
//                 // Usar el índice unique compuesto
//                 asistenteVirtualId_tareaId: {
//                     asistenteVirtualId: asistenteId,
//                     tareaId: tareaId,
//                 }
//             },
//             select: {
//                 id: true,
//                 status: true,
//                 montoSuscripcion: true,
//                 fechaSuscripcion: true,
//                 fechaDesuscripcion: true,
//             }
//         });

//         return {
//             tarea: {
//                 ...tarea,
//                 iconoUrl: tarea.iconoUrl ?? undefined, // Convert null to undefined
//             },
//             suscripcion: suscripcion // Puede ser null si no hay registro de suscripción
//         };

//     } catch (error) {
//         console.error(`Error obteniendo detalles de suscripción para tarea ${tareaId} y asistente ${asistenteId}:`, error);
//         // Podrías lanzar el error para manejarlo en el componente
//         throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
//         // O devolver null
//         // return null;
//     }
// }

// export async function obtenerDetallesSuscripcionTarea(
//     asistenteId: string,
//     tareaId: string
// ): Promise<TareaSuscripcionDetalles | null> {
//     if (!asistenteId || !tareaId) {
//         console.error("obtenerDetallesSuscripcionTarea: Faltan IDs.");
//         return null;
//     }

//     try {
//         // Usar una sola consulta para obtener todo
//         const tareaConDetalles = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 iconoUrl: true,
//                 // Incluir la galería ordenada
//                 TareaGaleria: {
//                     select: {
//                         id: true,
//                         imageUrl: true,
//                         altText: true,
//                         descripcion: true,
//                         // orden: true // Seleccionar si necesitas ordenar aquí específicamente
//                     },
//                     orderBy: {
//                         orden: 'asc' // Ordenar por el campo 'orden'
//                     }
//                 },
//                 // Incluir la suscripción específica si existe
//                 AsistenteTareaSuscripcion: {
//                     where: {
//                         asistenteVirtualId: asistenteId
//                         // Opcional: filtrar por status si solo quieres la activa/inactiva más reciente
//                         // status: 'activo'
//                     },
//                      select: {
//                         id: true,
//                         status: true,
//                         montoSuscripcion: true,
//                         fechaSuscripcion: true,
//                         fechaDesuscripcion: true,
//                     },
//                     take: 1 // Tomar solo una (la más relevante si hubiera múltiples por error)
//                 }
//             }
//         });


//         if (!tareaConDetalles) {
//             console.error(`Tarea con ID ${tareaId} no encontrada.`);
//             return null;
//         }

//         // Mapear al tipo final
//         const resultado: TareaSuscripcionDetalles = {
//             tarea: {
//                 id: tareaConDetalles.id,
//                 nombre: tareaConDetalles.nombre,
//                 descripcion: tareaConDetalles.descripcion,
//                 precio: tareaConDetalles.precio,
//                 iconoUrl: tareaConDetalles.iconoUrl ?? undefined,
//                 TareaGaleria: tareaConDetalles.TareaGaleria.map(galeria => ({
//                     ...galeria,
//                     descripcion: galeria.descripcion ?? undefined, // Convert null to undefined
//                     altText: galeria.altText ?? undefined, // Convert null to undefined
//                 })), // Ya está seleccionado y ordenado
//             },
//             // Tomar la primera (y única esperada) suscripción encontrada
//             suscripcion: tareaConDetalles.AsistenteTareaSuscripcion?.[0] || null
//         };

//         return resultado;

//     } catch (error) {
//         console.error(`Error obteniendo detalles suscripción tarea ${tareaId}, asistente ${asistenteId}:`, error);
//         throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
//     }
// }

/**
 * Cancela (desactiva) una suscripción existente de un asistente a una tarea.
 */
// export async function cancelarSuscripcionTarea(
//     suscripcionId: string,
//     // Pasamos IDs adicionales para revalidación
//     clienteId: string,
//     negocioId: string,
//     asistenteId: string,
//     tareaId: string
// ): Promise<{ success: boolean; error?: string }> {
//     if (!suscripcionId) {
//         return { success: false, error: "ID de suscripción no proporcionado." };
//     }
//     try {
//         await prisma.asistenteTareaSuscripcion.update({
//             where: { id: suscripcionId },
//             data: {
//                 status: 'inactivo', // O 'cancelado' según tu lógica
//                 fechaDesuscripcion: new Date(),
//             }
//         });

//         // Revalidar rutas relevantes
//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         revalidatePath(`/admin/IA/marketplace`); // Revalidar marketplace por si cambia estado

//         return { success: true };
//     } catch (error) {
//         console.error(`Error al cancelar suscripción ${suscripcionId}:`, error);
//         return { success: false, error: `Error al cancelar: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }

/**
 * Crea una nueva suscripción o reactiva una existente para un asistente a una tarea.
 */
// export async function crearOreactivarSuscripcionTarea(
//     asistenteId: string,
//     tareaId: string,
//     // Pasamos IDs adicionales para revalidación
//     clienteId: string,
//     negocioId: string
// ): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
//     if (!asistenteId || !tareaId) {
//         return { success: false, error: "Faltan IDs de asistente o tarea." };
//     }
//     try {
//         // 1. Obtener el precio base de la tarea para usarlo como monto de suscripción
//         const tareaInfo = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: { precio: true }
//         });

//         if (!tareaInfo) {
//             return { success: false, error: "Tarea no encontrada." };
//         }

//         const monto = tareaInfo.precio ?? 0; // Usar 0 si el precio es null

//         // 2. Usar upsert: crea si no existe, actualiza si existe
//         const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({
//             where: {
//                 asistenteVirtualId_tareaId: {
//                     asistenteVirtualId: asistenteId,
//                     tareaId: tareaId,
//                 }
//             },
//             // Datos para actualizar si ya existe (reactivar)
//             update: {
//                 status: 'activo',
//                 montoSuscripcion: monto, // Actualizar monto por si cambió en la tarea
//                 fechaDesuscripcion: null, // Limpiar fecha de desuscripción
//                 // fechaSuscripcion no se actualiza al reactivar
//             },
//             // Datos para crear si no existe
//             create: {
//                 asistenteVirtualId: asistenteId,
//                 tareaId: tareaId,
//                 montoSuscripcion: monto,
//                 status: 'activo',
//                 // fechaSuscripcion es default now()
//             }
//         });

//         // Revalidar rutas relevantes
//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         revalidatePath(`/admin/IA/marketplace`);

//         return { success: true, data: { id: suscripcion.id } };

//     } catch (error) {
//         console.error(`Error al suscribir/reactivar tarea ${tareaId} para asistente ${asistenteId}:`, error);
//         return { success: false, error: `Error al suscribir: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }

// export async function obtenerDetallesSuscripcionTarea(
//     asistenteId: string, // Se recibe aunque pueda estar vacío
//     tareaId: string
// ): Promise<TareaSuscripcionDetalles | null> {
//     if (!tareaId) {
//         console.error("obtenerDetallesSuscripcionTarea: Falta ID de tarea.");
//         return null;
//     }

//     try {
//         const tareaConDetalles = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 iconoUrl: true,
//                 TareaGaleria: { // Incluir galería
//                     select: {
//                         id: true,
//                         imageUrl: true,
//                         altText: true,
//                         descripcion: true,
//                     },
//                     orderBy: { orden: 'asc' }
//                 },
//                 // Incluir suscripción solo si asistenteId tiene valor
//                 AsistenteTareaSuscripcion: asistenteId ? {
//                     where: { asistenteVirtualId: asistenteId },
//                     select: {
//                         id: true,
//                         status: true,
//                         montoSuscripcion: true,
//                         fechaSuscripcion: true,
//                         fechaDesuscripcion: true,
//                     },
//                     take: 1
//                 } : undefined // No incluir si no hay asistenteId
//             }
//         });

//         if (!tareaConDetalles) {
//             console.error(`Tarea con ID ${tareaId} no encontrada.`);
//             return null;
//         }

//         // Mapear al tipo final
//         const resultado: TareaSuscripcionDetalles = {
//             tarea: {
//                 id: tareaConDetalles.id,
//                 nombre: tareaConDetalles.nombre,
//                 descripcion: tareaConDetalles.descripcion,
//                 precio: tareaConDetalles.precio,
//                 iconoUrl: tareaConDetalles.iconoUrl ?? undefined,
//                 TareaGaleria: tareaConDetalles.TareaGaleria.map(galeria => ({
//                     ...galeria,
//                     descripcion: galeria.descripcion ?? undefined,
//                     altText: galeria.altText ?? undefined,
//                 })),
//             },
//             // Tomar la suscripción si se incluyó en la consulta
//             suscripcion: asistenteId ? (tareaConDetalles.AsistenteTareaSuscripcion?.[0] || null) : null
//         };

//         return resultado;

//     } catch (error) {
//         console.error(`Error obteniendo detalles suscripción tarea ${tareaId}, asistente ${asistenteId}:`, error);
//         throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
//     }
// }

// /**
//  * Cancela (desactiva) una suscripción existente de un asistente a una tarea.
//  * Obtiene internamente clienteId y negocioId para revalidación.
//  * @param suscripcionId - El ID del registro AsistenteTareaSuscripcion a actualizar.
//  * @param asistenteId - El ID del Asistente para buscar cliente/negocio.
//  * @param tareaId - El ID de la Tarea para revalidación.
//  * @returns Objeto con success o error.
//  */
// export async function cancelarSuscripcionTarea(
//     suscripcionId: string,
//     asistenteId: string,
//     tareaId: string
// ): Promise<{ success: boolean; error?: string }> {
//     if (!suscripcionId || !asistenteId || !tareaId) {
//         return { success: false, error: "Faltan IDs requeridos (suscripción, asistente, tarea)." };
//     }
//     try {
//         // Obtener clienteId y negocioId para revalidación
//         const asistente = await prisma.asistenteVirtual.findUnique({
//             where: { id: asistenteId },
//             select: { clienteId: true, negocioId: true }
//         });
//         if (!asistente?.clienteId || !asistente.negocioId) {
//             // Podríamos continuar sin revalidar o lanzar error
//             console.warn(`No se encontró cliente/negocio para asistente ${asistenteId}. La revalidación podría ser incompleta.`);
//             // throw new Error("No se pudo encontrar la información del cliente/negocio.");
//         }
//         const { clienteId, negocioId } = asistente || { clienteId: null, negocioId: null }; // Usar null si no se encontraron

//         // Actualizar la suscripción
//         await prisma.asistenteTareaSuscripcion.update({
//             where: { id: suscripcionId },
//             data: {
//                 status: 'inactivo',
//                 fechaDesuscripcion: new Date(),
//             }
//         });

//         // Revalidar rutas (solo si tenemos los IDs)
//         if (clienteId && negocioId) {
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         }
//         revalidatePath(`/admin/IA/marketplace`); // Revalidar siempre marketplace

//         return { success: true };
//     } catch (error) {
//         console.error(`Error al cancelar suscripción ${suscripcionId}:`, error);
//         return { success: false, error: `Error al cancelar: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }

/**
 * Crea una nueva suscripción o reactiva una existente para un asistente a una tarea.
 * Obtiene internamente clienteId y negocioId para revalidación.
 * @param asistenteId - El ID del Asistente.
 * @param tareaId - El ID de la Tarea.
 * @returns Objeto con success, ID de suscripción o error.
 */
// export async function crearOreactivarSuscripcionTarea(
//     asistenteId: string,
//     tareaId: string
// ): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
//     if (!asistenteId || !tareaId) {
//         return { success: false, error: "Faltan IDs de asistente o tarea." };
//     }
//     try {
//         // Obtener información necesaria (precio tarea, clienteId, negocioId)
//         const [tareaInfo, asistenteInfo] = await Promise.all([
//             prisma.tarea.findUnique({
//                 where: { id: tareaId },
//                 select: { precio: true }
//             }),
//             prisma.asistenteVirtual.findUnique({
//                 where: { id: asistenteId },
//                 select: { clienteId: true, negocioId: true }
//             })
//         ]);

//         if (!tareaInfo) return { success: false, error: "Tarea no encontrada." };
//         if (!asistenteInfo?.clienteId || !asistenteInfo.negocioId) {
//             console.warn(`No se encontró cliente/negocio para asistente ${asistenteId}. Revalidación incompleta.`);
//         }

//         const monto = tareaInfo.precio ?? 0;
//         const { clienteId, negocioId } = asistenteInfo || { clienteId: null, negocioId: null };

//         // Usar upsert para crear o actualizar
//         const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({
//             where: { asistenteVirtualId_tareaId: { asistenteVirtualId: asistenteId, tareaId: tareaId } },
//             update: { status: 'activo', montoSuscripcion: monto, fechaDesuscripcion: null },
//             create: { asistenteVirtualId: asistenteId, tareaId: tareaId, montoSuscripcion: monto, status: 'activo' }
//         });

//         // Revalidar rutas
//         if (clienteId && negocioId) {
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         }
//         revalidatePath(`/admin/IA/marketplace`);

//         return { success: true, data: { id: suscripcion.id } };

//     } catch (error) {
//         console.error(`Error al suscribir/reactivar tarea ${tareaId} para asistente ${asistenteId}:`, error);
//         return { success: false, error: `Error al suscribir: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }

////////////

// export async function obtenerDetallesSuscripcionTarea(
//     asistenteId: string, // Se recibe aunque pueda estar vacío
//     tareaId: string
// ): Promise<TareaSuscripcionDetalles | null> {
//     if (!tareaId) {
//         console.error("obtenerDetallesSuscripcionTarea: Falta ID de tarea.");
//         return null;
//     }

//     try {
//         const tareaConDetalles = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 iconoUrl: true,
//                 // --- Incluir Categoría ---
//                 CategoriaTarea: {
//                     select: {
//                         nombre: true,
//                         color: true // Asegúrate que este campo exista en tu schema CategoriaTarea
//                     }
//                 },
//                 // --- Incluir Etiquetas ---
//                 etiquetas: {
//                     select: {
//                         etiquetaTarea: {
//                             select: {
//                                 id: true,
//                                 nombre: true
//                             }
//                         }
//                     }
//                 },
//                 // ----------------------
//                 TareaGaleria: { // Incluir galería
//                     select: {
//                         id: true,
//                         imageUrl: true,
//                         altText: true,
//                         descripcion: true,
//                     },
//                     orderBy: { orden: 'asc' }
//                 },
//                 // Incluir suscripción solo si asistenteId tiene valor
//                 AsistenteTareaSuscripcion: asistenteId ? {
//                     where: { asistenteVirtualId: asistenteId },
//                     select: {
//                         id: true,
//                         status: true,
//                         montoSuscripcion: true,
//                         fechaSuscripcion: true,
//                         fechaDesuscripcion: true,
//                     },
//                     take: 1
//                 } : undefined // No incluir si no hay asistenteId
//             }
//         });

//         if (!tareaConDetalles) {
//             console.error(`Tarea con ID ${tareaId} no encontrada.`);
//             return null;
//         }

//         // Mapear al tipo final, incluyendo categoría y etiquetas
//         const resultado: TareaSuscripcionDetalles = {
//             tarea: {
//                 id: tareaConDetalles.id,
//                 nombre: tareaConDetalles.nombre,
//                 descripcion: tareaConDetalles.descripcion,
//                 precio: tareaConDetalles.precio,
//                 iconoUrl: tareaConDetalles.iconoUrl ?? undefined,
//                 TareaGaleria: tareaConDetalles.TareaGaleria.map(galeria => ({
//                     ...galeria,
//                     descripcion: galeria.descripcion ?? undefined,
//                     altText: galeria.altText ?? undefined,
//                 })),
//                 // --- Añadir categoría y etiquetas al objeto tarea ---
//                 CategoriaTarea: tareaConDetalles.CategoriaTarea,
//                 // Mapear etiquetas para obtener un array limpio de objetos EtiquetaTarea
//                 etiquetas: tareaConDetalles.etiquetas
//                                 .map(et => et.etiquetaTarea) // Extraer el objeto etiquetaTarea
//                                 .filter(et => et !== null) as Pick<EtiquetaTarea, 'id' | 'nombre'>[] // Filtrar nulos y asegurar tipo
//                 // -------------------------------------------------
//             },
//             suscripcion: asistenteId ? (tareaConDetalles.AsistenteTareaSuscripcion?.[0] || null) : null
//         };

//         return resultado;

//     } catch (error) {
//         console.error(`Error obteniendo detalles suscripción tarea ${tareaId}, asistente ${asistenteId}:`, error);
//         throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
//     }
// }

// /**
//  * Cancela (desactiva) una suscripción existente de un asistente a una tarea.
//  * Obtiene internamente clienteId y negocioId para revalidación.
//  * @param suscripcionId - El ID del registro AsistenteTareaSuscripcion a actualizar.
//  * @param asistenteId - El ID del Asistente para buscar cliente/negocio.
//  * @param tareaId - El ID de la Tarea para revalidación.
//  * @returns Objeto con success o error.
//  */
// export async function cancelarSuscripcionTarea(
//     suscripcionId: string,
//     asistenteId: string,
//     tareaId: string
// ): Promise<{ success: boolean; error?: string }> {
//     if (!suscripcionId || !asistenteId || !tareaId) {
//         return { success: false, error: "Faltan IDs requeridos (suscripción, asistente, tarea)." };
//     }
//     try {
//         // Obtener clienteId y negocioId para revalidación
//         const asistente = await prisma.asistenteVirtual.findUnique({
//             where: { id: asistenteId },
//             select: { clienteId: true, negocioId: true }
//         });
//         if (!asistente?.clienteId || !asistente.negocioId) {
//              console.warn(`No se encontró cliente/negocio para asistente ${asistenteId}. La revalidación podría ser incompleta.`);
//         }
//         const { clienteId, negocioId } = asistente || { clienteId: null, negocioId: null };

//         // Actualizar la suscripción
//         await prisma.asistenteTareaSuscripcion.update({
//             where: { id: suscripcionId },
//             data: {
//                 status: 'inactivo',
//                 fechaDesuscripcion: new Date(),
//             }
//         });

//         // Revalidar rutas
//         if (clienteId && negocioId) {
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         }
//         revalidatePath(`/admin/IA/marketplace`);

//         return { success: true };
//     } catch (error) {
//         console.error(`Error al cancelar suscripción ${suscripcionId}:`, error);
//         return { success: false, error: `Error al cancelar: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }

// /**
//  * Crea una nueva suscripción o reactiva una existente para un asistente a una tarea.
//  * Obtiene internamente clienteId y negocioId para revalidación.
//  * @param asistenteId - El ID del Asistente.
//  * @param tareaId - El ID de la Tarea.
//  * @returns Objeto con success, ID de suscripción o error.
//  */
// export async function crearOreactivarSuscripcionTarea(
//     asistenteId: string,
//     tareaId: string
// ): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
//      if (!asistenteId || !tareaId) {
//         return { success: false, error: "Faltan IDs de asistente o tarea." };
//     }
//     try {
//         // Obtener información necesaria
//         const [tareaInfo, asistenteInfo] = await Promise.all([
//             prisma.tarea.findUnique({ where: { id: tareaId }, select: { precio: true } }),
//             prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { clienteId: true, negocioId: true } })
//         ]);

//         if (!tareaInfo) return { success: false, error: "Tarea no encontrada." };
//         if (!asistenteInfo?.clienteId || !asistenteInfo.negocioId) {
//             console.warn(`No se encontró cliente/negocio para asistente ${asistenteId}. Revalidación incompleta.`);
//         }

//         const monto = tareaInfo.precio ?? 0;
//         const { clienteId, negocioId } = asistenteInfo || { clienteId: null, negocioId: null };

//         // Usar upsert
//         const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({
//             where: { asistenteVirtualId_tareaId: { asistenteVirtualId: asistenteId, tareaId: tareaId } },
//             update: { status: 'activo', montoSuscripcion: monto, fechaDesuscripcion: null },
//             create: { asistenteVirtualId: asistenteId, tareaId: tareaId, montoSuscripcion: monto, status: 'activo' }
//         });

//         // Revalidar rutas
//         if (clienteId && negocioId) {
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
//             revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
//         }
//         revalidatePath(`/admin/IA/marketplace`);

//         return { success: true, data: { id: suscripcion.id } };

//     } catch (error) {
//         console.error(`Error al suscribir/reactivar tarea ${tareaId} para asistente ${asistenteId}:`, error);
//         return { success: false, error: `Error al suscribir: ${error instanceof Error ? error.message : String(error)}` };
//     }
// }


/**
 * Obtiene los detalles de una Tarea (incluyendo galería, categoría y etiquetas)
 * y el estado de suscripción específico para un Asistente Virtual.
 * @param asistenteId - El ID del Asistente Virtual (puede ser string vacío si no hay contexto).
 * @param tareaId - El ID de la Tarea.
 * @returns Objeto con detalles o null si la tarea no se encuentra.
 * @throws Error si ocurre un problema de base de datos.
 */
// export async function obtenerDetallesSuscripcionTarea(
//     asistenteId: string, // Se recibe aunque pueda estar vacío
//     tareaId: string
// ): Promise<TareaSuscripcionDetalles | null> {
//     if (!tareaId) {
//         console.error("obtenerDetallesSuscripcionTarea: Falta ID de tarea.");
//         return null;
//     }

//     try {
//         const tareaConDetalles = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             // Seleccionar todos los campos necesarios
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 iconoUrl: true,
//                 CategoriaTarea: {
//                     select: {
//                         nombre: true,
//                         color: true
//                     }
//                 },
//                 etiquetas: {
//                     select: {
//                         etiquetaTarea: {
//                             select: {
//                                 id: true,
//                                 nombre: true
//                             }
//                         }
//                     }
//                 },
//                 TareaGaleria: {
//                     select: {
//                         id: true,
//                         imageUrl: true,
//                         altText: true,
//                         descripcion: true,
//                     },
//                     orderBy: { orden: 'asc' }
//                 },
//                 AsistenteTareaSuscripcion: asistenteId ? {
//                     where: { asistenteVirtualId: asistenteId },
//                     select: {
//                         id: true,
//                         status: true,
//                         montoSuscripcion: true,
//                         fechaSuscripcion: true,
//                         fechaDesuscripcion: true,
//                     },
//                     take: 1
//                 } : undefined
//             }
//         });

//         if (!tareaConDetalles) {
//             console.error(`Tarea con ID ${tareaId} no encontrada.`);
//             return null;
//         }

//         // Construir el objeto 'tarea' explícitamente
//         const tareaData: TareaSuscripcionDetalles['tarea'] = {
//             id: tareaConDetalles.id,
//             nombre: tareaConDetalles.nombre,
//             descripcion: tareaConDetalles.descripcion,
//             precio: tareaConDetalles.precio,
//             iconoUrl: tareaConDetalles.iconoUrl ?? undefined,
//             TareaGaleria: tareaConDetalles.TareaGaleria.map(g => ({
//                 id: g.id,
//                 imageUrl: g.imageUrl,
//                 altText: g.altText ?? undefined, // Convert null to undefined
//                 descripcion: g.descripcion ?? undefined // Convert null to undefined
//             })),
//             CategoriaTarea: tareaConDetalles.CategoriaTarea,
//             etiquetas: tareaConDetalles.etiquetas
//                 .map(et => et.etiquetaTarea)
//                 .filter(et => et !== null) as Pick<EtiquetaTarea, 'id' | 'nombre'>[]
//         };

//         // Construir el resultado final
//         const resultado: TareaSuscripcionDetalles = {
//             tarea: tareaData,
//             suscripcion: asistenteId ? (tareaConDetalles.AsistenteTareaSuscripcion?.[0] || null) : null
//         };

//         return resultado;

//     } catch (error) {
//         console.error(`Error obteniendo detalles suscripción tarea ${tareaId}, asistente ${asistenteId}:`, error);
//         throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
//     }
// }

// --- Funciones cancelarSuscripcionTarea y crearOreactivarSuscripcionTarea (sin cambios) ---


export async function obtenerDetallesSuscripcionTarea(
    asistenteId: string,
    tareaId: string
): Promise<TareaSuscripcionDetalles | null> {
    if (!tareaId) {
        console.error("obtenerDetallesSuscripcionTarea: Falta ID de tarea.");
        return null;
    }

    try {
        // 1. Obtener detalles de la Tarea (incluyendo relaciones)
        const tareaData = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                iconoUrl: true,
                CategoriaTarea: { select: { nombre: true, color: true } },
                etiquetas: { select: { etiquetaTarea: { select: { id: true, nombre: true } } } },
                TareaGaleria: { select: { id: true, imageUrl: true, altText: true, descripcion: true }, orderBy: { orden: 'asc' } }
            }
        });

        if (!tareaData) {
            console.error(`Tarea con ID ${tareaId} no encontrada.`);
            return null;
        }

        let suscripcionData = null;
        let clienteIdData: string | null = null;
        let negocioIdData: string | null = null;

        // 2. Si se proporcionó asistenteId, buscar suscripción y datos del asistente
        if (asistenteId) {
            const asistenteConSuscripcion = await prisma.asistenteVirtual.findUnique({
                where: { id: asistenteId },
                select: {
                    clienteId: true, // <-- Obtener clienteId
                    negocioId: true, // <-- Obtener negocioId
                    AsistenteTareaSuscripcion: { // Obtener suscripción específica
                        where: { tareaId: tareaId },
                        select: {
                            id: true,
                            status: true,
                            montoSuscripcion: true,
                            fechaSuscripcion: true,
                            fechaDesuscripcion: true,
                        },
                        take: 1
                    }
                }
            });

            if (asistenteConSuscripcion) {
                clienteIdData = asistenteConSuscripcion.clienteId;
                negocioIdData = asistenteConSuscripcion.negocioId;
                suscripcionData = asistenteConSuscripcion.AsistenteTareaSuscripcion?.[0] || null;
            } else {
                console.warn(`Asistente con ID ${asistenteId} no encontrado al buscar suscripción.`);
                // No asignar clienteId/negocioId si el asistente no se encontró
            }
        }

        // 3. Construir el objeto resultado final
        const resultado: TareaSuscripcionDetalles = {
            tarea: {
                id: tareaData.id,
                nombre: tareaData.nombre,
                descripcion: tareaData.descripcion,
                precio: tareaData.precio,
                iconoUrl: tareaData.iconoUrl ?? undefined,
                TareaGaleria: tareaData.TareaGaleria.map(g => ({
                    ...g,
                    descripcion: g.descripcion ?? undefined,
                    altText: g.altText ?? undefined,
                })), // Mapeo con conversión de null a undefined
                CategoriaTarea: tareaData.CategoriaTarea,
                etiquetas: tareaData.etiquetas
                    .map(et => et.etiquetaTarea)
                    .filter(et => et !== null) as Pick<EtiquetaTarea, 'id' | 'nombre'>[]
            },
            suscripcion: suscripcionData,
            clienteId: clienteIdData, // <-- Añadir al resultado
            negocioId: negocioIdData  // <-- Añadir al resultado
        };

        return resultado;

    } catch (error) {
        console.error(`Error obteniendo detalles suscripción tarea ${tareaId}, asistente ${asistenteId}:`, error);
        throw new Error(`No se pudieron obtener los detalles: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export async function cancelarSuscripcionTarea(
    suscripcionId: string, asistenteId: string, tareaId: string
): Promise<{ success: boolean; error?: string }> {
    if (!suscripcionId || !asistenteId || !tareaId) { return { success: false, error: "Faltan IDs requeridos." }; }
    try {
        const asistente = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { clienteId: true, negocioId: true } });
        if (!asistente?.clienteId || !asistente.negocioId) { console.warn(`Cliente/Negocio no encontrado para asistente ${asistenteId}.`); }
        const { clienteId, negocioId } = asistente || { clienteId: null, negocioId: null };
        await prisma.asistenteTareaSuscripcion.update({ where: { id: suscripcionId }, data: { status: 'inactivo', fechaDesuscripcion: new Date() } });
        if (clienteId && negocioId) {
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
        }
        revalidatePath(`/admin/IA/marketplace`);
        return { success: true };
    } catch (error) { console.error(`Error al cancelar ${suscripcionId}:`, error); return { success: false, error: `Error: ${error instanceof Error ? error.message : String(error)}` }; }
}

export async function crearOreactivarSuscripcionTarea(
    asistenteId: string, tareaId: string
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    if (!asistenteId || !tareaId) { return { success: false, error: "Faltan IDs." }; }
    try {
        const [tareaInfo, asistenteInfo] = await Promise.all([prisma.tarea.findUnique({ where: { id: tareaId }, select: { precio: true } }), prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { clienteId: true, negocioId: true } })]);
        if (!tareaInfo) return { success: false, error: "Tarea no encontrada." };
        if (!asistenteInfo?.clienteId || !asistenteInfo.negocioId) { console.warn(`Cliente/Negocio no encontrado para asistente ${asistenteId}.`); }
        const monto = tareaInfo.precio ?? 0;
        const { clienteId, negocioId } = asistenteInfo || { clienteId: null, negocioId: null };
        const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({ where: { asistenteVirtualId_tareaId: { asistenteVirtualId: asistenteId, tareaId: tareaId } }, update: { status: 'activo', montoSuscripcion: monto, fechaDesuscripcion: null }, create: { asistenteVirtualId: asistenteId, tareaId: tareaId, montoSuscripcion: monto, status: 'activo' } });
        if (clienteId && negocioId) {
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
        }
        revalidatePath(`/admin/IA/marketplace`);
        return { success: true, data: { id: suscripcion.id } };
    } catch (error) { console.error(`Error al suscribir ${tareaId} para ${asistenteId}:`, error); return { success: false, error: `Error: ${error instanceof Error ? error.message : String(error)}` }; }
}
