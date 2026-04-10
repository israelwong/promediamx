'use client';

import React, { useState } from 'react';

import ListaTareas from './ListaTareas';
// import TareasCategorias from '../categorias/components/TareasCategorias_no';
import TareasEtiquetas from '../etiquetas/components/TareasEtiquetas';
import TareasCanales from '../canales/components/TareasCanales';
import TareaParametros from '../parametros/components/TareaParametros';
// import TareaFunciones from '../funciones/components/TareaFunciones';

import { LayoutList, List, Cog, ListTree, Tags } from 'lucide-react';
// import { useRouter } from 'next/navigation';
// import { X } from 'lucide-react';

// Tipos para las pestañas activas
type ActiveRightTab = 'tareas' | 'funciones' | 'parametros';
type ActiveSideTab = 'categorias' | 'etiquetas' | 'canales';

export default function TareasDashboard() {
    // const router = useRouter();
    const [activeRightTab, setActiveRightTab] = useState<ActiveRightTab>('tareas');
    const [activeSideTab, setActiveSideTab] = useState<ActiveSideTab>('categorias');

    // --- Clases de Tailwind ---
    const panelContainerClasses = "p-4 md:p-6 bg-zinc-900 rounded-lg min-h-screen";
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-6 gap-6 lg:gap-8"; // Aumentar gap general opcionalmente
    const leftCombinedColumnClasses = "lg:col-span-2 flex flex-col gap-6";
    const rightColumnClasses = "lg:col-span-4 flex flex-col"; // Quitado gap-4, se maneja interno

    // Clases para pestañas
    const tabButtonBaseClasses = "flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-800 focus:ring-blue-400 transition-colors duration-150 flex items-center justify-center gap-1.5 whitespace-nowrap";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/40";
    const tabButtonActiveClasses = "border-blue-500 text-white bg-zinc-700/50";
    // Contenedor del contenido de la pestaña activa (lateral)
    // Añadido flex flex-col para que el contenido interno pueda crecer
    const sideTabContainerClasses = "flex flex-col flex-grow min-h-0"; // Contenedor para Pestañas[Cat/Etiq]
    const sideTabContentContainerClasses = "flex-grow rounded-b-md rounded-tr-md bg-zinc-800/50 border border-t-0 border-zinc-700 flex flex-col"; // flex-col para que el contenido hijo (tabla) pueda usar flex-grow

    // Contenedor para la pestaña derecha
    const rightTabContainerClasses = "flex flex-col h-full"; // Contenedor para Pestañas[Tareas/Funciones]
    const rightTabContentContainerClasses = "flex-grow rounded-b-md rounded-tr-md bg-zinc-800 flex flex-col"; // flex-col


    return (
        <div className={panelContainerClasses}>
            {/* Cabecera del Panel */}
            <div className="mb-6 border-b border-zinc-700 pb-3">
                {/* ... (contenido cabecera sin cambios) ... */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                        <LayoutList size={20} /> Gestión de Tareas y Funciones
                    </h1>
                    {/* <button
                        onClick={() => router.push('/admin')}
                        className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded flex items-center gap-1 text-sm"
                    >
                        <X size={16} /> Cerrar
                    </button> */}
                </div>
            </div>

            {/* Grid Principal (2 Columnas en lg) */}
            <div className={gridContainerClasses}>

                {/* --- Columna Izquierda Combinada (2/5) --- */}
                {/* Aplicamos flex-col para que los hijos se apilen */}
                <div className={leftCombinedColumnClasses}>
                    {/* Canales (altura automática) */}
                    {/* Envolver en div con h-fit o aplicar directamente si TareasCanales lo soporta */}
                    {/* <div className="h-fit">
                        <TareasCanales />
                    </div> */}

                    {/* Pestañas Categorías/Etiquetas (ocupará espacio restante) */}
                    {/* Usamos sideTabContainerClasses con flex-grow */}
                    <div className={sideTabContainerClasses}>
                        <div className="flex border-b border-zinc-700 flex-wrap">
                            <button
                                onClick={() => setActiveSideTab('categorias')}
                                className={`${tabButtonBaseClasses} ${activeSideTab === 'categorias' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <ListTree size={14} /> Categorías
                            </button>
                            <button
                                onClick={() => setActiveSideTab('etiquetas')}
                                className={`${tabButtonBaseClasses} ${activeSideTab === 'etiquetas' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Tags size={14} /> Etiquetas
                            </button>
                            <button
                                onClick={() => setActiveSideTab('canales')}
                                className={`${tabButtonBaseClasses} ${activeSideTab === 'canales' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Tags size={14} /> Canales
                            </button>
                        </div>
                        {/* El contenedor de contenido ahora tiene flex-col */}
                        <div className={`${sideTabContentContainerClasses}`}>
                            {/* Los componentes hijos (TareasCategorias/Etiquetas) deberían tener flex-grow si necesitan llenar espacio */}
                            {/* {activeSideTab === 'categorias' && <TareasCategorias />} */}
                            {activeSideTab === 'etiquetas' && <TareasEtiquetas />}
                            {activeSideTab === 'canales' && <TareasCanales />}

                        </div>
                    </div>

                </div>

                {/* <div className="">
                    <TareaParametros />
                </div> */}

                {/* --- Columna Derecha (3/5) --- */}
                <div className={rightColumnClasses}>
                    <div className={rightTabContainerClasses}>
                        <div className="flex border-b border-zinc-700 flex-wrap">
                            <button
                                onClick={() => setActiveRightTab('tareas')}
                                className={`${tabButtonBaseClasses} ${activeRightTab === 'tareas' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <List size={16} /> Marketplace Tareas
                            </button>
                            <button
                                onClick={() => setActiveRightTab('funciones')}
                                className={`${tabButtonBaseClasses} ${activeRightTab === 'funciones' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Cog size={16} /> Funciones Globales
                            </button>
                            <button
                                onClick={() => setActiveRightTab('parametros')}
                                className={`${tabButtonBaseClasses} ${activeRightTab === 'parametros' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Cog size={16} /> Parámetros
                            </button>
                        </div>
                        <div className={rightTabContentContainerClasses}>
                            {activeRightTab === 'tareas' && <ListaTareas />}
                            {/* {activeRightTab === 'funciones' && <TareaFunciones />} */}
                            {activeRightTab === 'parametros' && <TareaParametros />}
                        </div>
                    </div>
                </div>
                {/* --- Fin Columna Derecha --- */}
            </div>
        </div>
    );
}
