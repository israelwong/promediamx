'use server'
import prisma from './prismaClient'
// import { CatalogoNivel } from './types'

export async function obtenerCatalogoNivel(catalogoId: string) {
    const catalogoNivel = await prisma.catalogoNivel.findFirst({
        where: {
            id: catalogoId
        }
    })
    return catalogoNivel
}

export async function obtenerCatalogoNiveles() {
    const catalogoNiveles = await prisma.catalogoNivel.findMany({
        orderBy: {
            id: 'asc'
        }
    })
    return catalogoNiveles
}