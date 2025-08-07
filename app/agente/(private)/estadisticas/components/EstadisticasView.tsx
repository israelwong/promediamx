"use client";

import React from 'react';
import { type EstadisticasAgenteData } from '../../../_lib/actions/actions/estadisticas.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];

interface EstadisticasViewProps {
    initialData?: EstadisticasAgenteData;
}

export default function EstadisticasView({ initialData }: EstadisticasViewProps) {
    if (!initialData) {
        return <p>No hay datos para mostrar.</p>;
    }

    const { leadsPorEtapa, leadsPorEtiqueta, leadsPorOferta } = initialData;
    const totalLeads = leadsPorEtapa.reduce((sum, etapa) => sum + etapa.cantidad, 0);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    {/* --- MEJORA: Añadimos un layout flexible y el contador total --- */}
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Prospectos por Etapa</CardTitle>
                            <p className="text-sm text-zinc-400">Distribución en el pipeline</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-zinc-100">{totalLeads}</p>
                            <p className="text-xs text-zinc-500">Prospectos Totales</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {leadsPorEtapa.reduce((acc, curr) => acc + curr.cantidad, 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={leadsPorEtapa}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="cantidad"
                                    nameKey="nombre"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {leadsPorEtapa.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[500px] flex items-center justify-center text-zinc-500">
                            No hay prospectos en el pipeline.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- NUEVA TARJETA: Prospectos por Oferta --- */}
            {/* Solo se muestra si el agente tiene más de una oferta */}
            {leadsPorOferta.length > 1 && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Prospectos por Oferta</CardTitle>
                                <p className="text-sm text-zinc-400">Distribución por campaña</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-zinc-100">{totalLeads}</p>
                                <p className="text-xs text-zinc-500">Prospectos Totales</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={leadsPorOferta} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {leadsPorOferta.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} prospectos`, name]} contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    {/* --- MEJORA: Añadimos también aquí el contador para consistencia --- */}
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Prospectos por Etiqueta</CardTitle>
                            <p className="text-sm text-zinc-400">Clasificación de prospectos</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-zinc-100">{totalLeads}</p>
                            <p className="text-xs text-zinc-500">Prospectos Totales</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {leadsPorEtiqueta.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={leadsPorEtiqueta} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                                <XAxis type="number" stroke="#a1a1aa" />
                                <YAxis type="category" dataKey="nombre" stroke="#a1a1aa" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46' }} />
                                <Bar dataKey="cantidad" name="Prospectos" fill="#8884d8">
                                    {leadsPorEtiqueta.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-zinc-500">
                            No se han asignado etiquetas a los prospectos.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}