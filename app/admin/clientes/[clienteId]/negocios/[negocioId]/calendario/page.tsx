/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/calendario/page.tsx
*/
import React from 'react';
import { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { headers } from 'next/headers';
// ✅ Se importa la nueva acción específica para el calendario
import { listarCitasParaCalendarioAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import RealtimeCalendarioView from './components/RealtimeCalendarioView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Calendario de Citas' };

interface CalendarioPageParams {
    clienteId: string;
    negocioId: string;
}

export default async function CalendarioPage({ params }: { params: Promise<CalendarioPageParams> }) {
    headers();
    const { negocioId, clienteId } = await params;

    // ✅ Se llama a la nueva acción para obtener los datos en el formato correcto
    const initialCitasResult = await listarCitasParaCalendarioAction({ negocioId });

    if (!initialCitasResult.success) {
        return <p className="p-6">Error al cargar las citas.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Calendar /> Calendario de Citas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Visualiza todas las citas de tu negocio en una vista de calendario.
                </p>
            </header>
            <RealtimeCalendarioView
                initialData={initialCitasResult.data || []}
                negocioId={negocioId}
                clienteId={clienteId}
            />
        </div>
    );
}