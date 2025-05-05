// app/admin/_components/Navbar.tsx (o donde residan tus componentes)
'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Image from 'next/image';

import { Usuario } from '@/app/admin/_lib/types';
import { verifyToken, cerrarSesion } from '@/app/lib/auth';
import { Bell, LogOut, Menu, X } from 'lucide-react'; // Iconos
import { UsuarioExtendido } from '@/app/admin/_lib/types'; // Asegúrate de que la ruta sea correcta


function Navbar() {
    // El estado ahora usa la interfaz ajustada
    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const token = Cookies.get('token');

    useEffect(() => {
        async function validarToken(token: string | undefined) {
            if (token) {
                try {
                    const response = await verifyToken(token);
                    // console.log('Payload recibido de verifyToken:', response.payload); // Mantener para debug

                    // Verificar payload básico
                    if (response.payload && 'id' in response.payload && 'username' in response.payload) {

                        // --- AJUSTE: Asignación con rolNombre ---
                        // Castear payload base
                        const baseUserData = response.payload as Omit<Usuario, 'rol'> & { rol?: string | null }; // Asumir que rol viene como string o null

                        const userData: UsuarioExtendido = {
                            ...baseUserData, // Esparcir propiedades base (sin 'rol' objeto)
                            rolNombre: baseUserData.rol ?? null, // Asignar el string directamente a rolNombre
                            token: token,
                        };
                        // -----------------------------------------

                        // console.log('Usuario establecido en el estado:', userData); // Debug
                        setUser(userData);

                    } else {
                        // console.warn("Token verification failed or payload missing.");
                        Cookies.remove('token');
                        router.push('/login');
                    }
                } catch {
                    // console.error('Error verifying token:', error);
                    Cookies.remove('token');
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        }
        validarToken(token);
    }, [token, router]);

    async function handleCerrarSesion() {
        // ... (sin cambios)
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            if (user?.token) {
                const response = await cerrarSesion(user.token);
                if (response?.status) {
                    Cookies.remove('token');
                    setUser(null);
                    router.push('/login');
                } else {
                    console.error("Error al cerrar sesión:", response?.message);
                }
            } else {
                Cookies.remove('token');
                router.push('/login');
            }
        }
    }

    // --- Definición de Links (sin cambios) ---
    const baseLinks = [{ href: '/admin/dashboard', label: 'Dashboard' },];
    const adminLinks = [
        { href: '/admin/clientes', label: 'Clientes' },
        { href: '/admin/marketplace', label: 'Marketplace' },
        { href: '/admin/tareas', label: 'Tareas' },
        { href: '/admin/configurar', label: 'Configurar' },
    ];

    // --- AJUSTE: Comparar con user.rolNombre ---
    const links = user?.rolNombre === 'Administrador' ? [...baseLinks, ...adminLinks] : baseLinks;
    // ------------------------------------------

    // Lógica de Enlace Activo (sin cambios)
    const isActive = (href: string) => {
        if (!pathname) return false;
        if (href === '/admin/dashboard') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    // Clases y JSX (sin cambios)
    const navContainerClasses = "flex items-center justify-between w-full h-full px-5";
    const logoContainerClasses = "flex items-center gap-2 text-lg text-zinc-100 font-semibold";
    const menuDesktopContainerClasses = "hidden md:flex items-center gap-4 lg:gap-6";
    const navLinksContainerClasses = "flex items-center gap-4 lg:gap-5";
    const actionsContainerClasses = "flex items-center gap-3";
    const mobileMenuButtonClasses = "md:hidden p-2 text-zinc-300 hover:text-white";
    const mobileMenuOverlayClasses = "fixed inset-0 bg-black/60 z-40 md:hidden";
    const mobileMenuClasses = "fixed top-0 right-0 h-full w-64 bg-zinc-800 shadow-lg z-50 flex flex-col p-4 md:hidden";
    const mobileLinkClasses = "block py-2 px-3 rounded hover:bg-zinc-700 text-zinc-300";
    const mobileActiveLinkClasses = "bg-sky-600 text-white font-semibold";
    const navLinkBaseClasses = "text-sm font-medium transition-colors duration-150 ease-in-out";
    const navLinkInactiveClasses = "text-zinc-400 hover:text-zinc-100";
    const navLinkActiveClasses = "text-white font-semibold";
    const iconButtonClasses = "p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700";
    const logoutButtonClasses = "text-sm text-zinc-400 hover:text-red-400 flex items-center gap-1.5 border border-zinc-700 hover:border-red-500/50 hover:bg-red-900/20 px-3 py-1.5 rounded-md transition-colors duration-150 ease-in-out";
    const mobileLogoutButtonClasses = `${logoutButtonClasses} w-full justify-center mt-auto`;
    const separatorClasses = "h-6 w-px bg-zinc-700";

    return (
        // JSX sin cambios estructurales...
        <div className={navContainerClasses}>
            <Link href="/admin/dashboard" className={logoContainerClasses}>
                <Image
                    src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/favicon_fullcolor.svg"
                    width={20}
                    height={20}
                    alt="ProMedia Logo"
                />
                <span>ProMedia</span>
            </Link>
            <div className={menuDesktopContainerClasses}>
                <nav className={navLinksContainerClasses}>
                    {user && links.map((link) => {
                        const active = isActive(link.href);
                        return (
                            <Link key={link.href} href={link.href}
                                className={`${navLinkBaseClasses} ${active ? navLinkActiveClasses : navLinkInactiveClasses}`}>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
                {user && links.length > 0 && <div className={separatorClasses}></div>}
                <div className={actionsContainerClasses}>
                    <button className={iconButtonClasses} title="Notificaciones (Próximamente)">
                        <Bell size={18} />
                    </button>
                    <button
                        className={logoutButtonClasses}
                        onClick={handleCerrarSesion}
                        title="Cerrar sesión"
                    >
                        <LogOut size={14} />
                        <span>Salir</span>
                    </button>
                </div>
            </div>
            <button className={mobileMenuButtonClasses} onClick={() => setMenuOpen(true)}>
                <Menu size={24} />
            </button>
            {menuOpen && (
                <>
                    <div className={mobileMenuOverlayClasses} onClick={() => setMenuOpen(false)}></div>
                    <div className={mobileMenuClasses}>
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-zinc-700">
                            <span className="text-lg font-semibold text-white">Menú</span>
                            <button onClick={() => setMenuOpen(false)} className="p-2 text-zinc-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <nav className="flex flex-col space-y-2">
                            {user && links.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                                        className={`${mobileLinkClasses} ${active ? mobileActiveLinkClasses : ''}`}>
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <button
                            className={mobileLogoutButtonClasses}
                            onClick={async () => { setMenuOpen(false); await handleCerrarSesion(); }}>
                            <LogOut size={14} /> Cerrar sesión
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default Navbar;
