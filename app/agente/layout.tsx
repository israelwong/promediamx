'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { verifyToken, cerrarSesion } from './_lib/actions/auth.actions';
import { Loader2, LogOut, LayoutDashboard, Users, Calendar } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

// --- Definición de Tipos ---
type UserPayload = {
    id: string;
    email: string;
    username: string;
    rol: string;
};

// --- Componente de Carga ---
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-zinc-400">Verificando sesión...</p>
            </div>
        </div>
    );
}

// --- Componente de la Barra Lateral ---
function AgenteSidebar({ user, handleLogout, isLoggingOut }: { user: UserPayload; handleLogout: () => void; isLoggingOut: boolean; }) {
    const pathname = usePathname();
    const navItems = [
        { href: '/agente', label: 'Pipeline', icon: LayoutDashboard },
        { href: '/agente/agenda', label: 'Agenda', icon: Calendar },
        { href: '/agente/prospectos', label: 'Prospectos', icon: Users },
    ];

    return (
        <aside className="hidden md:flex md:flex-col md:w-64 bg-zinc-900 border-r border-zinc-800">
            <div className="flex flex-col flex-grow">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                    <h1 className="text-xl font-bold text-white">ProMedia</h1>
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
                        {user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-100">{user.username}</p>
                        <p className="text-xs text-zinc-400 capitalize">{user.rol}</p>
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


// --- Layout Principal del Agente ---
export default function AgenteLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, startLogoutTransition] = useTransition();
    const [user, setUser] = useState<UserPayload | null>(null);

    useEffect(() => {
        console.log("LOG: [useEffect] Iniciando verificación de autenticación...");
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                console.log(`LOG: [checkAuth] Token encontrado en localStorage: ${token ? 'Sí' : 'No'}`);
                if (!token) {
                    console.log("LOG: [checkAuth] No hay token, redirigiendo a /agente/login");
                    router.replace('/agente/login');
                    return;
                }

                console.log("LOG: [checkAuth] Verificando token en el servidor...");
                const result = await verifyToken(token);
                console.log("LOG: [checkAuth] Resultado de verifyToken:", result);

                if (result.success && result.payload) {
                    console.log("LOG: [checkAuth] Verificación exitosa. Payload:", result.payload);
                    const userRole = result.payload.rol?.toLowerCase();
                    console.log(`LOG: [checkAuth] Rol del usuario: '${userRole}'`);

                    if (userRole === 'agente' || userRole === 'admin') {
                        console.log("LOG: [checkAuth] Rol permitido. Estableciendo usuario.");
                        setUser(result.payload);
                    } else {
                        console.log("LOG: [checkAuth] Rol no permitido. Limpiando sesión y redirigiendo.");
                        setUser(null);
                        localStorage.removeItem('auth_token');
                        router.replace('/agente/login');
                    }
                } else {
                    console.log("LOG: [checkAuth] Verificación fallida o sesión expirada. Limpiando y redirigiendo.");
                    setUser(null);
                    localStorage.removeItem('auth_token');
                    router.replace('/agente/login');
                }
            } catch (error) {
                console.error("LOG: [checkAuth] CATCH - Error inesperado durante la verificación:", error);
                setUser(null);
                localStorage.removeItem('auth_token');
                router.replace('/agente/login');
            } finally {
                console.log("LOG: [checkAuth] FINALLY - Finalizando carga (setIsLoading a false).");
                setIsLoading(false);
            }
        };
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        startLogoutTransition(async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await cerrarSesion(token);
            }
            localStorage.removeItem('auth_token');
            router.push('/agente/login');
        });
    };

    console.log(`LOG: [Render] Estado actual -> isLoading: ${isLoading}, user: ${user ? user.username : 'null'}`);

    if (isLoading) {
        console.log("LOG: [Render] Mostrando <LoadingScreen />");
        return <LoadingScreen />;
    }

    if (!user) {
        console.log("LOG: [Render] No hay usuario y la carga terminó. Retornando 'null' (pantalla negra mientras redirige).");
        return null;
    }

    console.log("LOG: [Render] Renderizando la UI principal del agente.");
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
