'use client';

import React from 'react';
// Asegúrate que la ruta de importación sea correcta
import Navbar from '@/app/admin/_components/Navbar'; // Navbar eliminado
// import IASidebar from '@/app/admin/IA/components/IASidebar';

// Definición estándar de props para un layout en Next.js App Router
interface LayoutProps {
    children: React.ReactNode;
}

// Este layout asume que un layout superior ya incluye el Navbar principal
export default function LayoutDashboard({ children }: LayoutProps) {

    return (

        <div>
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1  p-4 md:p-6 ">
                    {children}
                </main>

            </div>
        </div>
    );
}
