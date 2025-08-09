"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cerrarSesion } from '../_lib/actions/auth.actions';
import { LogOut, LayoutDashboard, User, CalendarCheck, Calendar, ChartLine, Menu, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

type UserPayload = {
    id: string;
    name: string;
    email: string;
    rol: string;
};

const navItems = [
    { href: '/agente/kanban', label: 'Pipeline', icon: LayoutDashboard },
    { href: '/agente/citas', label: 'Citas', icon: CalendarCheck },
    { href: '/agente/calendario', label: 'Calendario', icon: Calendar },
    { href: '/agente/leads', label: 'Leads', icon: User },
    { href: '/agente/estadisticas', label: 'Estadísticas', icon: ChartLine },
];

function SidebarContent({ user, closeSidebar }: { user: UserPayload, closeSidebar?: () => void }) {
    const pathname = usePathname();
    return (
        <div className="flex flex-col h-full bg-zinc-900 text-white">
            <div className="flex flex-col flex-grow overflow-y-auto">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800 flex-shrink-0">
                    <h1 className="text-xl font-bold text-white">Portal Agente</h1>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = item.href === '/agente/kanban' ? pathname === item.href : pathname?.startsWith(item.href);
                        return (
                            <Link key={item.label} href={item.href} onClick={closeSidebar}
                                className={`flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-zinc-800 p-4 flex-shrink-0">
                <div className="flex items-center gap-x-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">{user.name?.charAt(0).toUpperCase()}</div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
                        <p className="text-xs text-zinc-400 lowercase">{user.email}</p>
                    </div>
                </div>
                <form action={cerrarSesion}>
                    <Button type="submit" className="w-full mt-4 bg-zinc-800 hover:bg-red-900/40 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-500/50">
                        <LogOut className="h-4 w-4 mr-2" /><span>Cerrar Sesión</span>
                    </Button>
                </form>
            </div>
        </div>
    );
}

export default function AgenteUILayout({ user, children }: { user: UserPayload, children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname() ?? '';
    const isFullHeightPage = pathname.startsWith('/agente/calendario') || pathname.startsWith('/agente/kanban');

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100">
            <aside className="hidden md:block w-64 flex-shrink-0 border-r border-zinc-800">
                <SidebarContent user={user} />
            </aside>

            {/* --- Menú Deslizable para Móvil --- */}
            <div className="md:hidden">
                {/* --- CORRECCIÓN: Se añaden las clases condicionales que leen `sidebarOpen` --- */}
                <div
                    className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
                <div
                    className={`fixed top-0 left-0 h-full w-64 bg-zinc-900 z-40 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="absolute top-4 right-4">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-6 w-6" /></Button>
                    </div>
                    <SidebarContent user={user} closeSidebar={() => setSidebarOpen(false)} />
                </div>
            </div>

            {/* Layout adaptativo que ya tenías */}
            {isFullHeightPage ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="md:hidden h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-900 flex-shrink-0">
                        <h1 className="text-lg font-bold">Portal Agente</h1>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6" /></Button>
                    </header>
                    <main className="flex-1 overflow-y-auto">
                        <div className={`p-4 sm:p-6 lg:p-8 h-full`}>
                            {children}
                        </div>
                    </main>
                </div>
            ) : (
                <div className="flex-1 relative overflow-y-auto">
                    <header className="md:hidden sticky top-0 z-20 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
                        <h1 className="text-lg font-bold">Portal Agente</h1>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6" /></Button>
                    </header>
                    <div className={`p-4 sm:p-6 lg:p-8`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}