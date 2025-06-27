// RUTA: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/layout.tsx

import React from 'react';
// IMPORTANTE: Importamos ListaConversaciones aquí, en el padre.
import ListaConversaciones from './conversaciones/components/ListaConversaciones';

interface LayoutCRMParams {
    clienteId: string;
    negocioId: string;
}

export default async function LayoutCRM({
    children,
    params
}: Readonly<{
    children: React.ReactNode;
    params: Promise<LayoutCRMParams>;
}>) {

    // 1. Resolvemos la promesa (esto sabemos que funciona).
    const { clienteId, negocioId } = await params;

    // 2. Este layout ahora renderiza la estructura de dos columnas DIRECTAMENTE.
    return (
        <div className="flex h-full bg-zinc-900 text-zinc-300 gap-5">
            {/* Panel lateral para la lista de conversaciones */}
            <aside
                className="
              w-72 md:w-80 lg:w-96 flex-shrink-0
              bg-zinc-800 border border-zinc-700 rounded-lg
              flex flex-col 
            "
            >
                {/* 3. Pasamos los IDs (que SÍ tenemos) directamente a ListaConversaciones. */}
                <ListaConversaciones negocioId={negocioId} clienteId={clienteId} />
            </aside>

            {/* Contenido principal donde se mostrará el chat activo ({children}) */}
            <main className="flex-1 flex flex-col bg-zinc-900 overflow-hidden h-full">
                {children}
            </main>
        </div>
    );
}