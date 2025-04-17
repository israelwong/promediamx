'use server'

import prisma from './prismaClient'
import { Instruccion } from './types'

export async function obtenerInstrucciones(habilidadId: string) {
    const instrucciones = await prisma.instruccion.findMany({
        where: {
            habilidadId: habilidadId
        },
        orderBy: {
            orden: 'asc'
        }
    })
    return instrucciones
}

export async function crearInstruccion(instruccion: Instruccion) {
    try {
        const nuevaInstruccion = await prisma.instruccion.create({
            data: {
                habilidadId: instruccion.habilidadId.trim(),
                nombre: instruccion.nombre.trim(),
                descripcion: instruccion.descripcion?.trim() ?? null,
                version: instruccion.version,
                status: instruccion.status,
            }
        })
        return nuevaInstruccion
    } catch (error: unknown) {
        interface PrismaError extends Error {
            code?: string;
            meta?: {
                target?: string[];
            };
        }

        if (error instanceof Error && (error as PrismaError).code === 'P2002' && (error as PrismaError).meta?.target?.includes('nombre')) {
            console.error('Error: El nombre de la habilidad ya existe:', instruccion.nombre)
            throw new Error('El nombre de la habilidad ya existe. Por favor, elige otro nombre.')
        }
        console.error('Error al crear la habilidad:', error)
        throw new Error('Error al crear la habilidad')
    }
}
export async function actualizarInstruccion(instruccionId: string, instruccion: Instruccion) {
    try {
        const instruccionActualizada = await prisma.instruccion.update({
            where: { id: instruccionId },
            data: {
                habilidadId: instruccion.habilidadId,
                nombre: instruccion.nombre,
                descripcion: instruccion.descripcion ?? null,
                instruccion: instruccion.instruccion,
                trigger: instruccion.trigger,
                automatizacion: instruccion.automatizacion,
                version: instruccion.version,
                status: instruccion.status
            }
        })
        return instruccionActualizada
    } catch (error) {
        console.error('Error al actualizar la habilidad:', error)
        throw new Error('Error al actualizar la habilidad')
    }
}

export async function obtenerInstruccion(instruccionId: string) {
    try {
        const instruccion = await prisma.instruccion.findUnique({
            where: { id: instruccionId }
        })
        if (!instruccion) {
            throw new Error('Instrucción no encontrada')
        }
        return instruccion
    } catch (error) {
        console.error('Error al obtener la instrucción:', error)
        throw new Error('Error al obtener la instrucción')
    }
}

export async function actualizarOrdenInstrucciones(habilidadId: string, instrucciones: Instruccion[]) {
    try {
        const updatedInstrucciones = await Promise.all(
            instrucciones.map((instruccion) =>
                prisma.instruccion.update({
                    where: { id: instruccion.id },
                    data: { orden: instruccion.orden }
                })
            )
        )
        return updatedInstrucciones
    } catch (error) {
        console.error('Error al actualizar el orden de las instrucciones:', error)
        throw new Error('Error al actualizar el orden de las instrucciones')
    }
}