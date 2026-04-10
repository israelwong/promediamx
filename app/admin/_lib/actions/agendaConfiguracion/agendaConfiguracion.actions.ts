'use server';

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta la ruta a tu prismaClient si es diferente
import { revalidatePath } from 'next/cache';
import {
    AgendaConfiguracionData,
    UpsertAgendaConfiguracionFormInput,
    upsertAgendaConfiguracionFormSchema,
    agendaConfiguracionDataSchema
} from './agendaConfiguracion.schemas';
import type { ActionResult } from '@/app/admin/_lib/types'; // Asumiendo que ActionResult está aquí
import type { AgendaConfiguracion as AgendaConfiguracionPrisma } from '@prisma/client'; // Tipo de Prisma

// Función helper para parsear y validar datos de Prisma con nuestro schema Zod
function parseAndValidatePrismaData(prismaData: AgendaConfiguracionPrisma): AgendaConfiguracionData {
    const validation = agendaConfiguracionDataSchema.safeParse(prismaData);
    if (!validation.success) {
        // Este error es crítico e indica una discrepancia entre Prisma y Zod o datos corruptos
        console.error("Error de validación interna (Prisma a Zod):", validation.error.flatten());
        throw new Error("Discrepancia de datos internos al procesar AgendaConfiguracion.");
    }
    return validation.data;
}

export async function obtenerAgendaConfiguracionAction(
    negocioId: string
): Promise<ActionResult<AgendaConfiguracionData | null>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const configPrisma = await prisma.agendaConfiguracion.findUnique({
            where: { negocioId },
        });

        if (!configPrisma) {
            return { success: true, data: null }; // No es un error, simplemente no existe configuración aún
        }
        return { success: true, data: parseAndValidatePrismaData(configPrisma) };
    } catch (error) {
        console.error("Error en obtenerAgendaConfiguracionAction:", error);
        if (error instanceof Error && error.message.startsWith("Discrepancia de datos internos")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "No se pudo obtener la configuración de preferencias de agenda." };
    }
}

export async function upsertAgendaConfiguracionAction(
    negocioId: string,
    data: UpsertAgendaConfiguracionFormInput // Este tipo ya viene del formulario
): Promise<ActionResult<AgendaConfiguracionData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    const validation = upsertAgendaConfiguracionFormSchema.safeParse(data);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para preferencias.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }

    const validatedData = validation.data; // Datos listos para la BD (con nulls)

    try {
        const resultPrisma = await prisma.agendaConfiguracion.upsert({
            where: { negocioId },
            create: {
                negocioId,
                ...validatedData,
            },
            update: {
                ...validatedData,
            },
        });
        // Revalidar el path específico donde se muestra esta configuración.
        // El 'layout' puede ser necesario si la info afecta a un layout superior o rutas anidadas.
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/agenda`, 'page');

        return { success: true, data: parseAndValidatePrismaData(resultPrisma) };
    } catch (error) {
        console.error("Error en upsertAgendaConfiguracionAction:", error);
        if (error instanceof Error && error.message.startsWith("Discrepancia de datos internos")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "No se pudo guardar la configuración de preferencias de agenda." };
    }
}


export async function obtenerConfiguracionAgendaAction(negocioId: string) {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    try {
        const [horarios, excepciones] = await Promise.all([
            prisma.horarioAtencion.findMany({
                where: { negocioId: negocioId },
            }),
            prisma.excepcionHorario.findMany({
                where: { negocioId: negocioId, fecha: { gte: new Date() } }, // Solo excepciones futuras
            }),
        ]);

        return { success: true, data: { horarios, excepciones } };

    } catch {
        return { success: false, error: "No se pudo cargar la configuración de la agenda." };
    }
}