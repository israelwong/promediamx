"use client";

import React from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { type CitaListItem } from '@/app/admin/_lib/actions/citas/citas.schemas';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: es }),
    getDay,
    locales,
});

interface CitasCalendarioProps {
    events: CitaListItem[];
}

export default function CitasCalendario({ events }: CitasCalendarioProps) {
    const calendarEvents = events.map(cita => ({
        title: `${cita.asunto} - ${cita.lead?.nombre}`,
        start: new Date(cita.start),
        end: new Date(cita.end),
        resource: cita,
    }));

    return (
        <div className="h-full min-h-[650px] text-zinc-100">
            <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                // CORRECCIÓN: Eliminamos la vista de "Agenda" de las opciones.
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda", // Dejamos el texto por si acaso, no afecta.
                    noEventsInRange: "No hay citas en este rango.",
                    showMore: total => `+ ${total} más`,
                }}
            />
        </div>
    );
}