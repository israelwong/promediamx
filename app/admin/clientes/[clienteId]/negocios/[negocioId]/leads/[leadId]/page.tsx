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
            Etiqueta: { orderBy: { orden: 'asc' } }, // Se obtienen las etiquetas
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

    let lead: (Lead & { Agenda: Agenda[], Etiquetas: { etiquetaId: string }[] }) | null = null;
    if (!isNewLead) {
        lead = await prisma.lead.findUnique({
            where: { id: leadId },
            // ✅ Se incluyen las etiquetas ya asignadas al lead
            include: {
                Agenda: { where: { status: 'PENDIENTE' } },
                Etiquetas: { select: { etiquetaId: true } }
            }
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
            etiquetasDisponibles={crmData.Etiqueta} // Se pasan las etiquetas al formulario
            tiposDeCita={crmData.negocio.agendaTipoCita}
        />
    );
}

