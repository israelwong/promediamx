'use client'
// components/ConfigPanel.js

import Link from 'next/link';

export default function Configurar() {
    const buttons = [
        // { label: 'Roles', href: '/admin/configurar/roles' },
        { label: 'Usuarios', href: '/admin/configurar/usuarios' },
        { label: 'Servicios', href: '/admin/configurar/servicios' },
        { label: 'Sistema', href: '/admin/configurar/sistema' },
    ];

    return (
        <div className="container mx-auto">

            <div className="grid grid-cols-3 gap-4 p-4">
                {buttons.map((button, index) => (
                    <Link key={index} href={button.href}
                        className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg border border-zinc-700 text-white">
                        {button.label}
                    </Link>
                ))}
            </div>
        </div>
    );
};
