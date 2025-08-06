import { cookies } from 'next/headers';
import { verifyToken } from '../_lib/actions/auth.actions';
import { redirect } from 'next/navigation';
import { obtenerDatosPipelineAgente } from '@/app/admin/_lib/actions/agente/agente.actions';
import { Metadata } from 'next';
import PipelineKanbanBoard from './kanban/components/PipelineKanbanBoard'; // Ajustamos la ruta al componente
import { KanbanBoardData } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import prisma from '@/app/admin/_lib/prismaClient';
import { Button } from '@/app/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: "Mi Pipeline de Prospectos",
    description: "Gestiona tus leads a través de las etapas del pipeline.",
};

// Componente de Cabecera (Reutilizable)
function HeaderPage({ title, children }: { title: string, children?: React.ReactNode }) {
    return (
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">{title}</h1>
            <div className="flex items-center gap-2">{children}</div>
        </header>
    );
}

export default async function AgenteDashboardPage() {
    const tokenCookie = (await cookies()).get('auth_token');
    if (!tokenCookie) {
        redirect('/agente/login');
    }

    const verificationResult = await verifyToken(tokenCookie.value);
    if (!verificationResult.success || !verificationResult.payload) {
        redirect('/agente/login');
    }

    const agenteSession = verificationResult.payload;

    const agenteCompleto = await prisma.agente.findUnique({
        where: { id: agenteSession.id },
        include: {
            crm: {
                include: {
                    negocio: {
                        select: {
                            clienteId: true,
                        }
                    }
                }
            }
        }
    });

    if (!agenteCompleto || !agenteCompleto.crm || !agenteCompleto.crm.negocioId || !agenteCompleto.crm.negocio.clienteId) {
        return <div className="p-8 text-red-500">Error: No se pudo cargar la información de negocio del agente.</div>;
    }

    const negocioId = agenteCompleto.crm.negocioId;
    const clienteId = agenteCompleto.crm.negocio.clienteId;

    const pipelineResult = await obtenerDatosPipelineAgente(agenteSession.id);

    if (!pipelineResult.success || !pipelineResult.data) {
        return <div className="p-8 text-red-500">Error: {pipelineResult.error}</div>;
    }

    const { leads, etapasPipeline } = pipelineResult.data;

    const initialBoardData: KanbanBoardData = {
        columns: etapasPipeline.map(etapa => ({
            id: etapa.id,
            nombre: etapa.nombre,
            leads: leads.filter(lead => lead.pipelineId === etapa.id),
        }))
    };

    return (
        <div className="flex flex-col h-full">
            <HeaderPage title="Mi Pipeline de Prospectos">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href={`/agente/leads/nuevo`}> {/* O una ruta específica para agentes */}
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Prospecto
                    </Link>
                </Button>
            </HeaderPage>

            <div className="flex-grow">
                <PipelineKanbanBoard
                    initialBoardData={initialBoardData}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>
        </div>
    );
}