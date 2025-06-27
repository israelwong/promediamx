//ruta del archivo: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/page.tsx
import React from 'react';
import CitasManager from './components/CitasManager';
import { getCitasPorNegocioAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import { AlertTriangle, Calendar } from 'lucide-react';

import { Metadata } from 'next'


export const metadata: Metadata = {
    title: 'Editar Oferta',
    description: 'Editar oferta',
}
interface Props {
    negocioId: string
}

interface Props {
    negocioId: string;
}

export default async function Citas({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    const initialCitasResult = await getCitasPorNegocioAction(negocioId);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Calendar />
                    Gestor de Citas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Visualiza y gestiona todas las citas agendadas para tu negocio.
                </p>
            </header>

            {initialCitasResult.success ? (
                <CitasManager
                    initialCitas={initialCitasResult.data || []}
                    negocioId={negocioId}
                />
            ) : (
                <div className="p-10 text-center text-red-400 bg-red-900/20 rounded-lg border border-red-500/30">
                    <AlertTriangle className="mx-auto h-12 w-12" />
                    <p className="mt-4 font-semibold">Error al cargar las citas</p>
                    <p>{initialCitasResult.error}</p>
                </div>
            )}
        </div>
    );
}

