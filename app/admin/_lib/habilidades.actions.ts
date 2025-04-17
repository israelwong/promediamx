'use server'
import prisma from './prismaClient'
import { Habilidad } from './types'

export async function obtenerHabilidades() {
    const habilidades = await prisma.habilidad.findMany({
        orderBy: {
            id: 'asc'
        }
    })
    return habilidades
}

export async function crearHabilidad(habilidad: Habilidad) {

    try {
        const nuevaHabilidad = await prisma.habilidad.create({
            data: {
                nombre: habilidad.nombre.trim(),
                descripcion: habilidad.descripcion?.trim() ?? null,
                origen: habilidad.origen?.trim() ?? null,
                version: habilidad.version,
                status: habilidad.status,
                precio: habilidad.precio ?? 0
            }
        })
        return nuevaHabilidad
    } catch (error: unknown) {
        interface PrismaError extends Error {
            code?: string;
            meta?: {
                target?: string[];
            };
        }

        if (error instanceof Error && (error as PrismaError).code === 'P2002' && (error as PrismaError).meta?.target?.includes('nombre')) {
            console.error('Error: El nombre de la habilidad ya existe:', habilidad.nombre)
            throw new Error('El nombre de la habilidad ya existe. Por favor, elige otro nombre.')
        }
        console.error('Error al crear la habilidad:', error)
        throw new Error('Error al crear la habilidad')
    }
}

export async function actualizarHabilidad(habilidadId: string, habilidad: Habilidad) {
    try {
        const habilidadActualizada = await prisma.habilidad.update({
            where: { id: habilidadId },
            data: {
                nombre: habilidad.nombre.trim(),
                descripcion: habilidad.descripcion?.trim() ?? null,
                origen: habilidad.origen?.trim() ?? null,
                version: habilidad.version,
                status: habilidad.status,
                precio: habilidad.precio,
                rol: habilidad.rol?.trim() ?? null,
                personalidad: habilidad.personalidad?.trim() ?? null,
            }
        })
        return habilidadActualizada
    } catch (error) {
        console.error('Error al actualizar la habilidad:', error)
        throw new Error('Error al actualizar la habilidad')
    }
}

export async function obtenerHabilidad(id: string) {
    try {
        const habilidad = await prisma.habilidad.findUnique({
            where: { id }
        })
        return habilidad
    } catch (error) {
        console.error('Error al obtener la habilidad:', error)
        throw new Error('Error al obtener la habilidad')
    }
}

export async function eliminarHabilidad(id: string) {
    try {
        const habilidadEliminada = await prisma.habilidad.delete({
            where: { id }
        })
        return habilidadEliminada
    } catch (error) {
        console.error('Error al eliminar la habilidad:', error)
        throw new Error('Error al eliminar la habilidad')
    }
}