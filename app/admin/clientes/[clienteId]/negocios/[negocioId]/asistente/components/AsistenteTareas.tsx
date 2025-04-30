'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ajustar rutas si es necesario
import {
    obtenerSuscripcionesAsistenteTareas,
    cancelarSuscripcionAsistenteTarea
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions';
import { AsistenteTareaSuscripcion, Tarea } from '@/app/admin/_lib/types';
import { Loader2, ListX, ListChecks, ExternalLink, DollarSignIcon, Package, XIcon, BadgeInfo, Trash2, CheckCircle, Star } from 'lucide-react'; // Iconos añadidos

interface Props {
    asistenteId: string;
}

// Interfaz local para asegurar que 'tarea' está presente
interface SuscripcionConTarea extends AsistenteTareaSuscripcion {
    tarea?: Tarea;
}

export default function AsistenteTareas({ asistenteId }: Props) {
    const router = useRouter();
    const [suscripciones, setSuscripciones] = useState<SuscripcionConTarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Estados para el Modal de Detalles/Cancelación ---
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<SuscripcionConTarea | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    // --- Fin Estados Modal ---


    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col w-full";
    const headerClasses = "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-zinc-600 pb-3";
    // **CAMBIO: Contenedor principal ahora es un grid**
    const contentGridClasses = "flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"; // Grid de 2 columnas en pantallas medianas+
    const columnClasses = "flex flex-col gap-3 overflow-y-auto pr-1"; // Columna con scroll independiente
    const columnTitleClasses = "text-sm font-semibold text-zinc-300 sticky top-0 bg-zinc-800 py-1 px-1 z-10 flex items-center gap-2"; // Título pegajoso para columnas
    // Botón/Tarjeta de Tarea
    const taskButtonClasses = "w-full border border-zinc-700 rounded-lg p-3 bg-zinc-900/70 flex items-center justify-between gap-3 hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900 transition-colors duration-150 text-left";
    const buttonSecondaryClasses = "border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm";
    // Clases Modal (sin cambios)
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-3 overflow-y-auto";
    const modalFooterClasses = "flex justify-between items-center gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const modalInfoItem = "text-sm flex justify-between items-center";
    const modalInfoLabel = "text-zinc-400 mr-2";
    const modalInfoValue = "text-zinc-100 font-medium text-right";
    const buttonBaseClassesModal = "text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const includedTextStyle = "italic text-emerald-400";


    // --- Función para cargar tareas suscritas ---
    const fetchSuscripciones = useCallback(async () => {
        if (!asistenteId) return;
        // setLoading(true); // No reiniciar loading para evitar parpadeo
        setError(null);
        try {
            const data = await obtenerSuscripcionesAsistenteTareas(asistenteId);
            // Filtrar activas y ordenar por nombre
            const activeSubscriptions = (data || [])
                .filter(sub => sub.status === 'activo')
                .sort((a, b) => a.tarea?.nombre?.localeCompare(b.tarea?.nombre ?? '') ?? 0);
            setSuscripciones(activeSubscriptions as SuscripcionConTarea[]);
        } catch (err) {
            console.error('Error fetching suscripciones:', err);
            setError('Error al cargar las tareas suscritas.');
            setSuscripciones([]);
        } finally {
            setLoading(false);
        }
    }, [asistenteId]);

    useEffect(() => {
        setLoading(true);
        fetchSuscripciones();
    }, [fetchSuscripciones]);

    // --- Separar suscripciones por costo ---
    const { incluidas, adicionales } = useMemo(() => {
        const inc: SuscripcionConTarea[] = [];
        const add: SuscripcionConTarea[] = [];
        suscripciones.forEach(sub => {
            if (typeof sub.montoSuscripcion === 'number' && sub.montoSuscripcion > 0) {
                add.push(sub);
            } else {
                inc.push(sub);
            }
        });
        return { incluidas: inc, adicionales: add };
    }, [suscripciones]);

    // --- Calcular Precio Total Adicional ---
    const totalPrecioAdicional = useMemo(() => {
        // Sumar solo las adicionales (ya filtradas por monto > 0 implícitamente)
        return adicionales.reduce((sum, sub) => sum + (sub.montoSuscripcion ?? 0), 0);
    }, [adicionales]);


    // --- Manejadores Modal Detalles/Cancelación (sin cambios) ---
    const openDetailModal = (suscripcion: SuscripcionConTarea) => { /* ... */
        setSelectedSubscription(suscripcion);
        setCancelError(null);
        setIsCancelling(false);
        setIsDetailModalOpen(true);
    };
    const closeDetailModal = () => { /* ... */
        setIsDetailModalOpen(false);
        setTimeout(() => {
            setSelectedSubscription(null); setCancelError(null); setIsCancelling(false);
        }, 300);
    };
    const handleCancelSubscription = async () => { /* ... (sin cambios) ... */
        if (!selectedSubscription?.id) return;
        if (typeof selectedSubscription.montoSuscripcion !== 'number' || selectedSubscription.montoSuscripcion <= 0) {
            setCancelError("No se puede cancelar una tarea incluida por defecto.");
            return;
        }
        if (confirm(`¿Estás seguro de cancelar la suscripción a la tarea "${selectedSubscription.tarea?.nombre || 'esta tarea'}"?`)) {
            setIsCancelling(true); setCancelError(null);
            try {
                const result = await cancelarSuscripcionAsistenteTarea(selectedSubscription.id);
                if (result.success) { await fetchSuscripciones(); closeDetailModal(); }
                else { throw new Error(result.error || "Error desconocido al cancelar."); }
            } catch (err) {
                console.error("Error cancelling subscription:", err);
                setCancelError(err instanceof Error ? err.message : "No se pudo cancelar la suscripción.");
                setIsCancelling(false);
            }
        }
    };

    // --- Navegación al Marketplace (sin cambios) ---
    const handleAbrirMarketplace = () => { /* ... */
        router.push(`/admin/marketplace/${asistenteId}`);
    };

    // --- Helpers (sin cambios) ---
    const formatDate = (date: Date | string | null | undefined): string => { /* ... */
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Fecha inválida'; }
    };
    const formatCurrencyOrIncluded = (amount: number | null | undefined): React.ReactNode => { /* ... */
        if (typeof amount === 'number' && amount > 0) {
            return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
        }
        return <span className={includedTextStyle}>Incluida</span>;
    };

    // --- Renderizado de una columna de tareas ---
    const renderTaskColumn = (title: string, icon: React.ElementType, taskList: SuscripcionConTarea[]) => {
        const Icon = icon;
        return (
            <div className={columnClasses}>
                <h4 className={columnTitleClasses}><Icon size={15} /> {title} ({taskList.length})</h4>
                {taskList.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic px-1">Ninguna</p>
                ) : (
                    <ul className='space-y-2'>
                        {taskList.map((suscripcion) => {
                            const tareaInfo = suscripcion.tarea;
                            const nombreTarea = tareaInfo?.nombre || `Tarea ID: ${suscripcion.tareaId || 'Desconocido'}`;
                            const monto = suscripcion.montoSuscripcion;

                            return (
                                <li key={suscripcion.id}>
                                    <button
                                        onClick={() => openDetailModal(suscripcion)}
                                        className={taskButtonClasses}
                                        title={`Ver detalles de: ${nombreTarea}`}
                                    >
                                        <div className="flex-grow mr-2 overflow-hidden space-y-1 text-left">
                                            <p className="text-sm font-medium text-zinc-100 truncate">{nombreTarea}</p>
                                            {/* Mostrar precio o "Incluida" */}
                                            <p className="text-xs text-zinc-200 flex items-center gap-1">
                                                <DollarSignIcon size={13} className={(typeof monto === 'number' && monto > 0) ? 'text-green-500' : 'text-emerald-500flex-shrink-0'} />
                                                <span className='font-normal'>{formatCurrencyOrIncluded(monto)}</span>
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-zinc-500"><BadgeInfo size={16} /></div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    }


    // --- Renderizado Principal ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <div className='flex items-baseline gap-2'>
                    <h3 className="text-lg font-semibold text-white whitespace-nowrap">Tareas Suscritas</h3>
                    {/* Mostrar total ADICIONAL */}
                    {!loading && !error && adicionales.length > 0 && (
                        <span className='text-sm text-zinc-400'>(Costo Adicional: <span className='font-semibold text-green-400'>{formatCurrencyOrIncluded(totalPrecioAdicional)}</span>)</span>
                    )}
                </div>
                {!loading && !error && (
                    <button onClick={handleAbrirMarketplace} className={buttonSecondaryClasses} title="Abrir Marketplace">
                        <ExternalLink size={14} /> <span>Buscar Tareas</span> {/* Texto más corto */}
                    </button>
                )}
            </div>

            {/* Contenido Principal: Grid de Columnas */}
            <div className={contentGridClasses}>
                {loading ? (
                    <div className="md:col-span-2 flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando suscripciones...</span></div>
                ) : error ? (
                    <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-10"><ListX className="h-10 w-10 text-red-400 mb-2" /><p className="text-red-400 text-base">{error}</p></div>
                ) : suscripciones.length === 0 ? (
                    <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-10 w-10 text-zinc-500 mb-3" /><p className='text-zinc-400 italic text-base mb-3'>Este asistente no tiene tareas suscritas.</p><button onClick={handleAbrirMarketplace} className={`${buttonSecondaryClasses} !text-sm`} title="Abrir Marketplace"><ExternalLink size={14} /> <span>Buscar Tareas en Marketplace</span></button></div>
                ) : (
                    <>
                        {/* Columna Tareas Incluidas */}
                        {renderTaskColumn("Incluidas en Plan Base", CheckCircle, incluidas)}

                        {/* Columna Tareas Adicionales */}
                        {renderTaskColumn("Adicionales (con costo)", Star, adicionales)}
                    </>
                )}
            </div>

            {/* Modal Detalles/Cancelación (sin cambios en su estructura interna) */}
            {isDetailModalOpen && selectedSubscription && (
                <div className={modalOverlayClasses} onClick={closeDetailModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        {/* ... (contenido del modal igual que antes) ... */}
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Package size={18} /> Detalles de Tarea</h3>
                            <button onClick={closeDetailModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <div className={modalBodyClasses}>
                            {cancelError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{cancelError}</p>}
                            <div className={modalInfoItem}><span className={modalInfoLabel}>Tarea:</span><span className={modalInfoValue}>{selectedSubscription.tarea?.nombre || 'N/A'}</span></div>
                            {selectedSubscription.tarea?.descripcion && (<p className="text-sm text-zinc-400 border-t border-zinc-700 pt-3 mt-3">{selectedSubscription.tarea.descripcion}</p>)}
                            <div className={modalInfoItem}><span className={modalInfoLabel}>Costo Suscripción:</span><span className={`${modalInfoValue} ${!(typeof selectedSubscription.montoSuscripcion === 'number' && selectedSubscription.montoSuscripcion > 0) ? includedTextStyle : ''}`}>{formatCurrencyOrIncluded(selectedSubscription.montoSuscripcion)}</span></div>
                            <div className={modalInfoItem}><span className={modalInfoLabel}>Fecha Suscripción:</span><span className={modalInfoValue}>{formatDate(selectedSubscription.fechaSuscripcion)}</span></div>
                            <div className={modalInfoItem}><span className={modalInfoLabel}>Status:</span><span className={`${modalInfoValue} ${selectedSubscription.status === 'activo' ? 'text-green-400' : 'text-zinc-400'}`}>{selectedSubscription.status === 'activo' ? 'Activa' : 'Inactiva/Cancelada'}</span></div>
                        </div>
                        <div className={modalFooterClasses}>
                            {typeof selectedSubscription.montoSuscripcion === 'number' && selectedSubscription.montoSuscripcion > 0 ? (
                                <button type="button" onClick={handleCancelSubscription} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5`} disabled={isCancelling}>
                                    {isCancelling ? <Loader2 className='animate-spin' size={16} /> : <Trash2 size={14} />} Cancelar Suscripción
                                </button>
                            ) : (<div className="w-auto px-3 py-1.5"><span className="text-xs text-zinc-500 italic">Tarea incluida</span></div>)}
                            <button type="button" onClick={closeDetailModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isCancelling}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- Fin Modal --- */}

        </div>
    );
}
