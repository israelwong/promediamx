// app/agente/components/AgenteUILayout.tsx
"use client";

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cerrarSesion } from '../_lib/actions/auth.actions';
import { Loader2, LogOut, LayoutDashboard, User, CalendarCheck } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from 'react-hot-toast';

// Este es el tipo de datos del usuario que recibimos desde el layout de servidor
type UserPayload = {
    id: string;
    name: string;
    email: string;
    rol: string;
};

function AgenteSidebar({ user, handleLogout, isLoggingOut }: { user: UserPayload; handleLogout: () => void; isLoggingOut: boolean; }) {
    const pathname = usePathname();
    const navItems = [
        { href: '/agente', label: 'Pipeline', icon: LayoutDashboard },
        { href: '/agente/leads', label: 'Leads', icon: User },
        { href: '/agente/citas', label: 'Citas', icon: CalendarCheck },
        // { href: '/agente/calendario', label: 'Calendario', icon: Calendar },
        // Puedes añadir más items aquí en el futuro
    ];

    return (
        <aside className="hidden md:flex md:flex-col md:w-64 bg-zinc-900 border-r border-zinc-800">
            <div className="flex flex-col flex-grow">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                    <h1 className="text-xl font-bold text-white">Portal Agente</h1>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${pathname === item.href
                                ? 'bg-zinc-800 text-white'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                }`}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="border-t border-zinc-800 p-4">
                <div className="flex items-center gap-x-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
                        <p className="text-xs text-zinc-400 lowercase">{user.email}</p>
                    </div>
                </div>
                <Button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full mt-4 bg-zinc-800 hover:bg-red-900/40 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-500/50"
                >
                    {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4 mr-2" /><span>Cerrar Sesión</span></>}
                </Button>
            </div>
        </aside>
    );
}

// Este es el componente principal que exportamos
export default function AgenteUILayout({ user, children }: { user: UserPayload, children: React.ReactNode }) {
    const [isLoggingOut, startLogoutTransition] = useTransition();
    const router = useRouter();

    const handleLogout = () => {
        startLogoutTransition(async () => {
            // Llamamos a la server action que borra la cookie
            await cerrarSesion(user.id); // Cambia 'user.id' por el campo correcto si el token es diferente
            toast.success("Sesión cerrada.");
            // Redirigimos al login
            router.push('/agente/login');
        });
    };

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100">
            <AgenteSidebar user={user} handleLogout={handleLogout} isLoggingOut={isLoggingOut} />
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}