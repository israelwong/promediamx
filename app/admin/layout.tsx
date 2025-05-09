// app/admin/layout.tsx
import React from 'react';
import Navbar from './components/Navbar'; // O Header, etc.

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100">
            <header className="flex-shrink-0 h-16 border-b border-zinc-700 flex items-center px-4 md:px-6 w-full z-10">
                <Navbar />
            </header>
            {/* Este div ahora toma el espacio restante */}
            <div className="flex-1 flex overflow-hidden"> {/* <--- CORREGIDO: Añadido flex-1 */}
                {/* main ahora es un contenedor flex vertical para sus hijos */}
                {/* <main className="flex-1 flex flex-col overflow-hidden">  */}{/* <--- CORREGIDO: Añadido flex-col */}
                <main className="flex-1 flex flex-col overflow-hidden overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
