// app/admin/marketplace/componentes/MarketplaceLista.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// NUEVAS IMPORTS
import { obtenerTareasParaMarketplaceAction } from '@/app/admin/_lib/actions/tarea/tarea.actions';
import type { TareaParaMarketplaceData } from '@/app/admin/_lib/actions/tarea/tarea.schemas';
import { obtenerCategoriasAction } from '@/app/admin/_lib/actions/categoriaTarea/categoriaTarea.actions';
import type { CategoriaTareaData } from '@/app/admin/_lib/actions/categoriaTarea/categoriaTarea.schemas';
import {
    obtenerSuscripcionesParaAsistenteAction,
    crearOreactivarSuscripcionAction, // Renombrada y usa ActionResult
} from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.actions';
import type { UpsertSuscripcionTareaInput } from '@/app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.schemas';

import { Loader2, ListX, SearchIcon, ListChecks, BadgeCheck, CheckCircle, Check, Users, GalleryHorizontal } from 'lucide-react';

interface Props {
    // ids opcionales se pasas como props
    asistenteId?: string;
    clienteId?: string;
    negocioId?: string;
}

const DEFAULT_CARD_COLOR_HEX = '#3f3f46'; // zinc-700 como fallback para borde si no hay color de categoría

const TareaCard = ({ tarea, isSuscrito, isLoadingAction, onSuscribirClick, onCardClick, asistenteId }: {
    tarea: TareaParaMarketplaceData;
    isSuscrito: boolean;
    isLoadingAction: boolean;
    onSuscribirClick: (tareaId: string, tareaNombre: string) => void;
    onCardClick: (tareaId: string) => void;
    asistenteId?: string;
}) => {
    const categoriaColor = tarea.CategoriaTarea?.color || DEFAULT_CARD_COLOR_HEX;
    // Asumimos que la primera imagen de la galería es la portada
    // const imagenPortadaUrl = tarea.TareaGaleria?.[0]?.imageUrl || tarea.iconoUrl; // Fallback al iconoUrl si no hay galería

    // Clases base (algunas pueden venir de tu guía de estilos maestra)
    const cardClasses = `bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl`;
    // const imageContainerClasses = "w-full h-32 relative overflow-hidden"; // Altura fija para la imagen
    const contentClasses = "p-3 flex-grow flex flex-col";
    const footerClasses = "p-3 border-t border-zinc-700 flex justify-between items-center mt-auto"; // mt-auto para empujar al fondo
    const categoryTextClasses = "text-[0.65rem] font-bold uppercase tracking-wider mb-1 text-zinc-500";
    const titleClasses = "text-sm font-semibold text-zinc-100 mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors";
    const descriptionClasses = "text-xs text-zinc-400 line-clamp-2 flex-grow mb-2"; // line-clamp-2 para descripción más corta
    const tagClasses = "text-[0.6rem] px-1.5 py-0.5 rounded-full inline-block mr-1 mb-1 bg-zinc-700 text-zinc-300";
    const buttonSubscribeClasses = "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 text-xs font-medium px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center gap-1 disabled:opacity-50";
    const suscritoIndicatorClasses = "text-xs font-medium text-green-300 flex items-center gap-1";

    const handleCardClickInternal = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button[data-action-button="true"]')) return;
        onCardClick(tarea.id);
    };

    return (
        <div
            className={cardClasses}
            onClick={handleCardClickInternal}
            style={{ borderTop: `3px solid ${categoriaColor}` }} // Acento de color en el borde superior
            role="button" // Hacerlo semánticamente un botón si es clickeable
            tabIndex={0} // Hacerlo enfocable
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCardClick(tarea.id);
                }
            }} // Accionable con teclado
        >
            {/* {imagenPortadaUrl && (
                <div className={imageContainerClasses}>
                    <Image
                        src={imagenPortadaUrl}
                        alt={`Portada de ${tarea.nombre}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" // Ajusta según tus breakpoints
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            )} */}
            <div className={contentClasses}>
                <span
                    className={categoryTextClasses}
                    style={{ color: categoriaColor }}
                >
                    {tarea.CategoriaTarea?.nombre || 'General'}
                </span>
                <h3 className={titleClasses} title={tarea.nombre}>
                    {tarea.nombre}
                </h3>
                <p className={descriptionClasses} title={tarea.descripcion || ''}>
                    {tarea.descripcion || <span className='italic text-zinc-500'>Sin descripción</span>}
                </p>
                {/* Mostrar un número limitado de etiquetas para mantenerlo minimalista */}
                {tarea.etiquetas && tarea.etiquetas.length > 0 && (
                    <div className="mt-1 flex flex-wrap max-h-6 overflow-hidden"> {/* max-h para limitar altura de tags */}
                        {tarea.etiquetas.slice(0, 2).map(({ etiquetaTarea }) => etiquetaTarea ? (
                            <span key={etiquetaTarea.id} className={tagClasses}>
                                {etiquetaTarea.nombre}
                            </span>
                        ) : null)}
                        {tarea.etiquetas.length > 2 && <span className={`${tagClasses} bg-zinc-600`}>+{tarea.etiquetas.length - 2}</span>}
                    </div>
                )}
            </div>
            <div className={footerClasses}>
                <div className='flex items-center gap-2 text-zinc-500'>
                    <span title={`${tarea._count.AsistenteTareaSuscripcion} asistentes suscritos`}> <Users size={12} /> </span>
                    {tarea._count.TareaGaleria > 0 && <GalleryHorizontal size={12} />}
                    <span className="text-sm font-semibold text-emerald-400">
                        {typeof tarea.precio === 'number' && tarea.precio > 0 ? `$${tarea.precio.toFixed(2)}` : 'Gratis'}
                    </span>
                </div>
                <div className="h-7 flex items-center"> {/* Altura fija para alinear botones */}
                    {asistenteId && isSuscrito ? (
                        <span className={suscritoIndicatorClasses} title="Ya estás suscrito a esta tarea">
                            <CheckCircle size={14} /> Suscrito
                        </span>
                    ) : asistenteId && (
                        <button
                            data-action-button="true"
                            onClick={(e) => { e.stopPropagation(); onSuscribirClick(tarea.id, tarea.nombre); }}
                            className={buttonSubscribeClasses}
                            disabled={isLoadingAction}
                            title="Suscribir asistente a esta tarea"
                        >
                            {isLoadingAction ? <Loader2 className='animate-spin' size={14} /> : <BadgeCheck size={14} />}
                            Suscribir
                        </button>
                    )}
                    {!asistenteId && (
                        <button
                            data-action-button="true"
                            onClick={(e) => { e.stopPropagation(); onCardClick(tarea.id); }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            Ver Detalles
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function MarketplaceLista({ negocioId, clienteId, asistenteId }: Props) {
    const [tareas, setTareas] = useState<TareaParaMarketplaceData[]>([]);
    const [categorias, setCategorias] = useState<CategoriaTareaData[]>([]);
    const [suscritoTaskIds, setSuscritoTaskIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true); // Carga inicial de tareas y categorías
    const [loadingSuscripciones, setLoadingSuscripciones] = useState(!!asistenteId); // Carga de suscripciones si hay asistenteId
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // Para el botón de suscribir de una tarea específica

    const [error, setError] = useState<string | null>(null); // Error general de carga
    const [actionError, setActionError] = useState<string | null>(null); // Error en acción de suscribir
    const [actionSuccess, setActionSuccess] = useState<string | null>(null); // Éxito en acción de suscribir

    const [filtroTexto, setFiltroTexto] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('all');
    const router = useRouter();

    // Clases UI (sin cambios)
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    const filterButtonBase = "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-150 flex items-center gap-1";
    const filterButtonActive = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-900";
    const filterButtonInactive = "bg-zinc-700/50 border-zinc-600 text-zinc-300 hover:bg-zinc-600/50 hover:border-zinc-500";
    const gridContainerClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";


    useEffect(() => {
        setLoading(true); setError(null);
        const fetchBaseData = async () => {
            try {
                const [tareasResult, categoriasResult] = await Promise.all([
                    obtenerTareasParaMarketplaceAction(), // Nueva action
                    obtenerCategoriasAction()           // Nueva action
                ]);
                if (tareasResult.success && tareasResult.data) setTareas(tareasResult.data);
                else setError(prev => `${prev ? prev + ' | ' : ''}${tareasResult.error || 'Error tareas.'}`);

                if (categoriasResult.success && categoriasResult.data) setCategorias(categoriasResult.data);
                else setError(prev => `${prev ? prev + ' | ' : ''}${categoriasResult.error || 'Error categorías.'}`);

            } catch (err) {
                console.error("Error al obtener datos base marketplace:", err);
                setError("No se pudieron cargar los datos del marketplace.");
            } finally { setLoading(false); }
        };
        fetchBaseData();
    }, []);

    const fetchSuscripciones = useCallback(async () => {
        if (!asistenteId) {
            setSuscritoTaskIds(new Set()); setLoadingSuscripciones(false); return;
        }
        setLoadingSuscripciones(true); setActionError(null); // Limpiar actionError al recargar suscripciones
        const result = await obtenerSuscripcionesParaAsistenteAction(asistenteId); // Nueva action
        if (result.success && result.data) {
            const ids = new Set(result.data.map(sub => sub.tareaId));
            setSuscritoTaskIds(ids);
        } else {
            console.error("Error fetching suscripciones:", result.error);
            setActionError(result.error || "Error al cargar suscripciones del asistente.");
            setSuscritoTaskIds(new Set());
        }
        setLoadingSuscripciones(false);
    }, [asistenteId]);

    useEffect(() => {
        fetchSuscripciones();
    }, [fetchSuscripciones]);

    const tareasFiltradas = useMemo(() => { /* ... (sin cambios) ... */
        return tareas.filter(tarea => {
            const coincideTexto = tarea.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                tarea.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) || false;
            const coincideCategoria = categoriaSeleccionada === 'all' || tarea.categoriaTareaId === categoriaSeleccionada;
            return coincideTexto && coincideCategoria;
        });
    }, [tareas, filtroTexto, categoriaSeleccionada]);

    const handleSuscribir = async (tareaId: string, tareaNombre: string) => {
        if (!asistenteId || !tareaId) { // Necesitamos estos IDs para la action
            setActionError("Falta contexto de asistente, negocio o cliente para suscribir.");
            return;
        }
        if (!confirm(`Suscribir asistente a "${tareaNombre}"?`)) return;

        setIsActionLoading(tareaId); setActionError(null); setActionSuccess(null);
        try {
            // Construir el objeto input para la action
            const inputForAction: UpsertSuscripcionTareaInput = {
                asistenteId: asistenteId, // asistenteId ya está disponible en el scope
                tareaId: tareaId,         // tareaId es un parámetro de handleSuscribir
            };

            // Llamar a la action con el objeto input
            const result = await crearOreactivarSuscripcionAction(inputForAction);


            if (result.success && result.data) {
                setActionSuccess(`Suscrito a "${tareaNombre}" (ID Suscripción: ${result.data.id}, Status: ${result.data.status})`);
                await fetchSuscripciones(); // Refrescar estado de suscripciones
                setTimeout(() => setActionSuccess(null), 3000);
            } else {
                throw new Error(result.error || "Error desconocido al suscribir.");
            }
        } catch (err) {
            console.error("Error al suscribir:", err);
            setActionError(`Error al suscribir: ${err instanceof Error ? err.message : "Error"}`);
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleCardClick = (tareaId: string) => {
        // Si hay asistenteId, clienteId y negocioId, los pasamos como query params
        // para que la página de detalle sepa el contexto.
        let path = `/admin/marketplace/suscripcion/${tareaId}`;
        if (asistenteId && clienteId && negocioId) {
            path += `?asistenteId=${asistenteId}&clienteId=${clienteId}&negocioId=${negocioId}`;
        }
        router.push(path);
    };

    // Renderizado (sin cambios significativos, solo usa los nuevos nombres de actions/tipos)
    return (
        <div className={containerClasses}>
            <div className="mb-4 space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-zinc-400" /></div>
                    <input type="text" placeholder="Buscar tarea..." className={`${inputBaseClasses} pl-9`} value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} />
                </div>
                {!loading && categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-zinc-400 mr-2">Categoría:</span>
                        <button onClick={() => setCategoriaSeleccionada('all')} className={`${filterButtonBase} ${categoriaSeleccionada === 'all' ? filterButtonActive : filterButtonInactive}`}>
                            {categoriaSeleccionada === 'all' && <Check size={12} className="-ml-0.5" />} Todas
                        </button>
                        {categorias.map(cat => (<button key={cat.id} onClick={() => setCategoriaSeleccionada(cat.id)} className={`${filterButtonBase} ${categoriaSeleccionada === cat.id ? filterButtonActive : filterButtonInactive}`}>
                            {categoriaSeleccionada === cat.id && <Check size={12} className="-ml-0.5" />} {cat.nombre}
                        </button>))}
                    </div>
                )}
            </div>

            {actionError && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50">{actionError}</p>}
            {actionSuccess && <p className="mb-2 text-center text-xs text-green-400 bg-green-900/30 p-1.5 rounded border border-green-600/50 flex items-center justify-center gap-1"><CheckCircle size={14} /> {actionSuccess}</p>}

            <div className="flex-grow overflow-y-auto -mx-1 px-1"> {/* Contenedor para el scroll de la lista de tareas */}
                {loading || (asistenteId && loadingSuscripciones) ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400 h-full"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando tareas...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 h-full"><ListX className="h-10 w-10 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : tareasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 h-full"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>{filtroTexto || categoriaSeleccionada !== 'all' ? 'No hay tareas que coincidan con tu búsqueda.' : 'No hay tareas disponibles en el marketplace.'}</p></div>
                ) : (
                    <div className={gridContainerClasses}>
                        {tareasFiltradas.map((tarea) => {
                            const isSuscrito = asistenteId ? suscritoTaskIds.has(tarea.id) : false;
                            const isLoadingAction = isActionLoading === tarea.id;
                            return (
                                <TareaCard
                                    key={tarea.id}
                                    tarea={tarea}
                                    isSuscrito={isSuscrito}
                                    isLoadingAction={isLoadingAction}
                                    onSuscribirClick={handleSuscribir}
                                    onCardClick={handleCardClick}
                                    asistenteId={asistenteId}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}