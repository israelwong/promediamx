'use client';

import React, { useEffect, useState, useCallback } from 'react';

// Ajustar ruta a tu acción y tipos
import { obtenerEstadisticasCRM, EstadisticasCRM } from '@/app/admin/_lib/crmEstadisticas.actions'; // Asume que la acción existe
import { Loader2, AlertTriangle, Users, MessageSquare, Workflow, Share2, Tag } from 'lucide-react'; // Iconos

// Importar componentes de Recharts
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';

interface Props {
    crmId: string;
}

import CRMAgenda from '../agenda/components/CRMAgenda';


// Colores para las gráficas (puedes personalizarlos)
const COLORS_PIE = ['#0ea5e9', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#facc15', '#64748b']; // Sky, Emerald, Orange, Pink, Violet, Amber, Slate
const COLORS_BAR = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#78716c']; // Blue, Green, Amber, Red, Purple, Cyan, Stone

export default function CRMEstadisticas({ crmId }: Props) {
    const [stats, setStats] = useState<EstadisticasCRM | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "space-y-6";
    const cardClasses = "bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 shadow-sm";
    const cardTitleClasses = "text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2"; // Aumentado mb
    const totalStatClasses = "text-3xl font-bold text-white";
    const chartContainerClasses = "w-full h-64"; // Altura fija para los contenedores de gráficas

    // --- Carga de datos ---
    const fetchStats = useCallback(async () => {
        if (!crmId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerEstadisticasCRM(crmId);
            // Asegurar que los datos para las gráficas tengan la estructura correcta
            const formattedData: EstadisticasCRM = {
                ...data,
                // Renombrar 'nombre' a 'name' y 'count' a 'value' para recharts si es necesario,
                // o ajustar los 'dataKey' en las gráficas. Aquí asumimos que la acción ya devuelve 'nombre' y 'count'.
                // Ejemplo de formateo si fuera necesario:
                // leadsPorPipeline: data.leadsPorPipeline.map(p => ({ name: p.nombre, value: p.count })),
            };
            setStats(formattedData);
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

    // Preparar datos para gráficas (asegurando que sean arrays)
    const pipelineData = stats.leadsPorPipeline || [];
    const canalData = stats.leadsPorCanal || [];
    const etiquetaData = stats.leadsPorEtiqueta || [];

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
                </div>
            </div>

            {/* Sección de Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Gráfica Pipeline (Pastel) */}
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><Workflow size={16} /> Leads por Pipeline</h3>
                    {pipelineData.length > 0 ? (
                        <div className={chartContainerClasses}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pipelineData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Etiqueta opcional en sectores
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count" // Usar 'count' como valor
                                        nameKey="nombre" // Usar 'nombre' como etiqueta
                                    >
                                        {pipelineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value} Leads`, undefined]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-sm text-zinc-500 italic text-center py-10">No hay datos de pipeline.</p>}
                </div>

                {/* Gráfica Canales (Barras) */}
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><Share2 size={16} /> Leads por Canal</h3>
                    {canalData.length > 0 ? (
                        <div className={chartContainerClasses}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={canalData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#52525b" /> {/* zinc-600 */}
                                    {/* Ajustar dataKey para el nombre del canal */}
                                    <XAxis type="number" stroke="#a1a1aa" fontSize={10} /> {/* zinc-400 */}
                                    <YAxis dataKey="nombre" type="category" stroke="#a1a1aa" fontSize={10} width={80} tick={{ fill: '#d4d4d8' }} /> {/* zinc-300 */}
                                    <Tooltip
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} // Color índigo suave
                                        contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '0.5rem' }} // zinc-800, zinc-700
                                        labelStyle={{ color: '#e4e4e7' }} // zinc-200
                                        itemStyle={{ color: '#a1a1aa' }} // zinc-400
                                        formatter={(value: number) => [`${value} Leads`, undefined]}
                                    />
                                    {/* <Legend /> */}
                                    <Bar dataKey="count" name="Leads" barSize={20}>
                                        {canalData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_BAR[index % COLORS_BAR.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-sm text-zinc-500 italic text-center py-10">No hay datos de canales.</p>}
                </div>

                {/* Gráfica Etiquetas (Pastel) */}
                <div className={cardClasses}>
                    <h3 className={cardTitleClasses}><Tag size={16} /> Leads por Etiqueta</h3>
                    {etiquetaData.length > 0 ? (
                        <div className={chartContainerClasses}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={etiquetaData} dataKey="count" nameKey="nombre" cx="50%" cy="50%" outerRadius={80} fill="#82ca9d" labelLine={false}>
                                        {etiquetaData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => [`${value} Leads`, undefined]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <p className="text-sm text-zinc-500 italic text-center py-10">No hay datos de etiquetas.</p>}
                </div>
            </div>

            <CRMAgenda crmId={crmId} />

        </div>
    );
}
