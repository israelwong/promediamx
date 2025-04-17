'use server'
import prisma from './prismaClient'
// import { Cliente } from './types'

export async function obtenerClientes() {
    const clientes = await prisma.cliente.findMany({
        orderBy: {
            id: 'asc'
        },
        include: {
            contrato: {
                select: {
                    id: true
                }
            },
        }
    })
    return clientes
}

export async function obtenerCliente(clienteId: string) {
    const cliente = await prisma.cliente.findUnique({
        where: {
            id: clienteId
        },
        include: {
            contrato: {
                select: {
                    id: true,
                    fechaInicio: true,
                    fechaFin: true,
                    status: true,
                }
            },
            Negocio: {
                select: {
                    id: true,
                    nombre: true,
                    logo: true,
                    status: true,
                }
            }
        }
    })
    return cliente
}