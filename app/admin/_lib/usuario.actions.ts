'use server'
import prisma from './prismaClient'
import { Usuario } from './types'
import bcrypt from 'bcrypt'

export async function obtenerUsuarios() {
    return await prisma.usuario.findMany()
}

export async function obtenerUsuario(id: string) {
    return await prisma.usuario.findUnique({
        where: {
            id
        }
    })
}

export async function crearUsuario(usuario: Usuario) {

    //validar si usuario ya existe
    const user = await prisma.usuario.findUnique({
        where: {
            email: usuario.email
        }
    })
    if (user) {
        return { success: false, error: 'El usuario ya existe' }
    }

    //usar bcrypt para encriptar la contraseña
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(usuario.password, salt)
    usuario.password = hashedPassword

    // Validar si el número de teléfono ya existe
    const existingPhone = await prisma.usuario.findUnique({
        where: {
            telefono: usuario.telefono
        }
    })
    if (existingPhone) {
        return { success: false, error: 'El número de teléfono ya existe' }
    }

    try {
        await prisma.usuario.create({
            data: {
                username: usuario.username,
                email: usuario.email,
                telefono: usuario.telefono,
                password: usuario.password,
                rol: usuario.rol ?? '',
                status: usuario.status
            }
        })
        return { success: true }
    } catch (error: unknown) {
        if (error instanceof Error) {
            return { success: false, error: error.message }
        }
        return { success: false, error: 'An unknown error occurred' }
    }
}

export async function actualizarUsuario(usuario: Usuario) {
    try {
        await prisma.usuario.update({
            where: {
                id: usuario.id
            },
            data: {
                username: usuario.username,
                email: usuario.email,
                telefono: usuario.telefono,
                rol: usuario.rol,
                status: usuario.status
            }
        })
        return { success: true }
    } catch (error: unknown) {
        if (error instanceof Error) {
            return { success: false, error: error.message }
        }
        return { success: false, error: 'An unknown error occurred' }
    }
}

export async function eliminarUsuario(id: string) {
    try {
        await prisma.usuario.delete({
            where: {
                id
            }
        })
        return { success: true }
    } catch (error: unknown) {
        if (error instanceof Error) {
            return { success: false, error: error.message }
        }
        return { success: false, error: 'An unknown error occurred' }
    }
}