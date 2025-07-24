// Ejemplo conceptual en: @/app/admin/_lib/crmEstadisticas.actions.ts
'use server';
import prisma from '../prismaClient';

export interface EstadisticasCRM {
    totalLeads: number;
    totalConversaciones: number; // Contar conversaciones vinculadas a leads de este CRM
    leadsPorPipeline: { nombre: string; count: number }[];
    leadsPorCanal: { nombre: string; count: number }[];
    leadsPorEtiqueta: { nombre: string; count: number }[]; // Contar por etiquetas asignadas a leads
    agendaPorStatus: { status: string; count: number }[];
}

export async function obtenerEstadisticasCRM(crmId: string): Promise<EstadisticasCRM> {
    if (!crmId) throw new Error("CRM ID es requerido");

    try {
        // Usar $transaction para ejecutar múltiples agregaciones
        const [
            totalLeads,
            totalConversaciones, // Necesita lógica para contar convos de leads del CRM
            leadsPorPipelineData,
            leadsPorCanalData,
            leadsPorEtiquetaData, // Necesita query sobre LeadEtiqueta y join
            agendaPorStatusData
        ] = await prisma.$transaction([
            prisma.lead.count({ where: { crmId } }),
            prisma.conversacion.count({ where: { lead: { crmId } } }), // Ejemplo de conteo de conversaciones
            prisma.lead.groupBy({
                by: ['pipelineId'],
                where: { crmId, pipelineId: { not: null } },
                _count: { pipelineId: true },
                orderBy: { pipelineId: 'asc' }, // Add orderBy clause
            }),
            prisma.lead.groupBy({
                by: ['canalId'],
                where: { crmId, canalId: { not: null } },
                _count: { canalId: true },
                orderBy: { canalId: 'asc' }, // Add orderBy clause
            }),
            prisma.leadEtiqueta.groupBy({ // Agrupar por etiqueta en la tabla intermedia
                by: ['etiquetaId'],
                where: { lead: { crmId } }, // Filtrar por leads del CRM
                _count: { etiquetaId: true },
                orderBy: { etiquetaId: 'asc' }, // Add orderBy clause
            }),
            prisma.agenda.groupBy({
                by: ['status'],
                where: {
                    lead: { crmId: crmId }
                },
                _count: { status: true },
                orderBy: { status: 'asc' }, // Add orderBy clause
            }),
            prisma.agenda.groupBy({
                by: ['status'],
                where: {
                    // Filtrar por leads asociados al CRM actual
                    // O si la agenda se relaciona directo al CRM, usar crmId
                    lead: { crmId: crmId }
                    // Opcional: Filtrar por rango de fechas si quieres (ej: solo pendientes de hoy/esta semana)
                    // fecha: { gte: new Date() } // Ejemplo: solo futuras/pendientes
                },
                _count: { status: true },
                orderBy: { status: 'asc' }, // Add orderBy clause
            }),

        ]);

        // Mapear IDs a Nombres (requiere consultas adicionales o joins más complejos)
        // Esta parte es simplificada, necesitarás obtener los nombres reales
        const pipelineMap = await prisma.pipelineCRM.findMany({ where: { crmId }, select: { id: true, nombre: true } });
        const canalMap = await prisma.canalCRM.findMany({ where: { crmId }, select: { id: true, nombre: true } });
        const etiquetaMap = await prisma.etiquetaCRM.findMany({ where: { crmId }, select: { id: true, nombre: true } });

        const leadsPorPipeline = leadsPorPipelineData.map(item => ({
            nombre: pipelineMap.find(p => p.id === item.pipelineId)?.nombre || 'Desconocido',
            count: typeof item._count === 'object' && item._count.pipelineId ? item._count.pipelineId : 0
        })).sort((a, b) => b.count - a.count); // Ordenar descendente

        const leadsPorCanal = leadsPorCanalData.map(item => ({
            nombre: canalMap.find(c => c.id === item.canalId)?.nombre || 'Desconocido',
            count: typeof item._count === 'object' && 'canalId' in item._count ? item._count.canalId ?? 0 : 0
        })).sort((a, b) => b.count - a.count);

        const leadsPorEtiqueta = leadsPorEtiquetaData.map(item => ({
            nombre: etiquetaMap.find(e => e.id === item.etiquetaId)?.nombre || 'Desconocida',
            count: typeof item._count === 'object' && 'etiquetaId' in item._count ? item._count.etiquetaId ?? 0 : 0
        })).sort((a, b) => (b.count || 0) - (a.count || 0));


        // **NUEVO: Formatear datos de agenda**
        const formattedAgendaPorStatus = agendaPorStatusData.map(item => ({
            status: item.status, // El status ya es el nombre
            count: typeof item._count === 'object' && 'status' in item._count ? item._count.status ?? 0 : 0
        })).sort((a, b) => (b.count ?? 0) - (a.count ?? 0)); // Ordenar por cantidad



        return {
            totalLeads,
            totalConversaciones,
            leadsPorPipeline,
            leadsPorCanal,
            leadsPorEtiqueta,
            agendaPorStatus: formattedAgendaPorStatus, // Devolver los nuevos datos

        };

    } catch (error) {
        console.error(`Error fetching stats for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener las estadísticas del CRM.');
    }
}