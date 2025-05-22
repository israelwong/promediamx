
// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/components/CRMSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ListChecks,      // Para Tareas
    // FunctionSquare,  // Para Funciones
    // SlidersHorizontal, // Para Parametros
    Folder,          // Para Categorias
    Tag,             // Para Etiquetas
    MessagesSquare   // Para Canales
} from 'lucide-react';

// Definición del tipo (si no la tienes ya)
interface NavLink {
    hrefSuffix: string;
    icon: React.ElementType; // O el tipo específico de tus iconos Lucide
    label: string;
}

const navLinks: NavLink[] = [
    { hrefSuffix: '/', icon: ListChecks, label: 'Tareas' },
    // { hrefSuffix: '/funciones', icon: FunctionSquare, label: 'Funciones' },
    // { hrefSuffix: '/parametros', icon: SlidersHorizontal, label: 'Parámetros' },
    { hrefSuffix: '/categorias', icon: Folder, label: 'Categorías' }, // Asumiendo que "Categorias" se refiere a CategoriaTarea
    { hrefSuffix: '/etiquetas', icon: Tag, label: 'Etiquetas' },     // Asumiendo que "Etiquetas" se refiere a EtiquetaTarea
    { hrefSuffix: '/canales', icon: MessagesSquare, label: 'Canales' }, // Asumiendo que "Canales" se refiere a CanalConversacional
];

export default function TareaSidebar() {
    const pathname = usePathname();

    // Clases de Tailwind
    const navListClasses = "flex-grow p-3 space-y-1";
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left";
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100";
    const navLinkActiveClasses = "bg-sky-600 text-white shadow-inner";

    const getBasePath = (): string | null => {
        if (!pathname) return null;
        const configIndex = pathname.indexOf('/tareas');
        if (configIndex === -1) return null; // No estamos en una ruta de configuración válida
        return configIndex === -1 ? null : pathname.substring(0, configIndex + '/tareas'.length);
    };

    const basePath = getBasePath();

    // --- Función isActive Corregida ---
    const isActive = (hrefSuffix: string) => {
        if (!pathname || !basePath) return false;
        const expectedPath = `${basePath}${hrefSuffix}`;
        //para activa la ruta base
        if (hrefSuffix === '/') {
            // Coincidencia exacta o con slash final
            return pathname === basePath || pathname === `${basePath}/`;
        }
        return pathname === expectedPath;
    };
    // --- Fin Corrección ---


    const buildHref = (hrefSuffix: string): string => {
        if (!basePath) return '#';
        return `${basePath}${hrefSuffix}`;
    };

    return (
        <>
            <div className="p-4 border-b border-zinc-700">
                <h2 className="text-lg font-semibold">Tareas</h2>
                <p className="text-sm text-zinc-400">Gestión de tareas y funciones</p>
            </div>
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
