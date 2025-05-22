'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarCheck, AlertTriangleIcon, XIcon } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
// import { es } from 'date-fns/locale';

import { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload, createClient } from '@supabase/supabase-js';

// Define or import your Supabase client instance
const supabaseClient: SupabaseClient | null = typeof window !== 'undefined' ? (() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[ChatComponent] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
        return null;
    }
})() : null;

import { CitaExistente } from '@/app/admin/_lib/types';
import { ActionResult } from '@/app/admin/_lib/types';


import { obtenerTodasLasCitasDelNegocio } from '@/app/admin/_lib/crmAgenda.actions';
import { CitaDelDia, StatusAgenda } from '@/app/admin/_lib/crmAgenda.type';

interface AgendaRealtimePayload {
    id: string;
    fecha: string;
    asunto: string;
    status: string;
    descripcion?: string | null;
    meetingUrl?: string | null;
    fechaRecordatorio?: string | null;
    leadId?: string | null;
    agenteId?: string | null;
    asistenteId?: string | null;
    tipoDeCitaId?: string | null;
    // Otros campos de tu tabla 'Agenda' que puedan ser relevantes para la validación
}

interface Props {
    negocioId: string;
}

const statusColors: Record<StatusAgenda, string> = {
    [StatusAgenda.PENDIENTE]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    [StatusAgenda.COMPLETADA]: 'bg-green-500/20 text-green-300 border-green-500/30',
    [StatusAgenda.CANCELADA]: 'bg-red-500/20 text-red-400 border-red-500/30',
    [StatusAgenda.REAGENDADA]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    [StatusAgenda.NO_ASISTIO]: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export default function AgendaLista({ negocioId }: Props) {
    const [citas, setCitas] = useState<CitaDelDia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCita, setSelectedCita] = useState<CitaDelDia | null>(null);

    const fetchCitasDelDia = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        // const hoy = new Date();
        const result: ActionResult<CitaExistente[]> = await obtenerTodasLasCitasDelNegocio(negocioId);
        // Transforming the result is unnecessary since the transformedResult is not used.
        if (result.success && result.data) {
            setCitas(result.data.map(cita => ({
                ...cita,
                leadNombre: (cita as CitaExistente).leadNombre ?? 'Desconocido',
                tipoDeCitaNombre: cita.tipoDeCitaNombre ?? 'Sin tipo',
                asignadoANombre: 'asignadoANombre' in cita ? (cita.asignadoANombre as string) ?? 'No asignado' : 'No asignado',
                status: cita.status as StatusAgenda, // Ensure status matches the StatusAgenda type
                fecha: new Date(cita.fecha), // Convert fecha to Date type
            } as CitaDelDia)));
        } else {
            setError(result.error || "Error al cargar las citas del día.");
            setCitas([]);
        }
        if (isInitialLoad) setLoading(false);
    }, [negocioId]);

    useEffect(() => {
        fetchCitasDelDia(true);
    }, [fetchCitasDelDia]);

    useEffect(() => {
        if (!negocioId || !supabaseClient) {
            console.log("[AgendaLista Realtime] No suscrito (sin negocioId o cliente Supabase).");
            return;
        }

        const channelName = `agenda-public-changes`; // Un nombre de canal más genérico, ya que no podemos filtrar por negocioId en la suscripción
        console.log(`[AgendaLista Realtime] Suscribiendo a: ${channelName} para tabla Agenda`);

        const channel: RealtimeChannel = supabaseClient
            .channel(channelName)
            .on<RealtimePostgresChangesPayload<AgendaRealtimePayload>>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Agenda'
                },
                async (payload) => {
                    console.log('[AgendaLista Realtime] Payload crudo recibido:', payload);

                    const recordAfectado = payload.eventType === 'DELETE' ? payload.old : payload.new;
                    if (!recordAfectado || !(recordAfectado as AgendaRealtimePayload).id) { // Necesitamos el ID para cualquier operación
                        console.log('[AgendaLista Realtime] Payload inválido o sin ID, ignorando.');
                        return;
                    }

                    // Paso 1: Validar si la cita (o la cita eliminada) es para hoy
                    // Para DELETE, payload.old contiene los datos. Para INSERT/UPDATE, payload.new.
                    const fechaCitaISO = (recordAfectado as AgendaRealtimePayload).fecha;
                    if (!fechaCitaISO || !isToday(parseISO(fechaCitaISO))) {
                        console.log('[AgendaLista Realtime] Evento ignorado, la cita no es para hoy.');
                        // Si fue un DELETE de una cita que SÍ estaba en la lista, necesitamos quitarla.
                        // Si fue un UPDATE que la movió fuera de hoy, también.
                        // La forma más simple de manejar esto es recargar si el ID estaba en la lista actual.
                        if (recordAfectado && 'id' in recordAfectado && citas.some(c => c.id === recordAfectado.id)) {
                            console.log('[AgendaLista Realtime] Cita afectada estaba en la lista, recargando para consistencia.');
                            await fetchCitasDelDia(false);
                        }
                        return;
                    }

                    // Paso 2: Validar si la cita pertenece al negocioId actual
                    const tipoDeCitaId = (recordAfectado as AgendaRealtimePayload).tipoDeCitaId;

                    if (tipoDeCitaId) {
                        try {
                            const { data: tipoCitaInfo, error: errTipo } = await supabaseClient
                                .from('AgendaTipoCita') // Nombre exacto de tu tabla de tipos de cita
                                .select('negocioId')
                                .eq('id', tipoDeCitaId)
                                .single();

                            if (errTipo) {
                                console.error('[AgendaLista Realtime] Error al verificar negocioId del tipo de cita:', errTipo);
                                return; // No podemos validar, mejor no hacer nada o recargar por precaución
                            }

                            if (tipoCitaInfo && tipoCitaInfo.negocioId === negocioId) {
                                console.log('[AgendaLista Realtime] Evento pertenece al negocio actual. Recargando citas del día...');
                                await fetchCitasDelDia(false);
                            } else {
                                console.log('[AgendaLista Realtime] Evento ignorado, no pertenece al negocio actual o tipo de cita no encontrado.');
                                // Si fue un DELETE de una cita que SÍ estaba en la lista y pertenecía a este negocio,
                                // pero su tipo de cita fue modificado/eliminado de forma que ya no podemos verificar,
                                // la recarga es la opción más segura.
                                if (payload.eventType === 'DELETE' && recordAfectado && citas.some(c => c.id === (recordAfectado as AgendaRealtimePayload).id)) {
                                    console.log('[AgendaLista Realtime] Cita eliminada estaba en la lista, recargando para consistencia.');
                                    await fetchCitasDelDia(false);
                                }
                            }
                        } catch (validationError) {
                            console.error('[AgendaLista Realtime] Excepción durante validación de negocioId:', validationError);
                        }
                    } else {
                        // Si la cita no tiene tipoDeCitaId, no podemos verificar el negocioId por este medio.
                        // Podrías tener otra lógica aquí si las citas pueden no tener tipo.
                        // Por seguridad, si no podemos verificar, y el evento es un DELETE de una cita en la lista, recargamos.
                        console.log('[AgendaLista Realtime] Evento para cita sin tipoDeCitaId. No se puede verificar el negocio directamente.');
                        if (payload.eventType === 'DELETE' && recordAfectado && 'id' in recordAfectado && citas.some(c => c.id === recordAfectado.id)) {
                            console.log('[AgendaLista Realtime] Cita eliminada (sin tipo) estaba en la lista, recargando.');
                            await fetchCitasDelDia(false);
                        }
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[AgendaLista Realtime] Suscrito exitosamente a ${channelName}`);
                } else if (err) {
                    console.error(`[AgendaLista Realtime] Error en canal ${channelName}:`, err);
                    setError(`Error conexión Realtime: ${err.message}`);
                } else {
                    console.log(`[AgendaLista Realtime] Estado canal ${channelName}: ${status}`);
                }
            });

        return () => {
            if (supabaseClient && channel) {
                console.log(`[AgendaLista Realtime] Desuscribiendo de ${channelName}`);
                supabaseClient.removeChannel(channel).catch(console.error);
            }
        };
    }, [negocioId, fetchCitasDelDia, citas]); // Añadir 'citas' como dependencia para la lógica de DELETE

    // ... (El resto del componente: clases de UI, JSX del loader, lista y modal se mantienen igual que en la última versión)
    const widgetContainerClasses = "bg-zinc-800 rounded-lg shadow-md p-3 sm:p-4 h-full flex flex-col";
    const headerClasses = "flex items-center justify-between mb-3 pb-2 border-b border-zinc-700";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    const listContainerClasses = "flex-grow overflow-y-auto space-y-2 pr-1 -mr-2";
    const listItemClasses = "bg-zinc-900/70 p-2.5 rounded-md border border-zinc-700 hover:border-blue-500 cursor-pointer transition-all duration-150 ease-in-out";
    const modalOverlayClasses = "fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col";
    const modalHeaderClasses = "flex items-center justify-between p-3 sm:p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-md sm:text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[70vh] text-xs sm:text-sm";
    // const modalDetailItem = "flex flex-col mb-1.5";
    // const modalDetailLabel = "text-xs text-zinc-400 mb-0.5";
    // const modalDetailValue = "text-zinc-200";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const buttonSecondaryClasses = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";

    if (loading) {
        return (
            <div className={`${widgetContainerClasses} items-center justify-center`}>
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                <p className="text-xs text-zinc-400 mt-1.5">Cargando citas...</p>
            </div>
        );
    }

    return (
        <div className={widgetContainerClasses}>
            <div className={headerClasses}>
                <h3 className={titleClasses}>
                    <CalendarCheck size={16} className="text-blue-400" /> Citas de Hoy
                </h3>
            </div>

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/30 flex items-center gap-1.5 mb-2">
                    <AlertTriangleIcon size={14} /> {error}
                </div>
            )}

            {!loading && !error && citas.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-3">
                    <CalendarCheck size={24} className="text-zinc-500 mb-2" />
                    <p className="text-xs text-zinc-400">No hay citas programadas para hoy.</p>
                </div>
            )}

            {!loading && !error && citas.length > 0 && (
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
                                        {format(new Date(cita.fecha), 'HH:mm')} - {cita.asunto}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 truncate">
                                        {cita.leadNombre || 'Lead no asignado'}
                                    </p>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[cita.status] || statusColors[StatusAgenda.PENDIENTE]}`}>
                                    {cita.status.charAt(0).toUpperCase() + cita.status.slice(1).toLowerCase()}
                                </span>
                            </div>
                            {cita.tipoDeCitaNombre && (
                                <p className="mt-1 text-[11px] text-zinc-500 truncate">
                                    Servicio: {cita.tipoDeCitaNombre}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {selectedCita && (
                <div className={modalOverlayClasses} onClick={() => setSelectedCita(null)}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h4 className={modalTitleClasses}>Detalles de la Cita</h4>
                            <button
                                onClick={() => setSelectedCita(null)}
                                className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500"
                                aria-label="Cerrar modal"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className={modalBodyClasses}>
                            {/* ... (Contenido del modal sin cambios) ... */}
                        </div>
                        <div className={modalFooterClasses.replace('justify-end', 'justify-center')}>
                            <button type="button" onClick={() => setSelectedCita(null)} className={buttonSecondaryClasses.replace('px-6 py-2.5', 'px-4 py-2')}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
