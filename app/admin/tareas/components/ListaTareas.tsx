// Ruta relativa desde app/: admin/tareas/components/ListaTareas.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- DnD Imports ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

import {
    // OrdenarTareasInput, // Ya no se usa directamente si ActualizarOrdenTareasPorGrupoInputSchema es el nuevo
    ActualizarOrdenTareasPorGrupoInput, // Importar el nuevo tipo de input
    CategoriaTareaSimple, // Se mantiene
    TareaConDetalles // Se mantiene, asumiendo que está actualizada
} from '@/app/admin/_lib/actions/tarea/tarea.schemas';

import {
    obtenerTareasConDetalles,
    // obtenerCategoriasParaFiltro, // Aunque los botones se quitan, podría usarse para obtener nombres de categoría si no vienen en todasLasTareas
    actualizarOrdenTareas // Acción refactorizada
} from '@/app/admin/_lib/actions/tarea/tarea.actions';

import { Loader2, Search, GripVertical, Image as ImageIcon, GalleryHorizontal, PlusIcon, ListFilter } from 'lucide-react';
import { Input } from "@/app/components/ui/input";

// --- Interfaz para un Grupo de Tareas ---
interface GrupoDeTareas {
    categoriaInfo: CategoriaTareaSimple & { id: string | null }; // id puede ser null para "Sin Categoría"
    tareas: TareaConDetalles[];
}

// --- Componente SortableTableRow (Sin cambios funcionales mayores, pero usado en nuevo contexto) ---
function SortableTableRow({ id, tarea, onRowClick }: { id: string; tarea: TareaConDetalles; onRowClick: (id: string) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        // Añadir un backgroundColor si está siendo arrastrado para mejor feedback visual
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : undefined, // Ejemplo: blue-500 con opacidad
    };

    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";
    const tagClasses = "text-[0.65rem] px-1.5 py-0.5 rounded-full inline-block mr-1 mb-1 whitespace-nowrap";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onRowClick(tarea.id);
    };

    const ejecucionesCount = tarea._count?.TareaEjecutada ?? 0;
    const galeriaCount = tarea._count?.TareaGaleria ?? 0;
    // const categoriaColor = tarea.CategoriaTarea?.color || '#FFFFFF'; // Default color si no hay

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg' : ''}`}
            onClick={handleRowClickInternal}
            title={`Ver/Editar Tarea: ${tarea.nombre}`}
        >
            <td className={`${tdClasses} text-center w-10`}>
                <button
                    {...attributes} {...listeners} data-dnd-handle="true"
                    className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </button>
            </td>
            <td className={`${tdClasses} text-center w-8`}>
                {tarea.iconoUrl ? <ImageIcon size={12} className="text-blue-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            <td className={`${tdClasses} text-center w-8`}>
                {galeriaCount > 0 ? <GalleryHorizontal size={12} className="text-purple-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            <td className={`${tdClasses} font-medium text-zinc-100 max-w-[200px] truncate`}>
                <span title={tarea.nombre}>{tarea.nombre}</span>
            </td>
            {/* Categoría no se muestra por fila, ya que estarán agrupadas, pero puedes mantenerla si lo deseas para info extra */}
            {/* <td className={tdClasses}> ... </td> */}
            <td className={`${tdClasses} max-w-[150px]`}>
                {tarea.etiquetas && tarea.etiquetas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {tarea.etiquetas.slice(0, 2).map(({ etiquetaTarea }, index) =>
                            etiquetaTarea ? (
                                <span key={etiquetaTarea.id || index} className={`${tagClasses} bg-teal-900/70 text-teal-300 border border-teal-700/50`}>
                                    {etiquetaTarea.nombre}
                                </span>
                            ) : null
                        )}
                        {tarea.etiquetas.length > 2 && <span className={`${tagClasses} bg-zinc-700 text-zinc-400`}>...</span>}
                    </div>
                ) : <span className="text-zinc-600 italic text-xs">Ninguna</span>}
            </td>
            <td className={`${tdClasses} text-right w-16`}>
                {tarea.precio != null && tarea.precio > 0 ? (
                    <span className="font-semibold text-emerald-400">${tarea.precio.toFixed(2)}</span>
                ) : <span className="text-zinc-600">-</span>}
            </td>
            <td className={`${tdClasses} text-center w-16 ${ejecucionesCount > 0 ? 'text-cyan-300 font-medium' : 'text-zinc-500'}`}>
                {ejecucionesCount}
            </td>
            <td className={`${tdClasses} text-center w-20`}>
                <span className={`font-medium px-2 py-0.5 rounded-full text-[10px] ${tarea.status === 'activo' ? 'bg-green-500/20 text-green-300' : 'bg-zinc-600/50 text-zinc-400'}`}>
                    {tarea.status.charAt(0).toUpperCase() + tarea.status.slice(1)}
                </span>
            </td>
        </tr>
    );
}

