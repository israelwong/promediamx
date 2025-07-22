// RUTA: app/admin/clientes/[clienteId]/negocios/[negocioId]/kanban/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { Columns } from 'lucide-react';

import { obtenerDatosPipelineKanbanAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import RealtimePipelineView from './components/RealtimePipelineView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Pipeline de Ventas',
};

interface KanbanPageParams {
    clienteId: string;
    negocioId: string;
}

export default async function page({ params }: { params: Promise<KanbanPageParams> }) {
    const { clienteId, negocioId } = await params;

    const kanbanResult = await obtenerDatosPipelineKanbanAction({ negocioId });

    if (!kanbanResult.success || !kanbanResult.data) {
        return <p className="p-6">Error al cargar los datos del pipeline.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Columns />
                    Pipeline de Ventas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Arrastra los leads para actualizar su etapa en el flujo de ventas.
                </p>
            </header>

            <RealtimePipelineView
                initialKanbanData={kanbanResult.data}
                clienteId={clienteId}
                negocioId={negocioId}
            />
        </div>
    );
}
