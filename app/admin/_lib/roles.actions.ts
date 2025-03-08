'use server'
import prisma from './prismaClient'
import { Rol } from './types'

export async function obtenerRoles() {
    try {
        return await prisma.rol.findMany()
    } catch (error) {
        console.error('Error fetching roles:', error)
        throw new Error('Could not fetch roles')
    }
}

export async function obtenerRol(rolId: string) {
    try {
        return await prisma.rol.findUnique({ where: { id: rolId } })
    } catch (error) {
        console.error('Error fetching role:', error)
        throw new Error('Could not fetch role')
    }
}

export async function crearRol(rol: Rol) {
    try {
        await prisma.rol.create({ data: rol })
        return { success: true }
    } catch (error) {
        console.error('Error creating role:', error)
        throw new Error('Could not create role')
    }
}

export async function actualizarRol(rolId: string, rol: Rol) {
    try {
        await prisma.rol.update({ where: { id: rolId }, data: rol })
        return { success: true }
    } catch (error) {
        console.error('Error updating role:', error)
        throw new Error('Could not update role')
    }
}

export async function eliminarRol(rolId: string) {
    try {
        await prisma.rol.delete({ where: { id: rolId } })
        return { success: true }
    } catch (error) {
        console.error('Error deleting role:', error)
        throw new Error('Could not delete role')
    }
}