'use server'
import prisma from './prismaClient'
import { Usuario } from '@/app/lib/types'

export async function obtenerUsuarios() {
    return await prisma.usuario.findMany()
}

export async function obtenerUsuarioPorId(id: string) {
    return await prisma.usuario.findUnique({
        where: {
            id
        }
    })
}

export async function crearUsuario(usuario: Usuario) {
    return await prisma.usuario.create({
        data: usuario
    })
}

export async function actualizarUsuario(id: string, usuario: Usuario) {
    return await prisma.usuario.update({
        where: {
            id
        },
        data: usuario
    })
}

export async function eliminarUsuario(id: string) {
    return await prisma.usuario.delete({
        where: {
            id
        }
    })
}
