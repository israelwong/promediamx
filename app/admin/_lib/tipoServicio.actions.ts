'use server'
import prisma from './prismaClient'
import { TipoServicio } from './types'

export async function obtenerTiposServicios() {
    return await prisma.tipoServicio.findMany({
        orderBy: {
            createdAt: 'asc'
        }
    })
}

export async function obtenerTipoServicio(id: string) {
    return await prisma.tipoServicio.findUnique({
        where: {
            id
        }
    })
}

export async function actualizarTipoServicio(data: TipoServicio) {
    try {
        const updatedTipoServicio = await prisma.tipoServicio.update({
            where: {
                id: data.id
            },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                status: data.status
            }
        })
        return { success: true, data: updatedTipoServicio }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function eliminarTipoServicio(id: string) {
    try {
        await prisma.tipoServicio.delete({
            where: {
                id
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function crearTipoServicio(data: Omit<TipoServicio, 'id'>) {
    try {
        const newTipoServicio = await prisma.tipoServicio.create({
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                status: data.status
            }
        })
        return { success: true, data: newTipoServicio }
    } catch (error) {
        return { success: false, error: (error as unknown as Error).message }
    }
}