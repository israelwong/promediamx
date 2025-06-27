// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Users, Columns } from 'lucide-react';

// Importamos los componentes para cada pestaña.
import LeadList from './components/LeadList';
import PipelineView from './components/PipelineView';

export const metadata: Metadata = {
    title: 'Gestión de Leads',
    description: 'Administra tus leads y visualiza tu pipeline de ventas.',
};

// CORRECCIÓN 1: Definimos la interfaz para la promesa
interface LeadsPageParams {
    negocioId: string;
}

// CORRECCIÓN 2: La función ahora es 'async' y espera una Promise
export default async function LeadsPage({ params }: { params: Promise<LeadsPageParams> }) {

    // CORRECCIÓN 3: Usamos 'await' para resolver la promesa y obtener los IDs
    const { negocioId } = await params;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Users />
                    Leads y Pipeline
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Gestiona todos tus contactos y visualiza el flujo de ventas.
                </p>
            </header>

            <Tabs defaultValue="lista" className="w-full flex-grow flex flex-col">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-800 max-w-md">
                    <TabsTrigger value="lista">
                        <Users className="h-4 w-4 mr-2" />
                        Lista de Leads
                    </TabsTrigger>
                    <TabsTrigger value="pipeline">
                        <Columns className="h-4 w-4 mr-2" />
                        Vista Pipeline
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="lista" className="mt-4 flex-grow">
                    <LeadList negocioId={negocioId} />
                </TabsContent>

                <TabsContent value="pipeline" className="mt-4 flex-grow">
                    <PipelineView negocioId={negocioId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}