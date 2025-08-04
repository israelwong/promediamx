'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Añadido useCallback
import { useRouter } from 'next/navigation';
// NUEVAS IMPORTS
import { obtenerTareasSuscritasDetalladasAction } from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.actions';
import type { TareaSuscritaDetalleData } from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.schemas';

import { Loader2, AlertCircle, List, Star, Settings, ShoppingCart } from 'lucide-react';

interface Props {
    asistenteId: string;
    clienteId: string;
    negocioId: string;
    // Opcional: si el componente padre AgendaConfiguracion carga estos datos
    initialTareasSuscritas?: TareaSuscritaDetalleData[];
}

// Componente interno TaskList (actualizado para usar TareaSuscritaDetalleData)
const TaskList = ({ title, icon: Icon, tareas, showPrice, onManageClick }: {
    title: string;
    icon: React.ElementType;
    tareas: TareaSuscritaDetalleData[]; // Tipo actualizado
    showPrice: boolean;
    onManageClick: (tareaId: string) => void;
}) => {
    const taskListContainerClasses = "flex-1 space-y-2 overflow-y-auto pr-1"; // Cambiado flex-grow a flex-1
    const taskItemClasses = "p-2 bg-zinc-900/50 rounded border border-zinc-700/80 flex justify-between items-center gap-2";
    const taskInfoClasses = "flex-grow overflow-hidden";
    const taskNameClasses = "text-xs font-medium text-zinc-100 truncate";
    const taskStatsClasses = "text-xs text-cyan-300 flex-shrink-0 flex items-center gap-1";
    const taskPriceClasses = "text-xs font-semibold text-emerald-400 flex-shrink-0";
    const manageButtonClasses = "p-1 text-xs text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-700 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500";
    const sectionTitleClasses = "text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider";

    return (
        <div className="flex flex-col h-full"> {/* Asegurar que tome altura para que overflow funcione */}
            <h4 className={sectionTitleClasses}>
                <Icon size={14} /> {title} ({tareas.length})
            </h4>
            {tareas.length === 0 ? (
                <p className="text-xs italic text-zinc-500 text-center py-6 px-2 border border-dashed border-zinc-700 rounded-md bg-zinc-800/30 flex-grow flex items-center justify-center">
                    Ninguna tarea suscrita en esta categoría.
                </p>
            ) : (
                <div className={taskListContainerClasses}>
                    {tareas.map(t => (
                        <div key={t.suscripcionId} className={taskItemClasses}>
                            <div className={taskInfoClasses}>
                                <p className={taskNameClasses} title={t.tarea.nombre}>{t.tarea.nombre}</p>
                            </div>
                            <span className={taskStatsClasses} title={`${t.ejecuciones} veces ejecutada`}>
                                {t.ejecuciones}x
                            </span>
                            {showPrice && (
                                <span className={taskPriceClasses}>
                                    + {formatCurrency(t.montoSuscripcion)}
                                </span>
                            )}
                            <button
                                onClick={() => onManageClick(t.tarea.id)}
                                className={manageButtonClasses}
                                title="Gestionar Suscripción"
                            >
                                <Settings size={14} /> {/* Cambiado icono a Settings */}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper formatCurrency (sin cambios)
const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '$ 0.00'; // Mostrar $0.00 si es null o 0
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};


export default function AsistenteTareas({
    asistenteId,
    clienteId,
    negocioId,
    initialTareasSuscritas // Prop para datos iniciales
}: Props) {
    const router = useRouter();
    const [tareasSuscritas, setTareasSuscritas] = useState<TareaSuscritaDetalleData[]>(initialTareasSuscritas || []);
    const [loading, setLoading] = useState(!initialTareasSuscritas); // No cargar si hay datos iniciales
    const [error, setError] = useState<string | null>(null);

    const fetchTareasSuscritasLocal = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError(null);
        const result = await obtenerTareasSuscritasDetalladasAction(asistenteId); // Nueva action
        if (result.success && result.data) {
            setTareasSuscritas(result.data);
        } else {
            setError(result.error || "Error al cargar tareas suscritas.");
            setTareasSuscritas([]);
        }
        if (showLoading) setLoading(false);
    }, [asistenteId]);

    useEffect(() => {
        if (!initialTareasSuscritas) { // Solo cargar si no se proveyeron datos iniciales
            fetchTareasSuscritasLocal();
        }
    }, [fetchTareasSuscritasLocal, initialTareasSuscritas]);

    const { tareasBase, tareasAdicionales } = useMemo(() => {
        const base: TareaSuscritaDetalleData[] = [];
        const adicionales: TareaSuscritaDetalleData[] = [];
        tareasSuscritas.forEach(t => {
            if (t.montoSuscripcion === null || t.montoSuscripcion === 0) {
                base.push(t);
            } else {
                adicionales.push(t);
            }
        });
        return { tareasBase: base, tareasAdicionales: adicionales };
    }, [tareasSuscritas]);

    // Clases UI (sin cambios)
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full flex-grow"; // Añadido h-full
    const columnsContainerClasses = "grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow"; // Mantenemos esto como antes de tu último cambio
    const headerClasses = "flex items-center justify-between mb-4 border-b border-zinc-600 pb-3"; // Ajustado pb
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    const marketplaceButtonClasses = "mt-auto py-3 text-xs font-medium w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-indigo-400 border-t border-zinc-700"; // Añadido borde superior

    const handleManageSubscription = (tareaId: string) => {
        // router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tarea/${tareaId}`);
        router.push(`/admin/marketplace/suscripcion/${tareaId}?asistenteId=${asistenteId}&clienteId=${clienteId}&negocioId=${negocioId}`);
    };
    const handleGoToMarketplace = () => {
        router.push(`/admin/marketplace/${asistenteId}`); // Pasar asistenteId al marketplace
    };

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className={titleClasses}>
                    <List size={16} className="text-zinc-400" />
                    Tareas del Asistente
                </h3>
            </div>

            {loading && (
                <div className="flex-grow flex items-center justify-center text-zinc-400">
                    <Loader2 size={20} className="animate-spin mr-2" /> Cargando tareas...
                </div>
            )}
            {error && !loading && (
                <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-4 bg-red-900/20 border border-red-700 rounded-md">
                    <AlertCircle size={24} className="mb-2" />
                    <p className="text-sm text-center">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className={columnsContainerClasses}>
                    <TaskList
                        title="Tareas Incluidas" // Cambiado título
                        icon={Star}
                        tareas={tareasBase}
                        showPrice={false}
                        onManageClick={handleManageSubscription}
                    />
                    <TaskList
                        title="Tareas Premium Suscritas" // Cambiado título
                        icon={Settings}
                        tareas={tareasAdicionales}
                        showPrice={true}
                        onManageClick={handleManageSubscription}
                    />
                </div>
            )}

            {/* Botón siempre visible si no hay error y no está cargando, para asegurar acceso al marketplace */}
            {!loading && !error && (
                <button onClick={handleGoToMarketplace} className={marketplaceButtonClasses}>
                    <ShoppingCart size={14} /> Descubrir Más Tareas (Marketplace)
                </button>
            )}
        </div>
    );
}