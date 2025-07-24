'use server'

import prisma from '../prismaClient'

export async function eliminarParametro(parametroId: string) {
    try {
        const parametroEliminado = await prisma.parametroRequerido.delete({
            where: { id: parametroId }
        })
        return parametroEliminado
    } catch (error) {
        console.error('Error al eliminar el parámetro:', error)
        throw new Error('Error al eliminar el parámetro')
    }
}

export async function obtenerParametro(parametroId: string) {
    try {
        const parametro = await prisma.parametroRequerido.findUnique({
            where: { id: parametroId }
        })
        return parametro
    } catch (error) {
        console.error('Error al obtener el parámetro:', error)
        throw new Error('Error al obtener el parámetro')
    }
}