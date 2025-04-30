'use server'
import prisma from './prismaClient'
import { Rol } from './types'

export async function obtenerRoles() {
    try {
        return await prisma.rol.findMany({
            include: {
                usuarios: {
                    select: {
                        id: true,
                        email: true,
                        telefono: true,
                        status: true,
                        username: true,
                        createdAt: true,
                        updatedAt: true,
                        rolId: true,
                    },
                }
            },
        })
    } catch (error) {
        console.error('Error fetching roles:', error)
        throw new Error('Could not fetch roles')
    }
}

export async function obtenerRolPorId(rolId: string) {
    try {
        return await prisma.rol.findUnique({ where: { id: rolId } })
    } catch (error) {
        console.error('Error fetching role:', error)
        throw new Error('Could not fetch role')
    }
}

export async function actualizarRol(rolId: string, data: Rol) {
    try {
        const updatedRol = await prisma.rol.update({
            where: { id: rolId },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
            },
        })
        return { success: true, data: updatedRol }
    } catch (error) {
        console.error('Error updating role:', error)
        return { success: false, error: (error as unknown as Error).message }
    }
}

export async function eliminarRol(rolId: string) {
    try {
        await prisma.rol.delete({ where: { id: rolId } })
        return { success: true }
    } catch (error) {
        console.error('Error deleting role:', error)
        return { success: false, error: (error as unknown as Error).message }
    }
}
export async function crearRol(data: Rol) {
    try {
        const newRol = await prisma.rol.create({
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
            },
        })
        return { success: true, data: newRol }
    } catch (error) {
        console.error('Error creating role:', error)
        return { success: false, error: (error as unknown as Error).message }
    }
}