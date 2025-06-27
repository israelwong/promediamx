// -----------------------------------------------------------------------------
// RUTA: app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/components/CitasCalendario.tsx
// -----------------------------------------------------------------------------
'use client';

import React, { useState } from 'react';
import type { CitaType } from '@/app/admin/_lib/actions/citas/citas.schemas';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Props {
    citas: CitaType[];
}

export function CitasCalendario({ citas }: Props) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    const day = new Date(startDate);
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                    {currentDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}><ChevronRight size={16} /></Button>
                </div>
            </div>
            <div className="grid grid-cols-7 border-t border-l border-zinc-700">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="text-center font-medium text-xs text-zinc-400 p-2 border-b border-r border-zinc-700 bg-zinc-800">
                        {d}
                    </div>
                ))}
                {days.map(d => {
                    const citasDelDia = citas.filter(c => new Date(c.fecha).toDateString() === d.toDateString());
                    const isToday = new Date().toDateString() === d.toDateString();
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                    return (
                        <div key={d.toString()} className={`relative min-h-[120px] p-2 border-b border-r border-zinc-700 ${isCurrentMonth ? 'bg-zinc-900/50' : 'bg-zinc-800/30'}`}>
                            <span className={`text-xs font-semibold ${isToday ? 'bg-blue-600 text-white rounded-full flex items-center justify-center h-6 w-6' : (isCurrentMonth ? 'text-zinc-200' : 'text-zinc-500')}`}>
                                {d.getDate()}
                            </span>
                            <div className="mt-1 space-y-1">
                                {citasDelDia.map(cita => (
                                    <div key={cita.id} className="bg-blue-900/50 p-1 rounded-md text-xs text-blue-200 border-l-2 border-blue-400">
                                        <p className="font-semibold truncate">{new Date(cita.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="truncate">{cita.lead.nombre}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
