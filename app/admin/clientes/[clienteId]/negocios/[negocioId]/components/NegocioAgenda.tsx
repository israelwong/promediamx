'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, AlertTriangleIcon, Settings, CalendarDays, Edit, PlusIcon } from 'lucide-react';

import { obtenerResumenConfiguracionAgenda } from '@/app/admin/_lib/negocioAgenda.actions';
import { AgendaConfigSummary, AgendaActionResult } from '@/app/admin/_lib/negocioAgenda.type';

interface Props {
    clienteId: string;
    negocioId: string;
}

const InfoItem = ({ label, status, statusColor = 'text-zinc-300' }: { label: string; status: string | React.ReactNode; statusColor?: string }) => (
    <li className="flex justify-between items-center py-2 border-b border-zinc-700/50 last:border-b-0">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
    </li>
);

const StatusIndicator = ({ configured }: { configured: boolean }) => (
    configured
        ? <CheckCircle2 size={14} className="text-green-400 inline-block" />
        : <XCircle size={14} className="text-amber-400 inline-block" />
);


export default function NegocioAgendaWidget({ clienteId, negocioId }: Props) {
    const [summary, setSummary] = useState<AgendaConfigSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            setError(null);
            const result: AgendaActionResult<AgendaConfigSummary> = await obtenerResumenConfiguracionAgenda(negocioId);
            if (result.success && result.data) {
                setSummary(result.data);
            } else {
                setError(result.error || "Error al cargar resumen de agenda.");
            }
            setLoading(false);
        }
        fetchSummary();
    }, [negocioId]);

    const linkToConfig = `/admin/clientes/${clienteId}/negocios/${negocioId}/agenda`;

    // Clases de UI (Guía de Estilos)
    const widgetContainerClasses = "bg-zinc-800 rounded-lg shadow-md p-4 h-full flex flex-col"; // Asegurar que ocupe altura si es en grid
    const headerClasses = "flex items-center justify-between mb-3 pb-2 border-b border-zinc-700";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    const editLinkClasses = "text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1";
    const listClasses = "space-y-1 text-xs"; // Espaciado y tamaño de fuente para la lista

    if (loading) {
        return (
            <div className={`${widgetContainerClasses} items-center justify-center`}>
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <p className="text-xs text-zinc-400 mt-2">Cargando resumen...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={widgetContainerClasses}>
                <div className={headerClasses}>
                    <h3 className={titleClasses}><Settings size={16} /> Agenda</h3>
                </div>
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/30 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} /> {error}
                </div>
                <div className="mt-auto pt-3 text-right"> {/* mt-auto empuja al final */}
                    <Link href={linkToConfig} className={editLinkClasses}>
                        <Edit size={12} /> Ir a Configuración
                    </Link>
                </div>
            </div>
        );
    }

    if (!summary || !summary.configuracionIniciada) {
        return (
            <div className={widgetContainerClasses}>
                <div className={headerClasses}>
                    <h3 className={titleClasses}><Settings size={16} /> Agenda</h3>
                </div>
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <CalendarDays size={28} className="text-zinc-500 mb-2" />
                    <p className="text-xs text-zinc-400 mb-3">
                        La agenda de este negocio aún no ha sido configurada.
                    </p>
                    <Link href={linkToConfig} className={`text-xs px-3 py-1.5`}>
                        <PlusIcon size={14} /> Configurar Agenda Ahora
                    </Link>
                </div>
            </div>
        );
    }

    const pref = summary.preferencias;

    return (
        <div className={widgetContainerClasses}>
            <div className={headerClasses}>
                <h3 className={titleClasses}><Settings size={16} /> Configuración de Agenda</h3>
                <Link href={linkToConfig} className={editLinkClasses}>
                    <Edit size={12} /> Editar
                </Link>
            </div>

            <ul className={listClasses}>
                <InfoItem
                    label="Tipos de Cita"
                    status={summary.totalTiposCita > 0
                        ? <><CheckCircle2 size={14} className="text-green-400 inline-block mr-1" /> {summary.totalTiposCita} definidos</>
                        : <><XCircle size={14} className="text-amber-400 inline-block mr-1" /> Pendiente</>}
                />
                <InfoItem
                    label="Definición de Horario Semanal"
                    status={<><StatusIndicator configured={summary.horariosDefinidos} /> {summary.horariosDefinidos ? 'Configurado' : 'Pendiente'}</>}
                />
                <InfoItem
                    label="Definición de Excepciones de Horario"
                    status={summary.totalExcepciones > 0
                        ? <><CheckCircle2 size={14} className="text-green-400 inline-block mr-1" /> {summary.totalExcepciones} definidos</>
                        : <><XCircle size={14} className="text-amber-400 inline-block mr-1" /> Ninguna</>}
                />
                <InfoItem
                    label="Acepta Citas Presenciales"
                    status={<><StatusIndicator configured={pref?.aceptaPresenciales ?? false} /> {pref?.aceptaPresenciales ? 'Sí' : 'No'}</>}
                />
                <InfoItem
                    label="Acepta Citas Virtuales"
                    status={<><StatusIndicator configured={pref?.aceptaVirtuales ?? false} /> {pref?.aceptaVirtuales ? 'Sí' : 'No'}</>}
                />
                <InfoItem
                    label="Requiere Teléfono"
                    status={<><StatusIndicator configured={pref?.requiereTelefono ?? false} /> {pref?.requiereTelefono ? 'Sí' : 'No'}</>}
                />
                <InfoItem
                    label="Requiere Email"
                    status={<><StatusIndicator configured={pref?.requiereEmail ?? false} /> {pref?.requiereEmail ? 'Sí' : 'No'}</>}
                />
                <InfoItem
                    label="Métodos de Pago"
                    status={<><StatusIndicator configured={pref?.metodosPagoDefinidos ?? false} /> {pref?.metodosPagoDefinidos ? 'Definidos' : 'Pendiente'}</>}
                />
            </ul>
        </div>
    );
}
