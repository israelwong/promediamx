'use client';

import React, { useEffect, useState, useCallback } from 'react';
// Ajustar ruta a tu acción y tipos
import { obtenerEstadisticasCRM, EstadisticasCRM } from '@/app/admin/_lib/crmEstadisticas.actions'; // Acción para obtener estadísticas
import { Loader2, AlertTriangle, Users, MessageSquare, Workflow, Share2, Tag } from 'lucide-react'; // Iconos

interface Props {
    crmId: string;
}

// Tipo para los items de las listas de distribución
interface DistributionItem {
    nombre: string;
    count: number;
}

export default function CRMEstadisticas({ crmId }: Props) {
    const [stats, setStats] = useState<EstadisticasCRM | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "space-y-6"; // Espacio entre secciones
    const cardClasses = "bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 shadow-sm";
    const cardTitleClasses = "text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2";
    const totalStatClasses = "text-3xl font-bold text-white";
    const distributionListClasses = "space-y-2";
    const distributionItemClasses = "flex justify-between items-center text-sm";
    const distributionLabelClasses = "text-zinc-300 truncate";
    const distributionValueClasses = "font-medium text-zinc-100 bg-zinc-700 px-2 py-0.5 rounded text-xs";

    // --- Carga de datos ---
    const fetchStats = useCallback(async () => {
        if (!crmId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerEstadisticasCRM(crmId);
            setStats(data);
        } catch (err) {
            console.error("Error fetching CRM stats:", err);
            setError(err instanceof Error ? err.message : "Error al cargar estadísticas.");
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [crmId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- Renderizado de Listas de Distribución ---
    const renderDistributionList = (title: string, icon: React.ElementType, items: DistributionItem[]) => {
        const Icon = icon;
        const totalCount = items.reduce((sum, item) => sum + item.count, 0); // Calcular total para %

        return (
            <div className={cardClasses}>
                <h3 className={cardTitleClasses}><Icon size={16} /> {title}</h3>
                {items.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">No hay datos.</p>
                ) : (
                    <ul className={distributionListClasses}>
                        {items.map((item, index) => {
                            // Calcular porcentaje (evitar división por cero)
                            const percentage = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0';
                            return (
                                <li key={index} className={distributionItemClasses}>
                                    <span className={distributionLabelClasses} title={item.nombre}>{item.nombre}</span>
                                    <span className={distributionValueClasses} title={`${item.count} (${percentage}%)`}>
                                        {item.count}
                                        <span className='text-zinc-400 text-xs ml-1'>({percentage}%)</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    };


    // --- Renderizado Principal ---
    if (loading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
    }
    if (error) {
        return <div className="p-4 text-center text-red-400" role="alert"><AlertTriangle className="inline mr-2" />{error}</div>;
    }
    if (!stats) {
        return <div className="p-4 text-center text-zinc-500">No hay estadísticas disponibles para este CRM.</div>;
    }

    return (
        <div className={containerClasses}>
            {/* Sección de Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><Users size={16} /> Total Leads</h3>
                    <p className={totalStatClasses}>{stats.totalLeads}</p>
                </div>
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><MessageSquare size={16} /> Total Conversaciones</h3>
                    <p className={totalStatClasses}>{stats.totalConversaciones}</p>
                    {/* <p className="text-xs text-zinc-500 mt-1">Vinculadas a leads de este CRM</p> */}
                </div>
            </div>

            {/* Sección de Distribuciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderDistributionList("Leads por Pipeline", Workflow, stats.leadsPorPipeline)}
                {renderDistributionList("Leads por Canal", Share2, stats.leadsPorCanal)}
                {renderDistributionList("Leads por Etiqueta", Tag, stats.leadsPorEtiqueta)}
            </div>

            {/* Podrías añadir más secciones o gráficos aquí */}

        </div>
    );
}
