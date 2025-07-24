/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/page.tsx
*/
import React from 'react';
import { Metadata } from 'next';
import { CalendarClock } from 'lucide-react';
import { listarCitasAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import { CitasDataTable } from './components/data-table';
import { columns } from './components/columns';

export const metadata: Metadata = {
    title: 'Citas Agendadas',
};

interface CitasPageProps {
    params: {
        negocioId: string;
    };
    searchParams: {
        page?: string;
    }
}

// ✅ CORREGIDO: Se ajusta la firma para manejar los params y searchParams como una promesa.
export default async function CitasPage({ params: paramsPromise, searchParams: searchParamsPromise }: {
    params: Promise<CitasPageProps['params']>,
    searchParams: Promise<CitasPageProps['searchParams']>
}) {
    const params = await paramsPromise;
    const searchParams = await searchParamsPromise;
    const { negocioId } = params;
    const page = Number(searchParams.page) || 1;

    const citasResult = await listarCitasAction({ negocioId, page, pageSize: 15 });
    const citasData = citasResult.data || { citas: [], totalCount: 0, startIndex: 0 };

    return (
        // Se mantiene el layout flex para habilitar el scroll vertical
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <CalendarClock />
                    Citas Agendadas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Consulta todas las citas programadas y el estado de cada prospecto.
                </p>
            </header>

            <main className="flex-grow overflow-hidden">
                <CitasDataTable
                    columns={columns}
                    data={citasData.citas}
                    totalCount={citasData.totalCount}
                    startIndex={citasData.startIndex}
                />
            </main>
        </div>
    );
}
