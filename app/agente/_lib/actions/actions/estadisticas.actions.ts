"use server";

import { cookies } from 'next/headers';
import prisma from '@/app/admin/_lib/prismaClient';
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions';
import { type ActionResult } from '@/app/admin/_lib/types';

// Definimos la "forma" de los datos que devolverá la acción
export interface EstadisticasAgenteData {
    leadsPorEtapa: {
        id: string;
        nombre: string;
        cantidad: number;
    }[];
    leadsPorEtiqueta: {
        id: string;
        nombre: string;
        color: string | null;
        cantidad: number;
    }[];
    leadsPorOferta: {
        nombre: string;
        cantidad: number;
    }[];
}

export async function obtenerEstadisticasAgenteAction(): Promise<ActionResult<EstadisticasAgenteData>> {
    try {
        // 1. Autenticación y obtención del contexto del agente
        const tokenCookie = (await cookies()).get('auth_token');
        if (!tokenCookie) return { success: false, error: "No autenticado." };
        const verificationResult = await verifyToken(tokenCookie.value);
        if (!verificationResult.success || !verificationResult.payload) return { success: false, error: "Token inválido." };

        const agenteSession = verificationResult.payload;

        const agenteConOfertas = await prisma.agente.findUnique({
            where: { id: agenteSession.id },
            select: { crmId: true, ofertasAsignadas: { select: { oferta: { select: { nombre: true } } } } }
        });

        if (!agenteConOfertas?.crmId) return { success: false, error: "Agente no encontrado o sin CRM asignado." };

        const { crmId } = agenteConOfertas;
        const nombresOfertas = agenteConOfertas.ofertasAsignadas.map(oa => oa.oferta.nombre);


        if (nombresOfertas.length === 0) {
            return { success: true, data: { leadsPorEtapa: [], leadsPorEtiqueta: [], leadsPorOferta: [] } };
        }


        // Cláusula 'where' reutilizable para filtrar leads del agente
        const whereLeadsAgente = {
            crmId: crmId,
            OR: nombresOfertas.map(nombre => ({ jsonParams: { path: ['colegio'], equals: nombre } }))
        };

        // 2. Consulta para Leads por Etapa del Pipeline
        const leadsAgrupadosPorEtapa = await prisma.lead.groupBy({
            by: ['pipelineId'],
            where: whereLeadsAgente,
            _count: { _all: true },
        });

        const etapasDelCrm = await prisma.pipelineCRM.findMany({ where: { crmId } });
        const leadsPorEtapa = etapasDelCrm.map(etapa => ({
            id: etapa.id,
            nombre: etapa.nombre,
            cantidad: leadsAgrupadosPorEtapa.find(g => g.pipelineId === etapa.id)?._count._all || 0,
        }));

        // 3. Consulta para Leads por Etiqueta
        const leadsDelAgenteIds = (await prisma.lead.findMany({ where: whereLeadsAgente, select: { id: true } })).map(l => l.id);

        let leadsPorEtiqueta: EstadisticasAgenteData['leadsPorEtiqueta'] = [];
        if (leadsDelAgenteIds.length > 0) {
            const leadsAgrupadosPorEtiqueta = await prisma.leadEtiqueta.groupBy({
                by: ['etiquetaId'],
                where: { leadId: { in: leadsDelAgenteIds } },
                _count: { leadId: true },
            });

            const etiquetasDelCrm = await prisma.etiquetaCRM.findMany({ where: { crmId } });
            leadsPorEtiqueta = etiquetasDelCrm.map(etiqueta => ({
                id: etiqueta.id,
                nombre: etiqueta.nombre,
                color: etiqueta.color,
                cantidad: leadsAgrupadosPorEtiqueta.find(g => g.etiquetaId === etiqueta.id)?._count.leadId || 0,
            })).filter(e => e.cantidad > 0); // Solo mostramos etiquetas que se estén usando
        }

        // Obtener los leads para ofertas
        const leadsParaOfertas = await prisma.lead.findMany({ where: whereLeadsAgente, select: { jsonParams: true } });

        const conteoPorOferta: { [key: string]: number } = {};
        leadsParaOfertas.forEach(lead => {
            const colegio = (lead.jsonParams as { colegio?: string })?.colegio;
            if (colegio) {
                conteoPorOferta[colegio] = (conteoPorOferta[colegio] || 0) + 1;
            }
        });
        const leadsPorOferta = Object.entries(conteoPorOferta).map(([nombre, cantidad]) => ({ nombre, cantidad }));


        // --- Devolvemos el nuevo dato en el objeto de respuesta ---
        return { success: true, data: { leadsPorEtapa, leadsPorEtiqueta, leadsPorOferta } };

    } catch (error) {
        console.error("Error al obtener estadísticas del agente:", error);
        return { success: false, error: "No se pudieron cargar las estadísticas." };
    }
}