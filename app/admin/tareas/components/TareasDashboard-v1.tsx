'use client';

import React from 'react';
// Ajusta las rutas de importación según tu estructura
import ListaTareas from './ListaTareas'; // El componente rediseñado
import TareasCategorias from './TareasCategorias';
import TareasEtiquetas from './TareasEtiquetas';
import TareasCanales from './TareasCanales';
import TareaParametros from './TareaParametros';

import { LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function TareasDashboard() {
    const router = useRouter();

    // --- Clases de Tailwind ---
    const panelContainerClasses = "p-4 md:p-6 bg-zinc-900 rounded-lg min-h-screen";
    // --- LAYOUT AJUSTADO: 1 (side) + 1 (params) + 3 (list) = 5 ---
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-5 gap-6";
    const sideColumnClasses = "lg:col-span-1 flex flex-col gap-6"; // Canales, Categorías, Etiquetas
    const paramsColumnClasses = "lg:col-span-1 flex flex-col gap-6"; // Parámetros Globales (más estrecho)
    const listColumnClasses = "lg:col-span-3"; // Lista de Tareas (más ancha)

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

                {/* Columna Central (Parámetros Globales) */}
                <div className={paramsColumnClasses}>
                    <TareaParametros />
                </div>

                {/* Columna Derecha (Lista de Tareas - ahora más ancha) */}
                <div className={listColumnClasses}>
                    {/* Aquí va el nuevo componente ListaTareas rediseñado */}
                    <ListaTareas />
                </div>
            </div>
        </div>
    );
}
