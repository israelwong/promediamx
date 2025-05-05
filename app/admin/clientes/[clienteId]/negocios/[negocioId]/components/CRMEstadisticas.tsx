'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// --- Actions and Types ---
import {
    obtenerEstadisticasResumenCRM,
    crearCRMyPoblarDatos // Acción para configurar/crear
} from '@/app/admin/_lib/crm.actions'; // Ajusta la ruta
import type { EstadisticasCRMResumen } from '@/app/admin/_lib/types'; // Ajusta la ruta
// --- Icons ---
import { Loader2, AlertTriangle, LineChart, Settings, ArrowRight, DatabaseZap } from 'lucide-react'; // Icons

interface Props {
    negocioId: string;
    clienteId?: string; // Para construir URLs de navegación
}

export default function CRMEstadisticas({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [stats, setStats] = useState<EstadisticasCRMResumen | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfiguring, setIsConfiguring] = useState(false); // Estado para el botón de configurar

    // Clases Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex items-center justify-between gap-2 mb-4 border-b border-zinc-700 pb-2";
    const statsGridClasses = "grid grid-cols-2 gap-4 mb-4"; // Grid para mostrar stats
    const statCardClasses = "bg-zinc-900/40 p-3 rounded-lg text-center border border-zinc-700/50";
    const statValueClasses = "text-xl md:text-2xl font-bold text-white";
    const statLabelClasses = "text-xs text-zinc-400 mt-1";
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 w-full mt-auto`; // Botón ocupa todo el ancho y va al fondo
    const configureButtonClasses = `${buttonBaseClasses} text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 w-full`;

    // --- Carga de datos ---
    const fetchStats = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerEstadisticasResumenCRM(negocioId);
            setStats(data); // Guarda null si hay error en la acción o el objeto si tiene éxito
            console.log("Estadísticas CRM:", data);
            if (data === null) {
                // Si la acción devuelve null, es un error de carga
                setError("No se pudieron cargar las estadísticas del CRM.");
            }
        } catch (err) {
            console.error("Error al obtener estadísticas CRM:", err);
            setError("Error al cargar estadísticas.");
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- Navegación y Configuración ---
    const navigateToCRM = () => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
        router.push(`${basePath}/crm`); // Ruta dedicada al CRM completo
    };

    const handleConfigurarCRM = async () => {
        setIsConfiguring(true);
        setError(null);
        try {
            const result = await crearCRMyPoblarDatos(negocioId);
            if (result.success && result.data?.crmId) {
                // Éxito, redirigir a la página del CRM
                navigateToCRM();
            } else {
                throw new Error(result.error || "No se pudo configurar el CRM.");
            }
        } catch (err) {
            console.error("Error configurando CRM:", err);
            setError(err instanceof Error ? err.message : "Error al configurar.");
            setIsConfiguring(false); // Re-habilitar botón si falla
        }
        // No poner finally si hay redirección exitosa
    };

    // --- Renderizado ---
    const renderContent = () => {
        if (loading) {
            return <div className="flex-grow flex items-center justify-center text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando CRM...</span></div>;
        }
        if (error) {
            return <div className="flex-grow flex flex-col items-center justify-center text-center text-red-400"><AlertTriangle className="h-8 w-8 mb-2" /><span>{error}</span></div>;
        }
        if (!stats) {
            // Caso improbable si la acción no devolvió error pero sí null
            return <div className="flex-grow flex flex-col items-center justify-center text-center text-zinc-500"><AlertTriangle className="h-8 w-8 mb-2" /><span>No se pudo obtener el estado del CRM.</span></div>;
        }

        // Caso: CRM No Configurado
        if (!stats.crmConfigurado) {
            return (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <DatabaseZap size={32} className="text-emerald-500 mb-3" />
                    <p className="text-sm text-zinc-300 mb-4">El CRM para este negocio aún no está configurado.</p>
                    <button
                        onClick={handleConfigurarCRM}
                        className={configureButtonClasses}
                        disabled={isConfiguring}
                    >
                        {isConfiguring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings size={16} className="mr-2" />}
                        {isConfiguring ? 'Configurando...' : 'Configurar CRM Ahora'}
                    </button>
                </div>
            );
        }

        // Caso: CRM Configurado - Mostrar Estadísticas
        return (
            <div className="flex flex-col flex-grow">
                <div className={statsGridClasses}>
                    {/* Stat: Leads */}
                    <div className={statCardClasses}>
                        <p className={statValueClasses}>{stats.totalLeads ?? '0'}</p>
                        <p className={statLabelClasses}>Leads Totales</p>
                    </div>
                    {/* Stat: Conversaciones */}
                    <div className={statCardClasses}>
                        <p className={statValueClasses}>{stats.totalConversaciones ?? '0'}</p>
                        <p className={statLabelClasses}>Conversaciones</p>
                    </div>
                    {/* Podrías añadir más stats aquí si los incluyes en el tipo y la acción */}
                </div>
                {/* Espacio flexible para empujar botón hacia abajo */}
                <div className="flex-grow"></div>
                {/* Botón para ir al CRM completo */}
                <button onClick={navigateToCRM} className={primaryButtonClasses}>
                    <span>Gestionar CRM Completo</span>
                    <ArrowRight size={16} className="ml-2" />
                </button>
            </div>
        );
    };

    return (
        <div className={containerClasses}>
            {/* Cabecera del Widget */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <LineChart size={16} /> Resumen CRM
                </h3>
                {/* Podrías añadir un icono de refresh o info aquí si quieres */}
            </div>

            {/* Contenido dinámico */}
            {renderContent()}
        </div>
    );
}

