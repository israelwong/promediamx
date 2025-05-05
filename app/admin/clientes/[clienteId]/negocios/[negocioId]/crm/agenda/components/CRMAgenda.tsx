// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/agenda/components/CRMAgenda.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';

// Importar acción y tipos
import { obtenerEventosAgenda } from '@/app/admin/_lib/crmAgenda.actions'; // Ajusta ruta!
import { CalendarEvent } from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes UI y iconos
import { Loader2, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'; // Cambiado icono
import { Button } from '@/app/components/ui/button';

// Configurar el localizador y mensajes (sin cambios)
const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });
const messages = { /* ... (mensajes en español sin cambios) ... */
    allDay: 'Todo el día', previous: '<', next: '>', today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda', date: 'Fecha', time: 'Hora', event: 'Evento', noEventsInRange: 'No hay eventos en este rango.', showMore: (total: number) => `+ Ver más (${total})`,
};

interface Props {
    negocioId: string;
}

export default function CRMAgenda({ negocioId }: Props) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<View>(Views.MONTH);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Cargar eventos (sin cambios en la lógica)
    const fetchEvents = useCallback(async (rangeStart?: Date, rangeEnd?: Date) => {
        setLoading(true);
        setError(null);
        try {
            const result = await obtenerEventosAgenda(negocioId, rangeStart, rangeEnd);
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setEvents(result.data.eventos);
                if (!result.data.crmId && result.data.eventos.length === 0) {
                    setError("CRM no configurado para este negocio.");
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar eventos.");
            }
        } catch (err) {
            console.error("Error fetching events:", err);
            setError(`No se pudieron cargar los eventos: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        fetchEvents(start, end);
    }, [fetchEvents, currentDate]);

    // Manejadores (sin cambios en la lógica)
    const handleNavigate = useCallback((newDate: Date, view: View) => {
        setCurrentDate(newDate);
        setCurrentView(view);
    }, []);
    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    }, []);
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    }

    // --- Renderizado ---
    if (loading && events.length === 0) {
        return <div className="flex items-center justify-center h-64 text-zinc-400"><Loader2 className="h-8 w-8 animate-spin mr-3" />Cargando Agenda...</div>;
    }
    if (error) {
        return <div className="flex flex-col items-center justify-center h-64 text-red-500"><AlertTriangle className="h-8 w-8 mb-2" />{error}</div>;
    }
    if (!crmId && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-400">
                <CalendarIcon className="h-12 w-12 mb-4 text-zinc-600" />
                <h3 className="text-lg font-semibold text-zinc-300 mb-2">CRM No Configurado</h3>
                <p className="text-sm">La agenda requiere que el CRM esté configurado.</p>
            </div>
        );
    }

    return (
        // Contenedor principal del calendario
        <div className="h-[75vh] bg-zinc-900 p-0 rounded-lg border border-zinc-700 relative"> {/* Cambiado fondo y padding */}

            {/* --- ESTILOS CSS PERSONALIZADOS --- */}
            {/* Estos estilos sobrescriben los de react-big-calendar */}
            <style jsx global>{`
                /* Contenedor General */
                .rbc-calendar {
                    background-color: transparent; /* Hacer fondo transparente para ver el del div padre */
                    border: none; /* Quitar borde por defecto */
                    color: #d4d4d8; /* zinc-300 */
                    height: 100%; /* Asegurar que ocupe toda la altura */
                }

                /* Barra de Herramientas (Navegación y Vistas) */
                .rbc-toolbar {
                    background-color: #27272a; /* zinc-800 */
                    border-bottom: 1px solid #3f3f46; /* zinc-700 */
                    padding: 0.75rem 1rem; /* Ajustar padding */
                    margin-bottom: 0; /* Quitar margen inferior */
                    border-radius: 0.5rem 0.5rem 0 0; /* Redondear esquinas superiores */
                }
                .rbc-toolbar button {
                    color: #a1a1aa; /* zinc-400 */
                    background-color: #3f3f46; /* zinc-700 */
                    border: 1px solid #52525b; /* zinc-600 */
                    padding: 0.3rem 0.75rem;
                    border-radius: 0.375rem; /* rounded-md */
                    transition: background-color 0.2s, color 0.2s;
                }
                .rbc-toolbar button:hover:not(:disabled) {
                    background-color: #52525b; /* zinc-600 */
                    color: #f4f4f5; /* zinc-100 */
                }
                .rbc-toolbar button:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #0ea5e9; /* sky-500 ring */
                }
                 .rbc-toolbar button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                 }
                .rbc-btn-group button.rbc-active {
                    background-color: #0ea5e9; /* sky-600 */
                    color: white;
                    border-color: #0284c7; /* sky-700 */
                }
                .rbc-toolbar label { /* Etiqueta de fecha actual */
                    color: #f4f4f5; /* zinc-100 */
                    font-weight: 600;
                }

                /* Encabezados de Día/Semana */
                .rbc-header {
                    background-color: rgba(39, 39, 42, 0.5); /* zinc-800/50 */
                    border-bottom: 1px solid #3f3f46; /* zinc-700 */
                    color: #a1a1aa; /* zinc-400 */
                    padding: 0.5rem 0;
                    text-align: center;
                    font-size: 0.8rem;
                    font-weight: 500;
                }
                .rbc-header + .rbc-header { /* Borde entre headers */
                     border-left: 1px solid #3f3f46; /* zinc-700 */
                }

                /* Celdas de Día (Vista Mes) */
                .rbc-month-view {
                    border: none; /* Quitar borde exterior */
                }
                .rbc-month-row {
                     border-bottom: 1px solid #3f3f46; /* zinc-700 */
                     min-height: 100px; /* Ajustar altura mínima */
                }
                 .rbc-month-row:last-child {
                     border-bottom: none;
                 }
                .rbc-day-bg { /* Fondo de cada día */
                    border-left: 1px solid #3f3f46; /* zinc-700 */
                }
                .rbc-day-bg:first-child {
                    border-left: none;
                }
                .rbc-off-range-bg { /* Días fuera del mes */
                    background-color: rgba(24, 24, 27, 0.3); /* zinc-900/30 */
                }
                .rbc-today { /* Día actual */
                    background-color: rgba(56, 189, 260, 0.1); /* sky-400/10 */
                }
                .rbc-date-cell { /* Número del día */
                    color: #a1a1aa; /* zinc-400 */
                    padding: 0.25rem;
                    text-align: right;
                }
                 .rbc-date-cell.rbc-now { /* Número del día actual */
                     font-weight: 600;
                     color: #38bdf8; /* sky-400 */
                 }
                 .rbc-row-segment {
                    padding: 0 2px 2px 2px; /* Espacio para eventos */
                 }

                /* Eventos */
                .rbc-event {
                    background-color: #0ea5e9; /* sky-600 */
                    border: 1px solid #0284c7; /* sky-700 */
                    color: white;
                    border-radius: 0.25rem; /* rounded-sm */
                    padding: 2px 5px;
                    font-size: 0.75rem; /* text-xs */
                }
                .rbc-event:focus {
                     outline: none;
                     box-shadow: 0 0 0 2px #38bdf8; /* sky-400 ring */
                }
                .rbc-event-label { /* Hora del evento (si aplica) */
                    font-weight: 500;
                    margin-right: 4px;
                }
                 .rbc-event-content { /* Contenido del evento */
                     white-space: nowrap;
                     overflow: hidden;
                     text-overflow: ellipsis;
                 }
                 .rbc-show-more { /* Botón "+X más" */
                    color: #7dd3fc; /* sky-300 */
                    font-size: 0.7rem;
                    background-color: transparent;
                    padding: 2px;
                    margin-top: 2px;
                 }
                 .rbc-show-more:hover {
                    color: #0ea5e9; /* sky-500 */
                 }

                /* Vista Semana/Día */
                .rbc-time-view .rbc-header { /* Header con fecha */
                     border-bottom: 1px solid #3f3f46;
                }
                .rbc-time-header-content { /* Contenedor de headers y all-day */
                     border-bottom: 1px solid #3f3f46;
                }
                .rbc-time-gutter { /* Columna de horas */
                    background-color: rgba(39, 39, 42, 0.5); /* zinc-800/50 */
                }
                .rbc-time-slot { /* Cada slot de hora */
                     border-top: 1px dotted #52525b; /* zinc-600 */
                }
                .rbc-slot-selection { /* Cuando seleccionas un rango */
                    background-color: rgba(56, 189, 248, 0.2); /* sky-400/20 */
                    border-color: #38bdf8; /* sky-400 */
                }
                .rbc-current-time-indicator { /* Línea de hora actual */
                     background-color: #f87171; /* red-400 */
                     height: 2px;
                }

                /* Vista Agenda (Lista) */
                .rbc-agenda-view table {
                    border: 1px solid #3f3f46; /* zinc-700 */
                    background-color: transparent;
                }
                .rbc-agenda-view table thead th {
                     background-color: rgba(39, 39, 42, 0.5); /* zinc-800/50 */
                     border-bottom: 1px solid #3f3f46; /* zinc-700 */
                     color: #a1a1aa; /* zinc-400 */
                     padding: 0.5rem;
                }
                 .rbc-agenda-view table tbody tr td {
                    padding: 0.5rem;
                    border-bottom: 1px solid #3f3f46; /* zinc-700 */
                 }
                  .rbc-agenda-view table tbody tr:last-child td {
                     border-bottom: none;
                  }
                 .rbc-agenda-date-cell {
                    font-weight: 600;
                    color: #e4e4e7; /* zinc-200 */
                 }
                 .rbc-agenda-time-cell {
                     font-size: 0.8rem;
                 }

            `}</style>
            {/* --- FIN ESTILOS --- */}

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                messages={messages}
                culture='es'
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                view={currentView}
                date={currentDate}
                onNavigate={handleNavigate}
                onView={(view) => setCurrentView(view)}
                // onRangeChange={handleRangeChange} // Mantener comentado por ahora
                onSelectEvent={handleSelectEvent}
                selectable
                className="rbc-calendar" // Añadir clase base para asegurar aplicación de estilos
            />

            {/* Modal Básico para Detalles del Evento (sin cambios) */}
            {isModalOpen && selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-zinc-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 text-white">{selectedEvent.resource?.tipo}: {selectedEvent.title.split(': ')[1]?.split(' (')[0]}</h3>
                        <p className="text-sm text-zinc-300 mb-2"><strong>Fecha:</strong> {format(selectedEvent.start, 'PPP p', { locale: es })}</p>
                        {selectedEvent.resource?.lead && <p className="text-sm text-zinc-300 mb-2"><strong>Lead:</strong> {selectedEvent.resource.lead.nombre}</p>}
                        {selectedEvent.resource?.agente && <p className="text-sm text-zinc-300 mb-2"><strong>Agente:</strong> {selectedEvent.resource.agente.nombre}</p>}
                        {selectedEvent.resource?.descripcion && <p className="text-sm text-zinc-300 mb-2"><strong>Descripción:</strong> {selectedEvent.resource.descripcion}</p>}
                        <p className="text-sm text-zinc-300 mb-4"><strong>Status:</strong> <span className="capitalize">{selectedEvent.resource?.status}</span></p>
                        <Button onClick={closeModal} variant="outline" className="w-full bg-zinc-700 hover:bg-zinc-600">Cerrar</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
