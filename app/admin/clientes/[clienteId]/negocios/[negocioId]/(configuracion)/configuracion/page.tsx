// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/configuracion/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { Settings } from 'lucide-react';
import PageContent from './components/page-content';
// ✅ 1. Se importa la acción para obtener los datos en el servidor.
import { obtenerEstadoManyChatAction } from '@/app/admin/_lib/actions/crm/crm.actions';

export const metadata: Metadata = {
    title: 'Configuración del Negocio',
};

interface ConfiguracionPageParams {
    clienteId: string;
    negocioId: string;
}

// ✅ 2. La página se convierte en una función 'async' para poder obtener datos.
export default async function ConfiguracionPage({ params }: { params: Promise<ConfiguracionPageParams> }) {
    const { clienteId, negocioId } = await params;

    // ✅ 3. Se obtienen los datos del estado de la configuración aquí, en el Componente de Servidor.
    const result = await obtenerEstadoManyChatAction({ negocioId });
    const isManyChatConfigured = result.success && !!result.data?.configurado;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Settings />
                    Configuración del Negocio
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Gestiona las integraciones y ajustes generales de tu negocio.
                </p>
            </header>

            <main>
                {/* ✅ 4. Se pasan los datos obtenidos como la prop 'isManyChatConfigured' al componente cliente. */}
                <PageContent
                    clienteId={clienteId}
                    negocioId={negocioId}
                    isManyChatConfigured={isManyChatConfigured}
                />
            </main>
        </div>
    );
}
