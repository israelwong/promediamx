'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta a tus acciones y tipos
import { obtenerAsistentesPorNegocioId } from '@/app/admin/_lib/asistenteVirtual.actions';
import { AsistenteVirtual, AsistenteTareaSuscripcion, TareaEjecutada, Tarea, Conversacion } from '@/app/admin/_lib/types'; // Asegúrate que Conversacion esté importado
import { Loader2, ListX, ListChecks, PlusIcon, Bot, ChevronRight, Settings, MessageSquare, Package } from 'lucide-react'; // Iconos

// Extender la interfaz localmente para incluir las relaciones esperadas
interface AsistenteConDetalles extends AsistenteVirtual {
    AsistenteTareaSuscripcion?: (AsistenteTareaSuscripcion & { tarea?: Tarea })[];
    TareaEjecutada?: (TareaEjecutada & { tarea?: Tarea })[];
    Conversacion?: Conversacion[]; // Usar el tipo completo si lo tienes
    precioBase?: number | null;
}

interface Props {
    negocioId: string;
    clienteId: string; // Agregado clienteId
}

export default function SuscripcionesAsistentes({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [asistentes, setAsistentes] = useState<AsistenteConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Card principal del asistente
    const asistenteCardClasses = "block w-full p-4 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";
    const statusBadgeBase = "px-2 py-0.5 rounded-full text-xs font-medium";
    const statusBadgeActive = "bg-green-600 text-green-100";
    const statusBadgeInactive = "bg-gray-600 text-gray-100";
    // Estilos para la lista de tareas dentro de la card
    // const taskListContainerClasses = "mt-3 border-t border-zinc-600 pt-3 space-y-1.5";
    const taskItemClasses = "flex justify-between items-center text-xs";
    const taskNameClasses = "truncate text-zinc-300";
    const taskPriceClasses = "text-cyan-400 font-medium text-xs";
    const taskFreePriceClasses = "text-zinc-500 italic text-xs"; // Estilo para precio 0 o incluido
    // Estilos para el total
    const totalContainerClasses = "mt-4 pt-3 border-t border-dashed border-zinc-500 flex justify-between items-center";
    const totalLabelClasses = "text-sm font-semibold text-zinc-300";
    const totalAmountClasses = "text-lg font-bold text-emerald-400";


    // --- Función para cargar asistentes ---
    const fetchAsistentes = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerAsistentesPorNegocioId(negocioId);
            const sortedData = (data || []).sort((a, b) => a.nombre.localeCompare(b.nombre));
            setAsistentes(sortedData.map(item => ({
                ...item,
                Conversacion: item.Conversacion?.map(conversacion => ({
                    ...conversacion,
                })),
            })) as AsistenteConDetalles[]);
        } catch (err) {
            console.error("Error al obtener los asistentes:", err);
            setError("No se pudieron cargar los asistentes.");
            setAsistentes([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    // --- Carga inicial ---
    useEffect(() => {
        fetchAsistentes(true);
    }, [fetchAsistentes]);

    // --- Navegación ---
    const handleCrearAsistente = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/nuevo`);
    };

    const handleEditarAsistente = (asistenteId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
    };

    // --- Helper de formato ---
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Bot size={16} /> Asistentes Virtuales
                </h3>
                {!loading && !error && (
                    <button onClick={handleCrearAsistente} className={buttonPrimaryClasses} title="Crear nuevo asistente">
                        <PlusIcon size={14} /> <span>Crear</span>
                    </button>
                )}
            </div>

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : asistentes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay asistentes definidos para este negocio.</p><p className='text-xs text-zinc-500 mt-1'>Crea el primer asistente.</p></div>
                ) : (
                    // Lista de Asistentes
                    <ul className="space-y-3">
                        {asistentes.map((asistente) => {
                            const isActive = asistente.status === 'activo';
                            const suscripcionesActivas = asistente.AsistenteTareaSuscripcion?.filter(s => s.status === 'activo') || [];
                            const conversationCount = asistente.Conversacion?.length ?? 0;
                            const precioBaseAsistente = typeof asistente.precioBase === 'number' ? asistente.precioBase : 0;

                            // Calcular suma de tareas activas con costo > 0
                            const sumaTareas = suscripcionesActivas.reduce((sum, sub) => {
                                const monto = sub.montoSuscripcion;
                                return sum + (typeof monto === 'number' && monto > 0 ? monto : 0);
                            }, 0);

                            // Calcular total por asistente
                            const montoTotalAsistente = precioBaseAsistente + sumaTareas;

                            return (
                                <li key={asistente.id}>
                                    {/* Envolver todo en el botón para navegar */}
                                    <button
                                        onClick={() => handleEditarAsistente(asistente.id)}
                                        className={asistenteCardClasses}
                                        title={`Gestionar asistente: ${asistente.nombre}`}
                                    >
                                        {/* Contenedor principal flex */}
                                        <div className="flex justify-between items-start gap-3 mb-3"> {/* Añadido mb-3 */}
                                            {/* Info General */}
                                            <div className="flex-grow overflow-hidden space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`${statusBadgeBase} ${isActive ? statusBadgeActive : statusBadgeInactive}`}>
                                                        {isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    <h4 className='font-medium text-md text-zinc-100 truncate'>
                                                        {asistente.nombre}
                                                    </h4>
                                                </div>
                                                {asistente.descripcion && (
                                                    <p className='text-sm text-zinc-400 line-clamp-1 text-left'> {/* Alineado a la izquierda */}
                                                        {asistente.descripcion}
                                                    </p>
                                                )}
                                                {/* Contadores */}
                                                <div className='flex items-center gap-4 text-xs text-zinc-400 pt-1'>
                                                    <span className='flex items-center gap-1' title='Conversaciones gestionadas'>
                                                        <MessageSquare size={12} className='text-blue-400' /> {conversationCount} Conv.
                                                    </span>
                                                    <span className='flex items-center gap-1' title='Tareas activas'>
                                                        <Settings size={12} className='text-purple-400' /> {suscripcionesActivas.length} Tareas
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Chevron */}
                                            <div className="text-zinc-500 flex-shrink-0 pt-1">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>

                                        {/* Detalles Financieros */}
                                        <div className='space-y-2 border-t border-zinc-600 pt-3'>
                                            {/* Precio Base */}
                                            <div className='flex justify-between items-center text-sm'>
                                                <span className='text-zinc-400'>Precio Base:</span>
                                                <span className='font-medium text-zinc-200'>
                                                    {formatCurrency(precioBaseAsistente)}
                                                </span>
                                            </div>

                                            {/* Lista de Tareas Activas */}
                                            {suscripcionesActivas.length > 0 && (
                                                <div className="space-y-1 pt-1">
                                                    <h5 className="text-xs font-semibold text-zinc-300 mb-1 text-left">Tareas Activas:</h5>
                                                    {suscripcionesActivas.map(suscripcion => {
                                                        const taskName = suscripcion.tarea?.nombre || 'Tarea desconocida';
                                                        const taskPrice = suscripcion.montoSuscripcion; // Usar directamente

                                                        return (
                                                            <div key={suscripcion.id} className={taskItemClasses}>
                                                                <span className={taskNameClasses} title={taskName}>
                                                                    <Package size={11} className="inline mr-1 opacity-70" /> {/* Icono tarea */}
                                                                    {taskName}
                                                                </span>
                                                                {/* Mostrar precio o "Incluida" */}
                                                                {typeof taskPrice === 'number' && taskPrice > 0 ? (
                                                                    <span className={taskPriceClasses} title='Precio tarea'>
                                                                        {formatCurrency(taskPrice)}
                                                                    </span>
                                                                ) : (
                                                                    <span className={taskFreePriceClasses} title='Tarea incluida o sin costo'>
                                                                        Incluida
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Monto Total */}
                                            <div className={totalContainerClasses}>
                                                <span className={totalLabelClasses}>Total Asistente:</span>
                                                <span className={totalAmountClasses}>
                                                    {formatCurrency(montoTotalAsistente)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}

                    </ul>
                )}
            </div>
        </div>
    );
}
