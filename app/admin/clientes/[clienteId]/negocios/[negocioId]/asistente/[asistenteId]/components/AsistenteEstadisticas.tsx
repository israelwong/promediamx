'use client';

import React, { useState, useEffect } from 'react';
// Ajusta la ruta según tu estructura
import { obtenerEstadisticasGeneralesAsistente, EstadisticasGenerales } from '@/app/admin/_lib/asistenteVirtual.actions';
import { Loader2, AlertCircle, MessageSquare, ListChecks } from 'lucide-react'; // Iconos relevantes

interface Props {
    asistenteId: string;
}

export default function AsistenteEstadisticas({ asistenteId }: Props) {
    const [stats, setStats] = useState<EstadisticasGenerales | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await obtenerEstadisticasGeneralesAsistente(asistenteId);
                if (data === null) {
                    throw new Error("No se pudieron obtener las estadísticas.");
                }
                setStats(data);
            } catch (err) {
                console.error("Error fetching assistant stats:", err);
                setError(err instanceof Error ? err.message : "Error al cargar estadísticas.");
                setStats(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [asistenteId]); // Recargar si cambia el ID

    // --- Clases de Tailwind ---
    // Contenedor principal más pequeño
    const containerClasses = "p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md";
    // Grid para mostrar las dos métricas lado a lado
    const gridClasses = "grid grid-cols-2 gap-3 text-center";
    // Estilo para cada tarjeta de métrica
    const metricCardClasses = "p-2 bg-zinc-900/50 rounded";
    const metricValueClasses = "text-lg font-bold text-white block"; // Valor más grande
    const metricLabelClasses = "text-xs text-zinc-400 flex items-center justify-center gap-1"; // Label con icono

    return (
        <div className={containerClasses}>
            {/* Título Opcional (muy pequeño o sin él) */}
            {/* <h4 className="text-xs font-semibold text-zinc-300 mb-2 text-center uppercase tracking-wider">Uso General</h4> */}

            {loading && (
                <p className="text-xs italic text-zinc-500 text-center flex items-center justify-center gap-1 py-4">
                    <Loader2 size={12} className="animate-spin" /> Cargando stats...
                </p>
            )}

            {error && !loading && (
                <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1 py-4">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            {!loading && !error && stats && (
                <div className={gridClasses}>
                    {/* Métrica Conversaciones */}
                    <div className={metricCardClasses}>
                        <span className={metricValueClasses}>{stats.totalConversaciones}</span>
                        <span className={metricLabelClasses}>
                            <MessageSquare size={12} /> Conversaciones
                        </span>
                    </div>

                    {/* Métrica Tareas Ejecutadas */}
                    <div className={metricCardClasses}>
                        <span className={metricValueClasses}>{stats.totalTareasEjecutadas}</span>
                        <span className={metricLabelClasses}>
                            <ListChecks size={12} /> Tareas Ejecutadas
                        </span>
                    </div>
                </div>
            )}
            {/* Mensaje si no hay datos (opcional) */}
            {/* {!loading && !error && !stats && (
                 <p className="text-xs italic text-zinc-500 text-center py-4">No hay datos de estadísticas disponibles.</p>
            )} */}
        </div>
    );
}
