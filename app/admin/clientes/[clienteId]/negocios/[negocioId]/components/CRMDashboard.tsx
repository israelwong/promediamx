'use client';

import React, { useEffect, useState, useCallback } from 'react';
// Ajusta la ruta a tu acción y tipos
import { obtenerCRM } from '@/app/admin/_lib/crm.actions'; // Acción para obtener el CRM por negocioId
import { CRM as CRMType } from '@/app/admin/_lib/types'; // Tipo base de CRM
// Importar los componentes hijos para cada pestaña
import CRMEstadisticas from './(crm)/CRMEstadisticas';
import CRMAgentes from './(crm)/CRMAgentes';
// import CRMAgenda from './(crm)/CRMAgenda';
import CRMCamposPersonalizados from './(crm)/CRMCamposPersonalizados';
import CRMConfiguracion from './(crm)/CRMConfiguracion';

// Importar iconos
import { Loader2, AlertTriangle, LayoutDashboard, Users, Keyboard, Settings, DatabaseZap } from 'lucide-react';

interface Props {
    negocioId: string;
}

// Definir los IDs posibles para las pestañas
type TabId = 'estadisticas' | 'agentes' | 'agenda' | 'configuracion';

export default function CRMDashboard({ negocioId }: Props) {
    const [crmData, setCrmData] = useState<CRMType | null>(null); // Solo necesitamos el ID aquí
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('estadisticas'); // Pestaña inicial

    // Clases de Tailwind consistentes
    const containerClasses = "p-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const tabContainerClasses = "flex border-b border-zinc-700 bg-zinc-800 rounded-t-lg overflow-hidden";
    const tabButtonBase = "px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center justify-center gap-2 transition-colors duration-150 ease-in-out flex-grow sm:flex-grow-0"; // flex-grow en móvil
    const tabButtonActive = "bg-zinc-700 text-white border-b-2 border-blue-500";
    const tabButtonInactive = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 border-b-2 border-transparent";
    const tabContentContainerClasses = "flex-grow p-4 md:p-5 overflow-y-auto"; // Padding para el contenido
    const centeredMessageClasses = "flex flex-col items-center justify-center text-center h-60 text-zinc-500"; // Para mensajes centrados

    // --- Función para cargar datos del CRM ---
    const fetchCRMData = useCallback(async () => {
        if (!negocioId) {
            setError("ID de Negocio no proporcionado.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setCrmData(null);
        try {
            // La acción debe devolver al menos { id: string } o null
            const data = await obtenerCRM(negocioId); // Asume que esta acción busca por negocioId
            if (data && data.id) {
                setCrmData({ id: data.id }); // Guardar solo el ID o el objeto completo si lo necesitas
            } else {
                // No es un error necesariamente, el negocio puede no tener CRM
                console.log(`No se encontró CRM para el negocio ${negocioId}`);
            }
        } catch (err) {
            console.error("Error al obtener los datos del CRM:", err);
            setError("No se pudo cargar la información del CRM.");
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchCRMData();
    }, [fetchCRMData]);

    // Mapeo de pestañas
    // El componente se renderiza solo si crmData.id existe
    const tabs: { id: TabId; label: string; icon: React.ElementType; component: React.ReactNode }[] = [
        { id: 'estadisticas', label: 'CRM Dashboard', icon: LayoutDashboard, component: crmData?.id ? <CRMEstadisticas crmId={crmData.id} negocioId={negocioId} /> : null },
        { id: 'agenda', label: 'Form', icon: Keyboard, component: crmData?.id ? <CRMCamposPersonalizados crmId={crmData.id} /> : null },
        { id: 'agentes', label: 'Agentes', icon: Users, component: crmData?.id ? <CRMAgentes crmId={crmData.id} /> : null },
        { id: 'configuracion', label: 'Configuración', icon: Settings, component: crmData?.id ? <CRMConfiguracion crmId={crmData.id} /> : null },
    ];

    // --- Renderizado ---
    if (loading) {
        return (
            <div className={`${containerClasses} items-center justify-center`}>
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <p className="mt-2 text-sm text-zinc-400">Cargando CRM...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${containerClasses} items-center justify-center p-6 text-red-400`}>
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p>{error}</p>
                <button onClick={fetchCRMData} className="mt-4 text-xs underline hover:text-red-300">Reintentar</button>
            </div>
        );
    }

    // Si no hay error pero no se encontró CRM
    if (!crmData) {
        return (
            <div className={containerClasses}>
                <div className={centeredMessageClasses}>
                    <DatabaseZap className="h-12 w-12 mb-3 opacity-30" />
                    <p className='text-zinc-400 italic text-base mb-3'>Este negocio aún no tiene un CRM activado.</p>
                    {/* Opcional: Botón para crear/activar CRM */}
                    {/* <button onClick={handleActivateCRM} className="...">Activar CRM</button> */}
                </div>
            </div>
        );
    }

    // Si hay CRM, mostrar pestañas
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
                        aria-controls={`tabpanel-crm-${tab.id}`}
                        id={`tab-crm-${tab.id}`}
                    >
                        <tab.icon size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Contenedor del Contenido de las Pestañas */}
            <div className={tabContentContainerClasses}>
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        id={`tabpanel-crm-${tab.id}`}
                        role="tabpanel"
                        aria-labelledby={`tab-crm-${tab.id}`}
                        className={activeTab === tab.id ? 'block' : 'hidden'}
                    >
                        {/* Renderizar el componente si la pestaña está activa */}
                        {activeTab === tab.id && tab.component}
                    </div>
                ))}
            </div>
        </div>
    );
}
