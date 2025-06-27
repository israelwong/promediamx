import React from 'react';
import { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { listarCitasAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import RealtimeCitasView from './components/RealtimeCitasView';

export const metadata: Metadata = {
    title: 'Citas Agendadas',
};

interface CitasPageProps {
    params: Promise<{
        clienteId: string;
        negocioId: string;
    }>;
}

export default async function CitasPage({ params }: CitasPageProps) {
    const { negocioId, clienteId } = await params;

    const initialCitasResult = await listarCitasAction({ negocioId });

    if (!initialCitasResult.success) {
        return <p className="p-6">Error al cargar las citas.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Calendar />
                    Citas Agendadas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Gestiona y visualiza todas las citas de tu negocio.
                </p>
            </header>

            <RealtimeCitasView
                initialData={initialCitasResult.data || []}
                negocioId={negocioId}
                clienteId={clienteId}
            />
        </div>
    );
}