'use client';

import React from 'react'; // Ya no se necesita useState
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Importar iconos (XIcon ya no es necesario para el modal)
import { BotIcon, ListChecksIcon } from 'lucide-react';

// Definir los enlaces con iconos
const links = [
    { href: '/admin/IA/asistentes', label: 'Asistentes', icon: BotIcon },
    { href: '/admin/IA/tareas', label: 'Tareas', icon: ListChecksIcon },

];

// URL para la ventana emergente de testing
// const testingUrl = '/admin/IA/asistentes/conversacion'; // URL base
// const testingUrlPopup = `${testingUrl}?popup=true`; // Añadir parámetro

export default function IASidebar() {
    const pathname = usePathname();

    // Clases para los enlaces (reutilizables)
    const linkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out";
    const linkActiveClass = "bg-zinc-700 text-white";
    const linkInactiveClass = "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100";
    // Clases para el botón de testing
    // const testingButtonClasses = `${linkBaseClasses} ${linkInactiveClass} mt-4 border-t border-zinc-700 pt-3`;

    // Función para abrir la ventana de testing
    // const openTestingWindow = () => {
    //     const windowFeatures = 'width=800,height=700,resizable=yes,scrollbars=yes,status=yes';
    //     // Abrir la URL con el parámetro
    //     window.open(testingUrlPopup, 'testingWindow', windowFeatures);
    // };

    return (
        // Contenedor del Sidebar (sin cambios el Fragment <> </>)
        <nav className="flex flex-col justify-between h-full">
            {/* Enlaces de Navegación */}
            <div className="space-y-1">
                {links.map((link) => {
                    const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${linkBaseClasses} ${isActive ? linkActiveClass : linkInactiveClass}`}
                            title={link.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <link.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                            <span>{link.label}</span>
                        </Link>
                    );
                })}

                {/* Botón de Testing (ahora usa window.open) */}
                {/* <button
                    onClick={openTestingWindow} // Llama a la función para abrir la ventana
                    className={testingButtonClasses + " w-full"}
                    title="Abrir ventana de testing"
                >
                    <FlaskConical className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>Testing</span>
                </button> */}

            </div>
        </nav>
    );
}
