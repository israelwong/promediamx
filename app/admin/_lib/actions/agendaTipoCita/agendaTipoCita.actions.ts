'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    AgendaTipoCitaData,
    upsertAgendaTipoCitaFormInput,
    upsertAgendaTipoCitaFormSchema,
    ActualizarOrdenTiposCitaInput,
    actualizarOrdenTiposCitaSchema,
    // ordenAgendaTipoCitaItemSchema // No se usa directamente como tipo de parámetro
} from './agendaTipoCita.schemas';
import type { AgendaTipoCita as AgendaTipoCitaPrisma } from '@prisma/client';

// Helper para parsear datos de Prisma al schema Zod (si hay diferencias o para asegurar el contrato)
function parseToAgendaTipoCitaData(data: AgendaTipoCitaPrisma): AgendaTipoCitaData {
    // Aquí podrías añadir validación con agendaTipoCitaDataSchema.parse(data) si quieres ser estricto
    // Por ahora, asumimos que los campos son compatibles o se seleccionan correctamente.
    return {
        id: data.id,
        negocioId: data.negocioId,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        duracionMinutos: data.duracionMinutos ?? null,
        esVirtual: data.esVirtual,
        esPresencial: data.esPresencial,
        orden: data.orden ?? null, // Asegurar que el orden sea null si no está definido
        limiteConcurrencia: data.limiteConcurrencia, // Prisma asegura el default de 1
        activo: data.activo, // Prisma asegura el default de true
    };
}

export async function obtenerTiposCitaAction(
    negocioId: string
): Promise<ActionResult<AgendaTipoCitaData[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const tiposCitaDb = await prisma.agendaTipoCita.findMany({
            where: { negocioId: negocioId },
            orderBy: { orden: 'asc' },
            include: { // Incluir conteo de agendas asociadas
                _count: {
                    select: { agendas: true } // 'agendas' es el nombre de la relación en AgendaTipoCita
                }
            }
        });

        // Mapear y validar con Zod si es necesario, o asegurar que el tipo coincida
        // El tipo AgendaTipoCitaData incluye _count opcional.
        const data: AgendaTipoCitaData[] = tiposCitaDb.map((tc, index) => ({
            ...tc,
            orden: tc.orden ?? index,
            descripcion: tc.descripcion ?? null,
            duracionMinutos: tc.duracionMinutos ?? null,
            todoElDia: tc.todoElDia === null ? undefined : tc.todoElDia,
            _count: {
                agendas: tc._count?.agendas ?? 0,
            }
        }));

        return { success: true, data: data };
    } catch (error: unknown) {
        console.error(`Error obteniendo tipos de cita para negocio ${negocioId}:`, error);
        return { success: false, error: "No se pudieron obtener los tipos de cita." };
    }
}

