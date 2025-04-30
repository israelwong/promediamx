'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Ajusta la ruta si es necesario
import { obtenerTareasActivas } from '@/app/admin/_lib/tareas.actions';
import { obtenerCategorias } from '@/app/admin/_lib/categoriaTarea.actions';
import {
    obtenerSuscripcionesAsistenteTareas, // Para saber a qué está suscrito
    crearSuscripcionAsistenteTarea,    // Para el botón Suscribir
    // La cancelación se maneja en la página de detalle/suscripción
} from '@/app/admin/_lib/asistenteTareasSuscripciones.actions'; // Asegúrate que el path sea correcto
import { Tarea, CategoriaTarea, AsistenteTareaSuscripcion } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';
import { Loader2, ListX, SearchIcon, ListChecks, Eye, BadgeCheck, Settings, CheckCircle } from 'lucide-react'; // Iconos actualizados

// Tipo para las tareas que mostraremos en la lista
type TareaEnLista = Pick<Tarea, 'id' | 'nombre' | 'descripcion' | 'precio' | 'categoriaTareaId'>;

interface Props {
    asistenteId?: string; // AsistenteId es opcional, define el contexto
}

export default function MarketplaceLista({ asistenteId }: Props) {
    const [tareas, setTareas] = useState<TareaEnLista[]>([]);
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    // Estado para saber a qué IDs de tarea está suscrito el asistente actual
    const [suscritoTaskIds, setSuscritoTaskIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true); // Carga inicial de tareas y categorías
    const [loadingSuscripciones, setLoadingSuscripciones] = useState(false); // Carga de suscripciones (si aplica)
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null); // ID de la tarea cuya acción está en curso
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null); // Errores de Suscribir/Cancelar
    const [actionSuccess, setActionSuccess] = useState<string | null>(null); // Mensajes de éxito
    const [filtroTexto, setFiltroTexto] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('all');
    const router = useRouter();

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    const filterButtonBase = "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150";
    const filterButtonActive = "bg-blue-600 text-white";
    const filterButtonInactive = "bg-zinc-700 text-zinc-300 hover:bg-zinc-600";
    const tableClasses = "table-fixed w-full text-left text-zinc-300 border-collapse";
    const thClasses = "px-4 py-2 border-b border-zinc-700 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider";
    const tdClasses = "px-4 py-3 border-b border-zinc-700 text-sm";
    const trClasses = "hover:bg-zinc-700/50 transition-colors"; // Quitado cursor-pointer por defecto
    // Botones de acción en tabla
    const buttonTableBase = "text-white text-xs font-medium px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out flex items-center justify-center gap-1 disabled:opacity-50";
    const buttonSubscribe = `${buttonTableBase} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
    const buttonManage = `${buttonTableBase} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`;
    const buttonDetails = `${buttonTableBase} bg-sky-600 hover:bg-sky-700 focus:ring-sky-500`;


    // --- Carga de datos inicial (Tareas y Categorías) ---
    useEffect(() => {
        setLoading(true); setError(null);
        const fetchBaseData = async () => {
            try {
                const [tareasData, categoriasData] = await Promise.all([obtenerTareasActivas(), obtenerCategorias()]);
                const tareasMapped = tareasData.map((item: Tarea) => ({
                    id: item.id, nombre: item.nombre || 'Sin nombre',
                    descripcion: item.descripcion ?? '', precio: item.precio,
                    categoriaTareaId: item.categoriaTareaId,
                }));
                setTareas(tareasMapped);
                setCategorias(categoriasData);
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
            setSuscritoTaskIds(new Set()); // Limpiar si no hay asistente
            setLoadingSuscripciones(false);
            return;
        }
        setLoadingSuscripciones(true);
        setActionError(null); // Limpiar errores de acción al recargar
        try {
            const suscripcionesData = await obtenerSuscripcionesAsistenteTareas(asistenteId);
            const ids = new Set(suscripcionesData.map(sub => sub.tareaId));
            setSuscritoTaskIds(ids);
        } catch (err) {
            console.error("Error fetching suscripciones:", err);
            setActionError("Error al cargar suscripciones del asistente.");
            setSuscritoTaskIds(new Set());
        } finally {
            setLoadingSuscripciones(false);
        }
    }, [asistenteId]);

    useEffect(() => {
        fetchSuscripciones();
    }, [fetchSuscripciones]); // Ejecutar cuando cambie asistenteId (contenido en fetchSuscripciones)

    // --- Lógica de Filtrado ---
    const tareasFiltradas = useMemo(() => {
        // ... (sin cambios) ...
        return tareas.filter(tarea => {
            const coincideTexto = tarea.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                tarea.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) || false;
            const coincideCategoria = categoriaSeleccionada === 'all' || tarea.categoriaTareaId === categoriaSeleccionada;
            return coincideTexto && coincideCategoria;
        });
    }, [tareas, filtroTexto, categoriaSeleccionada]);

    // --- Manejador para Suscribir ---
    const handleSuscribir = async (tareaId: string, tareaNombre: string) => {
        if (!asistenteId) return; // Seguridad extra

        if (!confirm(`¿Confirmas suscribir al asistente a la tarea "${tareaNombre}"?`)) return;

        setIsActionLoading(tareaId); // Indicar qué tarea se está procesando
        setActionError(null);
        setActionSuccess(null);

        try {
            const tarea = tareas.find(t => t.id === tareaId); // Obtener precio
            const nuevaSuscripcionData = {
                asistenteVirtualId: asistenteId,
                tareaId: tareaId,
                montoSuscripcion: tarea?.precio ?? null,
                status: 'activo',
            };
            await crearSuscripcionAsistenteTarea(nuevaSuscripcionData as AsistenteTareaSuscripcion);
            setActionSuccess(`Suscrito a "${tareaNombre}"`);
            await fetchSuscripciones(); // Refrescar estado de suscripción
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error("Error al suscribir:", err);
            const message = err instanceof Error ? err.message : "Error desconocido";
            setActionError(`Error al suscribir: ${message}`);
        } finally {
            setIsActionLoading(null); // Limpiar indicador
        }
    };

    // --- Manejador para Gestionar/Ver Suscripción ---
    const handleGestionarSuscripcion = (tareaId: string) => {
        // Navega a la página de detalle de la tarea, pasando el asistenteId
        router.push(`/admin/marketplace/suscripcion/${tareaId}?asistenteId=${asistenteId}`);
    };


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Sección de Filtros (sin cambios) */}
            <div className="mb-4 space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-zinc-400" /></div>
                    <input type="text" placeholder="Buscar tarea..." className={`${inputBaseClasses} pl-9`} value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} />
                </div>
                {!loading && categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-zinc-400 mr-2">Categoría:</span>
                        <button onClick={() => setCategoriaSeleccionada('all')} className={`${filterButtonBase} ${categoriaSeleccionada === 'all' ? filterButtonActive : filterButtonInactive}`}>Todas</button>
                        {categorias.map(cat => (<button key={cat.id} onClick={() => setCategoriaSeleccionada(cat.id)} className={`${filterButtonBase} ${categoriaSeleccionada === cat.id ? filterButtonActive : filterButtonInactive}`}>{cat.nombre}</button>))}
                    </div>
                )}
            </div>

            {/* Mensajes de Acción */}
            {actionError && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50">{actionError}</p>}
            {actionSuccess && <p className="mb-2 text-center text-xs text-green-400 bg-green-900/30 p-1.5 rounded border border-green-600/50 flex items-center justify-center gap-1"><CheckCircle size={14} /> {actionSuccess}</p>}


            {/* Contenido Principal: Tabla o Mensajes */}
            <div className="flex-grow overflow-y-auto border border-zinc-700 rounded-lg">
                {loading || (asistenteId && loadingSuscripciones) ? ( // Mostrar carga si se carga base O suscripciones
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : tareasFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>{filtroTexto || categoriaSeleccionada !== 'all' ? 'No hay tareas que coincidan.' : 'No hay tareas disponibles.'}</p></div>
                ) : (
                    <table className={tableClasses}>
                        <thead className="bg-zinc-900/50 sticky top-0 z-10">
                            <tr>
                                <th className={`${thClasses} w-[65%]`}>Tarea</th>{/* Más ancho para nombre/desc/cat */}
                                <th className={`${thClasses} w-[15%] text-right`}>Precio</th>
                                <th className={`${thClasses} w-[20%]`}>Acción</th>{/* Columna de acción */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                            {tareasFiltradas.map((tarea) => {
                                const isSuscrito = asistenteId && tarea.id ? suscritoTaskIds.has(tarea.id) : false;
                                const isLoadingAction = isActionLoading === tarea.id;

                                return (
                                    <tr key={tarea.id} className={trClasses}>
                                        {/* Celda Tarea */}
                                        <td className={tdClasses}>
                                            <div className="flex flex-col">
                                                <span className='font-medium text-zinc-100'>{tarea.nombre}</span>
                                                <span className='text-xs text-zinc-400 mt-0.5 line-clamp-1'>{tarea.descripcion || <span className='italic text-zinc-600'>Sin descripción</span>}</span>
                                                <span className="mt-1 inline-block text-xs text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded w-fit">
                                                    {categorias.find(cat => cat.id === tarea.categoriaTareaId)?.nombre || 'General'}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Celda Precio */}
                                        <td className={`${tdClasses} text-green-400 font-medium text-right`}>
                                            {typeof tarea.precio === 'number' ? `$${tarea.precio.toFixed(2)}` : <span className='text-xs italic text-zinc-500'>Gratis</span>}
                                        </td>
                                        {/* Celda Acción Condicional */}
                                        <td className={tdClasses}>
                                            {asistenteId ? ( // Si estamos en contexto de asistente...
                                                isSuscrito ? ( // ...y está suscrito
                                                    <button
                                                        onClick={() => handleGestionarSuscripcion(tarea.id ?? '')}
                                                        className={buttonManage}
                                                        title="Gestionar Suscripción"
                                                        disabled={isLoadingAction}
                                                    >
                                                        <Settings size={14} /> Gestionar
                                                    </button>
                                                ) : ( // ...y NO está suscrito
                                                    <button
                                                        onClick={() => tarea.id && tarea.nombre && handleSuscribir(tarea.id, tarea.nombre)}
                                                        className={buttonSubscribe}
                                                        title="Suscribir Asistente"
                                                        disabled={isLoadingAction}
                                                    >
                                                        {isLoadingAction ? <Loader2 className='animate-spin' size={14} /> : <BadgeCheck size={14} />}
                                                        Suscribir
                                                    </button>
                                                )
                                            ) : ( // Si NO estamos en contexto de asistente
                                                <button
                                                    onClick={() => router.push(`/admin/marketplace/suscripcion/${tarea.id}`)}
                                                    className={buttonDetails} // Usar un estilo diferente (ej: azul cielo)
                                                    title="Ver Detalles"
                                                >
                                                    <Eye size={14} /> Ver Detalles
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
