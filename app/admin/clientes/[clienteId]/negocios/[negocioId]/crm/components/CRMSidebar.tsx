// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/components/CRMSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    MessageSquareText,
    Users,
    CalendarClock,
    Settings,
    Filter
} from 'lucide-react';

interface NavLink {
    hrefSuffix: string;
    label: string;
    icon: React.ElementType;
}

const navLinks: NavLink[] = [
    { hrefSuffix: '/conversaciones', icon: MessageSquareText, label: 'Conversaciones' },
    { hrefSuffix: '/leads', icon: Users, label: 'Leads' },
    { hrefSuffix: '/pipeline', icon: Filter, label: 'Pipeline' },
    { hrefSuffix: '/agenda', icon: CalendarClock, label: 'Agenda' },
    { hrefSuffix: '/configuracion', icon: Settings, label: 'Configuración' },
];

export default function CRMSidebar() {
    const pathname = usePathname();

    // Clases de Tailwind
    const navListClasses = "flex-grow p-3 space-y-1";
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left";
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100";
    const navLinkActiveClasses = "bg-sky-600 text-white shadow-inner";

    // Lógica de Navegación
    const getBasePath = (): string | null => {
        if (!pathname) return null;
        const crmIndex = pathname.indexOf('/crm');
        if (crmIndex === -1) return null;
        return pathname.substring(0, crmIndex + 4);
    };

    const basePath = getBasePath();

    // --- Función isActive Corregida ---
    const isActive = (hrefSuffix: string) => {
        if (!pathname || !basePath) return false;

        const expectedPath = `${basePath}${hrefSuffix}`;

        // Caso 1: Raíz del CRM (hrefSuffix es '')
        if (hrefSuffix === '') {
            // Coincidencia exacta o con slash final
            return pathname === basePath || pathname === `${basePath}/`;
        }

        // Caso 2: Secciones con subrutas (Leads, Configuración)
        if (hrefSuffix === '/leads' || hrefSuffix === '/configuracion' || hrefSuffix === '/conversaciones') {
            // Debe ser la ruta exacta O comenzar con la ruta + un slash
            return pathname === expectedPath || pathname.startsWith(`${expectedPath}/`);
        }

        // Caso 3: Secciones sin subrutas esperadas (Pipeline, Agenda)
        return pathname === expectedPath;
    };
    // --- Fin Corrección ---


    const buildHref = (hrefSuffix: string): string => {
        if (!basePath) return '#';
        return `${basePath}${hrefSuffix}`;
    };

    return (
        <>
            <nav className={navListClasses}>
                <ul>
                    {navLinks.map((link) => {
                        const active = isActive(link.hrefSuffix); // Usa lógica corregida
                        const href = buildHref(link.hrefSuffix);
                        return (
                            <li key={link.hrefSuffix}>
                                <Link
                                    href={href}
                                    className={`${navLinkBaseClasses} ${active ? navLinkActiveClasses : navLinkInactiveClasses}`}
                                >
                                    <link.icon className="h-4 w-4 flex-shrink-0" />
                                    <span>{link.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}
