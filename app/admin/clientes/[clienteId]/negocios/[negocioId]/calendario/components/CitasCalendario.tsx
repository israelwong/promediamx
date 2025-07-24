/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/calendario/components/CitasCalendario.tsx
*/
"use client";

import React from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// ✅ Se importa el tipo de datos correcto
import { type CitaParaCalendario } from '@/app/admin/_lib/actions/citas/citas.schemas';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: es }), getDay, locales });

interface CitasCalendarioProps {
    events: CitaParaCalendario[];
}

export default function CitasCalendario({ events }: CitasCalendarioProps) {
    const calendarEvents = events.map(cita => {
        const start = new Date(cita.start);
        // ✅ Se calcula la hora de fin sumando la duración a la hora de inicio.
        // Si no hay duración, se establece por defecto en 30 minutos.
        const end = addMinutes(start, cita.tipoDeCita?.duracionMinutos || 30);

        return {
            title: `${cita.tipoDeCita?.nombre || cita.asunto} - ${cita.lead?.nombre}`,
            start,
            end,
            resource: cita,
        };
    });

    return (
        <div className="h-full min-h-[650px] text-zinc-100">
            <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                culture="es"
                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                messages={{
                    next: "Siguiente", previous: "Anterior", today: "Hoy",
                    month: "Mes", week: "Semana", day: "Día",
                    noEventsInRange: "No hay citas en este rango.",
                    showMore: total => `+ ${total} más`,
                }}
            />
        </div>
    );
}
