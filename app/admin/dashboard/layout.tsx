// app/admin/dashboard/layout.tsx
import React from 'react';
// Importa tu componente de Sidebar del Dashboard (ajusta la ruta si es necesario)
import DashboardSideBar from './components/DashboardSidebar';

export default function LayoutDashboard({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Contenedor principal: flex horizontal, altura completa, oculta overflow propio, añade gap
        <div className="flex h-full overflow-hidden gap-6">

            {/* Barra Lateral del Dashboard */}
            {/* --- AJUSTE: Ancho reducido para modo icono --- */}
            <aside className="w-20 flex-shrink-0 border-r border-zinc-800 overflow-y-auto p-2"> {/* Adjusted width (w-20) and padding (p-2) */}
                {/* Renderiza tu componente de sidebar del dashboard aquí */}
                <DashboardSideBar />
            </aside>

            {/* Área de Contenido Principal del Dashboard */}
            {/* flex-1: Ocupa espacio restante */}
            {/* overflow-y-auto: Permite SOLO scroll VERTICAL si el contenido es más alto */}
            {/* overflow-x-hidden: PREVIENE el scroll horizontal en este nivel */}
            {/* min-w-0: Ayuda a flexbox a calcular el ancho correctamente y evitar que el contenido lo empuje */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
                {/* Añadimos un div interno para el padding, permitiendo que el scroll funcione correctamente en <main> */}
                <div className="p-4 md:p-6 h-full"> {/* Puedes ajustar el padding */}
                    {/* Aquí se renderizarán las páginas hijas del dashboard */}
                    {children}
                </div>
            </main>

        </div>
    );
}