// --- Componente Principal ListaTareas ---
export default function ListaTareas() {
    const router = useRouter();
    const [todasLasTareas, setTodasLasTareas] = useState<TareaConDetalles[]>([]);
    // const [categoriasFiltro, setCategoriasFiltro] = useState<CategoriaTareaSimple[]>([]); // Se podría usar para los nombres de categoría si es necesario
    const [filtroNombre, setFiltroNombre] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases Tailwind
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500 h-8";
    const primaryButtonClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md flex items-center gap-1 whitespace-nowrap";

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const tareasResult = await obtenerTareasConDetalles(); // Asume que esto ya ordena por categoría y luego por orden interno

            if (tareasResult.success) {
                setTodasLasTareas(tareasResult.data || []);
            } else {
                throw new Error(tareasResult.error || "Error desconocido cargando tareas.");
            }

            // Ya no necesitamos cargar categorías por separado para los botones de filtro
            // pero podrías quererlas para mostrar nombres si no vienen en todasLasTareas bien.
            // Por ahora, asumimos que CategoriaTarea en TareaConDetalles es suficiente.

        } catch (err: unknown) {
            console.error("Error fetching data:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error al cargar los datos.");
            setTodasLasTareas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Lógica de Filtrado por Nombre ---
    const tareasFiltradasPorNombre = useMemo(() => {
        if (!filtroNombre.trim()) {
            return todasLasTareas;
        }
        const lowerFiltroNombre = filtroNombre.toLowerCase();
        return todasLasTareas.filter(t =>
            t.nombre.toLowerCase().includes(lowerFiltroNombre)
        );
    }, [filtroNombre, todasLasTareas]);

    // --- Lógica para Agrupar Tareas por Categoría ---
    const gruposDeTareas = useMemo((): GrupoDeTareas[] => {
        const gruposMap = new Map<string | null, TareaConDetalles[]>();
        const categoriasInfoMap = new Map<string | null, CategoriaTareaSimple & { id: string | null }>();

        // Agrupa tareas
        tareasFiltradasPorNombre.forEach(tarea => {
            const key = tarea.categoriaTareaId; // puede ser null
            if (!gruposMap.has(key)) {
                gruposMap.set(key, []);
                if (tarea.CategoriaTarea) {
                    categoriasInfoMap.set(key, { ...tarea.CategoriaTarea, id: tarea.CategoriaTarea.id });
                } else if (key === null && !categoriasInfoMap.has(null)) { // Solo añadir "Sin Categoría" una vez
                    categoriasInfoMap.set(null, { id: '', nombre: 'Sin Categoría', color: '#71717a' }); // zinc-500
                }
            }
            gruposMap.get(key)!.push(tarea);
        });

        // Convierte el Map a un Array de GrupoDeTareas, manteniendo el orden de categorías que viene de la DB
        // (Gracias al `orderBy` en `obtenerTareasConDetalles`)
        const resultadoAgrupado: GrupoDeTareas[] = [];
        const categoriasUnicasVistas: (string | null)[] = [];

        // Primero, itera sobre las tareas para respetar el orden de aparición de categorías
        // dado por el `orderBy` del backend
        tareasFiltradasPorNombre.forEach(tarea => {
            const catId = tarea.categoriaTareaId;
            if (!categoriasUnicasVistas.includes(catId)) {
                categoriasUnicasVistas.push(catId);
                const info = tarea.CategoriaTarea
                    ? { ...tarea.CategoriaTarea, id: tarea.CategoriaTarea.id }
                    : { id: '', nombre: 'Sin Categoría', color: '#71717a' }; // zinc-500

                resultadoAgrupado.push({
                    categoriaInfo: info,
                    tareas: gruposMap.get(catId) || [] // Ya están ordenadas por 'orden' intra-categoría
                });
            }
        });

        return resultadoAgrupado;

    }, [tareasFiltradasPorNombre]);


    // --- DnD Handlers ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Necesitamos encontrar a qué grupo pertenecen active y over.
            // Y asegurarnos que el movimiento es dentro del mismo grupo.
            let activeCategoriaId: string | null = null;
            let overCategoriaId: string | null = null;
            let activeGrupoIndex = -1;
            // let overGrupoIndex = -1;

            // Encuentra los grupos de active y over
            for (let i = 0; i < gruposDeTareas.length; i++) {
                if (gruposDeTareas[i].tareas.some(t => t.id === active.id)) {
                    activeCategoriaId = gruposDeTareas[i].categoriaInfo.id;
                    activeGrupoIndex = i;
                }
                if (gruposDeTareas[i].tareas.some(t => t.id === over.id)) {
                    overCategoriaId = gruposDeTareas[i].categoriaInfo.id;
                    // overGrupoIndex = i;
                }
            }

            // Solo proceder si el drag es dentro de la misma categoría
            if (activeCategoriaId !== overCategoriaId || activeGrupoIndex === -1) {
                console.warn("Intento de arrastre entre categorías o grupo no encontrado. No permitido.");
                return;
            }

            const grupoAfectado = gruposDeTareas[activeGrupoIndex];
            const oldIndex = grupoAfectado.tareas.findIndex((t) => t.id === active.id);
            const newIndex = grupoAfectado.tareas.findIndex((t) => t.id === over.id);

            if (oldIndex === -1 || newIndex === -1) return;

            // 1. Reordenar el estado local 'gruposDeTareas' para UI inmediata
            const tareasReordenadasDelGrupo = arrayMove(grupoAfectado.tareas, oldIndex, newIndex);

            // Actualizar el estado 'gruposDeTareas' de forma inmutable
            // Eliminado: const nuevosGruposDeTareas = gruposDeTareas.map((grupo, index) => {
            //     if (index === activeGrupoIndex) {
            //         return { ...grupo, tareas: tareasReordenadasDelGrupo };
            //     }
            //     return grupo;
            // });
            // Si `gruposDeTareas` es un estado, usar `setGruposDeTareas(nuevosGruposDeTareas)`.
            // Como es un `useMemo`, necesitamos actualizar `todasLasTareas` para que se recalcule.
            // Esto es un poco más complejo si no quieres recargar todo.
            // Una solución más directa es hacer `gruposDeTareas` un estado y actualizarlo aquí.
            // Por ahora, asumiremos que `todasLasTareas` se actualizará y `gruposDeTareas` se recalculará.
            // (VER NOTA AL FINAL SOBRE ESTADO PARA GRUPOS)


            // 2. Asignar nuevo orden 0-based DENTRO DEL GRUPO
            const tareasConNuevoOrdenParaBackend = tareasReordenadasDelGrupo.map((t, index) => ({
                id: t.id,
                orden: index,
            }));

            // Para la UI, actualizamos `todasLasTareas` para reflejar el nuevo orden
            // Esto es una simplificación; idealmente, se actualizaría el orden solo de las tareas afectadas.
            const updatedTodasLasTareas = todasLasTareas.map(t => {
                const tareaActualizadaEnGrupo = tareasReordenadasDelGrupo.find(tg => tg.id === t.id);
                if (tareaActualizadaEnGrupo && t.categoriaTareaId === activeCategoriaId) {
                    const nuevoOrdenLocal = tareasReordenadasDelGrupo.findIndex(tg => tg.id === t.id);
                    return { ...t, orden: nuevoOrdenLocal };
                }
                return t;
            }).sort((a, b) => { // Re-aplicar el sort principal para que `gruposDeTareas` se reconstruya correctamente
                // Lógica de ordenamiento similar a la del backend
                const catA = a.categoriaTareaId;
                const catB = b.categoriaTareaId;
                const nombreCatA = a.CategoriaTarea?.nombre ?? '';
                const nombreCatB = b.CategoriaTarea?.nombre ?? '';

                if (catA === null && catB !== null) return -1; // nulls first
                if (catA !== null && catB === null) return 1;
                if (catA !== null && catB !== null) {
                    // Aquí podrías ordenar por CategoriaTarea.orden si existiera
                    if (nombreCatA < nombreCatB) return -1;
                    if (nombreCatA > nombreCatB) return 1;
                }
                // Si están en la misma categoría (o ambas sin categoría), ordenar por su 'orden' interno
                return (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre);
            });
            setTodasLasTareas(updatedTodasLasTareas);


            // 3. Preparar datos para la acción del servidor
            const inputParaAccion: ActualizarOrdenTareasPorGrupoInput = {
                categoriaTareaId: activeCategoriaId,
                tareasOrdenadas: tareasConNuevoOrdenParaBackend,
            };

            setIsSavingOrder(true);
            setError(null);
            try {
                const result = await actualizarOrdenTareas(inputParaAccion);
                if (!result.success) {
                    console.error('Error al guardar orden:', result.error, result.validationErrors);
                    setError(result.error || 'Error al guardar el nuevo orden. Recargando datos...');
                    // Si falla, recargar desde BD para consistencia
                    // La actualización de `todasLasTareas` ya ocurrió, pero una recarga forzada es más segura
                    await fetchData();
                } else {
                    // La UI ya se actualizó optimistamente.
                    // Si quieres asegurar 100% consistencia podrías hacer un fetchData() aquí también,
                    // pero puede causar un parpadeo. La actualización optimista de `todasLasTareas`
                    // debería ser suficiente si la lógica de ordenamiento es idéntica al backend.
                    console.log("Orden guardado exitosamente para categoría:", activeCategoriaId);
                }
            } catch (saveError: unknown) {
                console.error('Error crítico al llamar actualizarOrdenTareas:', saveError);
                setError('Error crítico al guardar el orden. Recargando datos...');
                await fetchData();
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [gruposDeTareas, fetchData, todasLasTareas]); // Añadir todasLasTareas a dependencias

    const handleRowClick = (tareaId: string) => {
        router.push(`/admin/tareas/${tareaId}`);
    };

    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-zinc-700 pb-3">
                <h3 className="text-base font-semibold text-white whitespace-nowrap">Marketplace de Tareas</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isSavingOrder && (
                        <span className='text-xs text-blue-400 flex items-center gap-1 animate-pulse'>
                            <Loader2 size={12} className='animate-spin' /> Guardando orden...
                        </span>
                    )}
                    <Link href="/admin/tareas/nueva" className={`${primaryButtonClasses} !px-2.5 !py-1.5 !text-xs w-full sm:w-auto justify-center`}>
                        <PlusIcon size={14} /> Nueva Tarea
                    </Link>
                </div>
            </div>

            <div className="mb-4 space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filtroNombre}
                        onChange={(e) => setFiltroNombre(e.target.value)}
                        className={`${inputBaseClasses} pl-7`}
                        disabled={loading}
                    />
                </div>
                {/* Filtros por categoría eliminados según tu indicación */}
            </div>

            {error && !loading && (
                <p className="mb-3 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600">
                    {error}
                </p>
            )}

            <div className="flex-grow overflow-auto -mx-4 -mb-4 border-t border-zinc-700 bg-zinc-900/30 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400 h-60">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Cargando tareas...</span>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <table className="min-w-full">
                            <thead className="bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Mover"></th>
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Icono">I</th>
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Galería">G</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre Tarea</th>
                                    {/* Columna Categoría eliminada de la fila, ya que es una cabecera de grupo */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Etiquetas</th>
                                    <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider w-16">Precio</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-16" title="Ejecuciones">Ejec.</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Status</th>
                                </tr>
                            </thead>
                            {/* El tbody se renderizará por cada grupo */}
                            {gruposDeTareas.length === 0 && !error && !loading ? (
                                <tbody>
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-sm text-zinc-500 italic">
                                            <ListFilter className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                            No se encontraron tareas con los filtros aplicados.
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                gruposDeTareas.map((grupo) => (
                                    <React.Fragment key={grupo.categoriaInfo.id || 'sin-categoria'}>
                                        {/* Cabecera de Categoría */}
                                        <thead className="sticky top-10 z-[9]">{/* Ajusta el top según la altura de tu thead principal */}
                                            <tr className="bg-zinc-700/60 backdrop-blur-sm">
                                                <td colSpan={8} className="px-3 py-1.5 text-xs font-semibold text-white tracking-wide"
                                                    style={{ borderBottom: `2px solid ${grupo.categoriaInfo.color || '#52525b'}` }}> {/* zinc-600 */}
                                                    {grupo.categoriaInfo.nombre}
                                                    <span className="ml-2 text-zinc-400 font-normal">({grupo.tareas.length} {grupo.tareas.length === 1 ? 'tarea' : 'tareas'})</span>
                                                </td>
                                            </tr>
                                        </thead>
                                        {/* Cuerpo de la tabla para este grupo con su propio SortableContext */}
                                        <SortableContext items={grupo.tareas.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                            <tbody className="divide-y divide-zinc-800">
                                                {grupo.tareas.map((tarea) => (
                                                    <SortableTableRow key={tarea.id} id={tarea.id} tarea={tarea} onRowClick={handleRowClick} />
                                                ))}
                                            </tbody>
                                        </SortableContext>
                                    </React.Fragment>
                                ))
                            )}
                        </table>
                    </DndContext>
                )}
                {!loading && todasLasTareas.length > 0 && gruposDeTareas.length > 0 && (
                    <p className="text-xs text-center text-zinc-500 mt-3 px-4 pb-2 italic">
                        Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-1 mx-0.5' /> para reordenar tareas dentro de su categoría.
                    </p>
                )}
            </div>
        </div>
    );
}