// app/admin/dashboard/components/DashboardSidebar.tsx
'use client'
import React from 'react'; // Removed useState
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Shuffle, Home, Calendar, Wallet, Inbox, SquareUser
    // Removed ChevronsLeft, ChevronsRight
} from 'lucide-react';

// Interface for link data
interface DashboardLink {
    href: string;
    label: string; // Still needed for tooltip (title)
    icon: React.ElementType;
}

// Array of links
const links: DashboardLink[] = [
    { href: '/admin/dashboard', label: 'Inicio', icon: Home },
    { href: '/admin/dashboard/promesas', label: 'Promesas', icon: Inbox },
    { href: '/admin/dashboard/seguimiento', label: 'Gestión', icon: Shuffle },
    { href: '/admin/dashboard/agenda', label: 'Agenda', icon: Calendar },
    { href: '/admin/dashboard/contactos', label: 'Contactos', icon: SquareUser },
    { href: '/admin/dashboard/finanzas', label: 'Finanzas', icon: Wallet },
];

function DashboardSideBar() {
    const pathname = usePathname();
    // Removed isExpanded state

    // Function to determine active link (no changes needed)
    const isActive = (href: string) => {
        if (href === '/admin/dashboard') {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    // --- Tailwind Classes for Minimalist Style ---
    const navListClasses = "flex flex-col items-center space-y-4 w-full"; // Centered icons, vertical space
    // Link classes: Centered content, adjusted padding for icon-only
    const linkBaseClasses = "p-3 rounded-lg transition-colors duration-150 ease-in-out block relative flex justify-center";
    const linkInactiveClasses = "text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200";
    const linkActiveClasses = "bg-sky-600 text-white shadow-inner"; // Active style remains

    return (
        <nav className="w-full pt-4"> {/* Added pt-4 for spacing from top */}
            <ul className={navListClasses}>
                {links.map((link) => {
                    const active = isActive(link.href);
                    const IconComponent = link.icon;

                    return (
                        <li key={link.href} className="w-full flex justify-center">
                            <Link
                                href={link.href}
                                className={`${linkBaseClasses} ${active ? linkActiveClasses : linkInactiveClasses}`}
                                title={link.label} // Tooltip shows the label
                            >
                                {/* Render Icon */}
                                <IconComponent
                                    size={22} // Consistent icon size
                                    strokeWidth={active ? 2.5 : 2}
                                />

                                {/* Active Indicator (Small dot) */}
                                {active && (
                                    <span className="absolute left-1 top-1/2 h-1.5 w-1.5 bg-sky-400 rounded-full transform -translate-y-1/2"></span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export default DashboardSideBar;