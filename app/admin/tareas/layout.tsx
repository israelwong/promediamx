// Ruta actual del archivo: /app/admin/tareas/layout.tsx

import React from 'react';
import TareaSidebar from './components/TareaSidebar'; // Asegúrate que la ruta sea correcta

// Layout como Server Component asíncrono (según requerimiento del usuario)
export default async function LayoutTarea({ children }: Readonly<{
    children: React.ReactNode;
}>) {

    return (
        // Contenedor principal que ocupa el espacio disponible y usa flexbox vertical
        <div className="flex flex-col flex-1 h-full">
            {/* Contenedor para la fila del sidebar y el contenido principal */}
            {/* flex-1 permite que este div crezca */}
            {/* overflow-hidden es CRUCIAL aquí para contener el desbordamiento de <main> */}
            {/* gap-6 añade espacio entre sidebar y main */}
            <div className="flex flex-1 overflow-hidden"> {/* <-- MANTENER overflow-hidden */}

                {/* Columna del Sidebar */}
                {/* Ancho fijo, no se encoge */}
                <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-zinc-700 shadow-sm"> {/* Scroll vertical si es necesario */}
                    <TareaSidebar />
                </aside>


                <main className="flex-1 overflow-auto min-w-0 p-5"> {/* <-- MANTENER overflow-auto y min-w-0 */}
                    {/* El contenido debe poder scrollear horizontalmente por sí mismo */}
                    {children}
                </main>

            </div>
        </div>
    );
}
