// app/agente/prospectos/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { Users } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'; // Asumo que sigues necesitando esto por tu auth
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions';
import { listarLeadsParaAgenteAction, obtenerFiltrosParaAgenteAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { LeadsDataTable } from './components/data-table';
import { columns } from '@/app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/columns';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { PlusCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Mis Prospectos' };

interface AgentLeadsPageProps {
    params: Promise<{ // En Next.js 15, es buena práctica tiparlos como promesas
        clienteId: string;
        negocioId: string;
    }>,
    searchParams: Promise<{
        q?: string;
        etapa?: string;
        colegio?: string;
        page?: string;
    }>
}

export default async function AgentLeadsPage({ searchParams }: AgentLeadsPageProps) {

    // --- CORRECCIÓN PARA NEXT.JS 15: "await" para resolver la promesa de searchParams ---
    const resolvedSearchParams = await searchParams;

    const page = Number(resolvedSearchParams.page) || 1;
    const searchTerm = resolvedSearchParams.q;
    const colegio = resolvedSearchParams.colegio;
    const etapa = resolvedSearchParams.etapa;

    // Tu lógica de autenticación personalizada (ya no debería causar conflicto)
    const tokenCookie = (await cookies()).get('auth_token'); // cookies() también es async ahora
    if (!tokenCookie) { redirect('/agente/login'); }

    const verificationResult = await verifyToken(tokenCookie.value);
    if (!verificationResult.success || !verificationResult.payload) { redirect('/agente/login'); }

    const agente = verificationResult.payload;

    // La lógica de obtención de datos permanece igual
    const [leadsResult, filtrosResult] = await Promise.all([
        listarLeadsParaAgenteAction({
            agenteId: agente.id,
            page,
            pageSize: 10,
            searchTerm,
            colegio,
            etapa
        }),
        obtenerFiltrosParaAgenteAction(agente.id)
    ]);

    const leadsData = leadsResult.data || { leads: [], totalCount: 0, page: 1, pageSize: 10, startIndex: 0 };
    const filtros = filtrosResult.data || { pipelines: [], colegios: [] };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                        <Users />
                        Mis Prospectos
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gestiona y filtra todos los prospectos de tus ofertas asignadas.
                    </p>
                </div>
                <Link href={`/agente/leads/nuevo`}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Prospecto
                    </Button>
                </Link>
            </header>

            <main className="flex-grow overflow-hidden">
                <LeadsDataTable
                    columns={columns}
                    data={leadsData.leads}
                    totalCount={leadsData.totalCount}
                    startIndex={leadsData.startIndex}
                    filtros={filtros}
                    basePath="/agente/leads"
                />
            </main>
        </div>
    );
}