// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/components/ConfiguracionSubmenu.tsx
'use client'; // Necesita usePathname

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Workflow, Tags, ListPlus, RadioTower, Users } from 'lucide-react'; // Iconos para cada sección

interface SubmenuLink {
    hrefSuffix: string; // Sufijo relativo a /configuracion (ej. '/pipeline')
    label: string;
    icon: React.ElementType;
}

// Define los links del submenú
const submenuLinks: SubmenuLink[] = [
    { hrefSuffix: '/agentes', icon: Users, label: 'Agentes' },
    { hrefSuffix: '/campos', icon: ListPlus, label: 'Campos Personalizados' },
    { hrefSuffix: '/pipeline', icon: Workflow, label: 'Pipeline' },
    { hrefSuffix: '/etiquetas', icon: Tags, label: 'Etiquetas' },
    { hrefSuffix: '/canales', icon: RadioTower, label: 'Canales' },
];

export default function ConfiguracionSubmenu() {
    const pathname = usePathname(); // Ruta completa actual

    // Clases de Tailwind
    const navContainerClasses = " border border-zinc-700 rounded-lg p-3 space-y-1 h-full"; // Contenedor estilizado
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100 ease-in-out w-full text-left";
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100";
    const navLinkActiveClasses = "bg-sky-600 text-white"; // O usa bg-zinc-700

    // --- Lógica replicada de CRMSidebar para rutas absolutas ---

    // Helper para obtener la ruta base hasta /crm/configuracion inclusive
    const getBasePath = (): string | null => {
        if (!pathname) return null;
        // Busca el final del segmento '/crm/configuracion'
        const configIndex = pathname.indexOf('/crm/configuracion');
        if (configIndex === -1) return null; // No estamos en una ruta de configuración válida
        // Extrae la parte de la ruta hasta /crm/configuracion inclusive
        return pathname.substring(0, configIndex + '/crm/configuracion'.length);
    };

    const basePath = getBasePath(); // Llama a la función helper

    // Función para determinar si un link está activo (comparando rutas absolutas)
    const isActive = (hrefSuffix: string) => {
        if (!pathname || !basePath) return false;

        // Construye la ruta absoluta esperada
        const expectedPath = `${basePath}${hrefSuffix}`;

        // Compara la ruta actual completa con la esperada.
        // Para la ruta raíz de configuración (si existiera, hrefSuffix sería ''),
        // se necesitaría manejar el caso del slash final opcional.
        // Pero aquí todos los sufijos tienen contenido.
        return pathname === expectedPath;
    };

    // Función para construir el href ABSOLUTO correcto
    const buildHref = (hrefSuffix: string): string => {
        // Si no tenemos basePath (error o fuera de config), devuelve '#' o una ruta segura
        if (!basePath) return '#';
        // Concatena la base con el sufijo para obtener la ruta absoluta
        return `${basePath}${hrefSuffix}`;
    };

    // --- Fin de la lógica replicada ---


    return (
        <nav className={navContainerClasses}>
            <div className="border-b border-zinc-700 pb-3">
                <h2 className="font-semibold text-zinc-200">Configuración</h2>
            </div>

            {/* Renderiza los links del submenú */}
            <ul>
                {submenuLinks.map((link) => {
                    const active = isActive(link.hrefSuffix);
                    // Construye el href ABSOLUTO usando la lógica replicada
                    const href = buildHref(link.hrefSuffix);

                    return (
                        <li key={link.hrefSuffix}>
                            <Link
                                href={href} // Usa el href ABSOLUTO construido
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
    );
}
