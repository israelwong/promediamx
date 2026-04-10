// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/campanas/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { Megaphone } from 'lucide-react';
import { listarCampanasConEstadisticasAction } from '@/app/admin/_lib/actions/campana/campana.actions';
import ListaCampanas from './components/lista-campanas';

export const metadata: Metadata = {
    title: 'Gestión de Campañas',
};

interface CampanasPageParams {
    negocioId: string;
}

export default async function CampanasPage({ params }: { params: Promise<CampanasPageParams> }) {
    const { negocioId } = await params;

    const campanasResult = await listarCampanasConEstadisticasAction(negocioId);

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Megaphone />
                    Campañas Publicitarias
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Gestiona y monitorea el rendimiento de tus campañas de Meta.
                </p>
            </header>

            <main>
                <ListaCampanas
                    initialCampanas={campanasResult.success ? campanasResult.data ?? [] : []}
                    negocioId={negocioId}
                />
            </main>
        </div>
    );
}
