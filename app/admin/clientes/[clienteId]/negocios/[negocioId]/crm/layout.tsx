// Ruta actual: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/layout.tsx
import React from 'react';
import CRMSidebar from './components/CRMSidebar';


export default async function LayoutCRM({ // Añadido async
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col flex-1 h-full">
            <div className="flex gap-6 flex-1">
                <aside className="w-64 flex-shrink-0 overflow-y-auto border border-zinc-700 rounded-lg shadow-sm">
                    <CRMSidebar />
                </aside>
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
