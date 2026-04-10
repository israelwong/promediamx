'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

import type { ActionResult } from '@/app/admin/_lib/types';
import {
    createClienteAdminSchema,
    updateClienteSchema,
    // clienteIdSchema,
    clienteConDetallesSchema,
    clienteParaEditarSchema
} from './cliente.schemas';
import type {
    CreateClienteAdminInput, UpdateClienteInput, ClienteConDetalles, ClienteParaEditar
} from './cliente.schemas';
import type { Cliente as ClientePrisma } from '@prisma/client';
import { z } from 'zod';


/**
 * Crea un nuevo cliente con una contraseña autogenerada y hasheada.
 * Diseñado para el flujo interno del administrador.
 * @param input - Los datos del formulario validados por Zod.
 * @returns El cliente recién creado.
 */
export async function createCliente(
    input: CreateClienteAdminInput
): Promise<ActionResult<ClientePrisma>> {
    const validationResult = createClienteAdminSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, email, telefono } = validationResult.data;

    try {
        const tempPassword = Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const nuevoCliente = await prisma.cliente.create({
            data: { nombre, email, telefono, password: hashedPassword, status: 'activo' },
        });

        revalidatePath('/admin/clientes');
        console.log(`Cliente "${nuevoCliente.nombre}" creado exitosamente.`);
        return { success: true, data: nuevoCliente };

    } catch (error: unknown) {
        console.error("Error al crear cliente:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El email '${email}' ya está en uso.` };
        }
        return { success: false, error: "Ocurrió un error inesperado al crear el cliente." };
    }
}



/**
 * Obtiene la lista de todos los clientes con detalles de facturación y conteos.
 * Reemplaza a `obtenerClientesConDetalles`.
 * @returns Una lista de clientes con sus detalles asociados.
 */
export async function getClientesConDetalles(): Promise<ActionResult<ClienteConDetalles[]>> {
    try {
        const clientesData = await prisma.cliente.findMany({
            orderBy: { nombre: 'asc' },
            select: {
                id: true,
                nombre: true,
                createdAt: true,
                status: true,
                email: true,
                _count: { select: { negocio: true } },
                negocio: {
                    select: {
                        AsistenteVirtual: {
                            where: { status: 'activo' },
                            select: {
                                // precioBase ha sido comentado en tu código original, se respeta esa decisión
                                AsistenteTareaSuscripcion: {
                                    where: { status: 'activo' },
                                    select: { montoSuscripcion: true, status: true },
                                }
                            }
                        }
                    }
                }
            }
        });

        // Validamos la data que sale de la DB contra nuestro esquema Zod
        const validationResult = z.array(clienteConDetallesSchema).safeParse(clientesData);
        if (!validationResult.success) {
            console.error("Error de validación Zod en getClientesConDetalles:", validationResult.error.flatten());
            return { success: false, error: "El formato de los datos de los clientes es inesperado." };
        }

        return { success: true, data: validationResult.data };

    } catch (error) {
        console.error("Error fetching detailed clients:", error);
        return { success: false, error: "No se pudo obtener la lista detallada de clientes." };
    }
}




/**
 * NUEVA: Obtiene los datos de un cliente por ID, formateados para el formulario de edición.
 */
export async function getClienteById(id: string): Promise<ActionResult<ClienteParaEditar>> {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id },
        });

        if (!cliente) {
            return { success: false, error: `Cliente con ID ${id} no encontrado.` };
        }

        const validationResult = clienteParaEditarSchema.safeParse(cliente);
        if (!validationResult.success) {
            console.error("Error de validación Zod en getClienteById:", validationResult.error.flatten());
            return { success: false, error: "El formato de los datos del cliente es inesperado." };
        }

        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error(`Error al obtener cliente ${id}:`, error);
        return { success: false, error: "No se pudo cargar el cliente." };
    }
}

/**
 * REFACTORIZADA: Actualiza un cliente usando react-hook-form y Zod.
 */
export async function updateCliente(id: string, input: UpdateClienteInput): Promise<ActionResult<ClienteParaEditar>> {
    const dataValidation = updateClienteSchema.safeParse(input);
    if (!dataValidation.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: dataValidation.error.flatten().fieldErrors };
    }
    try {
        const clienteActualizado = await prisma.cliente.update({
            where: { id },
            data: dataValidation.data,
        });

        revalidatePath(`/admin/clientes/${id}`);
        revalidatePath('/admin/clientes');

        const outputValidation = clienteParaEditarSchema.safeParse(clienteActualizado);
        if (!outputValidation.success) {
            return { success: false, error: "Formato de datos de cliente actualizado inesperado." };
        }

        return { success: true, data: outputValidation.data };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') return { success: false, error: `El email '${input.email}' ya está en uso.` };
            if (error.code === 'P2025') return { success: false, error: "Cliente no encontrado para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar el cliente." };
    }
}


/**
 * NUEVA: Elimina permanentemente a un cliente y todos sus datos asociados.
 * Usar con extrema precaución. Solo para desarrollo y pruebas.
 * @param id - El ID del cliente a eliminar.
 */
export async function deleteClienteDefinitivamente(id: string): Promise<ActionResult<null>> {
    if (!id) {
        return { success: false, error: "Se requiere un ID de cliente." };
    }
    try {
        await prisma.cliente.delete({
            where: { id },
        });
        revalidatePath('/admin/clientes'); // Revalidar la lista de clientes
        return { success: true, data: null };
    } catch (error) {
        console.error("Error al eliminar definitivamente el cliente:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "No se encontró el cliente para eliminar." };
        }
        return { success: false, error: "Ocurrió un error al eliminar el cliente." };
    }
}

/**
 * ARCHIVAR (Soft Delete): Cambia el estado del cliente a 'archivado'.
 * Esta es la opción segura y recomendada para producción.
 */
export async function archiveCliente(id: string): Promise<ActionResult<ClientePrisma>> {
    if (!id) {
        return { success: false, error: "Se requiere un ID de cliente." };
    }
    try {
        const clienteArchivado = await prisma.cliente.update({
            where: { id },
            data: { status: 'archivado' }
        });
        revalidatePath('/admin/clientes');
        revalidatePath(`/admin/clientes/${id}`);
        return { success: true, data: clienteArchivado };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "No se encontró el cliente para archivar." };
        }
        return { success: false, error: "Ocurrió un error al archivar el cliente." };
    }
}