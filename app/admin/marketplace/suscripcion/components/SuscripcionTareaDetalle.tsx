'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Ajustar rutas según sea necesario
import { obtenerTareaPorId } from '@/app/admin/_lib/tareas.actions';
import {
    validarSuscripcion,
    crearSuscripcionAsistenteTarea,
    cancelarSuscripcionAsistenteTarea
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // Asegúrate que el path sea correcto
import { obtenerCategorias } from '@/app/admin/_lib/categoriaTarea.actions'; // Para mostrar nombre de categoría
import { Tarea, CategoriaTarea, AsistenteTareaSuscripcion } from '@/app/admin/_lib/types';
import { Loader2, CheckCircle, BotIcon, BadgeCheck, BadgeX, Store } from 'lucide-react'; // Iconos (añadidos)

interface Props {
    tareaId: string;
}

export default function SuscripcionTareaDetalle({ tareaId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const asistenteId = searchParams?.get('asistenteId'); // Leer asistenteId de la URL

    const [tarea, setTarea] = useState<Tarea | null>(null);
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [suscripcionId, setSuscripcionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-6 bg-zinc-800 rounded-lg shadow-md max-w-2xl mx-auto";
    const labelBaseClasses = "text-sm font-medium text-zinc-400 block mb-0.5";
    const valueBaseClasses = "text-base text-zinc-100";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    // Estilo para botones secundarios de navegación
    const buttonSecondaryNavClasses = "text-zinc-300 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500 text-sm px-3 py-1.5";


    // --- Función para validar suscripción ---
    const checkSubscription = useCallback(async () => {
        // ... (sin cambios) ...
        if (!asistenteId || !tareaId) { setSuscripcionId(null); return; }
        try {
            const id = await validarSuscripcion(asistenteId, tareaId);
            setSuscripcionId(id);
        } catch (err) {
            console.error("Error validando suscripción:", err);
            setActionError("Error al verificar estado de suscripción.");
            setSuscripcionId(null);
        }
    }, [asistenteId, tareaId]);

    // --- Efecto para cargar datos iniciales ---
    useEffect(() => {
        // ... (sin cambios) ...
        setLoading(true); setError(null); setActionError(null); setActionSuccess(null); setSuscripcionId(null);
        const fetchInitialData = async () => {
            try {
                const [tareaData, categoriasData] = await Promise.all([obtenerTareaPorId(tareaId), obtenerCategorias()]);
                if (!tareaData) { throw new Error(`No se encontró la tarea con ID: ${tareaId}`); }
                setTarea(tareaData); setCategorias(categoriasData);
                if (asistenteId) { await checkSubscription(); }
            } catch (err) {
                console.error("Error cargando datos:", err);
                const message = err instanceof Error ? err.message : "Error desconocido";
                setError(`Error al cargar detalles: ${message}`);
                setTarea(null); setCategorias([]);
            } finally { setLoading(false); }
        };
        fetchInitialData();
    }, [tareaId, asistenteId, checkSubscription]);

    // --- Manejadores de Acción ---
    const handleSuscribir = async () => {
        // ... (sin cambios) ...
        if (!asistenteId || !tareaId) return;
        setIsActionLoading(true); setActionError(null); setActionSuccess(null);
        try {
            const nuevaSuscripcionData = { asistenteVirtualId: asistenteId, tareaId: tareaId, montoSuscripcion: tarea?.precio ?? null, status: 'activo' };
            await crearSuscripcionAsistenteTarea(nuevaSuscripcionData as AsistenteTareaSuscripcion);
            setActionSuccess("Suscripción realizada con éxito.");
            await checkSubscription();
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error("Error al suscribir:", err);
            const message = err instanceof Error ? err.message : "Error desconocido";
            setActionError(`Error al suscribir: ${message}`);
        } finally { setIsActionLoading(false); }
    };

    const handleCancelarSuscripcion = async () => {
        // ... (sin cambios) ...
        if (!suscripcionId || !asistenteId) return;
        if (confirm("¿Estás seguro de cancelar la suscripción a esta tarea para este asistente?")) {
            setIsActionLoading(true); setActionError(null); setActionSuccess(null);
            try {
                await cancelarSuscripcionAsistenteTarea(suscripcionId);
                setActionSuccess("Suscripción cancelada.");
                await checkSubscription();
                setTimeout(() => setActionSuccess(null), 3000);
            } catch (err) {
                console.error("Error al cancelar suscripción:", err);
                const message = err instanceof Error ? err.message : "Error desconocido";
                setActionError(`Error al cancelar: ${message}`);
            } finally { setIsActionLoading(false); }
        }
    };

    // --- Renderizado ---
    if (loading) { /* ... loading ... */ }
    if (error) { /* ... error ... */ }
    if (!tarea) { /* ... not found ... */ }

    const nombreCategoria = categorias.find(cat => cat.id === tarea?.categoriaTareaId)?.nombre || 'General';

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-zinc-700 pb-2">
                Detalle de Tarea: {tarea?.nombre} {/* Usar optional chaining */}
            </h2>

            {/* Detalles de la Tarea */}
            <div className="space-y-3 mb-6">
                {/* ... (detalles sin cambios) ... */}
                <div><label className={labelBaseClasses}>Nombre</label><p className={valueBaseClasses}>{tarea?.nombre}</p></div>
                <div><label className={labelBaseClasses}>Descripción</label><p className={`${valueBaseClasses} text-sm text-zinc-300`}>{tarea?.descripcion || <span className='italic text-zinc-500'>N/A</span>}</p></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelBaseClasses}>Categoría</label><p className={valueBaseClasses}>{nombreCategoria}</p></div>
                    <div><label className={labelBaseClasses}>Precio</label><p className={`${valueBaseClasses} font-semibold ${typeof tarea?.precio === 'number' ? 'text-green-400' : 'text-zinc-500 italic'}`}>{typeof tarea?.precio === 'number' ? `$${tarea.precio.toFixed(2)}` : 'Gratis'}</p></div>
                </div>
            </div>

            {/* Sección de Acción (Solo si hay asistenteId) */}
            {asistenteId && (
                <div className="pt-4 border-t border-zinc-700 space-y-3"> {/* Añadido space-y-3 */}
                    {/* Mensajes de Acción */}
                    {actionError && <p className="text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50">{actionError}</p>}
                    {actionSuccess && <p className="text-center text-xs text-green-400 bg-green-900/30 p-1.5 rounded border border-green-600/50 flex items-center justify-center gap-1"><CheckCircle size={14} /> {actionSuccess}</p>}

                    {/* Botón Condicional Suscribir/Cancelar */}
                    {suscripcionId ? (
                        // --- Ya suscrito ---
                        <>
                            <button
                                onClick={handleCancelarSuscripcion}
                                className={`${buttonBaseClasses} bg-red-600 hover:bg-red-700 focus:ring-red-500`}
                                disabled={isActionLoading}
                            >
                                {isActionLoading ? <Loader2 className='animate-spin' size={18} /> : <BadgeX size={18} />}
                                Cancelar Suscripción
                            </button>
                        </>
                    ) : (
                        // --- No suscrito ---
                        <button
                            onClick={handleSuscribir}
                            className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                            disabled={isActionLoading}
                        >
                            {isActionLoading ? <Loader2 className='animate-spin' size={18} /> : <BadgeCheck size={18} />}
                            Suscribirse a esta Tarea
                        </button>
                    )}

                    {/* Botones Adicionales */}
                    <div className='flex flex-col sm:flex-row gap-2 pt-2'>

                        <button
                            onClick={() => router.back()} // Ir al asistente
                            className={`${buttonBaseClasses} ${buttonSecondaryNavClasses}`}
                            disabled={isActionLoading}
                        >
                            <BotIcon size={16} /> Regresar
                        </button>

                        <button
                            onClick={() => router.push(`/admin/marketplace/${asistenteId}`)} // Volver (probablemente al marketplace)
                            className={`${buttonBaseClasses} ${buttonSecondaryNavClasses}`}
                            disabled={isActionLoading}
                        >
                            <Store size={16} /> Mostrar al Marketplace
                        </button>


                    </div>
                </div>
            )}
            {/* Botón para volver general (si no hay asistenteId o como fallback) */}
            {!asistenteId && (
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 mt-3 text-sm`}>
                    Volver
                </button>
            )}

        </div>
    );
}
