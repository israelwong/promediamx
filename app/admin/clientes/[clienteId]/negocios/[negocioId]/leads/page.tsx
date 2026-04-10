/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/page.tsx
*/
import React from 'react';
import { Metadata } from 'next';
import { Users } from 'lucide-react';
import { listarLeadsAction, obtenerDatosFiltrosLeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { LeadsDataTable } from './components/data-table';
import { columns } from './components/columns';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { PlusCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Lista de Leads' };

interface LeadsPageProps {
    params: {
        clienteId: string;
        negocioId: string;
    };
    searchParams: {
        q?: string;
        etapa?: string;
        colegio?: string;
        page?: string;
    }
}

export default async function LeadsPage({ params: paramsPromise, searchParams: searchParamsPromise }: {
    params: Promise<LeadsPageProps['params']>,
    searchParams: Promise<LeadsPageProps['searchParams']>
}) {
    const params = await paramsPromise;
    const searchParams = await searchParamsPromise;
    const { clienteId, negocioId } = params;

    const page = Number(searchParams.page) || 1;
    const searchTerm = searchParams.q;
    const colegio = searchParams.colegio;
    const etapa = searchParams.etapa;

    const [leadsResult, filtrosResult] = await Promise.all([
        listarLeadsAction({ negocioId, page, pageSize: 10, searchTerm, colegio, etapa }),
        obtenerDatosFiltrosLeadAction(negocioId)
    ]);

    const leadsData = leadsResult.data || { leads: [], totalCount: 0, page: 1, pageSize: 10, startIndex: 0 };

    // ✅ SOLUCIÓN: Se construye explícitamente el objeto 'filtros' para garantizar la forma correcta.
    // Esto extrae solo las propiedades que necesitamos (`pipelines` y `colegios`) del resultado de la acción
    // y proporciona un fallback seguro si los datos no están presentes.
    const filtros = {
        pipelines: filtrosResult.data?.pipelines || [],
        colegios: filtrosResult.data?.colegios || [],
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                        <Users />
                        Leads
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gestiona y filtra todos los prospectos de tu negocio.
                    </p>
                </div>
                <Link href={`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/nuevo`}>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Lead
                    </Button>
                </Link>
            </header>

            <main className="flex-grow overflow-hidden">
                <LeadsDataTable
                    columns={columns}
                    data={leadsData.leads}
                    totalCount={leadsData.totalCount}
                    startIndex={leadsData.startIndex}
                    filtros={filtros} // Se pasa el objeto 'filtros' con la forma garantizada
                />
            </main>
        </div>
    );
}
