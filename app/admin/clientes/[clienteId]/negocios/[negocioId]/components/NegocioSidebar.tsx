// app/admin/clientes/[clienteId]/negocios/[negocioId]/_components/NegocioSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- Iconos para la nueva estructura (actualizados) ---
import {
    // LayoutDashboard,
    // MessageSquare,
    Users, // Para Leads
    Calendar,
    // Tag,
    // Briefcase,
    // LibraryBig,
    SlidersHorizontal,
    // Bot,
    // CreditCard,
    Kanban,
    Columns, // Para Pipeline
    Tags,
    // VariableIcon, // Para Etiquetas
    ListCheck,
    // Settings,
    // ChartAreaIcon

} from 'lucide-react';

// --- Interfaces (sin cambios) ---
interface NavLink {
    hrefSuffix: string;
    label: string;
    icon: React.ElementType;
}

interface NavSection {
    title: string;
    links: NavLink[];
}

// --- ESTRUCTURA DE NAVEGACIÓN REFACTORIZADA ---
// Aquí aplicamos la nueva arquitectura de información que acordamos.
const navSections: NavSection[] = [
    {
        title: 'CRM',
        links: [
            // CAMBIO: La ruta de Conversaciones ahora es más específica.
            // { hrefSuffix: '/crm/conversaciones', icon: MessageSquare, label: 'Conversaciones' },
            // NUEVO: Añadido enlace a la nueva sección de Leads.
            { hrefSuffix: '/kanban', icon: Kanban, label: 'Kanban' },
            { hrefSuffix: '/calendario', icon: Calendar, label: 'Calendario' },
            { hrefSuffix: '/citas', icon: ListCheck, label: 'Citas Agendadas' },
            { hrefSuffix: '/leads', icon: Users, label: 'Leads' },
            // { hrefSuffix: '/campanas', icon: Users, label: 'Campañas' },
            // { hrefSuffix: '/estadisticas', icon: ChartAreaIcon, label: 'Estadísticas' },
        ]
    },
    {
        title: 'Configuración',
        links: [
            // { hrefSuffix: '/oferta', icon: Tag, label: 'Ofertas' },
            // { hrefSuffix: '/editar', icon: Briefcase, label: 'Perfil del Negocio' },
            { hrefSuffix: '/configAgenda', icon: SlidersHorizontal, label: 'Agendamiento' },
            { hrefSuffix: '/configPipeline', icon: Columns, label: 'Ajustes de Pipeline' },
            { hrefSuffix: '/configEtiquetas', icon: Tags, label: 'Etiquetas' },
            // { hrefSuffix: '/configParametrosPersonalizados', icon: VariableIcon, label: 'Parametros' },
            // { hrefSuffix: '/configuracion', icon: Settings, label: 'Configuración' },
            // { hrefSuffix: '/conocimiento', icon: LibraryBig, label: 'Base de Conocimiento' },
            // { hrefSuffix: '/asistente', icon: Bot, label: 'Asistente Virtual' },
            // { hrefSuffix: '/pagos', icon: CreditCard, label: 'Pagos' },
            // NUEVO: Enlaces para la configuración específica del CRM.
            // { hrefSuffix: '/agentes', icon: UserCog, label: 'Agentes' },
        ]
    },
];

interface NegocioSidebarProps {
    negocioId: string;
    clienteId: string;
}

export default function NegocioSidebar({ clienteId, negocioId }: NegocioSidebarProps) {
    const pathname = usePathname();

    const navContainerClasses = "flex h-full flex-col p-3 space-y-2 bg-zinc-800/50 rounded-lg border border-zinc-700 shadow-sm";
    const navLinkBaseClasses = "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";
    const navLinkInactiveClasses = "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100";
    const navLinkActiveClasses = "bg-blue-600 text-white shadow-sm";
    const sectionTitleClasses = "px-3 pt-3 pb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider";

    const basePathForSidebar = `/admin/clientes/${clienteId}/negocios/${negocioId}`;

    const isActive = (hrefSuffix: string): boolean => {
        if (!pathname) return false;

        const expectedPath = `${basePathForSidebar}${hrefSuffix}`;
        if (hrefSuffix === '/') {
            return pathname === basePathForSidebar;
        }
        return pathname.startsWith(expectedPath);
    };

    // buildHref ahora maneja el caso raíz de forma más limpia
    const buildHref = (hrefSuffix: string): string => {
        return hrefSuffix === '/' ? basePathForSidebar : `${basePathForSidebar}${hrefSuffix}`;
    };

    if (!clienteId || !negocioId) {
        return <nav className={navContainerClasses}><p className="text-zinc-500 text-xs p-3">Cargando...</p></nav>;
    }

    return (
        <nav className={navContainerClasses}>
            <div className="flex-grow">
                <ul className="space-y-2">
                    {/* <li>
                        <Link
                            href={buildHref('/')}
                            className={`${navLinkBaseClasses} ${isActive('/') ? navLinkActiveClasses : navLinkInactiveClasses}`}
                        >
                            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                            <span>Panel de Control</span>
                        </Link>
                    </li> */}

                    {navSections.map((section) => (
                        <li key={section.title}>
                            <h4 className={sectionTitleClasses}>{section.title}</h4>
                            <ul className="space-y-1 mt-1">
                                {section.links.map((link) => {
                                    const active = isActive(link.hrefSuffix);
                                    const href = buildHref(link.hrefSuffix);
                                    return (
                                        <li key={link.label}>
                                            <Link
                                                href={href}
                                                className={`${navLinkBaseClasses} ${active ? navLinkActiveClasses : navLinkInactiveClasses}`}
                                                aria-current={active ? 'page' : undefined}
                                            >
                                                <link.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                                                <span>{link.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}