// This file is part of the app/admin/clientes/[clienteId]/negocios/[negocioId]/components/NegocioAgenda.tsx
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
        // El div principal ocupa toda la altura de la pantalla y usa flex para la disposición vertical
        <div className='flex flex-col h-screen overflow-hidden'>
            {/* Header del negocio: fijo en la parte superior */}
            <div className='flex-shrink-0 mb-5'> {/* Evita que el header se encoja */}
                <NegocioHeader negocioId={negocioId} /> {/* Pasar clienteId si NegocioHeader lo necesita */}
            </div>

            {/* Contenedor principal para el sidebar y el contenido */}
            {/* 'flex-grow' permite que esta sección ocupe el espacio restante */}
            {/* 'overflow-hidden' en el contenedor padre y 'overflow-auto' en el contenido 
                ayudan a manejar el scroll correctamente si el contenido es muy largo. */}
            <div className="flex flex-grow overflow-hidden gap-5">
                {/* Sidebar con ancho fijo y borde a la derecha */}
                {/* El fondo del sidebar será transparente, heredando el del div padre (que a su vez hereda del layout principal) */}
                <div className="w-[250px] flex-shrink-0 h-full border-r border-zinc-700 overflow-y-auto bg-zinc-900">
                    {/* bg-zinc-900 añadido aquí para un fondo oscuro consistente si el layout padre no lo tiene o para diferenciarlo. 
                        Si quieres que sea completamente transparente al fondo del layout de admin, quita bg-zinc-900.
                        El `border-r border-zinc-700` ya está aquí.
                        `overflow-y-auto` para el scroll del sidebar si su contenido es largo.
                    */}
                    <NegocioSidebar
                        clienteId={clienteId}
                        negocioId={negocioId}
                    />
                </div>

                {/* Área de contenido principal */}
                {/* 'flex-grow' para que ocupe el espacio restante al lado del sidebar */}
                {/* 'overflow-y-auto' para permitir scroll solo en esta área si el contenido excede la altura */}
                <main className="flex-grow overflow-y-auto bg-zinc-900">
                    {/* bg-zinc-900 para el fondo del área de contenido. Ajusta según tu tema. */}
                    {children}
                </main>
            </div>
        </div>
    );
}
