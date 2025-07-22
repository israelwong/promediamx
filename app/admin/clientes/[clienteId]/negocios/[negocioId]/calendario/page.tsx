// app/admin/clientes/[clienteId]/negocios/[negocioId]/calendario/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { headers } from 'next/headers';

import { listarCitasAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import RealtimeCalendarioView from './components/RealtimeCalendarioView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Calendario de Citas',
};

interface CalendarioPageParams {
    clienteId: string;
    negocioId: string;
}

export default async function CalendarioPage({ params }: { params: Promise<CalendarioPageParams> }) {
    const resolvedParams = await params;
    headers();
    const { negocioId, clienteId } = resolvedParams;

    // Esta página solo obtiene los datos iniciales para el calendario
    const initialCitasResult = await listarCitasAction({ negocioId });

    if (!initialCitasResult.success) {
        return <p className="p-6">Error al cargar las citas.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Calendar />
                    Calendario de Citas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Visualiza todas las citas de tu negocio en una vista de calendario.
                </p>
            </header>

            {/* Se renderiza el nuevo componente de cliente para el Calendario */}
            <RealtimeCalendarioView
                initialData={initialCitasResult.data || []}
                negocioId={negocioId}
                clienteId={clienteId}
            />
        </div>
    );
}
