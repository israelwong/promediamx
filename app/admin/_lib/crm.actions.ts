'use server';
import prisma from './prismaClient';
// import { CRM } from './types';

type CRMConConteo = {
    id: string;
    negocioId: string;
    status: string;
    _count: {
        Lead: number;
        Agente: number;
        // Puedes añadir Pipeline: number, Etiqueta: number, etc. si los necesitas
    };
};

export async function obtenerCRM(negocioId: string): Promise<CRMConConteo | null> {
    if (!negocioId) {
        console.warn("obtenerCRM llamado sin negocioId");
        return null;
    }
    try {
        const crm = await prisma.cRM.findUnique({
            where: {
                // Usar el índice único negocioId establecido en el schema
                negocioId: negocioId,
            },
            include: {
                // Incluir el conteo de las relaciones deseadas
                _count: {
                    select: {
                        Lead: true,
                        Agente: true,
                        // Puedes añadir Pipeline: true, Etiqueta: true, etc. si los necesitas
                    },
                },
                // No incluyas las relaciones completas (Lead: true, Agente: true)
                // si solo necesitas los conteos para optimizar la consulta.
                // Solo incluye otros campos directos de CRM si los necesitas (ej: status)
                // select: { id: true, status: true, _count: true } // Ejemplo de selección explícita
            },
        });
        return crm as CRMConConteo | null; // Castear al tipo con conteo
    } catch (error) {
        console.error(`Error al obtener CRM para el negocio ${negocioId}:`, error);
        // Lanza el error para que el componente lo capture o devuelve null
        throw new Error("Error al obtener la información del CRM.");
        // Opcionalmente: return null;
    }
}