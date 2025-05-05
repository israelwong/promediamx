'use client'; // Asegúrate que los componentes hijos también sean client components si usan hooks

import React from 'react';
// Ajusta las rutas de importación según tu estructura de carpetas real
import AsistenteEditarForm from './AsistenteEditarForm';
import AsistenteTareas from './AsistenteTareas'; // Este será rediseñado después para separar tareas
import AsistenteEstadisticas from './AsistenteEstadisticas'; // Este será rediseñado para ser compacto
import AsistenteCosto from './AsistenteCosto'; // Este es el nuevo WidgetResumenCosto

interface Props {
    asistenteId: string;
    negocioId: string;
    clienteId: string;
}

export default function AsistenteDashboard({ asistenteId, negocioId, clienteId }: Props) {

    const dashboardContainerClasses = "p-4 md:p-6"; // Padding general de la página
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8"; // Grid principal (1 columna en móvil, 5 en lg)
    const editorColumnClasses = "lg:col-span-3 flex-grow"; // El editor ocupa 3 de 5 columnas en lg
    const sidebarColumnClasses = "lg:col-span-2 flex flex-col gap-6"; // La barra lateral ocupa 2 de 5 columnas en lg

    return (
        <div className={dashboardContainerClasses}>
            {/* Grid principal para organizar las dos columnas principales */}
            <div className={gridContainerClasses}>

                <div className={editorColumnClasses}>
                    <AsistenteEditarForm
                        asistenteId={asistenteId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </div>

                {/* Columna Derecha (Más estrecha): Estadísticas, Costo, Tareas */}
                <div className={sidebarColumnClasses}>
                    {/* Componente de Costo (WidgetResumenCosto) */}
                    <AsistenteCosto
                        asistenteId={asistenteId}
                    />

                    {/* Componente de Estadísticas (Versión Compacta) */}
                    <AsistenteEstadisticas
                        asistenteId={asistenteId}
                    />

                    {/* Componente de Tareas Suscritas (Rediseñado para separar Base/Adicionales) */}
                    <AsistenteTareas
                        asistenteId={asistenteId}
                        // Podrías pasar props adicionales si es necesario para la nueva lógica
                        clienteId={clienteId}
                        negocioId={negocioId}
                    />
                </div>

            </div>
        </div>
    );
}
