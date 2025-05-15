'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CalendarCheck, AlertTriangleIcon, Video, CalendarClock, Users, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { obtenerCitasDelDiaPorNegocio } from '@/app/admin/_lib/crmAgenda.actions';
import { CitaDelDia, StatusAgenda, ObtenerCitasDelDiaResult } from '@/app/admin/_lib/crmAgenda.type';

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


    const fetchCitasDelDia = useCallback(async () => {
        setLoading(true);
        setError(null);
        const hoy = new Date(); // Obtener citas para el día de hoy
        const result: ObtenerCitasDelDiaResult = await obtenerCitasDelDiaPorNegocio(negocioId, hoy);
        if (result.success && result.data) {
            setCitas(result.data);
        } else {
            setError(result.error || "Error al cargar las citas del día.");
            setCitas([]);
        }
        setLoading(false);
    }, [negocioId]);

    useEffect(() => {
        fetchCitasDelDia();
    }, [fetchCitasDelDia]);

    // Clases de UI
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const widgetContainerClasses = "bg-zinc-800 rounded-lg shadow-md p-3 sm:p-4 h-full flex flex-col"; // Compacto
    const headerClasses = "flex items-center justify-between mb-3 pb-2 border-b border-zinc-700";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    const listContainerClasses = "flex-grow overflow-y-auto space-y-2 pr-1 -mr-2"; // Espacio entre items, scroll
    const listItemClasses = "bg-zinc-900/70 p-2.5 rounded-md border border-zinc-700 hover:border-blue-500 cursor-pointer transition-all duration-150 ease-in-out";
    const modalOverlayClasses = "fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col";
    const modalHeaderClasses = "flex items-center justify-between p-3 sm:p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-md sm:text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[70vh] text-xs sm:text-sm";
    const modalDetailItem = "flex flex-col mb-1.5";
    const modalDetailLabel = "text-xs text-zinc-400 mb-0.5";
    const modalDetailValue = "text-zinc-200";
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
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/30 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} /> {error}
                </div>
            )}

            {!error && citas.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-3">
                    <CalendarCheck size={24} className="text-zinc-500 mb-2" />
                    <p className="text-xs text-zinc-400">No hay citas programadas para hoy.</p>
                </div>
            )}

            {!error && citas.length > 0 && (
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

            {/* Modal para Detalles de la Cita */}
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
                            <div className={modalDetailItem}>
                                <span className={modalDetailLabel}>Asunto:</span>
                                <span className={modalDetailValue}>{selectedCita.asunto}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                <div className={modalDetailItem}>
                                    <span className={modalDetailLabel}>Fecha y Hora:</span>
                                    <span className={modalDetailValue}>{format(new Date(selectedCita.fecha), 'PPPp', { locale: es })}</span>
                                </div>
                                <div className={modalDetailItem}>
                                    <span className={modalDetailLabel}>Estado:</span>
                                    <span className={`${modalDetailValue} text-xs px-2 py-0.5 rounded-full inline-block ${statusColors[selectedCita.status] || statusColors[StatusAgenda.PENDIENTE]}`}>
                                        {selectedCita.status.charAt(0).toUpperCase() + selectedCita.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                            </div>
                            {selectedCita.tipoDeCitaNombre && (
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                    <div className={modalDetailItem}>
                                        <span className={modalDetailLabel}>Tipo de Cita/Servicio:</span>
                                        <span className={modalDetailValue}>{selectedCita.tipoDeCitaNombre}</span>
                                    </div>
                                    {selectedCita.tipoDeCitaLimiteConcurrencia !== null && selectedCita.tipoDeCitaLimiteConcurrencia !== undefined && (
                                        <div className={modalDetailItem}>
                                            <span className={modalDetailLabel}>Límite Concurrencia:</span>
                                            <span className={modalDetailValue}><Users size={12} className="inline mr-1 -mt-px" />{selectedCita.tipoDeCitaLimiteConcurrencia}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={modalDetailItem}>
                                <span className={modalDetailLabel}>Lead:</span>
                                <span className={modalDetailValue}>{selectedCita.leadNombre || 'N/A'}</span>
                            </div>
                            <div className={modalDetailItem}>
                                <span className={modalDetailLabel}>Asignado a:</span>
                                <span className={modalDetailValue}>{selectedCita.asignadoANombre || 'N/A'} ({selectedCita.asignadoATipo || 'Sistema'})</span>
                            </div>

                            {selectedCita.descripcion && (
                                <div className={modalDetailItem}>
                                    <span className={modalDetailLabel}>Descripción:</span>
                                    <p className={`${modalDetailValue} whitespace-pre-wrap bg-zinc-900/50 p-2 rounded-md border border-zinc-700`}>{selectedCita.descripcion}</p>
                                </div>
                            )}
                            {selectedCita.meetingUrl && (
                                <div className={modalDetailItem}>
                                    <span className={modalDetailLabel}>Enlace Reunión:</span>
                                    <a href={selectedCita.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                                        <Video size={12} className="inline mr-1 -mt-px" /> {selectedCita.meetingUrl}
                                    </a>
                                </div>
                            )}
                            {selectedCita.fechaRecordatorio && (
                                <div className={modalDetailItem}>
                                    <span className={modalDetailLabel}>Recordatorio:</span>
                                    <span className={modalDetailValue}><CalendarClock size={12} className="inline mr-1 -mt-px" /> {format(new Date(selectedCita.fechaRecordatorio), 'Pp', { locale: es })}</span>
                                </div>
                            )}
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
