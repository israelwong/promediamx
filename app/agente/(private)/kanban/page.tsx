import React from 'react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import prisma from '@/app/admin/_lib/prismaClient';
import { obtenerDatosPipelineAgente } from '@/app/admin/_lib/actions/agente/agente.actions';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { PlusCircle } from 'lucide-react';
import RealtimeKanbanView from './components/RealtimeKanbanView';

export const metadata: Metadata = {
    title: "Mi Pipeline de Prospectos",
    description: "Gestiona tus leads a través de las etapas del pipeline.",
};

// Componente de Cabecera (sin cambios)
function HeaderPage({ title, children }: { title: string, children?: React.ReactNode }) {
    return (
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">{title}</h1>
            <div className="flex items-center gap-2">{children}</div>
        </header>
    );
}

export default async function KanbanPage() {
    const tokenCookie = (await cookies()).get('auth_token');
    if (!tokenCookie) redirect('/agente/login');

    const verificationResult = await verifyToken(tokenCookie.value);
    if (!verificationResult.success || !verificationResult.payload) redirect('/agente/login');

    const agenteSession = verificationResult.payload;

    // --- CAMBIO CLAVE: Obtenemos toda la información necesaria en una sola consulta ---
    const agenteCompleto = await prisma.agente.findUnique({
        where: { id: agenteSession.id },
        select: {
            crm: {
                select: {
                    id: true, // crmId para el canal de Supabase
                    negocioId: true, // negocioId para las acciones
                    negocio: { select: { clienteId: true } } // clienteId para las acciones
                }
            }
        }
    });

    // Validamos que todos los IDs necesarios existan
    if (!agenteCompleto?.crm?.id || !agenteCompleto.crm.negocioId || !agenteCompleto.crm.negocio?.clienteId) {
        return <div className="p-8 text-red-500">Error: Faltan datos críticos de CRM/Negocio para el agente.</div>;
    }

    const { id: crmId, negocioId, negocio: { clienteId } } = agenteCompleto.crm;

    const pipelineResult = await obtenerDatosPipelineAgente(agenteSession.id);
    if (!pipelineResult.success || !pipelineResult.data) {
        return <div className="p-8 text-red-500">Error: {pipelineResult.error}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <HeaderPage title="Mi Pipeline de Prospectos">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/agente/leads/nuevo">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Prospecto
                    </Link>
                </Button>
            </HeaderPage>

            <div className="flex-grow">
                {/* --- CAMBIO CLAVE: Pasamos los IDs explícitamente como props --- */}
                <RealtimeKanbanView
                    initialBoardData={pipelineResult.data}
                    crmId={crmId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>
        </div>
    );
}