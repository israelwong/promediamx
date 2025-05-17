// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/components/NegocioSidebar.tsx
// O la ruta donde realmente reside tu NegocioSidebar
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    CalendarDays,
    Bot,
    BookOpen,
    Presentation,
    Tag,
    Package,
    Briefcase,
    DatabaseZap
} from 'lucide-react';

interface NavLink {
    hrefSuffix: string;
    label: string;
    icon: React.ElementType;
}

const navLinks: NavLink[] = [
    { hrefSuffix: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { hrefSuffix: '/editar', icon: Briefcase, label: 'Info. Negocio' },
    { hrefSuffix: '/catalogo', icon: BookOpen, label: 'Catálogo' },
    { hrefSuffix: '/paquetes', icon: Package, label: 'Paquetes' },
    { hrefSuffix: '/oferta', icon: Tag, label: 'Ofertas' },
    { hrefSuffix: '/agenda', icon: CalendarDays, label: 'Agenda' },
    { hrefSuffix: '/asistente', icon: Bot, label: 'Asistente' },
    { hrefSuffix: '/crm', icon: DatabaseZap, label: 'CRM' },
    { hrefSuffix: '/landingpage', icon: Presentation, label: 'Landing page' },
];

interface NegocioSidebarProps {
    negocioId: string;
    clienteId: string;
}

export default function NegocioSidebar({ clienteId, negocioId }: NegocioSidebarProps) {
    const pathname = usePathname();

    // Clases de Tailwind
    // ACTUALIZADO: Se quita bg-zinc-800/50 para hacerlo transparente.
    // El borde a la derecha se manejará en el componente LayoutNegocio.
    // Se mantiene h-full para que ocupe toda la altura disponible.
    const navListClasses = "flex-grow p-3 space-y-1.5 h-full";
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"; // Asumiendo que el offset es sobre un fondo oscuro
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100";
    const navLinkActiveClasses = "bg-blue-600 text-white shadow-sm";

    const basePathForSidebar = `/admin/clientes/${clienteId}/negocios/${negocioId}`;

    const isActive = (hrefSuffix: string): boolean => {
        if (!pathname) return false;
        let normalizedSuffix = hrefSuffix;
        if (hrefSuffix === '') normalizedSuffix = '/';
        else if (!hrefSuffix.startsWith('/')) normalizedSuffix = `/${hrefSuffix}`;

        const expectedPath = `${basePathForSidebar}${normalizedSuffix === '/' ? '' : normalizedSuffix}`;

        if (normalizedSuffix === '/') {
            return pathname === basePathForSidebar || pathname === `${basePathForSidebar}/`;
        }
        return pathname.startsWith(`${expectedPath}/`) || pathname === expectedPath;
    };

    const buildHref = (hrefSuffix: string): string => {
        let normalizedSuffix = hrefSuffix;
        if (hrefSuffix === '' || hrefSuffix === '/') normalizedSuffix = '';
        else if (!hrefSuffix.startsWith('/')) normalizedSuffix = `/${hrefSuffix}`;
        return `${basePathForSidebar}${normalizedSuffix}`;
    };

    if (!clienteId || !negocioId) {
        return (
            <nav className={navListClasses}>
                <p className="text-zinc-500 text-xs p-3">Cargando navegación...</p>
            </nav>
        );
    }

    return (
        <nav className={navListClasses}>
            <ul>
                {navLinks.map((link) => {
                    const active = isActive(link.hrefSuffix);
                    const href = buildHref(link.hrefSuffix);
                    return (
                        <li key={link.label}>
                            <Link
                                href={href}
                                className={`${navLinkBaseClasses} ${active ? navLinkActiveClasses : navLinkInactiveClasses}`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <link.icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} aria-hidden="true" />
                                <span>{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
