// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/layout.tsx
import React from 'react';
import CRMSidebar from './components/CRMSidebar'; // Asegúrate que la ruta sea correcta

// Interface para tipar los parámetros de la ruta
interface LayoutCRMParams {
    clienteId: string;
    negocioId: string;
}

// Layout como Server Component asíncrono (según requerimiento del usuario)
export default async function LayoutCRM({ // Añadido async
    children,
    params
}: Readonly<{
    children: React.ReactNode;
    params: Promise<LayoutCRMParams>; // Usando Promise según requerimiento
}>) {

    // Acceder a los params con await
    const { negocioId, clienteId } = await params;

    return (
        // Contenedor principal que ocupa el espacio disponible y usa flexbox vertical
        <div className="flex flex-col flex-1 h-full">

            {/* Contenedor para la fila del sidebar y el contenido principal */}
            {/* flex-1 permite que este div crezca */}
            {/* overflow-hidden es CRUCIAL aquí para contener el desbordamiento de <main> */}
            {/* gap-6 añade espacio entre sidebar y main */}
            <div className="flex flex-1 gap-6 overflow-hidden"> {/* <-- MANTENER overflow-hidden */}

                {/* Columna del Sidebar */}
                {/* Ancho fijo, no se encoge */}
                <aside className="w-64 flex-shrink-0 overflow-y-auto border border-zinc-700 rounded-lg shadow-sm"> {/* Scroll vertical si es necesario */}
                    <CRMSidebar negocioId={negocioId} clienteId={clienteId} />
                </aside>

                {/* Columna del Contenido Principal */}
                {/* flex-1: Ocupa espacio restante */}
                {/* overflow-auto: Permite scroll en AMBAS direcciones si es necesario */}
                {/* min-w-0: Clave para que flexbox permita encoger y activar overflow */}
                {/* IMPORTANTE: Asegurarse que PipelinePanel (el hijo) tenga overflow-x-auto */}
                <main className="flex-1 overflow-auto min-w-0"> {/* <-- MANTENER overflow-auto y min-w-0 */}
                    {/* El contenido (PipelinePanel) debe poder scrollear horizontalmente por sí mismo */}
                    {children}
                </main>

            </div>
        </div>
    );
}
