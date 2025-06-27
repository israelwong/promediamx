// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { Users } from 'lucide-react';

import { listarLeadsAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { obtenerDatosPipelineKanbanAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import RealtimeLeadsView from './components/RealtimeLeadsView';

export const metadata: Metadata = {
    title: 'Gestión de Leads',
};

// CORRECCIÓN 1: Definimos la interfaz para la promesa de parámetros
interface LeadsPageParams {
    clienteId: string;
    negocioId: string;
}

// CORRECCIÓN 2: La firma de la función ahora espera un objeto que contiene una promesa
export default async function LeadsPage({ params }: { params: Promise<LeadsPageParams> }) {

    // CORRECCIÓN 3: Usamos 'await' para obtener los IDs antes de usarlos
    const { clienteId, negocioId } = await params;

    const [leadsResult, kanbanResult] = await Promise.all([
        listarLeadsAction({ negocioId, page: 1, pageSize: 20 }),
        obtenerDatosPipelineKanbanAction({ negocioId }),
    ]);

    if (!leadsResult.success || !kanbanResult.success || !leadsResult.data || !kanbanResult.data) {
        return <p className="p-6">Error al cargar los datos iniciales de los leads.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Users />
                    Leads y Pipeline
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Gestiona todos tus contactos y visualiza el flujo de ventas.
                </p>
            </header>

            <RealtimeLeadsView
                initialLeadsData={leadsResult.data}
                initialKanbanData={kanbanResult.data}
                clienteId={clienteId}
                negocioId={negocioId}
            />
        </div>
    );
}