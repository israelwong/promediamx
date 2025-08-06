import React from 'react';
import { Metadata } from 'next';
import { CalendarClock } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions';
import { listarCitasParaAgenteAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import { CitasDataTable } from './components/data-table';
import { columns } from './components/columns';

export const metadata: Metadata = {
    title: 'Mis Citas Agendadas',
};

// --- MEJORA: Se define una interfaz para las Props ---
interface AgentCitasPageProps {
    page?: string;
}

export default async function AgentCitasPage(searchParams: { params: Promise<AgentCitasPageProps> }) {
    const resolvedSearchParams = await searchParams.params;

    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');
    if (!tokenCookie) { redirect('/agente/login'); }

    const verificationResult = await verifyToken(tokenCookie.value);
    if (!verificationResult.success || !verificationResult.payload) { redirect('/agente/login'); }

    const agente = verificationResult.payload;
    const page = Number(resolvedSearchParams.page) || 1;

    const citasResult = await listarCitasParaAgenteAction({ agenteId: agente.id, page, pageSize: 15 });
    const citasData = citasResult.data || { citas: [], totalCount: 0, startIndex: 0 };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <CalendarClock />
                    Mis Citas Agendadas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Consulta todas las citas programadas para tus prospectos.
                </p>
            </header>

            <main className="flex-grow overflow-hidden">
                <CitasDataTable
                    columns={columns}
                    data={citasData.citas}
                    totalCount={citasData.totalCount}
                    startIndex={citasData.startIndex}
                    basePath="/agente/leads"
                />
            </main>
        </div>
    );
}