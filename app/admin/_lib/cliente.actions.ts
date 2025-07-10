//ruta actual: app/admin/clientes/[clienteId]/components/ClienteEditarForm.tsx

'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client' // Asegúrate de tener Prisma importado

import { Cliente, Negocio, AsistenteVirtual, AsistenteTareaSuscripcion } from "./types"; // Ajusta ruta

export interface ClienteConDetalles extends Cliente {
    _count?: {
        Negocio?: number; // Cambiado de negocio a Negocio si así está en tu tipo Cliente
    };
    Negocio?: (Negocio & { // Usar Negocio (mayúscula) si así está en tu tipo Cliente
        id: string; // Asegurar que id esté aquí
        nombre: string; // Asegurar que nombre esté aquí
        AsistenteVirtual?: (Pick<AsistenteVirtual, 'id' | 'precioBase' | 'status'> & {
            AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
        })[];
    })[];
}

// export async function obtenerClientesConDetalles(): Promise<ClienteConDetalles[]> {
//     try {
//         const clientes = await prisma.cliente.findMany({
//             orderBy: {
//                 nombre: 'asc'
//             },
//             select: {
//                 id: true,
//                 nombre: true,
//                 createdAt: true,
//                 status: true,
//                 email: true,
//                 _count: {
//                     select: { negocio: true } // Usar Negocio (mayúscula) si así está en schema
//                 },
//                 negocio: { // Usar Negocio (mayúscula) si así está en schema
//                     select: {
//                         id: true,
//                         nombre: true, // **AÑADIDO: Incluir nombre del negocio**
//                         AsistenteVirtual: {
//                             where: { status: 'activo' },
//                             select: {
//                                 id: true,
//                                 // precioBase: true,
//                                 status: true,
//                                 AsistenteTareaSuscripcion: {
//                                     where: { status: 'activo' },
//                                     select: {
//                                         montoSuscripcion: true,
//                                         status: true,
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//         // El tipo devuelto por Prisma ahora debería ser más compatible,
//         // pero un casteo puede seguir siendo necesario si tu tipo TS es más específico
//         return clientes.map(cliente => ({
//             ...cliente,
//             Negocio: cliente.negocio?.map(negocio => ({
//                 ...negocio,
//                 AsistenteVirtual: negocio.AsistenteVirtual?.map(asistente => ({
//                     ...asistente,
//                     // precioBase: asistente.precioBase ?? undefined,
//                     AsistenteTareaSuscripcion: asistente.AsistenteTareaSuscripcion?.map(tarea => ({
//                         ...tarea,
//                         montoSuscripcion: tarea.montoSuscripcion ?? undefined,
//                     })) ?? undefined,
//                 })) ?? undefined,
//             })) ?? undefined,
//             _count: cliente._count ? { Negocio: cliente._count.negocio } : undefined,
//         })) as ClienteConDetalles[];
//     } catch (error) {
//         console.error("Error fetching detailed clients:", error);
//         throw new Error("Error al obtener la lista detallada de clientes.");
//     }
// }


export async function obtenerClientes() {
    const clientes = await prisma.cliente.findMany({
        orderBy: {
            id: 'asc'
        },
        include: {
            negocio: {
                select: {
                    nombre: true
                }
            }
        }
    })
    return clientes
}

export async function obtenerClientePorId(clienteId: string) {
    const cliente = await prisma.cliente.findUnique({
        where: {
            id: clienteId
        },
        include: {
            negocio: {
                select: {
                    id: true,
                    nombre: true,
                    status: true,
                }
            }
        }
    })
    return cliente
}

export async function actualizarClientePorId(clienteId: string, data: Partial<Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'Contrato' | 'Negocio' | 'Factura' | '_count'>>): Promise<Cliente> {
    if (!clienteId) {
        throw new Error("Se requiere el ID del cliente para actualizar.");
    }

    // Construir objeto de actualización solo con campos escalares permitidos
    const dataToUpdate: Prisma.ClienteUpdateInput = {};

    // Mapear explícitamente los campos permitidos desde 'data' a 'dataToUpdate'
    if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre;
    if (data.email !== undefined && data.email !== null) dataToUpdate.email = data.email; // Prisma maneja null para campos opcionales
    if (data.telefono !== undefined && data.telefono !== null) dataToUpdate.telefono = data.telefono;
    if (data.password !== undefined && data.password) {
        // **IMPORTANTE: Hashear la contraseña ANTES de guardarla**
        // dataToUpdate.password = await hashPassword(data.password);
        dataToUpdate.password = data.password; // Placeholder - ¡IMPLEMENTAR HASHING!
    }
    if (data.rfc !== undefined) dataToUpdate.rfc = data.rfc;
    if (data.curp !== undefined) dataToUpdate.curp = data.curp;
    if (data.razonSocial !== undefined) dataToUpdate.razonSocial = data.razonSocial;
    if (data.status !== undefined && data.status !== null) dataToUpdate.status = data.status;
    if (data.stripeCustomerId !== undefined) dataToUpdate.stripeCustomerId = data.stripeCustomerId;
    // Añadir otros campos escalares que permitas editar...

    // Validar que hay algo que actualizar
    if (Object.keys(dataToUpdate).length === 0) {
        console.warn("actualizarClientePorId llamado sin datos para actualizar.");
        // Devolver el cliente existente o lanzar un error leve si prefieres
        const clienteExistente = await prisma.cliente.findUnique({ where: { id: clienteId } });
        if (!clienteExistente) throw new Error("Cliente no encontrado para actualizar.");
        return {
            ...clienteExistente,
            nombre: clienteExistente?.nombre ?? undefined,
            rfc: clienteExistente?.rfc ?? undefined,
            curp: clienteExistente?.curp ?? undefined,
            razonSocial: clienteExistente?.razonSocial ?? undefined,
            stripeCustomerId: clienteExistente?.stripeCustomerId ?? undefined,
        };
    }


    try {
        const clienteActualizado = await prisma.cliente.update({
            where: { id: clienteId },
            data: dataToUpdate,
        });
        return {
            ...clienteActualizado,
            nombre: clienteActualizado.nombre ?? undefined,
            rfc: clienteActualizado.rfc ?? undefined,
            curp: clienteActualizado.curp ?? undefined,
            razonSocial: clienteActualizado.razonSocial ?? undefined,
            stripeCustomerId: clienteActualizado.stripeCustomerId ?? undefined,
        };
    } catch (error) {
        console.error(`Error al actualizar cliente ${clienteId}:`, error);
        throw new Error(`No se pudo actualizar el cliente.`);
    }
}

export async function archivarClientePorId(clienteId: string) {
    const clienteArchivado = await prisma.cliente.update({
        where: {
            id: clienteId
        },
        data: {
            status: 'archivado' // Assuming 'status' is a field in your schema
        }
    })
    return clienteArchivado
}

export async function eliminarClientePorId(clienteId: string) {
    const clienteEliminado = await prisma.cliente.delete({
        where: {
            id: clienteId
        }
    })
    return clienteEliminado
}

