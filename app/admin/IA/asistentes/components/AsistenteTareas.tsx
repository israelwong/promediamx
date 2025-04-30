'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ajustar rutas si es necesario
import {
    obtenerSuscripcionesAsistenteTareas,
    // desasociarHabilidadTarea // Ya no se usa aquí
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // Corregida ruta y nombre de archivo
// import { obtenerTareaPorId } from '@/app/admin/_lib/tareas.actions'; // Ya no es necesario aquí
// Asegúrate que esta importación incluya la definición COMPLETA de AsistenteTareaSuscripcion con la tarea anidada
import { AsistenteTareaSuscripcion } from '@/app/admin/_lib/types';
import { Loader2, ListX, ListChecks, ExternalLink, Settings, DollarSignIcon } from 'lucide-react'; // Iconos

interface Props {
    asistenteId: string;
}

export default function AsistenteTareas({ asistenteId }: Props) {
    const router = useRouter();
    const [suscripciones, setSuscripciones] = useState<AsistenteTareaSuscripcion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const listItemClasses = "border border-zinc-700 rounded-lg p-3 bg-zinc-900/60 flex items-start justify-between gap-3";
    const buttonSecondaryClasses = "border border-zinc-500 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs";
    const buttonManageSubscription = "text-zinc-400 hover:text-blue-400 disabled:opacity-50 p-1 flex-shrink-0";

    // --- Función para cargar tareas suscritas ---
    const fetchSuscripciones = useCallback(async () => {
        if (!asistenteId) return;
        setLoading(true);
        setError(null);

        try {
            const data: AsistenteTareaSuscripcion[] = await obtenerSuscripcionesAsistenteTareas(asistenteId);
            setSuscripciones(data);
        } catch (err) {
            console.error('Error fetching suscripciones:', err);
            setError('Error al cargar las tareas suscritas.');
            setSuscripciones([]);
        } finally {
            setLoading(false);
        }
    }, [asistenteId]);

    // --- Efecto para cargar datos iniciales ---
    useEffect(() => {
        fetchSuscripciones();
    }, [fetchSuscripciones]);

    // --- Calcular Precio Total (Usando monto de la suscripción) ---
    const totalPrecio = useMemo(() => {
        return suscripciones.reduce((sum, sub) => sum + (sub.montoSuscripcion ?? sub.tarea?.precio ?? 0), 0);
    }, [suscripciones]);

    // --- Manejador para el botón "Gestionar Suscripción" ---
    const handleGestionarSuscripcion = (tareaId: string) => {
        router.push(`/admin/IA/marketplace/suscripcion/${tareaId}?asistenteId=${asistenteId}`);
    };

    // --- Navegación al Marketplace ---
    const handleAbrirMarketplace = () => {
        router.push(`/admin/IA/marketplace/${asistenteId}`);
    };

    // --- Función para renderizar el contenido principal ---
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-10 text-zinc-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando suscripciones...</span>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-10">
                    <ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p>
                </div>
            );
        }
        if (suscripciones.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-10">
                    <ListChecks className="h-8 w-8 text-zinc-500 mb-2" />
                    <p className='text-zinc-400 italic text-sm'>Este asistente no tiene tareas suscritas.</p>
                </div>
            );
        }

        // Si hay datos, renderizar la lista
        return (
            <ul className='space-y-2'>
                {suscripciones.map((suscripcion) => {
                    const tareaInfo = suscripcion.tarea;
                    const nombreTarea = tareaInfo?.nombre ?? `Tarea ID: ${suscripcion.tareaId}`;
                    const descripcionTarea = tareaInfo?.descripcion;
                    const monto = suscripcion.montoSuscripcion ?? tareaInfo?.precio;

                    // Renderizar solo si tenemos un nombre o ID para mostrar
                    if (!tareaInfo && !suscripcion.tareaId) return null;

                    return (
                        <li key={suscripcion.id} className={listItemClasses}>
                            <div className="flex-grow mr-2 overflow-hidden space-y-1">
                                <p className="text-sm font-medium text-zinc-200 truncate" title={nombreTarea}>
                                    {nombreTarea}
                                </p>
                                {descripcionTarea && (
                                    <p className="text-xs text-zinc-400 line-clamp-2" title={descripcionTarea}>
                                        {descripcionTarea}
                                    </p>
                                )}
                                <p className="text-xs text-zinc-300 mt-1 flex items-center gap-1">
                                    <DollarSignIcon size={13} className='text-green-500 flex-shrink-0' />
                                    {typeof monto === 'number'
                                        ? <span className='font-medium'>{monto.toFixed(2)}</span>
                                        : <span className='italic text-zinc-500'>N/A</span>
                                    }
                                </p>
                            </div>
                            <button onClick={() => handleGestionarSuscripcion(suscripcion.tareaId)} className={buttonManageSubscription} title="Gestionar Suscripción">
                                <Settings size={16} />
                            </button>
                        </li>
                    );
                })}
            </ul>
        );
    };


    // --- Renderizado Principal ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-zinc-600 pb-3'>
                <div className='flex items-baseline gap-2'>
                    <h3 className="text-base font-semibold text-white whitespace-nowrap">
                        Tareas Suscritas
                    </h3>
                    {!loading && !error && suscripciones.length > 0 && (
                        <span className='text-xs text-zinc-400'>(Total: <span className='font-medium text-green-400'>${totalPrecio.toFixed(2)}</span>)</span>
                    )}
                </div>
                <button onClick={handleAbrirMarketplace} className={buttonSecondaryClasses} title="Abrir Marketplace">
                    <ExternalLink size={14} /> <span>Abrir Marketplace</span>
                </button>
            </div>

            {/* Contenido Principal (llamando a la función de renderizado) */}
            <div className="flex-grow overflow-y-auto pr-1">
                {renderContent()}
            </div>
        </div>
    );
}
