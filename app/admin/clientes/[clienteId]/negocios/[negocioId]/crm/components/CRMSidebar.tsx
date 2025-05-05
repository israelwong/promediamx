// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/components/CRMSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Importar useRouter también
import {
    MessageSquareText,
    Users,
    CalendarClock,
    Settings,
    Filter,
    LogOut // Icono para Cerrar
} from 'lucide-react';
import CRMNegocioLogo from './CRMNegocioLogo'; // Asegúrate que la ruta sea correcta

interface NavLink {
    hrefSuffix: string;
    label: string;
    icon: React.ElementType;
}

const navLinks: NavLink[] = [
    { hrefSuffix: '', icon: MessageSquareText, label: 'Conversaciones' },
    { hrefSuffix: '/leads', icon: Users, label: 'Leads' },
    { hrefSuffix: '/pipeline', icon: Filter, label: 'Pipeline' },
    { hrefSuffix: '/agenda', icon: CalendarClock, label: 'Agenda' },
    { hrefSuffix: '/configuracion', icon: Settings, label: 'Configuración' },
];

interface Props {
    negocioId: string;
    clienteId: string;
}

export default function CRMSidebar({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const pathname = usePathname();

    // --- Clases de Tailwind Revisadas ---
    // El contenedor principal <aside> ya tiene estilos en LayoutCRM.
    // Estas clases son para los elementos *dentro* del sidebar.
    const logoContainerClasses = "p-4 border-b border-zinc-700"; // Contenedor del logo
    const navListClasses = "flex-grow p-3 space-y-1"; // Lista de navegación principal
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left"; // Estilo base para links
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"; // Estilo inactivo
    const navLinkActiveClasses = "bg-sky-600 text-white shadow-inner"; // Estilo activo
    const footerContainerClasses = "mt-auto p-3 border-t border-zinc-700"; // Contenedor del footer
    const closeButtonClasses = "w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-900/30 py-2 px-3 rounded-md transition-colors duration-150 ease-in-out mt-auto"; // Botón cerrar

    // --- Lógica de Navegación (Sin cambios respecto a la versión funcional) ---
    const getBasePath = (): string | null => {
        if (!pathname) return null;
        const crmIndex = pathname.indexOf('/crm');
        if (crmIndex === -1) return null;
        return pathname.substring(0, crmIndex + 4);
    };

    const basePath = getBasePath();

    const isActive = (hrefSuffix: string) => {
        if (!pathname || !basePath) return false;
        const expectedPath = `${basePath}${hrefSuffix}`;
        if (hrefSuffix === '/configuracion') {
            return pathname.startsWith(expectedPath);
        }
        if (hrefSuffix === '') {
            return pathname === basePath || pathname === `${basePath}/`;
        }
        return pathname === expectedPath;
    };

    const buildHref = (hrefSuffix: string): string => {
        if (!basePath) return '#';
        return `${basePath}${hrefSuffix}`;
    };

    const handleCloseCRM = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);
    }

    // --- Renderizado ---
    // No se necesita un div contenedor aquí, ya que el <aside> del layout lo envuelve
    return (
        <div>
            {/* Usar Fragment para evitar div extra */}
            {/* Contenedor del Logo/Nombre */}
            <div className={logoContainerClasses}>
                <CRMNegocioLogo negocioId={negocioId} />
            </div>

            {/* Lista de Navegación */}
            <nav className={navListClasses}>
                <ul>
                    {navLinks.map((link) => {
                        const active = isActive(link.hrefSuffix);
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

            {/* Footer con Botón Cerrar */}
            <div className={footerContainerClasses}>
                <button
                    onClick={handleCloseCRM}
                    className={closeButtonClasses}
                    title="Volver al panel del negocio"
                >
                    <LogOut size={14} />
                    <span>Cerrar CRM</span>
                </button>
            </div>
        </div>
    );
}
