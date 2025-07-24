/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/[leadId]/page.tsx
  ✅ REFACTORIZADO: Se corrige el manejo de 'params' para evitar el error de renderizado dinámico.
*/
import React from 'react';
import { Metadata } from 'next';
import prisma from '@/app/admin/_lib/prismaClient';
import LeadForm from './components/LeadForm';
import { notFound } from 'next/navigation';
import type { Lead, Agenda } from '@prisma/client';

export const metadata: Metadata = { title: 'Detalles del Lead' };

interface LeadPageProps {
    params: {
        clienteId: string;
        negocioId: string;
        leadId: string;
    };
}

export default async function LeadPage({ params }: { params: Promise<LeadPageProps['params']> }) {
    const resolvedParams = await params;
    const { clienteId, negocioId, leadId } = resolvedParams;

    if (!negocioId) {
        throw new Error("El ID del negocio no se encontró en la URL. La ruta es incorrecta.");
    }

    const isNewLead = leadId === 'nuevo';

    const crmData = await prisma.cRM.findUnique({
        where: { negocioId },
        select: {
            id: true,
            Pipeline: { orderBy: { orden: 'asc' } },
            negocio: {
                select: {
                    agendaTipoCita: { where: { activo: true }, orderBy: { orden: 'asc' } }
                }
            }
        }
    });

    if (!crmData) {
        return notFound();
    }

    let lead: (Lead & { Agenda: Agenda[] }) | null = null;
    if (!isNewLead) {
        lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { Agenda: { where: { status: 'PENDIENTE' } } }
        });
        if (!lead) {
            return notFound();
        }
    }

    return (
        <LeadForm
            clienteId={clienteId}
            negocioId={negocioId}
            crmId={crmData.id}
            initialLeadData={lead || undefined}
            etapasPipeline={crmData.Pipeline}
            tiposDeCita={crmData.negocio.agendaTipoCita}
        />
    );
}

