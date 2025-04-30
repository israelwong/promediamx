'use server';
import prisma from './prismaClient';
// import { Lead } from './types';

export async function obtenerLeads(crmId: string) {
    const leads = await prisma.lead.findMany({
        where: {
            crmId: crmId,
        },
        select: {
            id: true,
            crmId: true,
            crm: true, // Relación inversa opcional
            agenteId: true,
            agente: true, // Relación opcional
            canalId: true,
            Canal: true, // Relación opcional (usar nombre consistente)
            pipelineId: true, // Corregido typo
            Pipeline: true, // Relación opcional (usar nombre consistente)
            nombre: true,
            email: true, // Hecho opcional
            telefono: true, // Hecho opcional
            jsonParams: true, // Usar JsonValue si se importa
            valorEstimado: true, // Float? -> number | null
            status: true, // No opcional en schema
            createdAt: true, // No opcional en schema
            updatedAt: true, // No opcional en schema
        },
    });
    return leads;
}
