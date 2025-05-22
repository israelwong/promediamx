'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
// import { z } from 'zod';

import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ActualizarClienteInputSchema,
    type ActualizarClienteInput,
    type ClienteParaEditar,
    ClienteParaEditarSchema, // Para validar la salida de obtenerClientePorId
    type ClienteActualizadoOutput
} from './cliente.schemas';

// Importar el tipo Prisma directamente para el retorno de la DB
import type { Cliente as ClientePrisma } from '@prisma/client';

// --- Obtener Cliente por ID ---
export async function obtenerClientePorId(
    clienteId: string
): Promise<ActionResult<ClienteParaEditar | null>> {
    if (!clienteId) {
        return { success: false, error: "Se requiere el ID del cliente." };
    }
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            include: { // Incluir relaciones si son necesarias para ClienteParaEditarSchema
                negocio: {
                    select: { id: true, nombre: true, status: true },
                    take: 5 // Limitar para no sobrecargar si son muchos
                }
            }
        });

        if (!cliente) {
            return { success: false, error: `Cliente con ID ${clienteId} no encontrado.`, data: null };
        }

        // Validar/transformar con Zod antes de devolver
        const validationResult = ClienteParaEditarSchema.safeParse(cliente);
        if (!validationResult.success) {
            console.error("Error de validación Zod en obtenerClientePorId:", validationResult.error.flatten());
            return { success: false, error: "Formato de datos de cliente inesperado.", data: null };
        }

        return { success: true, data: validationResult.data };
    } catch (error: unknown) {
        console.error(`Error al obtener cliente ${clienteId}:`, error);
        return { success: false, error: `No se pudo cargar el cliente. ${(error instanceof Error ? error.message : '')}`, data: null };
    }
}

// --- Actualizar Cliente por ID ---
export async function actualizarClientePorId(
    clienteId: string,
    input: ActualizarClienteInput
): Promise<ActionResult<ClienteActualizadoOutput>> { // Devolver ClienteActualizadoOutput
    if (!clienteId) {
        return { success: false, error: "Se requiere el ID del cliente para actualizar." };
    }

    const validationResult = ActualizarClienteInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            validationErrors: validationResult.error.flatten().fieldErrors,
        };
    }
    const dataToUpdate = validationResult.data;

    // Excluir explícitamente 'password' si llegara a estar en el tipo ActualizarClienteInput
    // Aunque nuestro schema ActualizarClienteInputSchema ya lo omite.
    const { ...safeDataToUpdate } = dataToUpdate as ActualizarClienteInput; // Evitar 'password'

    if (Object.keys(safeDataToUpdate).length === 0) {
        // Podríamos devolver el cliente sin cambios o un mensaje específico
        const clienteExistenteResult = await obtenerClientePorId(clienteId);
        if (clienteExistenteResult.success && clienteExistenteResult.data) {
            return { success: true, data: clienteExistenteResult.data, error: "No se proporcionaron datos para actualizar." };
        }
        return { success: false, error: "No se proporcionaron datos para actualizar y no se pudo obtener el cliente." };
    }

    try {
        const clienteActualizado = await prisma.cliente.update({
            where: { id: clienteId },
            data: safeDataToUpdate,
            include: { // Incluir las mismas relaciones que ClienteParaEditarSchema para consistencia
                negocio: {
                    select: { id: true, nombre: true, status: true },
                    take: 5
                }
            }
        });

        revalidatePath(`/admin/clientes/${clienteId}`); // Para la página de edición
        revalidatePath('/admin/clientes'); // Para la lista de clientes

        const outputValidation = ClienteParaEditarSchema.safeParse(clienteActualizado);
        if (!outputValidation.success) {
            console.error("Error de validación Zod en salida de actualizarClientePorId:", outputValidation.error.flatten());
            // Devolver datos crudos si la validación de salida falla, pero la DB se actualizó
            return { success: true, data: clienteActualizado as unknown as ClienteActualizadoOutput };
        }
        return { success: true, data: outputValidation.data };

    } catch (error: unknown) {
        console.error(`Error al actualizar cliente ${clienteId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && error.meta?.target && (error.meta.target as string[]).includes('email')) {
                return { success: false, error: `El email '${input.email}' ya está en uso.` };
            }
            if (error.code === 'P2025') {
                return { success: false, error: "Cliente no encontrado para actualizar." };
            }
        }
        return { success: false, error: `No se pudo actualizar el cliente. ${(error instanceof Error ? error.message : '')}` };
    }
}

// --- Archivar Cliente por ID ---
export async function archivarClientePorId(
    clienteId: string
): Promise<ActionResult<ClientePrisma>> { // Devuelve el cliente actualizado
    if (!clienteId) {
        return { success: false, error: "Se requiere el ID del cliente para archivar." };
    }
    try {
        const clienteArchivado = await prisma.cliente.update({
            where: { id: clienteId },
            data: { status: 'archivado' },
        });
        revalidatePath(`/admin/clientes/${clienteId}`);
        revalidatePath('/admin/clientes');
        return { success: true, data: clienteArchivado };
    } catch (error: unknown) {
        console.error(`Error al archivar cliente ${clienteId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Cliente no encontrado para archivar." };
        }
        return { success: false, error: `No se pudo archivar el cliente. ${(error instanceof Error ? error.message : '')}` };
    }
}

// --- (Opcional) Eliminar Cliente por ID ---
// export async function eliminarClientePorId(clienteId: string): Promise<ActionResult<null>> { ... }