export async function crearTipoCitaAction(
    negocioId: string,
    inputData: upsertAgendaTipoCitaFormInput
): Promise<ActionResult<AgendaTipoCitaData>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    const validation = upsertAgendaTipoCitaFormSchema.safeParse(inputData);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }
    const { nombre, descripcion, duracionMinutos, todoElDia, esVirtual, esPresencial, limiteConcurrencia } = validation.data;

    try {
        // Verificar unicidad de nombre DENTRO del negocio
        const existente = await prisma.agendaTipoCita.findFirst({
            where: { negocioId, nombre }
        });
        if (existente) {
            return { success: false, error: `El tipo de cita "${nombre}" ya existe para este negocio.` };
        }

        const ultimoTipoCita = await prisma.agendaTipoCita.findFirst({
            where: { negocioId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoTipoCita?.orden ?? -1) + 1;

        const nuevoTipoCitaPrisma = await prisma.agendaTipoCita.create({
            data: {
                negocio: { connect: { id: negocioId } },
                nombre,
                descripcion,
                duracionMinutos,
                todoElDia,
                esVirtual,
                esPresencial,
                limiteConcurrencia, // Ya tiene default de 1 en Zod si es null/undefined
                orden: nuevoOrden,
                // 'activo' tomará el default de true del schema Prisma
            }
        });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/agenda`, 'page');
        return { success: true, data: parseToAgendaTipoCitaData(nuevoTipoCitaPrisma) };
    } catch (error) {
        console.error("Error en crearTipoCitaAction:", error);
        // El P2002 por nombre global unique no se puede evitar fácilmente aquí si el nombre ya existe en OTRO negocio.
        // Si el unique es @@unique([negocioId, nombre]) en Prisma, este error es menos probable aquí.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `Ya existe un tipo de cita con el nombre "${nombre}" (globalmente). Considere un nombre diferente.` };
        }
        return { success: false, error: "No se pudo crear el tipo de cita." };
    }
}

export async function actualizarTipoCitaAction(
    tipoCitaId: string,
    inputData: Partial<upsertAgendaTipoCitaFormInput> // Partial para actualizaciones
): Promise<ActionResult<AgendaTipoCitaData>> {
    if (!tipoCitaId) return { success: false, error: "ID de tipo de cita no proporcionado." };

    // Validar solo los campos que vienen. Usamos .partial() del schema original.
    const validation = upsertAgendaTipoCitaFormSchema.partial().safeParse(inputData);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para actualizar.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }
    const dataToUpdate = validation.data;
    if (Object.keys(dataToUpdate).length === 0) {
        return { success: false, error: "No se proporcionaron datos para actualizar." };
    }

    try {
        // Si se actualiza el nombre, verificar unicidad dentro del negocio
        if (dataToUpdate.nombre) {
            const tipoCitaActual = await prisma.agendaTipoCita.findUnique({ where: { id: tipoCitaId }, select: { negocioId: true } });
            if (!tipoCitaActual) return { success: false, error: "Tipo de cita no encontrado." };

            const existenteConMismoNombre = await prisma.agendaTipoCita.findFirst({
                where: {
                    negocioId: tipoCitaActual.negocioId,
                    nombre: dataToUpdate.nombre,
                    id: { not: tipoCitaId } // Excluir el tipo de cita actual
                }
            });
            if (existenteConMismoNombre) {
                return { success: false, error: `El tipo de cita "${dataToUpdate.nombre}" ya existe para este negocio.` };
            }
        }

        const tipoCitaActualizadoPrisma = await prisma.agendaTipoCita.update({
            where: { id: tipoCitaId },
            data: {
                ...dataToUpdate,
                // Asegurarse que los campos opcionales se manejen correctamente si no vienen
                duracionMinutos: dataToUpdate.duracionMinutos === undefined ? undefined : (dataToUpdate.duracionMinutos ?? null),
                todoElDia: dataToUpdate.todoElDia === undefined ? undefined : (dataToUpdate.todoElDia ?? null),
                descripcion: dataToUpdate.descripcion === undefined ? undefined : (dataToUpdate.descripcion ?? null),
                limiteConcurrencia: dataToUpdate.limiteConcurrencia === undefined ? undefined : (dataToUpdate.limiteConcurrencia ?? 1),
            },
        });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${tipoCitaActualizadoPrisma.negocioId}/agenda`, 'page');
        return { success: true, data: parseToAgendaTipoCitaData(tipoCitaActualizadoPrisma) };
    } catch (error) {
        console.error("Error en actualizarTipoCitaAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // Record to update not found
                return { success: false, error: "Tipo de cita no encontrado." };
            }
            if (error.code === 'P2002') { // Unique constraint (global)
                return { success: false, error: `Ya existe un tipo de cita con el nombre "${dataToUpdate.nombre}" (globalmente).` };
            }
        }
        return { success: false, error: "No se pudo actualizar el tipo de cita." };
    }
}

export async function eliminarTipoCitaAction(
    tipoCitaId: string
): Promise<ActionResult<null>> { // Devuelve null en data si es exitoso
    if (!tipoCitaId) return { success: false, error: "ID de tipo de cita no proporcionado." };
    try {
        const agendasAsociadas = await prisma.agenda.count({ where: { tipoDeCitaId: tipoCitaId } });
        if (agendasAsociadas > 0) {
            return { success: false, error: `No se puede eliminar: ${agendasAsociadas} cita(s) agendadas usan este tipo.` };
        }

        const tipoCita = await prisma.agendaTipoCita.findUnique({
            where: { id: tipoCitaId },
            select: { negocioId: true }
        });
        if (!tipoCita) return { success: false, error: "Tipo de cita no encontrado." };

        await prisma.agendaTipoCita.delete({ where: { id: tipoCitaId } });
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${tipoCita.negocioId}/agenda`, 'page');
        return { success: true, data: null };
    } catch (error) {
        console.error("Error en eliminarTipoCitaAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Tipo de cita no encontrado." };
        }
        return { success: false, error: "No se pudo eliminar el tipo de cita." };
    }
}

export async function actualizarOrdenTiposCitaAction(
    input: ActualizarOrdenTiposCitaInput
): Promise<ActionResult<null>> {
    const validation = actualizarOrdenTiposCitaSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada para orden inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId, items } = validation.data;

    if (!items || items.length === 0) {
        return { success: true, data: null }; // Nada que actualizar
    }
    try {
        await prisma.$transaction(
            items.map(item =>
                prisma.agendaTipoCita.update({
                    where: { id: item.id, negocioId: negocioId }, // Asegurar que pertenezcan al negocio
                    data: { orden: item.orden },
                })
            )
        );
        revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/agenda`, 'page');
        return { success: true, data: null };
    } catch (error) {
        console.error("Error en actualizarOrdenTiposCitaAction:", error);
        // Prisma puede lanzar un error si algún ID no se encuentra o no pertenece al negocioId
        return { success: false, error: "Error al actualizar el orden de los tipos de cita." };
    }
}