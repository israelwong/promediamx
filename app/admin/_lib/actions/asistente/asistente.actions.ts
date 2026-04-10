'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
// import { Prisma } from '@prisma/client';

import {
    createAsistenteImplícitoSchema,
    updateWhatsAppConfigSchema,
    asistenteParaWhatsAppConfigSchema
} from './asistente.schemas';
import type { CreateAsistenteImplícitoInput, UpdateWhatsAppConfigInput, AsistenteParaWhatsAppConfig } from './asistente.schemas';

/**
 * REFACTORIZADO: Crea un asistente con un nombre por defecto y lo vincula a las tareas activas.
 */
export async function createAsistenteWithDefaultName(
    input: CreateAsistenteImplícitoInput
): Promise<AsistenteParaWhatsAppConfig | null> {
    const validationResult = createAsistenteImplícitoSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Input inválido para crear asistente:", validationResult.error);
        return null;
    }
    const { negocioId, nombreNegocio } = validationResult.data;
    const nombreAsistente = `Asistente para ${nombreNegocio}`;

    try {
        const nuevoAsistente = await prisma.$transaction(async (tx) => {
            const tareasActivas = await tx.tarea.findMany({
                where: { status: 'activo' },
                select: { id: true }
            });

            const asistenteCreado = await tx.asistenteVirtual.create({
                data: {
                    nombre: nombreAsistente,
                    negocioId: negocioId,
                    status: 'activo',
                    version: 1.0,
                    whatsappConnectionStatus: "NO_CONECTADO",
                }
            });

            if (tareasActivas.length > 0) {
                await tx.asistenteTareaSuscripcion.createMany({
                    data: tareasActivas.map(tarea => ({
                        asistenteVirtualId: asistenteCreado.id,
                        tareaId: tarea.id,
                        status: 'activo',
                    }))
                });
            }
            return asistenteCreado;
        });

        revalidatePath(`/admin/clientes/`); // Ruta general para actualizar
        const parsedData = asistenteParaWhatsAppConfigSchema.parse(nuevoAsistente);
        return parsedData;

    } catch (error) {
        console.error("Error en transacción de creación de asistente:", error);
        return null; // Devolvemos null para que el orquestador sepa que falló
    }
}

/**
 * NUEVA: Obtiene un asistente por el ID del negocio (gracias a la relación 1-a-1).
 */
export async function getAssistantByBusinessId(negocioId: string): Promise<AsistenteParaWhatsAppConfig | null> {
    if (!negocioId) return null;
    try {
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: { negocioId },
        });
        if (!asistente) return null;

        // Validamos la salida antes de enviarla al cliente
        const parsedData = asistenteParaWhatsAppConfigSchema.parse(asistente);
        return parsedData;

    } catch (error) {
        console.error("Error buscando asistente por negocio:", error);
        return null;
    }
}

/**
 * NUEVA: Actualiza la configuración de WhatsApp de un asistente.
 */
export async function updateWhatsAppConfig(
    asistenteId: string,
    input: UpdateWhatsAppConfigInput
): Promise<ActionResult<AsistenteParaWhatsAppConfig>> {
    const validationResult = updateWhatsAppConfigSchema.safeParse(input);
    if (!validationResult.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
    }

    try {
        const asistenteActualizado = await prisma.asistenteVirtual.update({
            where: { id: asistenteId },
            data: validationResult.data
        });

        // Aquí podrías añadir lógica para verificar la conexión con el nuevo token si lo deseas

        revalidatePath(`/admin/clientes/`); // Revalidar ruta

        const parsedData = asistenteParaWhatsAppConfigSchema.parse(asistenteActualizado);
        return { success: true, data: parsedData };

    } catch (error) {
        console.error(`Error actualizando config de WhatsApp para asistente ${asistenteId}:`, error);
        return { success: false, error: "No se pudo guardar la configuración." };
    }
}

