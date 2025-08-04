// Ruta sugerida: app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/components/CatalogoSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BookOpenText,
    Filter,
    Tags,
} from 'lucide-react';

interface NavLink {
    hrefSuffix: string;
    label: string;
    icon: React.ElementType;
}

const navLinks: NavLink[] = [
    { hrefSuffix: '/', icon: BookOpenText, label: 'Catálogos' },
    { hrefSuffix: '/categorias', icon: Filter, label: 'Categorías' },
    { hrefSuffix: '/etiquetas', icon: Tags, label: 'Etiquetas' },
];

export default function CatalogoSidebar() {
    const pathname = usePathname();

    // Clases de Tailwind actualizadas para un estilo más refinado
    // El padding general del <nav> y el espaciado entre elementos <li>
    const navListClasses = "p-3 space-y-1.5"; // Un poco más de espacio entre ítems

    // Clases base para cada <Link>
    const navLinkBaseClasses = "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"; // Padding más generoso y rounded-lg

    // Clases para <Link> inactivo
    // Texto: zinc-300 para mejor contraste que zinc-400 sobre fondos oscuros
    // Hover: fondo zinc-700/70 (un poco más opaco) y texto zinc-50 (casi blanco)
    const navLinkInactiveClasses = "text-zinc-300 hover:bg-zinc-700/70 hover:text-zinc-50";

    // Clases para <Link> activo
    // Fondo: azul primario, texto blanco, sombra sutil
    const navLinkActiveClasses = "bg-blue-600 text-white shadow-md";

    // Lógica de Navegación (sin cambios funcionales, solo para contexto)
    const getBasePath = (): string | null => {
        if (!pathname) return null;
        const catalogoIndex = pathname.indexOf('/catalogo');
        if (catalogoIndex === -1) return null;
        return pathname.substring(0, catalogoIndex + '/catalogo'.length);
    };

    const basePath = getBasePath();

    const isActive = (currentHrefSuffix: string): boolean => {
        if (!pathname || !basePath) return false;
        let normalizedCurrentSuffix = currentHrefSuffix;
        if (currentHrefSuffix === '' || currentHrefSuffix === '/') {
            normalizedCurrentSuffix = '/';
        } else if (!currentHrefSuffix.startsWith('/')) {
            normalizedCurrentSuffix = `/${currentHrefSuffix}`;
        }
        const currentFullLinkPath = `${basePath}${normalizedCurrentSuffix === '/' ? '' : normalizedCurrentSuffix}`;
        if (normalizedCurrentSuffix !== '/') {
            return pathname === currentFullLinkPath || pathname.startsWith(`${currentFullLinkPath}/`);
        }
        if (pathname === basePath || pathname === `${basePath}/`) {
            return true;
        }
        if (pathname.startsWith(`${basePath}/`)) {
            const isSubRouteOfOtherSection = navLinks.some(link => {
                if (link.hrefSuffix !== '/' && link.hrefSuffix !== '') {
                    let normalizedOtherSuffix = link.hrefSuffix;
                    if (!link.hrefSuffix.startsWith('/')) {
                        normalizedOtherSuffix = `/${link.hrefSuffix}`;
                    }
                    const otherFullLinkPath = `${basePath}${normalizedOtherSuffix}`;
                    return pathname === otherFullLinkPath || pathname.startsWith(`${otherFullLinkPath}/`);
                }
                return false;
            });
            return !isSubRouteOfOtherSection;
        }
        return false;
    };

    const buildHref = (hrefSuffix: string): string => {
        if (!basePath) return '#';
        return `${basePath}${hrefSuffix === '/' ? '' : (hrefSuffix.startsWith('/') ? hrefSuffix : `/${hrefSuffix}`)}`;
    };

    if (!basePath) {
        return (
            <nav className={navListClasses}>
                <p className="text-zinc-500 text-xs p-2">Navegación de catálogo no disponible.</p>
            </nav>
        );
    }

    return (
        // El <aside> que contiene este <nav> ya tiene rounded-lg y border.
        // Este <nav> ocupa el espacio interno.

        <nav className={navListClasses}>

            <h2 className='mb-5 border-b border-zinc-600 pb-5 text-lg text-zinc-500'>
                Gestionar catálogos
            </h2>

            <ul>
                {navLinks.map((link) => {
                    const active = isActive(link.hrefSuffix);
                    const href = buildHref(link.hrefSuffix);
                    // Clases para los iconos
                    const iconClasses = `h-4.5 w-4.5 flex-shrink-0 transition-colors duration-150 ease-in-out ${active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-100'}`; // Tamaño 18px (h-4.5)

                    return (
                        <li key={link.label}>
                            <Link
                                href={href}
                                className={`${navLinkBaseClasses} ${active ? navLinkActiveClasses : navLinkInactiveClasses} group`} // Añadido 'group' para el hover del icono
                                aria-current={active ? 'page' : undefined}
                            >
                                <link.icon className={iconClasses} aria-hidden="true" />
                                <span>{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
