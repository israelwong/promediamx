'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
// Ajusta la ruta a tu acción y tipos
import { obtenerAsistenteVirtualPorId } from '@/app/admin/_lib/asistenteVirtual.actions';
import { AsistenteVirtual, TareaEjecutada, Tarea, Conversacion } from '@/app/admin/_lib/types'; // Asegúrate que todos los tipos necesarios estén aquí
import { Loader2, AlertTriangle, MessageSquare, Activity, ListOrdered } from 'lucide-react'; // Iconos

interface Props {
    asistenteId: string;
}

// Tipo para el desglose de tareas ejecutadas
interface TareaEjecutadaCount {
    nombre: string;
    count: number;
}

// Interfaz local para asegurar que las relaciones necesarias estén presentes
interface AsistenteConEstadisticas extends AsistenteVirtual {
    TareaEjecutada?: (TareaEjecutada & { tarea?: Pick<Tarea, 'id' | 'nombre'> | null })[]; // Solo necesitamos id y nombre de la tarea
    Conversacion?: Pick<Conversacion, 'id'>[]; // Solo necesitamos el id para contar
}


export default function AsistenteEstadisticas({ asistenteId }: Props) {
    const [asistenteData, setAsistenteData] = useState<AsistenteConEstadisticas | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const cardClasses = "bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 shadow-sm";
    const cardTitleClasses = "text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2";
    const statValueClasses = "text-2xl font-bold text-white";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2 mt-4"; // Espacio para la lista
    const listItemClasses = "flex justify-between items-center text-xs";
    const listLabelClasses = "text-zinc-300 truncate";
    const listValueClasses = "font-medium text-zinc-100 bg-zinc-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap";


    // --- Carga de datos ---
    const fetchData = useCallback(async () => {
        if (!asistenteId) {
            setError("ID de Asistente no proporcionado.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // La acción debe incluir TareaEjecutada.tarea y Conversacion
            const data = await obtenerAsistenteVirtualPorId(asistenteId);
            if (!data) {
                throw new Error("Asistente no encontrado.");
            }
            setAsistenteData(data as AsistenteConEstadisticas); // Castear al tipo local
        } catch (err) {
            console.error("Error fetching assistant stats data:", err);
            setError(err instanceof Error ? err.message : "Error al cargar estadísticas.");
            setAsistenteData(null);
        } finally {
            setLoading(false);
        }
    }, [asistenteId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Cálculo de Estadísticas ---
    const estadisticasCalculadas = useMemo(() => {
        if (!asistenteData) return { totalConversaciones: 0, totalTareasEjecutadas: 0, desgloseTareas: [] };

        const totalConversaciones = asistenteData.Conversacion?.length ?? 0;
        const totalTareasEjecutadas = asistenteData.TareaEjecutada?.length ?? 0;

        // Calcular desglose de tareas
        const counts: { [nombre: string]: number } = {};
        asistenteData.TareaEjecutada?.forEach(ejecucion => {
            const nombreTarea = ejecucion.tarea?.nombre || 'Tarea Desconocida';
            counts[nombreTarea] = (counts[nombreTarea] || 0) + 1;
        });

        const desgloseTareas: TareaEjecutadaCount[] = Object.entries(counts)
            .map(([nombre, count]) => ({ nombre, count }))
            .sort((a, b) => b.count - a.count); // Ordenar por más ejecutadas

        return { totalConversaciones, totalTareasEjecutadas, desgloseTareas };

    }, [asistenteData]);


    // --- Renderizado ---
    if (loading) {
        return <div className={`${containerClasses} items-center justify-center`}><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
    }
    if (error) {
        return <div className={`${containerClasses} items-center justify-center p-6 text-red-400`}><AlertTriangle className="h-8 w-8 mb-2" /><p>{error}</p></div>;
    }
    if (!asistenteData) {
        return <div className={`${containerClasses} items-center justify-center text-zinc-500`}>No se encontraron datos para este asistente.</div>;
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Activity size={16} /> Estadísticas de Uso
                </h3>
                {/* Podrías añadir un selector de rango de fechas aquí en el futuro */}
            </div>

            {/* Contenido Principal */}
            <div className="flex-grow overflow-y-auto pr-1">
                {/* Sección de Totales */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={cardClasses}>
                        <h4 className={cardTitleClasses}><MessageSquare size={15} /> Conversaciones</h4>
                        <p className={statValueClasses}>{estadisticasCalculadas.totalConversaciones}</p>
                    </div>
                    <div className={cardClasses}>
                        <h4 className={cardTitleClasses}><Activity size={15} /> Tareas Ejecutadas</h4>
                        <p className={statValueClasses}>{estadisticasCalculadas.totalTareasEjecutadas}</p>
                    </div>
                </div>

                {/* Sección Desglose Tareas Ejecutadas */}
                <div className={cardClasses}>
                    <h4 className={cardTitleClasses}><ListOrdered size={15} /> Desglose por Tarea</h4>
                    {estadisticasCalculadas.desgloseTareas.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No se han ejecutado tareas.</p>
                    ) : (
                        <ul className={listContainerClasses}>
                            {estadisticasCalculadas.desgloseTareas.map((item, index) => (
                                <li key={index} className={listItemClasses}>
                                    <span className={listLabelClasses} title={item.nombre}>
                                        {item.nombre}
                                    </span>
                                    <span className={listValueClasses}>
                                        {item.count} {item.count === 1 ? 'vez' : 'veces'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
