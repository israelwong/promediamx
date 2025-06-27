// app/admin/_lib/actions/dashboard/dashboard.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { getDashboardDataParamsSchema, type DashboardData } from './dashboard.schemas';
import { z } from 'zod';
import { StatusAgenda } from '@prisma/client';

export async function getDashboardDataAction(
    params: z.infer<typeof getDashboardDataParamsSchema>
): Promise<ActionResult<DashboardData>> {

    const validation = getDashboardDataParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }
    const { negocioId } = validation.data;

    try {
        // --- Lógica de Fechas ---
        // Nota: Esto usa la zona horaria del servidor.
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        hace7Dias.setHours(0, 0, 0, 0);

        // --- Consultas en Paralelo con una Transacción ---
        const [
            conversacionesActivas,
            leadsNuevosHoy,
            citasAgendadasHoy,
            pipelineData,
            appointmentStatusData,
            knowledgeGapsGenerales,
            knowledgeGapsOfertas,
        ] = await prisma.$transaction([
            // 1. KPI: Conversaciones Activas
            prisma.conversacion.count({
                where: {
                    lead: { crm: { negocioId } },
                    status: { notIn: ['archivada', 'cerrada'] },
                },
            }),
            // 2. KPI: Leads Nuevos Hoy
            prisma.lead.count({
                where: {
                    crm: { negocioId },
                    createdAt: { gte: hoyInicio },
                },
            }),
            // 3. KPI: Citas Agendadas Hoy
            prisma.agenda.count({
                where: {
                    negocioId,
                    createdAt: { gte: hoyInicio },
                    status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                },
            }),
            // 4. Datos para el gráfico de Pipeline
            prisma.pipelineCRM.findMany({
                where: { crm: { negocioId } },
                select: {
                    id: true,
                    nombre: true,
                    _count: {
                        select: { Lead: true },
                    },
                },
                orderBy: { orden: 'asc' },
            }),
            // 5. Datos para el gráfico de Citas (últimos 7 días)
            prisma.agenda.groupBy({
                by: ['status'],
                where: {
                    negocioId,
                    fecha: { gte: hace7Dias },
                },
                orderBy: {
                    status: 'asc',
                },
                _count: {
                    id: true,
                },
            }),
            // 6. Knowledge Gaps Generales
            prisma.negocioConocimientoItem.count({
                where: {
                    negocioId,
                    estado: 'PENDIENTE_RESPUESTA',
                },
            }),
            // 7. Knowledge Gaps de Ofertas
            prisma.preguntaSinRespuestaOferta.count({
                where: {
                    oferta: { negocioId },
                    estado: 'PENDIENTE_REVISION',
                },
            }),
        ]);

        // --- Ensamblaje del Objeto de Respuesta ---
        const dashboardData: DashboardData = {
            kpis: {
                conversacionesActivas,
                leadsNuevosHoy,
                citasAgendadasHoy,
            },
            pipelineStatus: pipelineData.map(stage => ({
                id: stage.id,
                nombre: stage.nombre,
                leadCount: stage._count.Lead,
            })),
            appointmentStatus: appointmentStatusData.map(status => ({
                status: status.status, // ej: "PENDIENTE", "CANCELADA"
                count: typeof status._count === 'object' && status._count !== null && typeof status._count.id === 'number' ? status._count.id : 0,
            })),
            actionItems: {
                // NOTA: Este es un placeholder. Se necesita una tabla o lógica para errores reales.
                erroresAsistente: 0,
                knowledgeGapsGenerales,
                knowledgeGapsOfertas,
            },
        };

        return { success: true, data: dashboardData };

    } catch (error) {
        console.error("Error en getDashboardDataAction:", error);
        return { success: false, error: "No se pudieron cargar los datos del panel." };
    }
}