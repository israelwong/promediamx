'use client';

import React, { useState, useEffect } from 'react';
import { obtenerCostosAsistente, CostosAsistente } from '@/app/admin/_lib/asistenteVirtual.actions'; // Ajusta ruta
import { Loader2, AlertCircle, DollarSign, Plus, Equal } from 'lucide-react';

interface Props {
    asistenteId: string;
}

export default function AsistenteCosto({ asistenteId }: Props) {
    const [costos, setCostos] = useState<CostosAsistente | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCostos = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await obtenerCostosAsistente(asistenteId);
                if (data === null) {
                    // Si la acción devuelve null explícitamente por error o no encontrado
                    throw new Error("No se pudieron obtener los datos de costos.");
                }
                setCostos(data);
            } catch (err) {
                console.error("Error fetching assistant costs:", err);
                setError(err instanceof Error ? err.message : "Error al cargar costos.");
                setCostos(null); // Limpiar costos si hay error
            } finally {
                setLoading(false);
            }
        };

        fetchCostos();
    }, [asistenteId]); // Recargar si cambia el ID del asistente

    // --- Clases de Tailwind ---
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md";
    const titleClasses = "text-sm font-semibold text-zinc-100 mb-3 border-b border-zinc-600 pb-2 flex items-center gap-2";
    const itemClasses = "flex justify-between items-center text-xs py-1";
    const labelClasses = "text-zinc-400";
    const valueClasses = "text-zinc-100 font-medium";
    const totalClasses = "text-base font-semibold text-emerald-400"; // Total destacado
    const separatorClasses = "border-t border-dashed border-zinc-600 my-2";
    const loadingErrorClasses = "text-center text-xs italic";

    // Calcular total
    const totalMensual = costos ? (costos.precioBase ?? 0) + costos.costoTareasAdicionales : 0;

    // Formateador de moneda (opcional pero recomendado)
    const formatCurrency = (value: number | null) => {
        if (value === null) return '$ -.--';
        return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    };

    return (
        <div className={containerClasses}>
            <h3 className={titleClasses}>
                <DollarSign size={16} className="text-emerald-400" />
                Resumen de Costo Mensual
            </h3>

            {loading && (
                <p className={`${loadingErrorClasses} text-zinc-500 flex items-center justify-center gap-1`}>
                    <Loader2 size={12} className="animate-spin" /> Cargando...
                </p>
            )}

            {error && !loading && (
                <p className={`${loadingErrorClasses} text-red-400 flex items-center justify-center gap-1`}>
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            {!loading && !error && costos && (
                <div className="space-y-1">
                    {/* Precio Base */}
                    <div className={itemClasses}>
                        <span className={labelClasses}>Precio Base Asistente:</span>
                        <span className={valueClasses}>{formatCurrency(costos.precioBase)}</span>
                    </div>

                    {/* Costo Tareas Adicionales */}
                    <div className={itemClasses}>
                        <span className={labelClasses}>Costo Tareas Adicionales:</span>
                        <span className={valueClasses}>
                            <Plus size={10} className="inline -mt-0.5 mr-0.5" />
                            {formatCurrency(costos.costoTareasAdicionales)}
                        </span>
                    </div>

                    {/* Separador */}
                    <div className={separatorClasses}></div>

                    {/* Total */}
                    <div className={`${itemClasses} !py-2`}>
                        <span className={`${labelClasses} font-semibold`}>Total Mensual Estimado:</span>
                        <span className={totalClasses}>
                            <Equal size={12} className="inline -mt-1 mr-1" />
                            {formatCurrency(totalMensual)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
