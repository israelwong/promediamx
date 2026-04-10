'use client';

import React from 'react';
// import { useRouter } from 'next/navigation'; // Aunque no se use para navegar ahora, puede ser útil después
import { Settings, Globe, BarChart3, MousePointerClick, FileInput } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    clienteId: string; // Agregado clienteId
}

export default function SuscripcionesLandingpage({ negocioId, clienteId }: Props) {
    console.log("SuscripcionesLandingpage renderizado con negocioId:", negocioId, "para el clienteId:", clienteId);
    // const router = useRouter();

    // Clases de Tailwind consistentes con otros componentes del panel
    const containerClasses = "p-4 md:p-5 bg-zinc-800  flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const contentContainerClasses = "flex-grow flex flex-col items-center justify-center text-center text-zinc-500";
    // Botón desactivado
    const buttonDisabledClasses = "bg-zinc-600 text-zinc-400 cursor-not-allowed text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 whitespace-nowrap";
    // Clases para los placeholders de estadísticas
    const statPlaceholderClasses = "text-sm flex items-center gap-2";

    const handleGestionarClick = () => {
        // Por ahora no hace nada o redirige a una página genérica
        console.log("Funcionalidad 'Gestionar Landing Page' próximamente.");
        // router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/landingpage`); // Ruta futura
        console.log("Redirigiendo a la página de gestión de landing page...");
    };

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Globe size={16} /> Landing Page
                </h3>
                {/* Botón desactivado */}
                <button
                    onClick={handleGestionarClick}
                    className={buttonDisabledClasses}
                    title="Gestionar Landing Page (Próximamente)"
                    disabled // Desactivado por ahora
                >
                    <Settings size={14} /> <span>Personalizar</span>
                </button>
            </div>

            {/* Contenido Principal - Placeholder */}
            <div className={contentContainerClasses}>
                <Globe size={48} className="mb-4 opacity-30" /> {/* Icono grande */}
                <p className="text-lg font-semibold text-zinc-400 mb-2">
                    Módulo Próximamente
                </p>
                <p className="text-sm text-zinc-500 mb-6">
                    Aquí podrás gestionar la landing page de tu negocio.
                </p>

                {/* Placeholders de Estadísticas */}
                <div className="space-y-2 text-left w-full max-w-xs p-4 bg-zinc-700/30 rounded-md border border-zinc-600/50">
                    <div className={statPlaceholderClasses}>
                        <BarChart3 size={16} className="flex-shrink-0" />
                        <span>Estadísticas de visita: --</span>
                    </div>
                    <div className={statPlaceholderClasses}>
                        <MousePointerClick size={16} className="flex-shrink-0" />
                        <span>Clicks generados: --</span>
                    </div>
                    <div className={statPlaceholderClasses}>
                        <FileInput size={16} className="flex-shrink-0" />
                        <span>Lead forms ejecutados: --</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
