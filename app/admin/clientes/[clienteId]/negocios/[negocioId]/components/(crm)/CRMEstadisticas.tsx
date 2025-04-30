'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Importar useRouter
// Ajustar ruta a tu acción y tipos
import { obtenerEstadisticasCRM, EstadisticasCRM } from '@/app/admin/_lib/crmEstadisticas.actions'; // Asume que la acción existe y devuelve agendaPorStatus
import { Loader2, AlertTriangle, Users, MessageSquare, Calendar, CalendarCheck, CalendarClock, CalendarX, Workflow, Share2, Tag, ArrowRight } from 'lucide-react'; // Iconos (añadido ArrowRight)
// No se necesitan importaciones de Recharts

interface Props {
    crmId: string;
    // **NUEVO: Pasar negocioId para la navegación**
    negocioId: string;
}

// Tipo para los items de las listas (unificado)
interface DistributionItem {
    nombre?: string; // Para Pipeline, Canal, Etiqueta
    status?: string; // Para Agenda
    count: number;
}

export default function CRMEstadisticas({ crmId, negocioId }: Props) { // Añadir negocioId a props
    const router = useRouter(); // Inicializar router
    const [stats, setStats] = useState<EstadisticasCRM | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "space-y-4";
    const cardClasses = "bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 shadow-sm";
    const cardTitleClasses = "text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2";
    const totalStatClasses = "text-2xl font-bold text-white";
    const summaryListClasses = "space-y-1.5";
    const summaryItemClasses = "flex justify-between items-center text-xs";
    const summaryLabelClasses = "text-zinc-400 flex items-center gap-1.5 truncate";
    const summaryValueClasses = "font-medium text-zinc-200 bg-zinc-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap";
    // **NUEVO: Clases para el botón de acción**
    const actionButtonClasses = "w-full mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition-colors duration-150 ease-in-out";


    // --- Carga de datos ---
    const fetchStats = useCallback(async () => {
        if (!crmId) {
            // Si no hay crmId, podríamos incluso no mostrar nada o un mensaje diferente
            // setError("CRM no encontrado para este negocio.");
            setLoading(false); // Importante poner loading false aquí también
            return;
        }
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
    }, [crmId]); // Dependencia es crmId

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // --- Helper para icono de status de agenda ---
    const getAgendaStatusIcon = (status: string | undefined): React.ElementType => {
        switch (status?.toLowerCase()) {
            case 'pendiente': return CalendarClock;
            case 'completada': return CalendarCheck;
            case 'cancelada': return CalendarX;
            default: return CalendarClock;
        }
    };

    // --- Renderizado de Listas de Distribución ---
    const renderDistributionList = (title: string, icon: React.ElementType, items: DistributionItem[] | undefined) => {
        const Icon = icon;
        const listItems = items || [];
        const totalCount = listItems.reduce((sum, item) => sum + item.count, 0);

        return (
            <div className={cardClasses}>
                <h3 className={cardTitleClasses}><Icon size={15} /> {title}</h3>
                {listItems.length === 0 ? (<p className="text-xs text-zinc-500 italic">No hay datos.</p>)
                    : (<ul className={summaryListClasses}> {listItems.map((item, index) => { const label = item.nombre || 'Desconocido'; const percentage = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(0) : '0'; return (<li key={index} className={summaryItemClasses}><span className={summaryLabelClasses} title={label}>{label}</span><span className={summaryValueClasses} title={`${item.count} (${percentage}%)`}>{item.count}<span className='text-zinc-400 text-xs ml-1'>({percentage}%)</span></span></li>); })} </ul>)}
            </div>
        );
    };

    // --- Renderizado de Resumen de Agenda ---
    const renderAgendaSummary = (items: DistributionItem[] | undefined) => {
        const listItems = items || [];
        return (
            <div className={cardClasses}>
                <h3 className={cardTitleClasses}><Calendar size={15} /> Resumen de Agenda</h3>
                {listItems.length === 0 ? (<p className="text-xs text-zinc-500 italic">No hay eventos registrados.</p>)
                    : (<ul className={summaryListClasses}> {listItems.map((item, index) => { const Icon = getAgendaStatusIcon(item.status); const statusLabel = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Desconocido'; return (<li key={index} className={summaryItemClasses}><span className={summaryLabelClasses}><Icon size={13} className="opacity-80" /> {statusLabel}</span><span className={summaryValueClasses}>{item.count}</span></li>); })} </ul>)}
            </div>
        );
    };

    // --- Navegación al CRM completo ---
    const handleAbrirCRM = () => {
        // Navegar a la ruta dedicada del CRM para este negocio
        router.push(`/admin/negocios/${negocioId}/crm`);
    };


    // --- Renderizado Principal ---
    if (loading) {
        return <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
    }
    if (error) {
        return <div className={`${cardClasses} bg-red-900/30 border-red-700 text-red-400`} role="alert"><AlertTriangle className="inline mr-2" />{error}</div>;
    }
    // Si no hay CRM ID (porque la acción obtenerCRM no lo devolvió), mostrar mensaje diferente
    if (!crmId && !loading) {
        return (
            <div className={`${cardClasses} text-center text-zinc-500 italic`}>
                CRM no activado para este negocio.
                {/* Opcional: Botón para activar */}
            </div>
        );
    }
    // Si hay CRM ID pero no hay estadísticas (error en obtenerEstadisticasCRM o datos vacíos)
    if (!stats && !loading) {
        return <div className={`${cardClasses} text-center text-zinc-500 italic`}>No hay estadísticas disponibles.</div>;
    }


    return (
        <div className={containerClasses}>
            {/* Sección de Totales */}
            <div className="grid grid-cols-2 gap-3">
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><Users size={15} /> Leads</h3>
                    <p className={totalStatClasses}>{stats?.totalLeads ?? 0}</p> {/* Usar ?? 0 por si stats es null */}
                </div>
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><MessageSquare size={15} /> Conversaciones</h3>
                    <p className={totalStatClasses}>{stats?.totalConversaciones ?? 0}</p>
                </div>
            </div>

            {/* Listas de Distribución */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {renderDistributionList("Por Pipeline", Workflow, stats?.leadsPorPipeline)}
                {renderDistributionList("Por Canal", Share2, stats?.leadsPorCanal)}
                {renderDistributionList("Por Etiqueta", Tag, stats?.leadsPorEtiqueta)}
            </div>

            {/* Sección Resumen de Agenda */}
            {renderAgendaSummary(stats?.agendaPorStatus)}

            {/* **NUEVO: Botón para Abrir CRM Completo** */}
            <div className="mt-auto pt-4"> {/* mt-auto empuja el botón hacia abajo si hay espacio */}
                <button onClick={handleAbrirCRM} className={actionButtonClasses}>
                    Gestionar CRM Completo
                    <ArrowRight size={16} />
                </button>
            </div>

        </div>
    );
}
