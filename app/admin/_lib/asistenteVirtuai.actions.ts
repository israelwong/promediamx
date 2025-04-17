'use server'
import prisma from './prismaClient'

export async function obtenerAsistentesVirtuales(contratoId: string) {
    const asistentes = await prisma.asistenteVirtual.findMany({
        where: {
            contratoId: contratoId
        },
        orderBy: {
            id: 'asc'
        }
    })
    return asistentes
}

export async function obtenerAsistenteVirtual(asistenteId: string) {
    const asistente = await prisma.asistenteVirtual.findUnique({
        where: {
            id: asistenteId
        }
    })
    //
    return asistente
}