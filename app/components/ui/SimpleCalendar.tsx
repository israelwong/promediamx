// Ruta: app/components/ui/SimpleCalendar.tsx
"use client";

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface SimpleCalendarProps {
    selectedDate?: Date | null;
    onDateSelect: (date: Date) => void;
}

export function SimpleCalendar({ selectedDate, onDateSelect }: SimpleCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate || new Date()));

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const startDate = startOfWeek(startOfMonth(currentMonth), { locale: es });
    const endDate = endOfWeek(endOfMonth(currentMonth), { locale: es });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const daysOfWeek = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

    return (
        <div className="p-3 bg-zinc-800/50 text-zinc-100 rounded-md border border-zinc-700 w-full">
            {/* Encabezado del Calendario */}
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-sm font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Grid de Días */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-xs font-medium text-zinc-400 capitalize pb-2">
                        {day}
                    </div>
                ))}
                {days.map(day => (
                    <button
                        key={day.toString()}
                        type="button"
                        onClick={() => onDateSelect(day)}
                        className={`
                            w-full aspect-square rounded-full text-xs flex items-center justify-center transition-colors
                            ${!isSameMonth(day, currentMonth) ? 'text-zinc-600' : 'text-zinc-200'}
                            ${isSameDay(day, new Date()) && !isSameDay(day, selectedDate || new Date(0)) ? 'border border-zinc-500' : ''}
                            ${isSameDay(day, selectedDate || new Date(0)) ? 'bg-blue-400 text-zinc-900 font-bold' : 'hover:bg-zinc-700'}
                        `}
                    >
                        {format(day, 'd')}
                    </button>
                ))}
            </div>
        </div>
    );
}
