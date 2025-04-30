'use server'
import prisma from './prismaClient'
import { AsistenteTareaSuscripcion } from './types'

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

