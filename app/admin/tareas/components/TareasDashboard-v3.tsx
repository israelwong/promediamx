'use client';

import React, { useState } from 'react';
// Ajusta las rutas de importación según tu estructura
import ListaTareas from './ListaTareas';
import TareasCategorias from './TareasCategorias';
import TareasEtiquetas from './TareasEtiquetas';
import TareasCanales from './TareasCanales';
import TareaParametros from './TareaParametros';
import TareaFunciones from './TareaFunciones'; // Componente que lista todas las funciones

import { LayoutList, List, Cog } from 'lucide-react'; // Iconos para pestañas
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

// Tipo para la pestaña activa en la columna derecha
type ActiveRightTab = 'tareas' | 'funciones';

export default function TareasDashboard() {
    const router = useRouter();
    // Estado para la pestaña activa de la columna derecha
    const [activeTab, setActiveTab] = useState<ActiveRightTab>('tareas');

    // --- Clases de Tailwind ---
    const panelContainerClasses = "p-4 md:p-6 bg-zinc-900 rounded-lg min-h-screen";
    // Layout: 1 (Side) + 1 (Params) + 3 (Tabs: Tareas/Funciones) = 5
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-5 gap-6";
    const sideColumnClasses = "lg:col-span-1 flex flex-col gap-6"; // Canales, Categorías, Etiquetas
    const paramsColumnClasses = "lg:col-span-1 flex flex-col gap-6"; // Parámetros Globales
    // Columna derecha ahora contiene las pestañas
    const rightColumnClasses = "lg:col-span-3 flex flex-col gap-4"; // Ocupa 3 columnas

    // Clases para las pestañas de la columna derecha
    const tabButtonBaseClasses = "flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-t-md border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50";
    const tabButtonActiveClasses = "border-blue-500 text-white bg-zinc-800";
    // Contenedor del contenido de la pestaña activa
    // const tabContentContainerClasses = "p-4 bg-zinc-800 rounded-b-md rounded-tr-md border border-t-0 border-zinc-700 flex-grow";


    return (
        <div className={panelContainerClasses}>
            {/* Cabecera del Panel */}
            <div className="mb-6 border-b border-zinc-700 pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                        <LayoutList size={20} /> Gestión de Tareas y Funciones
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

                {/* Columna Central (Parámetros Globales) */}
                <div className={paramsColumnClasses}>
                    {/* Contenedor interno opcional para limitar ancho si se desea */}
                    {/* <div className="w-full max-w-lg mx-auto"> */}
                    <TareaParametros />
                    {/* </div> */}
                </div>

                {/* Columna Derecha (Pestañas: Tareas y Funciones) */}
                <div className={rightColumnClasses}>
                    {/* Contenedor de las Pestañas */}
                    <div className="flex flex-col h-full"> {/* Flex container */}
                        {/* Botones de Pestañas */}
                        <div className="flex border-b border-zinc-700 flex-wrap">
                            <button
                                onClick={() => setActiveTab('tareas')}
                                className={`${tabButtonBaseClasses} ${activeTab === 'tareas' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <List size={16} /> Marketplace Tareas
                            </button>
                            <button
                                onClick={() => setActiveTab('funciones')}
                                className={`${tabButtonBaseClasses} ${activeTab === 'funciones' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                            >
                                <Cog size={16} /> Funciones Globales
                            </button>
                        </div>

                        {/* Contenido de la Pestaña Activa */}
                        {/* Quitamos el padding y borde de aquí, ya que los componentes hijos lo tienen */}
                        <div className="flex-grow rounded-b-md rounded-tr-md bg-zinc-800">
                            {activeTab === 'tareas' && <ListaTareas />}
                            {activeTab === 'funciones' && <TareaFunciones />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
