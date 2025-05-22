// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/agenda/components/CRMAgenda.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View, EventProps } from 'react-big-calendar'; // Importar EventProps
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns'; // Importar startOfMonth, endOfMonth
import { es } from 'date-fns/locale/es';

// --- NUEVAS IMPORTS ---
import { listarEventosAgendaAction } from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.actions';
import type {
    AgendaEventoData, // Tipo Zod para los eventos del calendario
    // ObtenerEventosAgendaResultData // No se usa directamente en el estado del componente
} from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.schemas';

// Componentes UI y iconos
import { XIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Importar CSS base

// Configurar el localizador y mensajes (sin cambios)
const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });
const messages = {
    allDay: 'Todo el día', previous: '< Anterior', next: 'Siguiente >', today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda Detallada', date: 'Fecha', time: 'Hora', event: 'Evento',
    noEventsInRange: 'No hay eventos en este rango.', showMore: (total: number) => `+ Ver ${total} más`,
};

interface Props {
    negocioId: string;
}

export default function CRMAgenda({ negocioId }: Props) {
    const [events, setEvents] = useState<AgendaEventoData[]>([]); // Usar el nuevo tipo Zod
    const [crmId, setCrmId] = useState<string | null>(null); // Para saber si el CRM está configurado
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<View>(Views.MONTH);

    const [selectedEvent, setSelectedEvent] = useState<AgendaEventoData | null>(null); // Usar el nuevo tipo Zod
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchEvents = useCallback(async (dateForRange: Date, viewForRange: View) => {
        setLoading(true);
        setError(null);

        // Determinar el rango de fechas basado en la vista y la fecha actual del calendario
        let rangeStart: Date;
        let rangeEnd: Date;

        // Esta lógica de rango es una simplificación. react-big-calendar puede proveer el rango
        // a través de onRangeChange, pero para una carga inicial basada en la vista actual:
        if (viewForRange === Views.MONTH) {
            rangeStart = startOfMonth(dateForRange);
            rangeEnd = endOfMonth(dateForRange);
        } else if (viewForRange === Views.WEEK) {
            rangeStart = startOfWeek(dateForRange, { locale: es });
            rangeEnd = new Date(rangeStart);
            rangeEnd.setDate(rangeStart.getDate() + 6);
            rangeEnd.setHours(23, 59, 59, 999); // Fin del día
        } else { // DAY o AGENDA
            rangeStart = new Date(dateForRange);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd = new Date(dateForRange);
            rangeEnd.setHours(23, 59, 59, 999);
        }
        // Para la vista AGENDA, podrías querer un rango más amplio, ej. 30 días desde rangeStart
        if (viewForRange === Views.AGENDA) {
            rangeEnd = new Date(rangeStart);
            rangeEnd.setDate(rangeStart.getDate() + 30); // Por ejemplo, los próximos 30 días
        }

        try {
            const result = await listarEventosAgendaAction({ negocioId, rangeStart, rangeEnd }); // Nueva Action
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                // Los datos ya vienen como Date del servidor si Prisma los maneja así
                setEvents(result.data.eventos.map(ev => ({
                    ...ev,
                    start: new Date(ev.start), // Asegurar que sean objetos Date
                    end: new Date(ev.end),     // Asegurar que sean objetos Date
                })));
                if (!result.data.crmId && result.data.eventos.length === 0 && !error) { // Evitar sobreescribir error de carga
                    setError("CRM no configurado para este negocio.");
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar eventos.");
            }
        } catch (err) {
            console.error("Error fetching events:", err);
            setError(`No se pudieron cargar los eventos: ${err instanceof Error ? err.message : "Error"}`);
            setEvents([]); // Limpiar eventos en caso de error
        } finally {
            setLoading(false);
        }
    }, [negocioId, error]); // Añadido error a dependencias para evitar sobreescribir

    useEffect(() => {
        if (negocioId) fetchEvents(currentDate, currentView);
    }, [fetchEvents, currentDate, currentView, negocioId]); // Añadido negocioId

    const handleNavigate = useCallback((newDate: Date) => {
        setCurrentDate(newDate);
        // No es necesario llamar a fetchEvents aquí si el useEffect anterior ya depende de currentDate y currentView
    }, []);

    const handleView = useCallback((view: View) => {
        setCurrentView(view);
        // No es necesario llamar a fetchEvents aquí
    }, []);


    const handleSelectEvent = useCallback((event: unknown) => { // event es 'unknown' de react-big-calendar
        setSelectedEvent(event as AgendaEventoData); // Cast al tipo Zod
        setIsModalOpen(true);
    }, []);

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    }

    // Componente personalizado para el evento, si quieres estilizarlo más
    const EventComponent = ({ event }: EventProps<AgendaEventoData>) => {
        const tipo = event.resource?.tipo?.toLowerCase();
        // const letbgColor = 'bg-sky-600 hover:bg-sky-500'; // Default
        let bgColor = 'bg-sky-600 hover:bg-sky-500'; // Default
        if (tipo === 'llamada') bgColor = 'bg-amber-600 hover:bg-amber-500';
        else if (tipo === 'reunion') bgColor = 'bg-purple-600 hover:bg-purple-500';
        else if (tipo === 'tarea') bgColor = 'bg-rose-600 hover:bg-rose-500';

        return (
            <div className={`p-1 text-xs text-white rounded-sm h-full ${bgColor} transition-colors`}>
                <strong>{event.title.split('(')[0].trim()}</strong> {/* Solo el asunto y tipo */}
                {event.resource?.lead?.nombre && <span className="block truncate text-[10px] opacity-80">{event.resource.lead.nombre}</span>}
            </div>
        );
    };


    if (loading && events.length === 0) { /* ... (sin cambios) ... */ }
    if (error && !loading) { /* ... (sin cambios, pero se muestra solo si no está cargando) ... */ } // Modificado para no mostrar error durante carga
    if (!crmId && !loading && !error) { /* ... (sin cambios) ... */ }

    return (
        <div className="h-[calc(100vh-12rem)] bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 relative shadow-lg"> {/* Ajusta la altura según necesites */}
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
                     border-bottom: 1px solid #999999; /* zinc-700 */
                     min-height: 100px; /* Ajustar altura mínima */
                }
                 .rbc-month-row:last-child {
                     border-bottom: none;
                 }
                .rbc-day-bg { /* Fondo de cada día */
                    border-left: 1px solid #999999; /* zinc-700 */
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
                startAccessor="start" // Propiedad del objeto evento que tiene la fecha de inicio
                endAccessor="end"     // Propiedad del objeto evento que tiene la fecha de fin
                style={{ height: '100%' }}
                messages={messages}
                culture='es'
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                view={currentView} // Vista actual controlada por el estado
                date={currentDate} // Fecha actual controlada por el estado
                onNavigate={handleNavigate} // Se llama cuando el usuario cambia de fecha
                onView={handleView}         // Se llama cuando el usuario cambia de vista
                onSelectEvent={handleSelectEvent} // Se llama al hacer clic en un evento
                selectable // Permite seleccionar slots de tiempo (para crear eventos, no implementado aquí)
                className="rbc-calendar" // Clase base para aplicar estilos
                components={{
                    event: EventComponent, // Componente personalizado para renderizar cada evento
                }}
                min={new Date(0, 0, 0, 7, 0, 0)} // Hora mínima visible en vistas de día/semana (7 AM)
                max={new Date(0, 0, 0, 21, 0, 0)} // Hora máxima visible (9 PM)
                formats={{ // Formatos de fecha personalizados (opcional)
                    agendaHeaderFormat: ({ start, end }, culture, local) =>
                        (local?.format?.(start, 'PPP', culture) ?? '') + ' – ' + (local?.format?.(end, 'PPP', culture) ?? ''),
                    dayHeaderFormat: (date, culture, local) => local?.format?.(date, 'eeee dd MMM', culture) ?? '',
                    // ... otros formatos
                }}
            />

            {isModalOpen && selectedEvent && selectedEvent.resource && ( // Asegurar que resource exista
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-zinc-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-zinc-600" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-semibold text-white">
                                {selectedEvent.resource.tipo}: {selectedEvent.title.split(' (')[0].replace(`[${selectedEvent.resource.tipo}] `, '')}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={closeModal} className="p-1 h-auto text-zinc-400 hover:text-white -mt-2 -mr-2"><XIcon size={20} /></Button>
                        </div>

                        <p className="text-sm text-zinc-300 mb-2">
                            <strong>Fecha:</strong> {format(new Date(selectedEvent.start), "PPP 'a las' p", { locale: es })}
                        </p>
                        {selectedEvent.resource.lead && <p className="text-sm text-zinc-300 mb-2"><strong>Lead:</strong> {selectedEvent.resource.lead.nombre}</p>}
                        {selectedEvent.resource.agente && <p className="text-sm text-zinc-300 mb-2"><strong>Agente:</strong> {selectedEvent.resource.agente.nombre}</p>}
                        {selectedEvent.resource.descripcion && <p className="text-sm text-zinc-300 mb-2 whitespace-pre-line"><strong>Notas:</strong> {selectedEvent.resource.descripcion}</p>}
                        <p className="text-sm text-zinc-300 mb-4">
                            <strong>Status:</strong> <span className="capitalize font-medium">{selectedEvent.resource.status.replace('_', ' ')}</span>
                        </p>
                        <Button onClick={closeModal} variant="outline" className="w-full bg-zinc-700 hover:bg-zinc-600 border-zinc-600">Cerrar</Button>
                    </div>
                </div>
            )}
        </div>
    );
}