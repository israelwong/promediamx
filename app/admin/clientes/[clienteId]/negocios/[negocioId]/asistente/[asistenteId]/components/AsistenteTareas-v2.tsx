'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Para navegar al marketplace y gestionar
// Ajusta rutas
import { obtenerTareasSuscritasDetalladas, TareaSuscritaDetalle } from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // O tareas.actions
import { Loader2, AlertCircle, List, Star, Settings, ExternalLink, ShoppingCart } from 'lucide-react';

interface Props {
    asistenteId: string;
    clienteId: string; // Necesario para la ruta de gestión
    negocioId: string; // Necesario para la ruta de gestión
}

type ActiveTabTareas = 'base' | 'adicionales';

export default function AsistenteTareas({ asistenteId, clienteId, negocioId }: Props) {
    const router = useRouter();
    const [tareasSuscritas, setTareasSuscritas] = useState<TareaSuscritaDetalle[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTabTareas>('base');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTareas = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await obtenerTareasSuscritasDetalladas(asistenteId);
                setTareasSuscritas(data ?? []); // Usar array vacío si es null
            } catch (err) {
                console.error("Error fetching subscribed tasks:", err);
                setError(err instanceof Error ? err.message : "Error al cargar tareas suscritas.");
                setTareasSuscritas([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTareas();
    }, [asistenteId]);

    // Separar tareas base y adicionales usando useMemo para eficiencia
    const { tareasBase, tareasAdicionales } = useMemo(() => {
        const base: TareaSuscritaDetalle[] = [];
        const adicionales: TareaSuscritaDetalle[] = [];
        tareasSuscritas.forEach(t => {
            // Considerar base si el monto de suscripción es 0 o null
            if (t.montoSuscripcion === null || t.montoSuscripcion === 0) {
                base.push(t);
            } else {
                adicionales.push(t);
            }
        });
        return { tareasBase: base, tareasAdicionales: adicionales };
    }, [tareasSuscritas]);

    // --- Clases de Tailwind ---
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col"; // flex-col
    const headerClasses = "flex items-center justify-between mb-3 border-b border-zinc-600 pb-2";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    // Pestañas
    const tabContainerClasses = "flex border-b border-zinc-700 mb-3";
    const tabButtonBaseClasses = "flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium border-b-2 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-800 focus:ring-blue-400 transition-colors duration-150 flex items-center justify-center gap-1.5 rounded-t";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/40";
    const tabButtonActiveClasses = "border-blue-500 text-white bg-zinc-700/50";
    // Lista de tareas
    const taskListContainerClasses = "space-y-2 flex-grow overflow-y-auto max-h-60 pr-1"; // Limitar altura y scroll
    const taskItemClasses = "p-2 bg-zinc-900/50 rounded border border-zinc-700/80 flex justify-between items-center gap-2";
    const taskInfoClasses = "flex-grow overflow-hidden";
    const taskNameClasses = "text-xs font-medium text-zinc-100 truncate";
    // const taskDescClasses = "text-[0.7rem] text-zinc-400 truncate";
    const taskStatsClasses = "text-xs text-cyan-300 flex-shrink-0 flex items-center gap-1"
    const taskPriceClasses = "text-xs font-semibold text-emerald-400 flex-shrink-0";
    const manageButtonClasses = "p-1 text-xs text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-700 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500";
    const marketplaceButtonClasses = "mt-4 text-xs font-medium w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-indigo-400";

    const handleManageSubscription = (tareaId: string) => {
        // Navegar a la página de detalle/gestión de suscripción de tarea
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tareas/${tareaId}`);
    };

    const handleGoToMarketplace = () => {
        // Navegar al marketplace general, pasando el ID del asistente para contexto
        router.push(`/admin/IA/marketplace?asistenteId=${asistenteId}`);
    };


    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className={titleClasses}>
                    <List size={16} className="text-zinc-400" />
                    Tareas Suscritas
                </h3>
                {/* Podría ir un resumen de conteos aquí si se desea */}
            </div>

            {/* Pestañas */}
            <div className={tabContainerClasses}>
                <button
                    onClick={() => setActiveTab('base')}
                    className={`${tabButtonBaseClasses} ${activeTab === 'base' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                >
                    <Star size={12} /> Incluidas ({tareasBase.length})
                </button>
                <button
                    onClick={() => setActiveTab('adicionales')}
                    className={`${tabButtonBaseClasses} ${activeTab === 'adicionales' ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                >
                    <Settings size={12} /> Adicionales ({tareasAdicionales.length})
                </button>
            </div>

            {/* Contenido */}
            {loading && (
                <p className="text-xs italic text-zinc-500 text-center py-4 flex items-center justify-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Cargando tareas...
                </p>
            )}
            {error && !loading && (
                <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1 py-4">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            {!loading && !error && (
                <div className={taskListContainerClasses}>
                    {/* Mostrar contenido de la pestaña activa */}
                    {(activeTab === 'base' ? tareasBase : tareasAdicionales).length === 0 ? (
                        <p className="text-xs italic text-zinc-500 text-center py-6">
                            No hay tareas {activeTab === 'base' ? 'base' : 'adicionales'} suscritas.
                        </p>
                    ) : (
                        (activeTab === 'base' ? tareasBase : tareasAdicionales).map(t => (
                            <div key={t.suscripcionId} className={taskItemClasses}>
                                <div className={taskInfoClasses}>
                                    <p className={taskNameClasses} title={t.tarea.nombre}>{t.tarea.nombre}</p>
                                    {/* <p className={taskDescClasses} title={t.tarea.descripcion || ''}>{t.tarea.descripcion || 'Sin descripción'}</p> */}
                                </div>
                                <span className={taskStatsClasses} title={`${t.ejecuciones} veces ejecutada`}>
                                    {t.ejecuciones}x
                                </span>
                                {/* Mostrar precio y botón gestionar solo para adicionales */}
                                {activeTab === 'adicionales' && (
                                    <>
                                        <span className={taskPriceClasses}>
                                            + {formatCurrency(t.montoSuscripcion)}
                                        </span>
                                        <button
                                            onClick={() => handleManageSubscription(t.tarea.id)}
                                            className={manageButtonClasses}
                                            title="Gestionar Suscripción"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Botón para ir al Marketplace */}
            <button onClick={handleGoToMarketplace} className={marketplaceButtonClasses}>
                <ShoppingCart size={14} /> Ir al Marketplace
            </button>

        </div>
    );
}

// Helper para formatear moneda (igual que en AsistenteCosto)
const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '$ 0.00'; // Mostrar 0.00 si es null o 0
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};
