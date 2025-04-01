'use server'
import prisma from './prismaClient'
import { Servicio } from './types'

export async function obtenerServicios() {
    return await prisma.servicio.findMany({
        orderBy: {
            orden: 'asc'
        }
    })
}

export async function obtenerServicio(id: string) {
    return await prisma.servicio.findUnique({
        where: {
            id
        }
    })
}

export async function actualizarServicio(data: Servicio) {
    try {
        const updatedServicio = await prisma.servicio.update({
            where: {
                id: data.id
            },
            data: {
                tipo: data.tipo,
                nombre: data.nombre,
                descripcion: data.descripcion,
                costo: data.costo,
                precio: data.precio,
                status: data.status
            }
        })
        return { success: true, data: updatedServicio }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function eliminarServicio(id: string) {
    try {
        await prisma.servicio.delete({
            where: {
                id
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function crearServicio(data: Servicio) {
    try {
        const newServicio = await prisma.servicio.create({
            data: {
                tipo: data.tipo,
                nombre: data.nombre,
                descripcion: data.descripcion,
                costo: data.costo,
                precio: data.precio,
                status: data.status
            }
        })
        return { success: true, data: newServicio }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function actualizarPosicionesSevicios(servicios: Servicio[]) {
    // console.log('actualizarPosicionesSevicios', servicios);
    servicios.forEach(async (servicio) => {
        await prisma.servicio.update({
            where: { id: servicio.id },
            data: {
                orden: servicio.orden
            }
        });
    });

}