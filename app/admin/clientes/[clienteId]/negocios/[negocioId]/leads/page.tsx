// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { Users } from 'lucide-react';
import { headers } from 'next/headers';

import { listarLeadsAction } from '@/app/admin/_lib/actions/lead/lead.actions';
// ✅ Se importa el nuevo componente de cliente, más específico.
import RealtimeLeadList from './components/RealtimeLeadList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Lista de Leads',
};

interface LeadsPageParams {
    clienteId: string;
    negocioId: string;
}

export default async function LeadsPage({ params }: { params: Promise<LeadsPageParams> }) {
    const resolvedParams = await params;
    headers();
    const { clienteId, negocioId } = resolvedParams;

    // ✅ La página ahora solo obtiene los datos para la lista de leads.
    const leadsResult = await listarLeadsAction({ negocioId, page: 1, pageSize: 20 });

    if (!leadsResult.success || !leadsResult.data) {
        return <p className="p-6">Error al cargar la lista de leads.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Users />
                    Lista de Leads
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Busca, filtra y gestiona todos tus contactos.
                </p>
            </header>

            {/* ✅ El componente de vista ahora es más simple y solo maneja la lista. */}
            <RealtimeLeadList
                initialLeadsData={leadsResult.data}
                clienteId={clienteId}
                negocioId={negocioId}
            />
        </div>
    );
}
