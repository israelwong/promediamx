'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Loader2,
    CalendarCheck,
    AlertTriangleIcon,
    XIcon,
    CalendarDays, // Para el botón "Hoy"
    CalendarRange // Para el botón "Mes"
} from 'lucide-react';
import { format, isToday, } from 'date-fns';
import { es } from 'date-fns/locale/es'; // Importar explícitamente el locale
import { SupabaseClient, RealtimeChannel, createClient } from '@supabase/supabase-js';
import { Button } from '@/app/components/ui/button';

// Nuevas Actions y Tipos/Schemas Zod
import { listarCitasAgendaAction } from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.actions';
import {
    type CitaDelDiaData,
    StatusAgenda, // El enum Zod (ej. StatusAgenda.Enum.pendiente)
    statusAgendaEnum, // El objeto Zod enum
    type AgendaRealtimePayload,
    agendaRealtimePayloadSchema
} from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.schemas';

import { BellRing } from 'lucide-react'; // Para el icono de recordatorio

// Configuración del cliente Supabase (como la tenías)
const supabaseClient: SupabaseClient | null = typeof window !== 'undefined' ? (() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[AgendaLista] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
        return null;
    }
})() : null;

interface Props {
    negocioId: string;
}

// Colores de status (asegúrate que las claves coincidan con los valores de tu enum Zod)
const statusColors: Record<StatusAgenda, string> = {
    [statusAgendaEnum.enum.pendiente]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    [statusAgendaEnum.enum.completada]: 'bg-green-500/20 text-green-300 border-green-500/30',
    [statusAgendaEnum.enum.cancelada]: 'bg-red-500/20 text-red-400 border-red-500/30',
    [statusAgendaEnum.enum.reagendada]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    [statusAgendaEnum.enum.no_asistio]: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function AgendaLista({ negocioId }: Props) {
    const [citas, setCitas] = useState<CitaDelDiaData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCita, setSelectedCita] = useState<CitaDelDiaData | null>(null);
    const [crmId, setCrmId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'hoy' | 'mes'>('hoy');
    const [currentDateRef, setCurrentDateRef] = useState(new Date()); // Para el mes/día actual

    const fetchCitas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) {
            setError("ID de negocio no proporcionado.");
            if (isInitialLoad) setLoading(false);
            return;
        }
        if (isInitialLoad) setLoading(true);
        setError(null);

        const paramsForAction: {
            negocioId: string;
            fechaReferencia: Date;
            tipoRango: "dia" | "mes";
        } = {
            negocioId,
            fechaReferencia: currentDateRef,
            tipoRango: viewMode === 'hoy' ? 'dia' : 'mes',
        };

        const result = await listarCitasAgendaAction(paramsForAction);

        if (result.success && result.data) {
            setCrmId(result.data.crmId);
            // Asegurar que las fechas sean objetos Date válidos
            setCitas(result.data.citas.map(cita => ({
                ...cita,
                fecha: new Date(cita.fecha),
                ...(cita.fechaRecordatorio && { fechaRecordatorio: new Date(cita.fechaRecordatorio) }),
            })));
            if (!result.data.crmId && isInitialLoad && result.data.citas.length === 0) {
                setError("CRM no configurado para este negocio. La agenda no está disponible.");
            }
        } else {
            setError(result.error || `Error al cargar citas para ${viewMode === 'hoy' ? 'hoy' : 'el mes'}.`);
            setCitas([]);
        }
        if (isInitialLoad) setLoading(false);
    }, [negocioId, currentDateRef, viewMode]);

    useEffect(() => {
        // Carga inicial y cuando cambian los parámetros de filtrado (viewMode, currentDateRef)
        if (negocioId) {
            fetchCitas(true); // true para que muestre el loader en la carga inicial o cambio de vista
        }
    }, [fetchCitas, negocioId, viewMode, currentDateRef]); // fetchCitas ahora incluye viewMode y currentDateRef


    useEffect(() => {
        if (!negocioId || !supabaseClient) {
            console.log("[AgendaLista Realtime] No suscrito (sin negocioId o cliente Supabase).");
            return;
        }
        // ASUNCIÓN IMPORTANTE: Tu tabla 'Agenda' en PostgreSQL TIENE una columna 'negocioId'
        // y tus políticas RLS permiten filtrar por ella para el rol que usa Supabase Realtime.
        const filterString = `negocioId=eq.${negocioId}`;
        const channelName = `db-agenda-negocio-${negocioId}`; // Canal único por negocio para la tabla Agenda

        console.log(`[AgendaLista Realtime] Intentando suscribir a: ${channelName} con filtro: ${filterString}`);

        const channel: RealtimeChannel = supabaseClient
            .channel(channelName)
            .on<AgendaRealtimePayload>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Agenda',
                    filter: filterString
                },
                async (payload) => {
                    console.log('[AgendaLista Realtime] Payload crudo recibido (ya filtrado por Supabase):', payload);
                    // Validar el payload con Zod (opcional, pero buena práctica)
                    const recordAfectado = payload.eventType === 'DELETE' ? payload.old : payload.new;
                    const parsedPayload = agendaRealtimePayloadSchema.safeParse(recordAfectado);

                    if (!parsedPayload.success) {
                        console.warn('[AgendaLista Realtime] Payload de Supabase no pasó validación Zod:', parsedPayload.error);
                        // Considerar recargar la lista completa por precaución si el payload es inesperado
                        await fetchCitas(false); // Recargar sin spinner de página completa
                        return;
                    }
                    // Si el filtro de Supabase por negocioId funciona, ya no necesitas validar negocioId aquí.
                    // La validación de fecha (si es del día/mes actual) sigue siendo relevante si el filtro no lo cubre.
                    console.log('[AgendaLista Realtime] Evento válido para este negocio, recargando citas...');
                    await fetchCitas(false);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[AgendaLista Realtime] Suscrito exitosamente a ${channelName}`);
                    // Considera limpiar errores previos si la suscripción es exitosa
                    // setError(null); // Descomenta si quieres limpiar errores de conexión previos al suscribir.
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    // Estos SÍ son errores de conexión que deberías mostrar
                    console.error(`[AgendaLista Realtime] Problema con canal ${channelName}: ${status}`, err);
                    setError(`Error conexión Realtime: ${err?.message || status}`);
                } else if (status === 'CLOSED') {
                    // El canal se cerró. Esto puede ser intencional (desmontaje, cambio de dependencias).
                    // No lo trates como un error visible para el usuario a menos que 'err' esté presente.
                    console.log(`[AgendaLista Realtime] Canal ${channelName} CERRADO.`, err);
                    if (err) { // Si hay un objeto de error adjunto al cierre, podría ser un problema
                        setError(`Canal Realtime cerrado con error: ${err.message}`);
                    }
                } else {
                    // Otros estados como 'joining', 'leaving', etc.
                    // console.log(`[AgendaLista Realtime] Estado canal ${channelName}: ${status}`);
                }
            });

        return () => {
            if (supabaseClient && channel) {
                console.log(`[AgendaLista Realtime] Desuscribiendo de ${channelName}`);
                supabaseClient.removeChannel(channel).catch(console.error);
            }
        };
    }, [negocioId, fetchCitas]); // fetchCitas se incluye porque es la acción a tomar

    const widgetContainerClasses = "bg-zinc-800 rounded-lg shadow-md p-3 sm:p-4 h-full flex flex-col";
    const headerClasses = "flex items-center justify-between mb-3 pb-2 border-b border-zinc-700";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-1.5";
    const listContainerClasses = "flex-grow overflow-y-auto space-y-2 pr-1 -mr-2";
    const listItemClasses = "bg-zinc-900/70 p-2.5 rounded-md border border-zinc-700 hover:border-blue-500 cursor-pointer transition-all duration-150 ease-in-out";
    const modalOverlayClasses = "fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col";
    const modalHeaderClasses = "flex items-center justify-between p-3 sm:p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-base sm:text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[70vh] text-xs sm:text-sm";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    // const buttonSecondaryClasses = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";

    const getFormattedDateTitle = () => {
        if (viewMode === 'hoy') {
            return `Hoy, ${format(currentDateRef, 'dd MMMM yyyy', { locale: es })}`;
        } else {
            return format(currentDateRef, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
        }
    };

    const formatListItemDate = (date: Date) => {
        if (viewMode === 'hoy' && isToday(date)) {
            return format(date, 'HH:mm');
        }
        return format(date, 'dd MMM, HH:mm', { locale: es });
    };

    const handleViewModeChange = (newMode: 'hoy' | 'mes') => {
        setViewMode(newMode);
        setCurrentDateRef(new Date()); // Resetear a la fecha actual al cambiar de modo
        // fetchCitas se disparará por el useEffect que depende de viewMode y currentDateRef
    };

    if (loading && citas.length === 0) {
        return (
            <div className={`${widgetContainerClasses} items-center justify-center`}>
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                <p className="text-xs text-zinc-400 mt-1.5">Cargando citas...</p>
            </div>
        );
    }

    // Mostrar error crítico (CRM no configurado) incluso si hay un error de carga de citas menor
    if (!crmId && !loading && error?.includes("CRM no configurado")) {
        return (
            <div className={`${widgetContainerClasses} items-center justify-center text-center`}>
                <AlertTriangleIcon size={24} className="text-red-400 mb-2" />
                <p className="text-sm text-red-300">{error}</p>
                <p className="text-xs text-zinc-400 mt-1">Verifica la configuración del CRM.</p>
            </div>
        );
    }

    function isValidDate(date: Date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
    return (
        <div className={widgetContainerClasses}>
            <div className={headerClasses}>
                <div className="flex items-center gap-2">
                    <span className={titleClasses}>
                        <CalendarCheck size={16} className="text-blue-400" />
                        Citas para:
                    </span>
                </div>
                <div className="flex items-center gap-1 border border-zinc-700 rounded-md p-0.5 text-xs">
                    <Button
                        variant={viewMode === 'hoy' ? "default" : "ghost"} // Usar variantes de tu Button
                        size="sm"
                        onClick={() => handleViewModeChange('hoy')}
                        className={`px-2 py-1 h-auto transition-colors ${viewMode === 'hoy' ? 'bg-zinc-600 hover:bg-zinc-500 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
                    >
                        <CalendarDays size={12} className="mr-1" /> Hoy
                    </Button>
                    <Button
                        variant={viewMode === 'mes' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleViewModeChange('mes')}
                        className={`px-2 py-1 h-auto transition-colors ${viewMode === 'mes' ? 'bg-zinc-600 hover:bg-zinc-500 text-white' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
                    >
                        <CalendarRange size={12} className="mr-1" /> Mes
                    </Button>
                </div>
            </div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-300 font-medium">{getFormattedDateTitle()}</span>
            </div>

            {error && crmId && ( /* Mostrar errores de carga de citas si el CRM sí está configurado */
                <p className="text-xs text-red-400 mb-2 p-2 bg-red-900/30 border border-red-600/50 rounded">{error}</p>
            )}

            {loading && ( /* Mostrar un loader más sutil si ya hay citas pero se están recargando */
                <div className="flex items-center justify-center py-4 text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-xs">Actualizando...</span>
                </div>
            )}

            {!loading && !error && citas.length === 0 && crmId && (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-3">
                    <CalendarCheck size={24} className="text-zinc-500 mb-2" />
                    <p className="text-xs text-zinc-400">
                        No hay citas programadas para {viewMode === 'hoy' ? 'hoy' : 'este mes'}.
                    </p>
                </div>
            )}

            {!loading && !error && citas.length > 0 && crmId && (
                <ul className={listContainerClasses}>
                    {citas.map(cita => (
                        <li
                            key={cita.id}
                            className={listItemClasses}
                            onClick={() => setSelectedCita(cita)}
                            title={`Ver detalles de: ${cita.asunto}`}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-grow min-w-0">
                                    <p className="text-xs font-semibold text-blue-400 truncate">
                                        {formatListItemDate(cita.fecha)} - {cita.asunto}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 truncate">
                                        {cita.leadNombre || 'Lead no asignado'}
                                    </p>
                                </div>
                                <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[cita.status] || statusColors[statusAgendaEnum.enum.pendiente]}`}
                                >
                                    {cita.status.charAt(0).toUpperCase() + cita.status.slice(1).toLowerCase()}
                                </span>
                            </div>
                            {(cita.tipoDeCitaNombre || (cita.tipoOriginal !== 'Otro' && cita.tipoOriginal)) && (
                                <p className="mt-1 text-[11px] text-zinc-500 truncate">
                                    Servicio: {cita.tipoDeCitaNombre || cita.tipoOriginal}
                                </p>
                            )}
                            {cita.asignadoANombre && (
                                <p className="mt-0.5 text-[10px] text-zinc-500 truncate">
                                    Atiende: {cita.asignadoANombre}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Modal */}
            {selectedCita && (
                <div className={modalOverlayClasses} onClick={() => setSelectedCita(null)}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h4 className={modalTitleClasses}>
                                {selectedCita.asunto}
                            </h4>
                            <button onClick={() => setSelectedCita(null)} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className={modalBodyClasses}>
                            <p><strong>Fecha y Hora:</strong> {format(new Date(selectedCita.fecha), "PPPP 'a las' p", { locale: es })}</p>
                            <p><strong>Lead:</strong> {selectedCita.leadNombre || 'N/A'}</p>
                            <p><strong>Tipo/Servicio:</strong> {selectedCita.tipoDeCitaNombre || selectedCita.tipoOriginal}</p>
                            <p><strong>Atiende:</strong> {selectedCita.asignadoANombre || 'N/A'}</p>
                            <p><strong>Status:</strong> <span className="capitalize font-medium">{selectedCita.status.replace('_', ' ')}</span></p>
                            {selectedCita.descripcion && <div className="mt-2 pt-2 border-t border-zinc-700"><p className="text-xs text-zinc-400 mb-1">Notas:</p><p className="whitespace-pre-line text-zinc-200">{selectedCita.descripcion}</p></div>}
                            {selectedCita.meetingUrl && <p><strong>Enlace Reunión:</strong> <a href={selectedCita.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline truncate block">{selectedCita.meetingUrl}</a></p>}
                            {selectedCita.fechaRecordatorio && isValidDate(new Date(selectedCita.fechaRecordatorio)) && (
                                <p className="text-amber-400 flex items-center gap-1"><BellRing size={12} /><strong>Recordatorio:</strong> {format(new Date(selectedCita.fechaRecordatorio), "Pp", { locale: es })}</p>
                            )}
                        </div>
                        <div className={modalFooterClasses}>
                            <Button type="button" onClick={() => setSelectedCita(null)} variant="outline" size="sm" className="bg-zinc-700 hover:bg-zinc-600 border-zinc-600">Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}