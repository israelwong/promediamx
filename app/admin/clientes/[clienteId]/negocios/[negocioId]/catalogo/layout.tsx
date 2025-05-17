// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/layout.tsx
import React from 'react';
import CatalogoSidebar from './components/CatalogoSidebar';

export default async function LayoutCRM({ // Añadido async
    children
}: Readonly<{
    children: React.ReactNode;
}>) {

    return (
        <div className="flex flex-col flex-1">
            <div className="flex flex-1 gap-6 overflow-hidden">
                <aside className="w-64 flex-shrink-0 overflow-y-auto border border-zinc-700 rounded-lg shadow-sm
                bg-zinc-800
                ">
                    <CatalogoSidebar />
                </aside>

                <main className="flex-1 overflow-auto min-w-0 ">
                    {children}
                </main>

            </div>
        </div>
    );
}
