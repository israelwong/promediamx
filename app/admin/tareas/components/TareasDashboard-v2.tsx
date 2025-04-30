'use client'; // Asegúrate que los componentes hijos también sean client components si usan hooks

import React, { useState } from 'react';
// Ajusta las rutas de importación según tu estructura
import ListaTareas from './ListaTareas';
import TareasCategorias from './TareasCategorias';
import TareasEtiquetas from './TareasEtiquetas';
import TareasCanales from './TareasCanales';
import TareaFunciones from './TareaFunciones';
import TareaParametros from './TareaParametros'; // Asegúrate de que este componente exista

import { LayoutList, Database, Cable } from 'lucide-react'; // Iconos
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

// Definimos los tipos posibles para las pestañas activas
type ActiveTab = 'parametros' | 'funciones';

export default function TareasDashboard() {
    const router = useRouter();
    // Estado para controlar la pestaña activa
    const [activeTab, setActiveTab] = useState<ActiveTab>('funciones');

    // --- Clases de Tailwind ---
    const panelContainerClasses = "p-4 md:p-6 bg-zinc-900 rounded-lg min-h-screen"; // Contenedor general
    // --- NUEVO LAYOUT: 3 columnas principales en LG ---
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-5 gap-6"; // 1 (side) + 2 (tabs) + 2 (list) = 5
    const sideColumnClasses = "lg:col-span-1 flex flex-col gap-6"; // Columna para Canales, Categorías, Etiquetas
    // --- NUEVO: Columna combinada para Pestañas (más ancha) ---
    const tabColumnClasses = "lg:col-span-2 flex flex-col gap-6";
    const listColumnClasses = "lg:col-span-2"; // Columna para ListaTareas

    // Clases para las pestañas
    const tabButtonBaseClasses = "flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-t-md border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50";
    const tabButtonActiveClasses = "border-blue-500 text-white bg-zinc-800";

    // Clases para el contenedor del contenido de las pestañas
    const tabContentContainerClasses = "p-4 bg-zinc-800 rounded-b-md rounded-tr-md border border-t-0 border-zinc-700 flex-grow"; // Añadido flex-grow

    return (
        <div className={panelContainerClasses}>

            {/* Cabecera del Panel */}
            <div className="mb-6 border-b border-zinc-700 pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                        <LayoutList size={20} /> Gestión de Tareas del Marketplace
                    </h1>
                    <button
                        onClick={() => router.push('/admin')} // Ajusta la ruta si es necesario
                        className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded flex items-center gap-1 text-sm"
                    >
                        <X size={16} /> Cerrar
                    </button>
                </div>
            </div>

            {/* Grid Principal */}
            <div className={gridContainerClasses}>

                {/* Columna Lateral Izquierda (Canales, Categorías, Etiquetas) */}
                <div className={sideColumnClasses}>
                    <TareasCanales />
                    <TareasCategorias />
                    <TareasEtiquetas />
                </div>

                {/* Columna Central (Pestañas: Parámetros y Funciones) */}
                <div className={tabColumnClasses}>
                    {/* Contenedor de las Pestañas */}
                    <div className="flex flex-col h-full"> {/* Flex container para pestañas y contenido */}
                        {/* Botones de Pestañas */}
                        <div className="flex border-b border-zinc-700 flex-wrap">
                            <button
                                onClick={() => setActiveTab('funciones')}
                                className={`${tabButtonBaseClasses} ${activeTab === 'funciones' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Cable size={16} /> Funciones Automatización
                            </button>
                            <button
                                onClick={() => setActiveTab('parametros')}
                                className={`${tabButtonBaseClasses} ${activeTab === 'parametros' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Database size={16} /> Parámetros Globales
                            </button>
                        </div>

                        {/* Contenido de la Pestaña Activa */}
                        <div className={tabContentContainerClasses}>
                            {activeTab === 'parametros' && <TareaParametros />}
                            {activeTab === 'funciones' && <TareaFunciones />}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha (Lista de Tareas) */}
                <div className={listColumnClasses}>
                    <ListaTareas />
                </div>

            </div>
        </div>
    );
}
