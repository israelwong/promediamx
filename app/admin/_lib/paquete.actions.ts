'use server'
import prisma from './prismaClient'
import { Paquete } from './types'

export async function obtenerPaquetes() {
    return await prisma.paquete.findMany()
}

export async function obtenerPaquete(id: string) {
    return await prisma.paquete.findUnique({ where: { id } })
}

export async function crearPaquete(paquete: Paquete, listaServiciosId: string[]) {
    try {

        console.log('Creating new package with data:', paquete)
        const nuevoPaquete = await prisma.paquete.create({ data: paquete })
        console.log('New package created:', nuevoPaquete)

        const paqueteServicios = listaServiciosId.map(servicio => {
            return {
                paqueteId: nuevoPaquete.id,
                servicioId: servicio
            }
        })
        console.log('Package services to be created:', paqueteServicios)
        await prisma.paqueteServicio.createMany({ data: paqueteServicios })
        return { success: true, data: nuevoPaquete }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

export async function actualizarPaquete(id: string, paquete: Paquete) {
    try {
        const paqueteActualizado = await prisma.paquete.update({ where: { id }, data: paquete })
        return { success: true, data: paqueteActualizado }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

export async function eliminarPaquete(id: string) {
    try {
        await prisma.paquete.delete({ where: { id } })
        return { success: true }
    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}

export async function obtenerPaquetesConServicios() {
    return await prisma.paquete.findMany({
        include: {
            PaqueteServicio: true
        }
    })
}