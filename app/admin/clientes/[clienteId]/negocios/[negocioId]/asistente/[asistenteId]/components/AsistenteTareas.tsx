'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta rutas
import { obtenerTareasSuscritasDetalladas, TareaSuscritaDetalle } from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // O tareas.actions
import { Loader2, AlertCircle, List, Star, Settings, ExternalLink, ShoppingCart } from 'lucide-react';

interface Props {
    asistenteId: string;
    clienteId: string;
    negocioId: string;
}

// Componente interno reutilizable para renderizar una lista de tareas
const TaskList = ({ title, icon: Icon, tareas, showPrice, onManageClick }: {
    title: string;
    icon: React.ElementType;
    tareas: TareaSuscritaDetalle[];
    showPrice: boolean;
    onManageClick: (tareaId: string) => void;
}) => {
    // Clases reutilizadas de la versión anterior
    const taskListContainerClasses = "space-y-2 flex-grow overflow-y-auto pr-1"; // Limitar altura y scroll
    const taskItemClasses = "p-2 bg-zinc-900/50 rounded border border-zinc-700/80 flex justify-between items-center gap-2";
    const taskInfoClasses = "flex-grow overflow-hidden";
    const taskNameClasses = "text-xs font-medium text-zinc-100 truncate";
    const taskStatsClasses = "text-xs text-cyan-300 flex-shrink-0 flex items-center gap-1";
    const taskPriceClasses = "text-xs font-semibold text-emerald-400 flex-shrink-0";
    const manageButtonClasses = "p-1 text-xs text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-700 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500";
    const sectionTitleClasses = "text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider";

    return (
        <div>
            <h4 className={sectionTitleClasses}>
                <Icon size={14} /> {title} ({tareas.length})
            </h4>
            {tareas.length === 0 ? (
                <p className="text-xs italic text-zinc-500 text-center py-6 px-2 border border-dashed border-zinc-700 rounded-md bg-zinc-800/30">
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
                            {/* Mostrar precio solo si showPrice es true */}
                            {showPrice && (
                                <span className={taskPriceClasses}>
                                    + {formatCurrency(t.montoSuscripcion)}
                                </span>
                            )}
                            {/* Botón Gestionar siempre visible */}
                            <button
                                onClick={() => onManageClick(t.tarea.id)}
                                className={manageButtonClasses}
                                title="Gestionar Suscripción"
                            >
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function AsistenteTareas({ asistenteId, clienteId, negocioId }: Props) {
    const router = useRouter();
    const [tareasSuscritas, setTareasSuscritas] = useState<TareaSuscritaDetalle[]>([]);
    // const [activeTab, setActiveTab] = useState<ActiveTabTareas>('base'); // Ya no se necesita
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTareas = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await obtenerTareasSuscritasDetalladas(asistenteId);
                setTareasSuscritas(data ?? []);
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

    // Separar tareas base y adicionales
    const { tareasBase, tareasAdicionales } = useMemo(() => {
        const base: TareaSuscritaDetalle[] = [];
        const adicionales: TareaSuscritaDetalle[] = [];
        tareasSuscritas.forEach(t => {
            if (t.montoSuscripcion === null || t.montoSuscripcion === 0) {
                base.push(t);
            } else {
                adicionales.push(t);
            }
        });
        // Opcional: Ordenar cada lista internamente si es necesario
        // base.sort((a, b) => a.tarea.nombre.localeCompare(b.tarea.nombre));
        // adicionales.sort((a, b) => a.tarea.nombre.localeCompare(b.tarea.nombre));
        return { tareasBase: base, tareasAdicionales: adicionales };
    }, [tareasSuscritas]);

    // --- Clases de Tailwind ---
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col";
    const headerClasses = "flex items-center justify-between mb-4 border-b border-zinc-600 pb-2"; // Aumentado mb
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    // --- NUEVO: Grid para las dos columnas ---
    const columnsContainerClasses = "grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-[200px]"; // min-h para evitar colapso si está vacío
    const marketplaceButtonClasses = "mt-4 text-xs font-medium w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-indigo-400";

    // --- Handlers ---
    const handleManageSubscription = (tareaId: string) => {
        // console.log("Gestionar suscripción para tarea:", tareaId);
        // return;
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tarea/${tareaId}`);
    };
    const handleGoToMarketplace = () => {
        router.push(`/admin/marketplace?asistenteId=${asistenteId}`);
    };

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className={titleClasses}>
                    <List size={16} className="text-zinc-400" />
                    Tareas Suscritas
                </h3>
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
                // --- Contenedor de las dos columnas ---
                <div className={columnsContainerClasses}>
                    {/* Columna Tareas Base */}
                    <TaskList
                        title="Incluidas"
                        icon={Star}
                        tareas={tareasBase}
                        showPrice={false} // No mostrar precio para base
                        onManageClick={handleManageSubscription}
                    />
                    {/* Columna Tareas Adicionales */}
                    <TaskList
                        title="Adicionales"
                        icon={Settings}
                        tareas={tareasAdicionales}
                        showPrice={true} // Mostrar precio para adicionales
                        onManageClick={handleManageSubscription}
                    />
                </div>
            )}

            {/* Botón para ir al Marketplace */}
            {!loading && ( // Mostrar siempre si no está cargando
                <button onClick={handleGoToMarketplace} className={marketplaceButtonClasses}>
                    <ShoppingCart size={14} /> Ir al Marketplace
                </button>
            )}
        </div>
    );
}

// Helper para formatear moneda
const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '$ 0.00';
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};
