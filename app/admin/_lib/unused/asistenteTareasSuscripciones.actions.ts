// Ruta actual desde app: app/admin/_lib/asistenteTareasSuscripciones.actions.ts

'use server'
import prisma from '../prismaClient'

import { AsistenteTareaSuscripcion, TareaSuscripcionDetalles, EtiquetaTarea } from '../types'
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
                    select: { id: true, nombre: true, precio: true }
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

// export async function obtenerTareasSuscritasDetalladas(asistenteId: string): Promise<TareaSuscritaDetalle[]> {
//     if (!asistenteId) return [];
//     try {
//         const suscripciones = await prisma.asistenteTareaSuscripcion.findMany({
//             where: {
//                 asistenteVirtualId: asistenteId,
//                 status: 'activo', // Solo suscripciones activas
//             },
//             select: {
//                 id: true,
//                 montoSuscripcion: true,
//                 tarea: {
//                     select: {
//                         id: true,
//                         nombre: true,
//                         descripcion: true, // <-- Añadir descripcion aquí
//                         precio: true, // Seleccionar precio original para referencia
//                         // Contar las ejecuciones para esta tarea y este asistente
//                         _count: {
//                             select: {
//                                 TareaEjecutada: {
//                                     where: { asistenteVirtualId: asistenteId }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//             // Opcional: Ordenar por nombre de tarea
//             orderBy: {
//                 tarea: {
//                     nombre: 'asc'
//                 }
//             }
//         });

//         // Mapear el resultado al formato deseado
//         return suscripciones.map(s => ({
//             suscripcionId: s.id,
//             tarea: {
//                 id: s.tarea.id,
//                 nombre: s.tarea.nombre,
//                 descripcion: s.tarea.descripcion ?? null, // <-- Añadir descripcion aquí
//                 precio: s.tarea.precio,
//             },
//             montoSuscripcion: s.montoSuscripcion,
//             ejecuciones: s.tarea._count.TareaEjecutada,
//         }));

//     } catch (error) {
//         console.error(`Error al obtener tareas suscritas para asistente ${asistenteId}:`, error);
//         return []; // Devolver vacío en caso de error
//     }
// }

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
