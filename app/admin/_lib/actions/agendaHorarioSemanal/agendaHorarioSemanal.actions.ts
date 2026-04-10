'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
// import { Prisma } from '@prisma/client'; // Para DiaSemana si es necesario, aunque z.nativeEnum lo maneja
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    HorarioAtencionData,
    GuardarHorariosAtencionInput,
    guardarHorariosAtencionInputSchema,
    // horarioAtencionItemSchema, // Para validar cada item en el array
} from './agendaHorarioSemanal.schemas';
import type { HorarioAtencion as HorarioAtencionPrisma } from '@prisma/client';


// Helper para parsear datos de Prisma al schema Zod
function parseToHorarioAtencionData(data: HorarioAtencionPrisma): HorarioAtencionData {
    // La validación con horarioAtencionDataSchema.parse(data) ocurrirá implícitamente 
    // si el tipo de retorno de la action usa HorarioAtencionData[]
    return {
        id: data.id,
        negocioId: data.negocioId,
        dia: data.dia,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
    };
}

export async function obtenerHorariosAtencionAction(
    negocioId: string
): Promise<ActionResult<HorarioAtencionData[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const horariosPrisma = await prisma.horarioAtencion.findMany({
            where: { negocioId },
            // orderBy: { dia: 'asc' }, // Prisma no puede ordenar por enum directamente así. Ordenar en el cliente o mapear a números.
        });
        // El orden se manejará en el cliente con DIAS_MAP
        const horariosData = horariosPrisma.map(parseToHorarioAtencionData);
        return { success: true, data: horariosData };
    } catch (error) {
        console.error("Error en obtenerHorariosAtencionAction:", error);
        return { success: false, error: "No se pudieron obtener los horarios de atención." };
    }
}

export async function guardarHorariosAtencionAction(
    input: GuardarHorariosAtencionInput
): Promise<ActionResult<HorarioAtencionData[]>> { // Devolver los horarios guardados
    const validation = guardarHorariosAtencionInputSchema.safeParse(input);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para guardar horarios.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }

    const { negocioId, horarios } = validation.data;

    try {
        // Validar cada horario individualmente (la refine ya lo hizo, pero una doble verificación no está de más si hay lógica compleja)
        for (const h of horarios) {
            if (h.horaInicio >= h.horaFin) { // Esta validación ya está en el .refine del schema
                return { success: false, error: `Para el día ${h.dia}, la hora de inicio (${h.horaInicio}) debe ser anterior a la hora de fin (${h.horaFin}).` };
            }
        }

        const savedHorariosPrisma = await prisma.$transaction(async (tx) => {
            await tx.horarioAtencion.deleteMany({ where: { negocioId } });
            if (horarios.length > 0) {
                // Prisma createMany no devuelve los registros creados con todos los adaptadores.
                // Por lo tanto, creamos uno por uno o hacemos un findMany después.
                // Para devolver los datos con IDs, es mejor crear uno por uno o hacer un findMany.
                // Aquí, optaremos por un findMany después para simplicidad de la transacción.
                await tx.horarioAtencion.createMany({
                    data: horarios.map(h => ({
                        negocioId,
                        dia: h.dia,
                        horaInicio: h.horaInicio,
                        horaFin: h.horaFin,
                    })),
                });
                return tx.horarioAtencion.findMany({ where: { negocioId } });
            }
            return []; // Si no hay horarios que guardar, devolver array vacío
        });

        revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/agenda`, 'page');
        const horariosData = savedHorariosPrisma.map(parseToHorarioAtencionData);
        return { success: true, data: horariosData };
    } catch (error) {
        console.error("Error en guardarHorariosAtencionAction:", error);
        // Podrías tener errores si, por ejemplo, el negocioId no existe.
        return { success: false, error: "No se pudieron guardar los horarios de atención." };
    }
}