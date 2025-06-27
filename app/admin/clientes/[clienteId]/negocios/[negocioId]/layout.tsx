// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/layout.tsx
import React from 'react';
import NegocioSidebar from './components/NegocioSidebar';
import CitaModal from './leads/components/CitaModal'; // Importamos el modal



interface Props {
    clienteId: string;
    negocioId: string;
}

// Usamos el patrón de Promise que funciona en tu proyecto
export default async function LayoutNegocio({ children, params }: { children: React.ReactNode, params: Promise<Props> }) {
    const { negocioId, clienteId } = await params;

    return (


        // CORRECCIÓN DEFINITIVA:
        // Este contenedor usa h-full para ocupar todo el espacio que le da el LayoutClientes.
        // Es un contenedor flex que se dividirá horizontalmente.
        <div className='flex h-full w-full gap-6 p-6'>

            {/* El CitaModal vive aquí, fuera del flujo principal, listo para ser activado. */}
            <CitaModal negocioId={negocioId} clienteId={clienteId} />

            {/* 1. Sidebar */}
            <aside className="w-[250px] flex-shrink-0">
                <NegocioSidebar
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            </aside>

            {/* 2. Contenido Principal */}
            {/* flex-1 hace que ocupe el resto del ancho. */}
            {/* min-w-0 es el "truco mágico" que le permite a un hijo con overflow (como el Kanban) encogerse y mostrar su propio scroll. */}
            <main className="flex-1 min-w-0">
                {children}
            </main>
        </div>
    );
}