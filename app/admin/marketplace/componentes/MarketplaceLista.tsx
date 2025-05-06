'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Añadido useSearchParams
// Ajusta rutas
import { obtenerTareasParaMarketplace } from '@/app/admin/_lib/tareas.actions'; // Usar nueva acción y tipo
import { obtenerCategorias } from '@/app/admin/_lib/categoriaTarea.actions';
import {
    obtenerSuscripcionesAsistenteTareas,
    crearSuscripcionAsistenteTarea,
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions';
import { CategoriaTarea, AsistenteTareaSuscripcion, TareaParaMarketplace } from '@/app/admin/_lib/types';
import { Loader2, ListX, SearchIcon, ListChecks, BadgeCheck, CheckCircle, GalleryHorizontal, Users, Check } from 'lucide-react'; // Iconos actualizados

interface Props {
    asistenteId?: string; // AsistenteId opcional, se puede pasar como prop o leer de la URl
    // AsistenteId ahora se leerá desde los searchParams si está presente
}

// --- Componente TareaCard ---
const TareaCard = ({ tarea, isSuscrito, isLoadingAction, onSuscribirClick, onCardClick }: {
    tarea: TareaParaMarketplace;
    isSuscrito: boolean;
    isLoadingAction: boolean;
    onSuscribirClick: (tareaId: string, tareaNombre: string) => void;
    onCardClick: (tareaId: string) => void;
}) => {
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-64 hover:border-blue-600/50 hover:shadow-blue-900/20 transition-all duration-200 cursor-pointer group"; // Alto fijo h-64
    const contentClasses = "p-3 flex-grow overflow-hidden flex flex-col";
    const footerClasses = "p-3 border-t border-zinc-700 flex justify-between items-center";
    const tagClasses = "text-[0.65rem] px-1.5 py-0.5 rounded-full inline-block mr-1 mb-1 bg-teal-900/70 text-teal-300";
    const buttonSubscribe = "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 text-xs font-medium px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center gap-1 disabled:opacity-50";
    const suscritoIndicator = "text-xs font-medium text-green-400 flex items-center gap-1";

    const handleCardClickInternal = (e: React.MouseEvent<HTMLDivElement>) => {
        // Evitar navegación si se hizo clic en el botón de suscribir
        if ((e.target as HTMLElement).closest('button[data-action-button="true"]')) {
            return;
        }
        onCardClick(tarea.id);
    };

    return (
        <div className={cardClasses} onClick={handleCardClickInternal}>
            {/* Contenido Principal */}
            <div className={contentClasses}>
                {/* Categoría */}
                <span className="text-[0.65rem] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    {tarea.CategoriaTarea?.nombre || 'General'}
                </span>
                {/* Nombre */}
                <h3 className="text-sm font-semibold text-zinc-100 mb-1 line-clamp-2" title={tarea.nombre}>
                    {tarea.nombre}
                </h3>
                {/* Descripción */}
                <p className="text-xs text-zinc-400 line-clamp-3 flex-grow" title={tarea.descripcion || ''}>
                    {tarea.descripcion || <span className='italic'>Sin descripción</span>}
                </p>
                {/* Etiquetas */}
                {tarea.etiquetas && tarea.etiquetas.length > 0 && (
                    <div className="mt-2 flex flex-wrap max-h-10 overflow-hidden"> {/* Limitar altura de etiquetas */}
                        {tarea.etiquetas.slice(0, 3).map(({ etiquetaTarea }) => etiquetaTarea ? ( // Mostrar máx 3
                            <span key={etiquetaTarea.id} className={tagClasses}>
                                {etiquetaTarea.nombre}
                            </span>
                        ) : null)}
                        {tarea.etiquetas.length > 3 && <span className={`${tagClasses} bg-zinc-600`}>...</span>}
                    </div>
                )}
            </div>
            {/* Pie de Tarjeta */}
            <div className={footerClasses}>
                {/* Indicadores y Precio */}
                <div className='flex items-center gap-2 text-zinc-500'>
                    <span title={`${tarea._count.AsistenteTareaSuscripcion} asistentes suscritos`}>
                        <Users size={12} />
                    </span>
                    {tarea._count.TareaGaleria > 0 && <GalleryHorizontal size={12} />}
                    <span className="text-sm font-semibold text-emerald-400 ml-1">
                        {typeof tarea.precio === 'number' && tarea.precio > 0 ? `$${tarea.precio.toFixed(2)}` : 'Gratis'}
                    </span>
                </div>
                {/* Botón/Indicador Acción */}
                <div className="h-6"> {/* Contenedor para evitar salto de layout */}
                    {isSuscrito ? (
                        <span className={suscritoIndicator} title="Ya estás suscrito a esta tarea">
                            <CheckCircle size={14} /> Suscrito
                        </span>
                    ) : (
                        <button
                            data-action-button="true" // Para evitar click en card
                            onClick={() => onSuscribirClick(tarea.id, tarea.nombre)}
                            className={buttonSubscribe}
                            disabled={isLoadingAction}
                            title="Suscribir asistente a esta tarea"
                        >
                            {isLoadingAction ? <Loader2 className='animate-spin' size={14} /> : <BadgeCheck size={14} />}
                            Suscribir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal MarketplaceLista ---
export default function MarketplaceLista({ asistenteId }: Props) { // Renombrar prop para claridad
    const [tareas, setTareas] = useState<TareaParaMarketplace[]>([]);
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [suscritoTaskIds, setSuscritoTaskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingSuscripciones, setLoadingSuscripciones] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('all');
    const router = useRouter();
    // const searchParams = useSearchParams(); // Hook para leer params de URL

    // --- Obtener asistenteId de la URL si no se pasa como prop ---
    // Esto permite que el componente funcione en ambos contextos
    // const asistenteId = asistenteIdProp ?? (searchParams ? searchParams.get('asistenteId') : null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    const filterButtonBase = "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-150 flex items-center gap-1";
    const filterButtonActive = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-900";
    const filterButtonInactive = "bg-zinc-700/50 border-zinc-600 text-zinc-300 hover:bg-zinc-600/50 hover:border-zinc-500";
    // --- NUEVO: Grid para las tarjetas ---
    const gridContainerClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"; // Ajusta columnas según breakpoints

    // --- Carga de datos inicial (Tareas y Categorías) ---
    useEffect(() => {
        setLoading(true); setError(null);
        const fetchBaseData = async () => {
            try {
                // Usar la nueva acción que trae los conteos y etiquetas
                const [tareasData, categoriasData] = await Promise.all([
                    obtenerTareasParaMarketplace(), // Llama a la nueva acción
                    obtenerCategorias()
                ]);
                setTareas(tareasData || []); // El tipo ya debería ser TareaParaMarketplace
                setCategorias(categoriasData || []);
            } catch (err) {
                console.error("Error al obtener datos base:", err);
                setError("No se pudieron cargar los datos del marketplace.");
            } finally { setLoading(false); }
        };
        fetchBaseData();
    }, []);

    // --- Carga de Suscripciones (si hay asistenteId) ---
    const fetchSuscripciones = useCallback(async () => {
        if (!asistenteId) {
            setSuscritoTaskIds(new Set()); setLoadingSuscripciones(false); return;
        }
        setLoadingSuscripciones(true); setActionError(null);
        try {
            const suscripcionesData = await obtenerSuscripcionesAsistenteTareas(asistenteId);
            const ids = new Set(suscripcionesData.map(sub => sub.tareaId));
            setSuscritoTaskIds(ids);
        } catch (err) {
            console.error("Error fetching suscripciones:", err);
            setActionError("Error al cargar suscripciones.");
            setSuscritoTaskIds(new Set());
        } finally { setLoadingSuscripciones(false); }
    }, [asistenteId]);

    useEffect(() => {
        fetchSuscripciones();
    }, [fetchSuscripciones]);

    // --- Lógica de Filtrado ---
    const tareasFiltradas = useMemo(() => {
        return tareas.filter(tarea => {
            const coincideTexto = tarea.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                tarea.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) || false;
            const coincideCategoria = categoriaSeleccionada === 'all' || tarea.categoriaTareaId === categoriaSeleccionada;
            return coincideTexto && coincideCategoria;
        });
    }, [tareas, filtroTexto, categoriaSeleccionada]);

    // --- Manejador para Suscribir ---
    const handleSuscribir = async (tareaId: string, tareaNombre: string) => {
        if (!asistenteId) return;
        if (!confirm(`Suscribir asistente a "${tareaNombre}"?`)) return;
        setIsActionLoading(tareaId); setActionError(null); setActionSuccess(null);
        try {
            const tarea = tareas.find(t => t.id === tareaId);
            const nuevaSuscripcionData = {
                asistenteVirtualId: asistenteId,
                tareaId: tareaId,
                montoSuscripcion: tarea?.precio ?? null,
                status: 'activo',
            };
            await crearSuscripcionAsistenteTarea(nuevaSuscripcionData as AsistenteTareaSuscripcion);
            setActionSuccess(`Suscrito a "${tareaNombre}"`);
            await fetchSuscripciones(); // Refrescar estado
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error("Error al suscribir:", err);
            setActionError(`Error al suscribir: ${err instanceof Error ? err.message : "Error"}`);
        } finally { setIsActionLoading(null); }
    };

    // --- Manejador para Click en Tarjeta (Navegación) ---
    const handleCardClick = (tareaId: string) => {
        // Si hay asistenteId, ir a la página de gestión de suscripción
        // Si no, ir a una página de detalle genérica (o la misma, pero sin opción de suscribir)
        const basePath = asistenteId
            ? `/admin/marketplace/suscripcion/${tareaId}?asistenteId=${asistenteId}` // Ruta para gestionar
            : `/admin/marketplace/suscripcion/${tareaId}`; // Ruta genérica (ajusta si es necesario)

        // --- CORRECCIÓN: Asegurar pasar asistenteId si existe ---
        // La ruta ya incluye el asistenteId si está presente
        router.push(basePath);
    };


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Sección de Filtros */}
            <div className="mb-4 space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-zinc-400" /></div>
                    <input type="text" placeholder="Buscar tarea por nombre o descripción..." className={`${inputBaseClasses} pl-9`} value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} />
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

            {/* Contenido Principal: Grid de Tarjetas o Mensajes */}
            <div className="flex-grow overflow-y-auto -mx-1"> {/* Overflow y margen negativo */}
                {loading || (asistenteId && loadingSuscripciones) ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : tareasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>{filtroTexto || categoriaSeleccionada !== 'all' ? 'No hay tareas que coincidan.' : 'No hay tareas disponibles.'}</p></div>
                ) : (
                    // --- Grid de Tarjetas ---
                    <div className={gridContainerClasses}>
                        {tareasFiltradas.map((tarea) => {
                            const isSuscrito = asistenteId ? suscritoTaskIds.has(tarea.id) : false;
                            const isLoadingAction = isActionLoading === tarea.id;

                            return (
                                <TareaCard
                                    key={tarea.id}
                                    tarea={tarea}
                                    isSuscrito={asistenteId ? isSuscrito : false} // Solo relevante si hay asistenteId
                                    isLoadingAction={isLoadingAction}
                                    onSuscribirClick={asistenteId ? handleSuscribir : () => { }} // Solo permitir suscribir si hay asistenteId
                                    onCardClick={handleCardClick}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}


