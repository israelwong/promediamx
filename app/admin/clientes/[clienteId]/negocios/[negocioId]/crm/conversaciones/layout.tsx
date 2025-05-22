// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/layout.tsx
import React from 'react';
import ListaConversaciones from './components/ListaConversaciones';

interface LayoutCRMParams {
    clienteId: string;
    negocioId: string;
}

// Layout como Server Component asíncrono (según requerimiento del usuario)
export default async function LayoutConversaciones({ // Añadido async
    children,
    params
}: Readonly<{
    children: React.ReactNode;
    params: Promise<LayoutCRMParams>; // Usando Promise según requerimiento
}>) {

    const { negocioId, clienteId } = await params;
    // Ya no necesitamos calcular la altura aquí, asumimos que el AdminLayout
    // nos provee un contenedor con la altura correcta (100% del espacio restante).
    // Ya no necesitamos calcular la altura aquí, asumimos que el AdminLayout
    // nos provee un contenedor con la altura correcta (100% del espacio restante).
    return (
        // Este div tomará el 100% de la altura de su contenedor padre en AdminLayout.
        <div
            className="flex h-full bg-zinc-900 text-zinc-300 gap-5"
        >
            {/* Panel lateral para la lista de conversaciones */}
            <aside
                className="
              w-72 md:w-80 lg:w-96 flex-shrink-0
              bg-zinc-800 border border-zinc-700 rounded-lg
              flex flex-col 
            "
            // overflow-y-auto se maneja dentro de ListaConversaciones si es necesario,
            // o aquí si ListaConversaciones no es flex-col h-full.
            // Por ahora, ListaConversaciones es flex flex-col h-full, así que su contenido interno hará scroll.
            >
                <ListaConversaciones negocioId={negocioId} clienteId={clienteId} />
            </aside>

            {/* Contenido principal donde se mostrará el chat y las herramientas */}
            <main
                className="flex-1 flex flex-col  bg-zinc-900 overflow-hidden"
            // flex-1 para que ocupe el espacio restante.
            // flex-col para que su hijo (ConversationDetailPage) pueda usar h-full.
            >
                {children}
            </main>
        </div>
    );
}
