'use server';

import { ZodObject, ZodRawShape } from 'zod';

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ExcepcionHorarioData,
    UpsertExcepcionHorarioFormInput,
    upsertExcepcionHorarioFormSchema,
    excepcionHorarioDataSchema
} from './agendaExcepcionHorario.schemas';
import type { ExcepcionHorario as ExcepcionHorarioPrisma } from '@prisma/client';

// Helper para parsear datos de Prisma al schema Zod (convirtiendo Date a string YYYY-MM-DD)
function parseToExcepcionHorarioData(exPrisma: ExcepcionHorarioPrisma): ExcepcionHorarioData {
    const dataForZod = {
        ...exPrisma,
        fecha: exPrisma.fecha.toISOString().split('T')[0], // Convertir Date a YYYY-MM-DD string
    };
    // Validar con el schema de Zod para asegurar la forma y tipos correctos
    return excepcionHorarioDataSchema.parse(dataForZod);
}

export async function obtenerExcepcionesHorarioAction(
    negocioId: string
): Promise<ActionResult<ExcepcionHorarioData[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const excepcionesPrisma = await prisma.excepcionHorario.findMany({
            where: { negocioId },
            orderBy: { fecha: 'asc' },
        });
        const excepcionesData = excepcionesPrisma.map(parseToExcepcionHorarioData);
        return { success: true, data: excepcionesData };
    } catch (error) {
        console.error("Error en obtenerExcepcionesHorarioAction:", error);
        return { success: false, error: "No se pudieron obtener las excepciones de horario." };
    }
}

export async function crearExcepcionHorarioAction(
    negocioId: string,
    inputData: UpsertExcepcionHorarioFormInput
): Promise<ActionResult<ExcepcionHorarioData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    const validation = upsertExcepcionHorarioFormSchema.safeParse(inputData);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para la excepción.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .filter(([v]) => v !== undefined)
                    .map(([k, v]) => [k, v ?? []])
            ),
        };
    }
    const { fecha, descripcion, esDiaNoLaborable, horaInicio, horaFin } = validation.data;

    try {
        // Convertir fecha string a Date object para Prisma, interpretándola como UTC para evitar problemas de timezone
        const fechaDate = new Date(fecha + "T00:00:00.000Z");

        const nuevaExcepcionPrisma = await prisma.excepcionHorario.create({
            data: {
                negocio: { connect: { id: negocioId } },
                fecha: fechaDate,
                descripcion,
                esDiaNoLaborable,
                horaInicio: !esDiaNoLaborable ? horaInicio : null,
                horaFin: !esDiaNoLaborable ? horaFin : null,
            }
        });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/agenda`, 'page');
        return { success: true, data: parseToExcepcionHorarioData(nuevaExcepcionPrisma) };
    } catch (error) {
        console.error("Error en crearExcepcionHorarioAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo @@unique([negocioId, fecha]) en tu schema Prisma
            return { success: false, error: `Ya existe una excepción para la fecha ${fecha}.` };
        }
        return { success: false, error: "No se pudo crear la excepción de horario." };
    }
}

export async function actualizarExcepcionHorarioAction(
    excepcionId: string,
    inputData: Partial<UpsertExcepcionHorarioFormInput> // Partial para actualizaciones
): Promise<ActionResult<ExcepcionHorarioData>> {
    if (!excepcionId) {
        return { success: false, error: "ID de excepción no proporcionado." };
    }

    // Validar solo los campos que vienen. Usamos .partial() sobre el objeto base del schema.
    // upsertExcepcionHorarioFormSchema es un ZodEffects anidado, así que accedemos al schema interno dos veces.

    // Extraer el objeto base del esquema anidado de ZodEffects
    const baseObjectSchema = (upsertExcepcionHorarioFormSchema.innerType().innerType() as ZodObject<ZodRawShape>).partial();

    const validation = baseObjectSchema.safeParse(inputData);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para actualizar la excepción.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .map(([k, v]) => [k, v ?? []])
            ),
        };
    }
    const dataToUpdate = validation.data;
    if (Object.keys(dataToUpdate).length === 0) {
        return { success: false, error: "No se proporcionaron datos para actualizar." };
    }

    // Preparar datos para Prisma, convirtiendo fecha si es necesario
    const prismaData: Prisma.ExcepcionHorarioUpdateInput = { ...dataToUpdate };
    if (dataToUpdate.fecha) {
        prismaData.fecha = new Date(dataToUpdate.fecha + "T00:00:00.000Z");
    }
    // Si esDiaNoLaborable cambia, ajustar horas
    if (dataToUpdate.esDiaNoLaborable === true) {
        prismaData.horaInicio = null;
        prismaData.horaFin = null;
    } else if (dataToUpdate.esDiaNoLaborable === false) {
        // Si se marca como horario especial, se espera que horaInicio/horaFin vengan o ya existan
        // La validación de Zod (refine) ya cubre que estén si esDiaNoLaborable es false.
        if (dataToUpdate.horaInicio !== undefined) prismaData.horaInicio = dataToUpdate.horaInicio;
        if (dataToUpdate.horaFin !== undefined) prismaData.horaFin = dataToUpdate.horaFin;
    }


    try {
        const excepcionActualizadaPrisma = await prisma.excepcionHorario.update({
            where: { id: excepcionId },
            data: prismaData,
        });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${excepcionActualizadaPrisma.negocioId}/agenda`, 'page');
        return { success: true, data: parseToExcepcionHorarioData(excepcionActualizadaPrisma) };
    } catch (error) {
        console.error("Error en actualizarExcepcionHorarioAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: "Excepción de horario no encontrada." };
            }
            if (error.code === 'P2002' && dataToUpdate.fecha) {
                return { success: false, error: `Ya existe una excepción para la fecha ${dataToUpdate.fecha}.` };
            }
        }
        return { success: false, error: "No se pudo actualizar la excepción de horario." };
    }
}

export async function eliminarExcepcionHorarioAction(
    excepcionId: string
): Promise<ActionResult<null>> {
    if (!excepcionId) return { success: false, error: "ID de excepción no proporcionado." };
    try {
        const excepcion = await prisma.excepcionHorario.findUnique({
            where: { id: excepcionId },
            select: { negocioId: true }
        });
        if (!excepcion) return { success: false, error: "Excepción no encontrada." };

        await prisma.excepcionHorario.delete({ where: { id: excepcionId } });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${excepcion.negocioId}/agenda`, 'page');
        return { success: true, data: null };
    } catch (error) {
        console.error("Error en eliminarExcepcionHorarioAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Excepción de horario no encontrada." };
        }
        return { success: false, error: "No se pudo eliminar la excepción de horario." };
    }
}