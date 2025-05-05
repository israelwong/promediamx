'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
// --- Lightbox Imports ---
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
// Ajusta rutas
import {
    obtenerDetallesSuscripcionTarea,
    cancelarSuscripcionTarea,
    crearOreactivarSuscripcionTarea,
    // Este tipo debe incluir CategoriaTarea y etiquetas en tarea
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions';
import { Loader2, AlertCircle, ArrowLeft, ShoppingCart, CheckCircle, XCircle, BadgeDollarSign, ImageIcon as ImageIconPlaceholder, GalleryHorizontal, ListTree, Tag } from 'lucide-react'; // Añadidos ListTree y Tag
import { TareaSuscripcionDetalles } from '@/app/admin/_lib/types'; // Ajusta la ruta según tu estructura de carpetas

// --- Props Simplificadas ---
interface Props {
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
        return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Fecha inválida'; }
};

// --- Constante para color por defecto ---
const DEFAULT_COLOR_HEX = '#6b7280'; // zinc-500

// --- Componente Interno que usa useSearchParams ---
function TareaSuscripcionContent({ tareaId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const asistenteId = searchParams?.get('asistenteId');

    const [detalles, setDetalles] = useState<TareaSuscripcionDetalles | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // --- Carga de Datos ---
    const cargarDetalles = useCallback(async () => {
        if (!tareaId) { setError("Falta ID de tarea."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const data = await obtenerDetallesSuscripcionTarea(asistenteId || '', tareaId);
            console.log("Detalles de tarea:", data);
            if (!data || !data.tarea) throw new Error("No se encontró la tarea.");
            setDetalles(data);
        } catch (err) {
            console.error("Error fetching details:", err);
            setError(err instanceof Error ? err.message : "Error al cargar.");
            setDetalles(null);
        } finally { setLoading(false); }
    }, [asistenteId, tareaId]);

    useEffect(() => { cargarDetalles(); }, [cargarDetalles]);

    // --- Efecto para limpiar mensaje de éxito ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); }
        return () => clearTimeout(timer);
    }, [successMessage]);

    // --- Handlers para Acciones ---
    const handleCancelarSuscripcion = async () => { /* ... (sin cambios) ... */
        if (!asistenteId || !detalles?.suscripcion?.id || isProcessing) return;
        if (confirm(`¿Cancelar suscripción a "${detalles.tarea.nombre}"?`)) {
            setIsProcessing(true); setError(null); setSuccessMessage(null);
            try { const result = await cancelarSuscripcionTarea(detalles.suscripcion.id, asistenteId, tareaId); if (!result.success) throw new Error(result.error || "Error"); setSuccessMessage("Suscripción cancelada."); await cargarDetalles(); }
            catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setIsProcessing(false); }
        }
    };
    const handleSuscribirReactivar = async () => { /* ... (sin cambios) ... */
        if (!asistenteId || isProcessing) return;
        setIsProcessing(true); setError(null); setSuccessMessage(null);
        try { const result = await crearOreactivarSuscripcionTarea(asistenteId, tareaId); if (!result.success) throw new Error(result.error || "Error"); setSuccessMessage("Suscripción activada/reactivada."); await cargarDetalles(); }
        catch (err) { setError(err instanceof Error ? err.message : "Error"); } finally { setIsProcessing(false); }
    };

    // --- Navegación ---
    const irAtras = () => router.back();
    const irAlMarketplace = () => router.push(`/admin/IA/marketplace?asistenteId=${asistenteId}`);

    // --- Preparar slides para Lightbox ---
    const slides = detalles?.tarea.TareaGaleria?.map(img => ({
        src: img.imageUrl, alt: img.altText || '', title: img.descripcion || '',
    })) || [];

    // --- Clases de Tailwind ---
    const containerClasses = "max-w-5xl mx-auto p-4 md:p-6";
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden";
    const mainGridClasses = "md:grid md:grid-cols-5 md:gap-6 lg:gap-8";
    const infoColumnClasses = "md:col-span-3 p-4 sm:p-6";
    const galleryColumnClasses = "md:col-span-2 p-4 sm:p-6 bg-zinc-800/50 md:border-l md:border-zinc-700";
    const titleClasses = "text-xl sm:text-2xl font-semibold text-white";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed mt-2";
    const priceClasses = "text-lg font-semibold";
    const statusLabelClasses = "text-xs font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1";
    const statusActiveClasses = "bg-green-500/20 text-green-300";
    const statusInactiveClasses = "bg-zinc-600/50 text-zinc-400";
    const detailLabelClasses = "text-xs text-zinc-400 font-medium";
    const detailValueClasses = "text-sm text-zinc-200";
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const dangerButtonClasses = `${buttonBaseClasses} text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;
    const galleryTitleClasses = "text-base font-semibold text-zinc-200 mb-3 flex items-center gap-2";
    const mainImageContainerClasses = "aspect-video w-full relative rounded-lg overflow-hidden border border-zinc-600 bg-zinc-700 cursor-pointer hover:opacity-90 transition-opacity shadow-md";
    const thumbnailGridClasses = "grid grid-cols-4 gap-2 mt-3";
    const thumbnailClasses = "aspect-square w-full relative rounded-md overflow-hidden border border-zinc-600 cursor-pointer hover:opacity-80 transition-opacity";
    // --- Clases para Categoría y Etiquetas ---
    const categoryTagClasses = "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 mr-2"; // Tag para categoría
    const etiquetaTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-600 text-zinc-300"; // Tag para etiquetas

    // --- Renderizado ---
    if (loading) { return <div className="flex justify-center items-center h-40 text-zinc-400"><Loader2 className="animate-spin mr-2" /> Cargando...</div>; }
    if (error || !detalles?.tarea) { return (<div className={`${containerClasses} text-center`}> <div className="bg-red-900/30 border border-red-500 rounded-md p-4 text-red-400 flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error || "No se pudo cargar."} </div> <button onClick={irAtras} className={`${secondaryButtonClasses} mt-4 mx-auto`}> <ArrowLeft size={16} className="mr-1" /> Volver </button> </div>); }

    const { tarea, suscripcion } = detalles;
    const isSubscribed = suscripcion?.status === 'activo';
    const isBaseTask = tarea.precio === null || tarea.precio === 0;
    const galleryImages = tarea.TareaGaleria || [];
    const mainImageUrl = galleryImages[0]?.imageUrl;
    const categoryColor = tarea.CategoriaTarea?.color || DEFAULT_COLOR_HEX;

    return (
        <div className={containerClasses}>
            {/* Botones de Navegación */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={irAtras} className={`${secondaryButtonClasses} !px-3 !py-1 !text-xs`}>
                    <ArrowLeft size={14} className="mr-1" /> Volver
                </button>
                {asistenteId && (
                    <div className="flex gap-2">
                        <button onClick={irAlMarketplace} className={`${secondaryButtonClasses} !px-3 !py-1 !text-xs`}>
                            <ShoppingCart size={14} className="mr-1" /> Ir al Marketplace
                        </button>
                        <button onClick={() => router.push(`/admin/clientes/${detalles.clienteId}/negocios/${detalles.negocioId}/asistente/${asistenteId}`)} className={`${secondaryButtonClasses} !px-3 !py-1 !text-xs`}>
                            <ArrowLeft size={14} className="mr-1" /> Ir al Asistente Virtual
                        </button>
                    </div>
                )}
            </div>

            <div className={cardClasses}>
                <div className={mainGridClasses}>

                    {/* --- Columna Izquierda: Información --- */}
                    <div className={infoColumnClasses}>
                        {/* Nombre, Status y Categoría */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-zinc-700">
                            <div className="flex-grow">
                                <h1 className={titleClasses}>{tarea.nombre}</h1>
                                {/* --- NUEVO: Mostrar Categoría con Color --- */}
                                {tarea.CategoriaTarea && (
                                    <span
                                        className={`${categoryTagClasses} mt-1.5`}
                                        style={{ backgroundColor: categoryColor + '30', color: categoryColor, borderColor: categoryColor + '80' }} // Fondo con opacidad, texto y borde con color
                                    >
                                        <ListTree size={12} /> {tarea.CategoriaTarea.nombre}
                                    </span>
                                )}
                            </div>
                            {asistenteId && suscripcion && (
                                <span className={`${statusLabelClasses} ${isSubscribed ? statusActiveClasses : statusInactiveClasses} flex-shrink-0 mt-1 sm:mt-0`}>
                                    {isSubscribed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {isSubscribed ? 'Activa' : 'Inactiva'}
                                </span>
                            )}
                        </div>

                        {/* Precio */}
                        <div className="pt-4">
                            <p className={`${priceClasses} ${isBaseTask ? 'text-green-400' : 'text-emerald-400'}`}>
                                <BadgeDollarSign size={18} className="inline-block mr-1 -mt-1" />
                                {isBaseTask ? 'Incluida en Plan Base' : formatCurrency(tarea.precio ?? null) + ' / mes'}
                            </p>
                        </div>

                        {/* Descripción */}
                        {tarea.descripcion && (
                            <div className="pt-4">
                                <h2 className="text-sm font-semibold text-zinc-200 mb-1">Descripción</h2>
                                <p className={descriptionClasses}>{tarea.descripcion}</p>
                            </div>
                        )}

                        {/* --- NUEVO: Mostrar Etiquetas --- */}
                        {tarea.etiquetas && tarea.etiquetas.length > 0 && (
                            <div className="pt-4 border-t border-zinc-700 mt-4">
                                <h2 className="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-1.5"><Tag size={14} /> Etiquetas</h2>
                                <div className="flex flex-wrap gap-1.5">
                                    {tarea.etiquetas.map(et => (
                                        <span key={et.id} className={etiquetaTagClasses}>
                                            {et.nombre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detalles Suscripción */}
                        {asistenteId && suscripcion && (
                            <div className="border-t border-zinc-700 pt-4 mt-4 space-y-3">
                                <h2 className="text-sm font-semibold text-zinc-200">Detalles Suscripción</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    <div><span className={detailLabelClasses}>Monto Actual:</span><p className={detailValueClasses}>{formatCurrency(suscripcion.montoSuscripcion ?? null)}</p></div>
                                    <div><span className={detailLabelClasses}>Fecha Inicio:</span><p className={detailValueClasses}>{formatDate(suscripcion.fechaSuscripcion)}</p></div>
                                    {!isSubscribed && suscripcion.fechaDesuscripcion && (<div><span className={detailLabelClasses}>Fecha Cancelación:</span><p className={detailValueClasses}>{formatDate(suscripcion.fechaDesuscripcion)}</p></div>)}
                                </div>
                            </div>
                        )}

                        {/* Mensajes */}
                        <div className="min-h-[2rem] mt-5">
                            {error && <p className="text-sm text-red-400 text-center border border-red-600 bg-red-900/30 p-2 rounded">{error}</p>}
                            {successMessage && <p className="text-sm text-green-400 text-center border border-green-600 bg-green-900/30 p-2 rounded">{successMessage}</p>}
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex justify-end pt-4 mt-auto border-t border-zinc-700">
                            {asistenteId ? ( /* ... (botones sin cambios) ... */ isSubscribed ? (<button onClick={handleCancelarSuscripcion} className={dangerButtonClasses} disabled={isProcessing}> {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <XCircle size={16} className="mr-1" />} Cancelar </button>) : (<button onClick={handleSuscribirReactivar} className={primaryButtonClasses} disabled={isProcessing}> {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-1" />} {suscripcion ? 'Reactivar' : 'Suscribirse'} </button>)
                            ) : (<span className="text-xs text-zinc-500 italic">Selecciona asistente para suscribir.</span>)}
                        </div>
                    </div>

                    {/* --- Columna Derecha: Galería --- */}
                    <div className={galleryColumnClasses}>
                        {/* ... (Renderizado de galería sin cambios) ... */}
                        <h2 className={galleryTitleClasses}> <GalleryHorizontal size={16} /> Galería </h2>
                        {galleryImages.length > 0 ? (<div> <div className={mainImageContainerClasses} onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}> {mainImageUrl ? (<Image src={mainImageUrl} alt={galleryImages[0].altText || `Imagen principal ${tarea.nombre}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />) : (<div className="flex items-center justify-center h-full bg-zinc-700"><ImageIconPlaceholder size={32} className="text-zinc-500" /></div>)} <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"> <span className="text-white text-xs font-semibold">Ver Galería</span> </div> </div> {galleryImages.length > 1 && (<div className={thumbnailGridClasses}> {galleryImages.slice(0, 4).map((img, index) => (<div key={img.id} className={thumbnailClasses} onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}> <Image src={img.imageUrl} alt={img.altText || `Miniatura ${index + 1}`} fill className="object-cover" sizes="10vw" /> </div>))} </div>)} {galleryImages.length > 4 && (<p className="text-xs text-zinc-400 text-center mt-2">... y {galleryImages.length - 4} más</p>)} </div>) : (<div className="border border-dashed border-zinc-600 rounded-lg p-6 text-center text-zinc-500 italic text-sm"> No hay imágenes. </div>)}
                    </div>

                </div> {/* Fin Main Grid */}
            </div> {/* Fin Card */}

            {/* --- Lightbox --- */}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={slides}
                index={lightboxIndex}
            />
            {/* --------------- */}
        </div>
    );
}

// --- Componente Wrapper con Suspense ---
export default function TareaSuscripcionDetallePageWrapper(props: Props) {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-40 text-zinc-400"><Loader2 className="animate-spin mr-2" /> Cargando...</div>}>
            <TareaSuscripcionContent {...props} />
        </Suspense>
    );
}
