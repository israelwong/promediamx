'use client';

import React from 'react';
// Asegúrate que la ruta de importación sea correcta
import Navbar from '@/app/admin/_components/Navbar'; // Navbar eliminado
import { useSearchParams } from 'next/navigation';
import IASidebar from '@/app/admin/IA/components/IASidebar';

// Definición estándar de props para un layout en Next.js App Router
interface LayoutProps {
    children: React.ReactNode;
}

// Este layout asume que un layout superior ya incluye el Navbar principal
export default function LayoutDashboard({ children }: LayoutProps) {

    const searchParams = useSearchParams();
    const isPopup = searchParams?.get('popup') === 'true'; // Verificar si el parámetro existe


    if (isPopup) {
        // Si es popup, renderizar SOLO el contenido hijo
        return <>{children}</>;
    }

    return (
        // Contenedor principal para Sidebar + Contenido
        // 'flex-1' hace que este contenedor crezca si el layout padre usa flexbox.
        // 'overflow-hidden' ayuda a contener el scroll interno del sidebar/main.
        // Ajusta 'h-full' o similar si es necesario según tu layout padre.
        <div>
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                {/* Barra Lateral Izquierda (Sidebar) */}
                {/* Ancho fijo, no se encoge, scroll vertical si es necesario */}
                {/* Oculto en pantallas pequeñas (móvil), visible desde medianas (md) */}
                <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex-shrink-0 overflow-y-auto p-4 hidden md:block">
                    <IASidebar />
                </aside>

                {/* Área de Contenido Principal (Derecha) */}
                {/* Ocupa el espacio restante horizontalmente, scroll vertical */}
                <main className="flex-1  p-4 md:p-6 ">
                    {/* Aquí se renderizarán las páginas hijas */}
                    {children}
                </main>

            </div>
        </div>
    );
}
