'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // useParams ya no es necesario
import Image from 'next/image';
// Ajusta rutas
import {
    obtenerDetallesSuscripcionTarea,
    cancelarSuscripcionTarea,
    crearOreactivarSuscripcionTarea,
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // O donde estén las acciones
import { Loader2, AlertCircle, ArrowLeft, ShoppingCart, CheckCircle, XCircle, List } from 'lucide-react'; // Añadido List
import { TareaSuscripcionDetalles } from '@/app/admin/_lib/types'; // Ajusta la ruta según tu estructura

// --- Props que recibe de page.tsx ---
interface Props {
    asistenteId: string;
    negocioId: string;
    clienteId: string;
    tareaId: string;
}

// Helper para formatear moneda
const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '$ 0.00';
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

// Helper para formatear fechas
const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return 'Fecha inválida';
    }
};

// --- El componente ahora recibe y usa las props ---
export default function TareaSuscripcionDetallePage({ asistenteId, negocioId, clienteId, tareaId }: Props) {
    const router = useRouter();

    const [detalles, setDetalles] = useState<TareaSuscripcionDetalles | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Carga de Datos (Usa props directamente) ---
    const cargarDetalles = useCallback(async () => {
        // Validar props al inicio
        if (!asistenteId || !tareaId || !clienteId || !negocioId) {
            setError("Faltan IDs necesarios para cargar la página.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            // Llamar a la acción con los IDs de las props
            const data = await obtenerDetallesSuscripcionTarea(asistenteId, tareaId);
            if (!data || !data.tarea) {
                throw new Error("No se encontró la tarea o hubo un error al cargar los detalles.");
            }
            setDetalles(data);
        } catch (err) {
            console.error("Error fetching subscription details:", err);
            setError(err instanceof Error ? err.message : "Error al cargar detalles.");
            setDetalles(null);
        } finally {
            setLoading(false);
        }
        // Dependencias ahora son las props
    }, [asistenteId, tareaId, clienteId, negocioId]);

    useEffect(() => {
        cargarDetalles();
    }, [cargarDetalles]);

    // --- Handlers para Acciones (Usan props directamente) ---
    const handleCancelarSuscripcion = async () => {
        if (!detalles?.suscripcion?.id || isProcessing) return;
        if (confirm(`¿Estás seguro de cancelar la suscripción a la tarea "${detalles.tarea.nombre}"?`)) {
            setIsProcessing(true); setError(null); setSuccessMessage(null);
            try {
                // Pasar IDs desde props a la acción
                const result = await cancelarSuscripcionTarea(
                    detalles.suscripcion.id,
                    clienteId,
                    negocioId,
                    // asistenteId,
                    // tareaId
                );
                if (!result.success) throw new Error(result.error || "Error desconocido al cancelar.");
                setSuccessMessage("Suscripción cancelada con éxito.");
                await cargarDetalles(); // Recargar
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al cancelar.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleSuscribirReactivar = async () => {
        if (isProcessing) return;
        setIsProcessing(true); setError(null); setSuccessMessage(null);
        try {
            // Pasar IDs desde props a la acción
            const result = await crearOreactivarSuscripcionTarea(
                asistenteId,
                tareaId,
                // clienteId,
                // negocioId
            );
            if (!result.success) throw new Error(result.error || "Error desconocido al suscribir/reactivar.");
            setSuccessMessage("Suscripción activada/reactivada con éxito.");
            await cargarDetalles(); // Recargar
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al suscribir/reactivar.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Navegación (Usa props directamente) ---
    const irAlAsistente = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);

    };
    const irAlMarketplace = () => {
        router.push(`/admin/marketplace?asistenteId=${asistenteId}`);
    };

    // --- Clases de Tailwind (sin cambios) ---
    const containerClasses = "max-w-3xl mx-auto p-4 md:p-6";
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden";
    const headerClasses = "p-4 sm:p-6 bg-gradient-to-r from-zinc-700/50 to-zinc-800/30 border-b border-zinc-600 flex items-center gap-4";
    const contentClasses = "p-4 sm:p-6 space-y-4";
    const titleClasses = "text-xl sm:text-2xl font-semibold text-white";
    const descriptionClasses = "text-sm text-zinc-300";
    const priceClasses = "text-lg font-semibold text-emerald-400";
    const statusLabelClasses = "text-xs font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1";
    const statusActiveClasses = "bg-green-500/20 text-green-300";
    const statusInactiveClasses = "bg-zinc-600/50 text-zinc-400";
    const detailLabelClasses = "text-xs text-zinc-400 font-medium";
    const detailValueClasses = "text-sm text-zinc-200";
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const dangerButtonClasses = `${buttonBaseClasses} text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;


    // --- Renderizado (Lógica sin cambios, solo usa props) ---
    if (loading) {
        // ... (igual que antes) ...
        return (<div className="flex justify-center items-center h-40 text-zinc-400"><Loader2 className="animate-spin mr-2" /> Cargando detalles...</div>);
    }

    if (error || !detalles?.tarea) {
        // ... (igual que antes) ...
        return (<div className={`${containerClasses} text-center`}> <div className="bg-red-900/30 border border-red-500 rounded-md p-4 text-red-400 flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error || "No se pudo cargar la información."} </div> <button onClick={irAlAsistente} className={`${secondaryButtonClasses} mt-4 mx-auto`}> <ArrowLeft size={16} className="mr-1" /> Volver </button> </div>);
    }

    const { tarea, suscripcion } = detalles;
    const isSubscribed = suscripcion?.status === 'activo';
    const isBaseTask = tarea.precio === null || tarea.precio === 0;

    return (
        <div className={containerClasses}>
            {/* Botones de Navegación */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={irAlAsistente} className={`${secondaryButtonClasses} !px-3 !py-1 !text-xs`}>
                    <ArrowLeft size={14} className="mr-1" /> Volver al Asistente
                </button>
                <button onClick={irAlMarketplace} className={`${secondaryButtonClasses} !px-3 !py-1 !text-xs`}>
                    <ShoppingCart size={14} className="mr-1" /> Ir al Marketplace
                </button>
            </div>

            <div className={cardClasses}>
                {/* Cabecera */}
                <div className={headerClasses}>
                    {/* ... (Renderizado del icono) ... */}
                    {tarea.iconoUrl ? (<Image src={tarea.iconoUrl} alt={`Icono de ${tarea.nombre}`} width={48} height={48} className="w-12 h-12 rounded-md border border-zinc-600 object-cover flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />) : (<div className="w-12 h-12 rounded-md border border-zinc-600 bg-zinc-700 flex items-center justify-center flex-shrink-0"><List size={24} className="text-zinc-500" /></div>)}
                    <div className="flex-grow">
                        <h1 className={titleClasses}>{tarea.nombre}</h1>
                        <p className={`${priceClasses} mt-1 ${isBaseTask ? 'text-green-400' : 'text-emerald-400'}`}>
                            {isBaseTask ? 'Incluida (Base)' : formatCurrency(tarea.precio ?? null)}
                        </p>
                    </div>
                    {suscripcion && (<span className={`${statusLabelClasses} ${isSubscribed ? statusActiveClasses : statusInactiveClasses}`}> {isSubscribed ? <CheckCircle size={12} /> : <XCircle size={12} />} {isSubscribed ? 'Activa' : 'Inactiva'} </span>)}
                </div>

                {/* Contenido */}
                <div className={contentClasses}>
                    {/* ... (Renderizado de descripción y detalles de suscripción) ... */}
                    {tarea.descripcion && (<div className="mb-4"> <h2 className="text-sm font-semibold text-zinc-200 mb-1">Descripción</h2> <p className={descriptionClasses}>{tarea.descripcion}</p> </div>)}
                    {suscripcion && (<div className="border-t border-zinc-700 pt-4 space-y-2"> <h2 className="text-sm font-semibold text-zinc-200 mb-1">Detalles Suscripción</h2> <div className="grid grid-cols-2 gap-x-4 gap-y-1"> <div> <span className={detailLabelClasses}>Monto Actual:</span>
                        <p className={detailValueClasses}>{formatCurrency(suscripcion.montoSuscripcion ?? null)}</p>
                    </div>
                        <div>
                            <span className={detailLabelClasses}>Fecha Suscripción:</span> <p className={detailValueClasses}>{formatDate(suscripcion.fechaSuscripcion)}</p> </div> {!isSubscribed && suscripcion.fechaDesuscripcion && (<div> <span className={detailLabelClasses}>Fecha Cancelación:</span> <p className={detailValueClasses}>{formatDate(suscripcion.fechaDesuscripcion)}</p> </div>)} </div> </div>)}

                    {/* Mensajes */}
                    {error && <p className="text-sm text-red-400 text-center border border-red-600 bg-red-900/30 p-2 rounded mt-4">{error}</p>}
                    {successMessage && <p className="text-sm text-green-400 text-center border border-green-600 bg-green-900/30 p-2 rounded mt-4">{successMessage}</p>}

                    {/* Botones de Acción */}
                    <div className="flex justify-end pt-4 mt-4 border-t border-zinc-700">
                        {isSubscribed ? (
                            <button onClick={handleCancelarSuscripcion} className={dangerButtonClasses} disabled={isProcessing}>
                                {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <XCircle size={16} className="mr-1" />} Cancelar Suscripción
                            </button>
                        ) : (
                            <button onClick={handleSuscribirReactivar} className={primaryButtonClasses} disabled={isProcessing}>
                                {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-1" />} {suscripcion ? 'Reactivar' : 'Suscribirse'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

