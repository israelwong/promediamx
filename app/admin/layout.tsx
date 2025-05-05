// app/admin/layout.tsx
import React from 'react';
import Navbar from './components/Navbar'; // O Header, etc.

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // Contenedor principal que ocupa toda la pantalla y usa flexbox VERTICAL
        <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100">

            <header className="flex-shrink-0 h-16 border-b border-zinc-700 flex items-center px-4 md:px-6 w-full z-10"> {/* Añadido w-full y z-10 */}
                <Navbar />
            </header>

            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>

            </div>
        </div>
    );
}
