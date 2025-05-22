// app/admin/_lib/actions/agenteCrm/agenteCrm.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    listarAgentesCrmParamsSchema,
    ObtenerAgentesCrmResultData,
    AgenteCrmData,
    crearAgenteCrmParamsSchema,
    editarAgenteCrmParamsSchema,
    eliminarAgenteCrmParamsSchema,
    // Importar schema para validar salida si es necesario
    // agenteCrmSchema
} from './agenteCrm.schemas';
import { z } from 'zod';
import bcrypt from 'bcrypt'; // Para hashear passwords
// import { revalidatePath } from 'next/cache';

const SALT_ROUNDS = 10; // Para bcrypt

// Acción para obtener agentes y el crmId a partir del negocioId
export async function listarAgentesCrmAction(
    params: z.infer<typeof listarAgentesCrmParamsSchema>
): Promise<ActionResult<ObtenerAgentesCrmResultData>> {
    const validation = listarAgentesCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Agente: { // Relación en modelo CRM hacia Agente
                    orderBy: { nombre: 'asc' },
                    select: { // Seleccionar todos los campos de AgenteCrmData (excepto password)
                        id: true, crmId: true, userId: true, nombre: true, email: true,
                        telefono: true, rol: true, status: true, createdAt: true, updatedAt: true,
                        _count: { select: { Lead: true } } // Conteo de leads
                    }
                },
            },
        });

        if (!crm) {
            return { success: true, data: { crmId: null, agentes: [] } };
        }

        const agentesData: AgenteCrmData[] = crm.Agente.map(agente => ({
            ...agente,
            nombre: agente.nombre ?? null,
            telefono: agente.telefono ?? null,
            rol: agente.rol as AgenteCrmData['rol'] ?? 'agente_ventas', // Cast y default
            status: agente.status as AgenteCrmData['status'] ?? 'activo', // Cast y default
            userId: agente.userId ?? null,
            _count: { Lead: agente._count?.Lead ?? 0 }
        }));

        return { success: true, data: { crmId: crm.id, agentes: agentesData } };
    } catch (error) {
        console.error(`Error en listarAgentesCrmAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar los agentes.' };
    }
}

// Acción para CREAR un nuevo AgenteCRM
export async function crearAgenteCrmAction(
    params: z.infer<typeof crearAgenteCrmParamsSchema>
): Promise<ActionResult<AgenteCrmData | null>> {
    const validation = crearAgenteCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear el agente.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, datos } = validation.data;

    try {
        const hashedPassword = await bcrypt.hash(datos.password, SALT_ROUNDS);

        const nuevoAgente = await prisma.agente.create({
            data: {
                crmId,
                nombre: datos.nombre,
                email: datos.email,
                telefono: datos.telefono,
                password: hashedPassword,
                rol: datos.rol,
                status: datos.status,
                // userId podría asociarse después o si se crea un Usuario global primero
            },
            select: { /* ... campos para AgenteCrmData ... */
                id: true, crmId: true, userId: true, nombre: true, email: true,
                telefono: true, rol: true, status: true, createdAt: true, updatedAt: true,
                _count: { select: { Lead: true } }
            }
        });
        // TODO: Revalidar path donde se listan los agentes
        const agenteData: AgenteCrmData = {
            ...nuevoAgente,
            nombre: nuevoAgente.nombre ?? null,
            telefono: nuevoAgente.telefono ?? null,
            rol: nuevoAgente.rol as AgenteCrmData['rol'] ?? 'agente_ventas',
            status: nuevoAgente.status as AgenteCrmData['status'] ?? 'activo',
            userId: nuevoAgente.userId ?? null,
            _count: { Lead: nuevoAgente._count?.Lead ?? 0 }
        };
        return { success: true, data: agenteData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if ((error.meta?.target as string[])?.includes('email')) {
                return { success: false, error: `El email '${datos.email}' ya está en uso.`, data: null };
            }
            // Podría haber otros constraints únicos como userId
        }
        return { success: false, error: 'No se pudo crear el agente.', data: null };
    }
}

// Acción para EDITAR un AgenteCRM existente
export async function editarAgenteCrmAction(
    params: z.infer<typeof editarAgenteCrmParamsSchema>
): Promise<ActionResult<AgenteCrmData | null>> {
    const validation = editarAgenteCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar el agente.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { agenteId, datos } = validation.data;

    try {
        const agenteActualizado = await prisma.agente.update({
            where: { id: agenteId },
            data: {
                nombre: datos.nombre,
                telefono: datos.telefono,
                rol: datos.rol,
                status: datos.status,
                // No actualizamos email ni password aquí
                updatedAt: new Date(),
            },
            select: { /* ... campos para AgenteCrmData ... */
                id: true, crmId: true, userId: true, nombre: true, email: true,
                telefono: true, rol: true, status: true, createdAt: true, updatedAt: true,
                _count: { select: { Lead: true } }
            }
        });
        // TODO: Revalidar path
        const agenteData: AgenteCrmData = {
            ...agenteActualizado,
            nombre: agenteActualizado.nombre ?? null,
            telefono: agenteActualizado.telefono ?? null,
            rol: agenteActualizado.rol as AgenteCrmData['rol'] ?? 'agente_ventas',
            status: agenteActualizado.status as AgenteCrmData['status'] ?? 'activo',
            userId: agenteActualizado.userId ?? null,
            _count: { Lead: agenteActualizado._count?.Lead ?? 0 }
        };
        return { success: true, data: agenteData };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Agente no encontrado.", data: null };
        }
        return { success: false, error: 'No se pudo actualizar el agente.', data: null };
    }
}

// Acción para ELIMINAR un AgenteCRM
export async function eliminarAgenteCrmAction(
    params: z.infer<typeof eliminarAgenteCrmParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarAgenteCrmParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de agente inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { agenteId } = validation.data;

    try {
        // Verificar si el agente tiene Leads asignados.
        // En el modelo Lead, `agenteId` es opcional y `onDelete: SetNull`.
        // Así que la eliminación debería funcionar, y los leads quedarían sin asignar.
        // Si quisieras impedir la eliminación, harías un count aquí:
        // const leadsAsignados = await prisma.lead.count({ where: { agenteId: agenteId } });
        // if (leadsAsociados > 0) {
        //     return { success: false, error: `Este agente tiene ${leadsAsociados} lead(s) asignado(s). Reasígnalos primero.`};
        // }

        const agenteEliminado = await prisma.agente.delete({ where: { id: agenteId }, select: { id: true } });
        // TODO: Revalidar path
        return { success: true, data: { id: agenteEliminado.id } };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Agente no encontrado." };
        }
        // P2003 podría ocurrir si hay otras relaciones que no son SetNull
        return { success: false, error: 'No se pudo eliminar el agente.' };
    }
}