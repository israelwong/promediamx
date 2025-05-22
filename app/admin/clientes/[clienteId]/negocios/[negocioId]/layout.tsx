// Ruta actual del archivo: app/admin/clientes/[clienteId]/negocios/[negocioId]/layout.tsx
import React from 'react'
import NegocioHeader from './components/NegocioHeader';
import NegocioSidebar from './components/NegocioSidebar'

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function LayoutNegocio({ children, params }: { children: React.ReactNode, params: Promise<Props> }) {
    const { negocioId, clienteId } = await params;

    return (
        <div className='flex flex-col h-screen overflow-y-auto'> {/* overflow-hidden */}
            <div className='flex-shrink-0 mb-5'>
                <NegocioHeader clienteId={clienteId} negocioId={negocioId} />
            </div>

            {/* CONTENEDOR 2: Cuerpo principal, flex horizontal, también con overflow-hidden */}
            <div className="flex flex-grow gap-5">
                <div className="w-[250px] flex-shrink-0  overflow-y-auto">
                    <NegocioSidebar
                        clienteId={clienteId}
                        negocioId={negocioId}
                    />
                </div>
                <main className="flex-grow overflow-y-auto bg-zinc-900 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
