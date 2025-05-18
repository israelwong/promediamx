// Ruta: app/admin/marketplace/suscripcion/components/SuscripcionTareaDetalle.tsx
// (O donde esté tu TareaSuscripcionContent.tsx)
'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// NUEVAS IMPORTS
import {
    obtenerDetallesSuscripcionTareaAction,
    cancelarSuscripcionTareaAction,
    crearOreactivarSuscripcionTareaAction,
} from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.actions';
import type {
    TareaSuscripcionDetallesData
} from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.schemas';
// ActionResult es global

import { AlertCircle, Loader2, ArrowLeft, ShoppingCart, CheckCircle, XCircle, BadgeDollarSign, ImageIcon as ImageIconPlaceholder, GalleryHorizontal, ListTree, Tag } from 'lucide-react';

interface Props {
    tareaId: string;
    // clienteId y negocioId se obtendrán del searchParams o del estado 'detalles'
}

// Helper para formatear moneda (sin cambios)
const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
};
// Helper para formatear fechas (sin cambios)
// Helper para formatear fechas
const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'Fecha inválida'; }
};

const DEFAULT_COLOR_HEX = '#6b7280'; // zinc-500

function TareaSuscripcionContent({ tareaId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Obtener IDs de contexto de searchParams
    const asistenteIdParam = searchParams?.get('asistenteId');
    // clienteId y negocioId vendrán del estado 'detalles' una vez cargado,
    // o podrían pasarse también por searchParams si el link de origen los incluye.
    // Por ahora, asumimos que la action de obtenerDetalles los devuelve.

    const [detalles, setDetalles] = useState<TareaSuscripcionDetallesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // Para botones de acción suscribir/cancelar
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const cargarDetalles = useCallback(async (showLoadingSpinner = true) => {
        if (!tareaId) { setError("Falta ID de tarea."); setLoading(false); return; }

        if (showLoadingSpinner) setLoading(true);
        setError(null); setSuccessMessage(null);
        try {
            // asistenteIdParam puede ser null si se accede a la tarea sin contexto de asistente
            if (!asistenteIdParam) {
                throw new Error("Falta ID de asistente.");
            }
            const result = await obtenerDetallesSuscripcionTareaAction(asistenteIdParam, tareaId);

            if (!result.success || !result.data || !result.data.tarea) {
                throw new Error(result.error || "No se encontró la tarea o hubo un error.");
            }
            setDetalles(result.data);
        } catch (err) {
            console.error("Error fetching subscription details:", err);
            setError(err instanceof Error ? err.message : "Error al cargar detalles de la tarea.");
            setDetalles(null);
        } finally {
            if (showLoadingSpinner) setLoading(false);
        }
    }, [asistenteIdParam, tareaId]);

    useEffect(() => {
        cargarDetalles();
    }, [cargarDetalles]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); }
        return () => clearTimeout(timer);
    }, [successMessage]);

    const handleCancelarSuscripcion = async () => {
        if (!asistenteIdParam || !detalles?.suscripcion?.id || !detalles.clienteId || !detalles.negocioId || isProcessing) {
            setError("Faltan datos para cancelar la suscripción o ya se está procesando.");
            return;
        }
        if (confirm(`¿Estás seguro de cancelar la suscripción a la tarea "${detalles.tarea.nombre}"?`)) {
            setIsProcessing(true); setError(null); setSuccessMessage(null);
            try {
                const result = await cancelarSuscripcionTareaAction({
                    suscripcionId: detalles.suscripcion.id,
                    asistenteId: asistenteIdParam,
                    tareaId: tareaId,
                    clienteId: detalles.clienteId, // Obtenido de 'detalles'
                    negocioId: detalles.negocioId, // Obtenido de 'detalles'
                });
                if (!result.success) throw new Error(result.error || "Error desconocido al cancelar.");
                setSuccessMessage("Suscripción cancelada con éxito.");
                await cargarDetalles(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al cancelar la suscripción.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleSuscribirReactivar = async () => {
        if (!asistenteIdParam || !detalles?.clienteId || !detalles.negocioId || isProcessing) {
            setError("Faltan datos de contexto (asistente, cliente, negocio) para suscribir.");
            return;
        }
        setIsProcessing(true); setError(null); setSuccessMessage(null);
        try {
            const result = await crearOreactivarSuscripcionTareaAction({
                asistenteId: asistenteIdParam,
                tareaId: tareaId,
                clienteId: detalles.clienteId, // Obtenido de 'detalles'
                negocioId: detalles.negocioId, // Obtenido de 'detalles'
            });
            if (!result.success) throw new Error(result.error || "Error desconocido al suscribir/reactivar.");
            setSuccessMessage("Suscripción activada/reactivada con éxito.");
            await cargarDetalles(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al suscribir/reactivar.");
        } finally {
            setIsProcessing(false);
        }
    };

    const irAtras = () => router.back(); // Simple back, o construir ruta si es necesario
    const irAlMarketplace = () => {
        // Si tenemos asistenteIdParam, lo incluimos para volver al marketplace contextualizado
        const marketplacePath = asistenteIdParam ? `/admin/marketplace/${asistenteIdParam}` : '/admin/marketplace';
        router.push(marketplacePath);
    };
    const irAlAsistente = () => {
        if (asistenteIdParam && detalles?.clienteId && detalles?.negocioId) {
            router.push(`/admin/clientes/${detalles.clienteId}/negocios/${detalles.negocioId}/asistente/${asistenteIdParam}`);
        } else {
            // Fallback si no hay contexto completo, quizás ir a la lista de asistentes o al dashboard
            router.push('/admin/dashboard'); // O una ruta más adecuada
        }
    };

    // Preparar slides para Lightbox
    const slides = useMemo(() =>
        detalles?.tarea.TareaGaleria?.map(img => ({
            src: img.imageUrl,
            alt: img.altText || '',
            title: img.descripcion || '',
        })) || [],
        [detalles?.tarea.TareaGaleria]);


    // Clases UI (sin cambios, usar las que ya tenías)
    const containerClasses = "max-w-5xl mx-auto p-4 md:p-6"; /* ... */
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden";
    const mainGridClasses = "md:grid md:grid-cols-5 md:gap-6 lg:gap-8";
    const infoColumnClasses = "md:col-span-3 p-4 sm:p-6";
    // const galleryColumnClasses = "md:col-span-2 p-4 sm:p-6 bg-zinc-800/50 md:border-l md:border-zinc-700";
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
    const categoryTagClasses = "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 mr-2 border"; // Añadido border para que se vea el color
    const etiquetaTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-600 text-zinc-300";


    // --- Renderizado ---
    if (loading) { return <div className="flex justify-center items-center h-40 text-zinc-400"><Loader2 className="animate-spin mr-2" /> Cargando...</div>; }
    if (error || !detalles?.tarea) { return (<div className={`${containerClasses} text-center`}> <div className="bg-red-900/30 border border-red-500 rounded-md p-4 text-red-400 flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error || "No se pudo cargar."} </div> <button onClick={irAtras} className={`${secondaryButtonClasses} mt-4 mx-auto`}> <ArrowLeft size={16} className="mr-1" /> Volver </button> </div>); }


    const { tarea, suscripcion } = detalles!; // Sabemos que detalles no es null aquí
    const isSubscribedAndActive = suscripcion?.status === 'activo';
    const isBaseTask = tarea.precio === null || tarea.precio === 0;
    const galleryImages = tarea.TareaGaleria || [];
    const mainImageUrl = galleryImages[0]?.imageUrl;
    // Usar el color de la categoría o un gris por defecto
    const categoryColor = tarea.CategoriaTarea?.color && tarea.CategoriaTarea.color !== "currentColor" && tarea.CategoriaTarea.color !== "transparent"
        ? tarea.CategoriaTarea.color
        : DEFAULT_COLOR_HEX;


    return (
        <div className={containerClasses}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={irAtras} className={`${secondaryButtonClasses} !px-3 !py-1.5 !text-xs`}>
                    <ArrowLeft size={14} className="mr-1.5" /> Volver
                </button>
                {asistenteIdParam && ( // Solo mostrar si hay contexto de asistente
                    <div className="flex gap-2">
                        <button onClick={irAlMarketplace} className={`${secondaryButtonClasses} !px-3 !py-1.5 !text-xs`}>
                            <ShoppingCart size={14} className="mr-1.5" /> Ir al Marketplace (Asistente)
                        </button>
                        <button onClick={irAlAsistente} className={`${secondaryButtonClasses} !px-3 !py-1.5 !text-xs`}>
                            <ArrowLeft size={14} className="mr-1.5" /> Ir a Config. Asistente
                        </button>
                    </div>
                )}
                {!asistenteIdParam && ( // Botón genérico al marketplace si no hay contexto de asistente
                    <button onClick={() => router.push('/admin/marketplace')} className={`${secondaryButtonClasses} !px-3 !py-1.5 !text-xs`}>
                        <ShoppingCart size={14} className="mr-1.5" /> Ver todas las Tareas
                    </button>
                )}
            </div>

            <div className={cardClasses}>
                <div className={mainGridClasses}>
                    <div className={infoColumnClasses}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-zinc-700">
                            <div className="flex-grow">
                                <h1 className={titleClasses}>{tarea.nombre}</h1>
                                {tarea.CategoriaTarea && (
                                    <span
                                        className={`${categoryTagClasses} mt-1.5`}
                                        style={{
                                            backgroundColor: `${categoryColor}20`, // 20 para opacidad ~12.5%
                                            color: categoryColor,
                                            borderColor: `${categoryColor}80`  // 80 para opacidad ~50%
                                        }}
                                    >
                                        <ListTree size={12} /> {tarea.CategoriaTarea.nombre}
                                    </span>
                                )}
                            </div>
                            {asistenteIdParam && suscripcion && (
                                <span className={`${statusLabelClasses} ${isSubscribedAndActive ? statusActiveClasses : statusInactiveClasses} flex-shrink-0 mt-1 sm:mt-0`}>
                                    {isSubscribedAndActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {isSubscribedAndActive ? 'Suscripción Activa' : 'Suscripción Inactiva'}
                                </span>
                            )}
                        </div>
                        <div className="pt-4">
                            <p className={`${priceClasses} ${isBaseTask ? 'text-green-400' : 'text-emerald-400'}`}>
                                <BadgeDollarSign size={18} className="inline-block mr-1 -mt-1" />
                                {isBaseTask ? 'Incluida (Base)' : formatCurrency(tarea.precio ?? null) + (tarea.precio ? ' / mes' : '')}
                            </p>
                        </div>
                        {tarea.descripcion && (
                            <div className="pt-4">
                                <h2 className="text-sm font-semibold text-zinc-200 mb-1">Descripción</h2>
                                <div className={`${descriptionClasses} prose prose-sm prose-invert max-w-none`} dangerouslySetInnerHTML={{ __html: tarea.descripcion.replace(/\n/g, '<br />') }} />
                            </div>
                        )}
                        {tarea.etiquetas && tarea.etiquetas.length > 0 && (
                            <div className="pt-4 border-t border-zinc-700 mt-4">
                                <h2 className="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-1.5"><Tag size={14} /> Etiquetas</h2>
                                <div className="flex flex-wrap gap-1.5">
                                    {tarea.etiquetas.map(et => (
                                        et && <span key={et.etiquetaTarea.id} className={etiquetaTagClasses}>{et.etiquetaTarea.nombre}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {asistenteIdParam && suscripcion && (
                            <div className="border-t border-zinc-700 pt-4 mt-4 space-y-3">
                                <h2 className="text-sm font-semibold text-zinc-200">Detalles de tu Suscripción</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    <div>
                                        <span className={detailLabelClasses}>Monto de esta Suscripción:</span>
                                        <p className={detailValueClasses}>{formatCurrency(suscripcion.montoSuscripcion ?? null)}</p>
                                    </div>
                                    <div>
                                        <span className={detailLabelClasses}>Fecha de Suscripción:</span>
                                        <p className={detailValueClasses}>{formatDate(suscripcion.fechaSuscripcion)}</p>
                                    </div>
                                    {!isSubscribedAndActive && suscripcion.fechaDesuscripcion && (
                                        <div>
                                            <span className={detailLabelClasses}>Fecha de Cancelación:</span>
                                            <p className={detailValueClasses}>{formatDate(suscripcion.fechaDesuscripcion)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="min-h-[2rem] mt-5">
                            {error && <p className="text-sm text-red-400 text-center border border-red-600 bg-red-900/30 p-2 rounded">{error}</p>}
                            {successMessage && <p className="text-sm text-green-400 text-center border border-green-600 bg-green-900/30 p-2 rounded">{successMessage}</p>}
                        </div>
                        <div className="flex justify-end pt-4 mt-auto border-t border-zinc-700">
                            {asistenteIdParam ? (
                                isSubscribedAndActive ? (
                                    <button onClick={handleCancelarSuscripcion} className={dangerButtonClasses} disabled={isProcessing}> {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <XCircle size={16} className="mr-1" />} Cancelar Suscripción </button>
                                ) : (
                                    <button onClick={handleSuscribirReactivar} className={primaryButtonClasses} disabled={isProcessing}> {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-1" />} {suscripcion ? 'Reactivar Suscripción' : 'Suscribirse a esta Tarea'} </button>
                                )
                            ) : ( // Si no hay asistenteIdParam, es una vista de admin global para la tarea
                                <button onClick={() => { /* TODO: Lógica para editar tarea o suscribir para un cliente (modal) */ alert('TODO: Editar Tarea o Suscribir para Cliente (Admin)'); }} className={secondaryButtonClasses}>
                                    Gestionar Tarea (Admin)
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2 p-4 sm:p-6 bg-zinc-800/50 md:border-l md:border-zinc-700 flex flex-col">
                        <h2 className={galleryTitleClasses}>
                            <GalleryHorizontal size={16} /> Galería
                        </h2>
                        {galleryImages.length > 0 ? (
                            <div>
                                <div
                                    className={`${mainImageContainerClasses} group mb-3`}
                                    onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label="Ver galería"
                                >
                                    {mainImageUrl ? (
                                        <Image
                                            src={mainImageUrl}
                                            alt={galleryImages[0].altText || `Imagen principal ${tarea.nombre}`}
                                            fill
                                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, 40vw"
                                            priority
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full bg-zinc-700">
                                            <ImageIconPlaceholder size={32} className="text-zinc-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded shadow">
                                            Ver Galería
                                        </span>
                                    </div>
                                </div>
                                {galleryImages.length > 1 && (
                                    <div className={thumbnailGridClasses}>
                                        {galleryImages.slice(0, 4).map((img, index) => (
                                            <div
                                                key={img.id}
                                                className={`${thumbnailClasses} group`}
                                                onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`Ver imagen ${index + 1}`}
                                            >
                                                <Image
                                                    src={img.imageUrl}
                                                    alt={img.altText || `Miniatura ${index + 1}`}
                                                    fill
                                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                                    sizes="10vw"
                                                />
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {galleryImages.length > 4 && (
                                    <p className="text-xs text-zinc-400 text-center mt-2">
                                        ... y {galleryImages.length - 4} más
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="border border-dashed border-zinc-600 rounded-lg p-6 text-center text-zinc-500 italic text-sm">
                                No hay imágenes.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {galleryImages.length > 0 && (
                <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={slides} index={lightboxIndex} />
            )}
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
