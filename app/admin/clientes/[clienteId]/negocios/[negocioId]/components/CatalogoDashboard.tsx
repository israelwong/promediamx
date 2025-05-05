'use client';

import React, { useState } from 'react';

import NegocioCatalogos from './(catalogo)/NegocioCatalogos';
import NegocioEtiquetas from './(catalogo)/NegocioEtiquetas';
import NegocioCategorias from './(catalogo)/NegocioCategorias';

// Importar iconos para las pestañas
import { Package, LayoutGrid, Tags as EtiquetasIcon } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId?: string; // Opcional, dependiendo de si lo necesitas
}

// Definir los IDs posibles para las pestañas
type TabId = 'catalogos' | 'categorias' | 'etiquetas';

export default function CatalogoDashboard({ clienteId, negocioId }: Props) {
    // Estado para controlar la pestaña activa
    const [activeTab, setActiveTab] = useState<TabId>('catalogos'); // Iniciar con 'catalogos'

    // Clases de Tailwind consistentes
    const containerClasses = "p-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col"; // Quitado padding inicial para que pestañas peguen arriba
    const tabContainerClasses = "flex border-b border-zinc-700 bg-zinc-800 rounded-t-lg overflow-hidden"; // Contenedor de pestañas
    const tabButtonBase = "px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center justify-center gap-2 transition-colors duration-150 ease-in-out flex-grow sm:flex-grow-0"; // flex-grow en móvil
    const tabButtonActive = "bg-zinc-700 text-white border-b-2 border-blue-500"; // Estilo activo con borde inferior
    const tabButtonInactive = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 border-b-2 border-transparent"; // Estilo inactivo
    const tabContentContainerClasses = "flex-grow p-4 overflow-y-auto"; // Contenedor para el contenido de la pestaña activa

    // Mapeo de pestañas para renderizado
    const tabs: { id: TabId; label: string; icon: React.ElementType; component: React.ReactNode }[] = [
        { id: 'catalogos', label: 'Catálogos', icon: Package, component: <NegocioCatalogos negocioId={negocioId} clienteId={clienteId} /> },
        { id: 'categorias', label: 'Categorías', icon: LayoutGrid, component: <NegocioCategorias negocioId={negocioId} /> },
        { id: 'etiquetas', label: 'Etiquetas', icon: EtiquetasIcon, component: <NegocioEtiquetas negocioId={negocioId} /> },
    ];

    return (
        <div className={containerClasses}>
            {/* Barra de Pestañas */}
            <div className={tabContainerClasses} role="tablist">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${tabButtonBase} ${activeTab === tab.id ? tabButtonActive : tabButtonInactive}`}
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                    >
                        <tab.icon size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">{tab.label}</span> {/* Ocultar texto en móvil si es necesario */}
                    </button>
                ))}
            </div>

            {/* Contenedor del Contenido de las Pestañas */}
            <div className={tabContentContainerClasses}>
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        id={`tabpanel-${tab.id}`}
                        role="tabpanel"
                        aria-labelledby={`tab-${tab.id}`}
                        // Renderizar solo el contenido de la pestaña activa
                        className={activeTab === tab.id ? 'block' : 'hidden'}
                    >
                        {/* Renderizar el componente asociado a la pestaña activa */}
                        {activeTab === tab.id && tab.component}
                    </div>
                ))}
            </div>
        </div>
    );
}