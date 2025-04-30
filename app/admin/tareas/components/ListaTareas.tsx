'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    obtenerTareasConDetalles,
    obtenerCategorias,
    actualizarOrdenTareas
} from '@/app/admin/_lib/tareas.actions'; // Ajusta ruta
import { TareaConDetalles, CategoriaTarea } from '@/app/admin/_lib/types'; // Ajusta ruta
import { Loader2, Search, ListFilter, GripVertical, Image as ImageIcon, GalleryHorizontal, Check } from 'lucide-react'; // Añadido PlayCircle

// Dnd Imports
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Componente SortableTableRow (con nueva columna) ---
function SortableTableRow({ id, tarea, onRowClick }: { id: string; tarea: TareaConDetalles; onRowClick: (id: string) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";
    const tagClasses = "text-[0.65rem] px-1.5 py-0.5 rounded-full inline-block mr-1 mb-1";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('button[data-dnd-handle="true"]')) return;
        onRowClick(tarea.id);
    };

    const ejecucionesCount = tarea._count?.TareaEjecutada ?? 0; // Obtener conteo

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500' : ''}`}
            onClick={handleRowClickInternal}
        >
            {/* Celda Handle DnD */}
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
            {/* Celda Icono */}
            <td className={`${tdClasses} text-center w-8`}>
                {tarea.iconoUrl ? <ImageIcon size={12} className="text-blue-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            {/* Celda Galería */}
            <td className={`${tdClasses} text-center w-8`}>
                {(tarea._count?.TareaGaleria ?? 0) > 0 ? <GalleryHorizontal size={12} className="text-purple-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            {/* Celda Nombre Tarea */}
            <td className={`${tdClasses} font-medium text-zinc-100`}>
                {tarea.nombre}
                {tarea.tareaFuncion && <span className="block text-[0.7rem] text-blue-400/80 font-normal" title={`Función: ${tarea.tareaFuncion.nombreVisible}`}>Fn: {tarea.tareaFuncion.nombreVisible}</span>}
            </td>
            {/* Celda Categoría */}
            <td className={tdClasses}>
                {tarea.CategoriaTarea ? <span className={`${tagClasses} bg-gray-700 text-gray-200`}>{tarea.CategoriaTarea.nombre}</span> : <span className="text-zinc-600 italic">N/A</span>}
            </td>
            {/* Celda Etiquetas */}
            <td className={tdClasses}>
                {tarea.etiquetas && tarea.etiquetas.length > 0 ? (
                    <div className="flex flex-wrap">
                        {tarea.etiquetas.map(({ etiquetaTarea }) => etiquetaTarea ? <span key={etiquetaTarea.id} className={`${tagClasses} bg-teal-900/70 text-teal-300`}>{etiquetaTarea.nombre}</span> : null)}
                    </div>
                ) : <span className="text-zinc-600 italic">Ninguna</span>}
            </td>
            {/* Celda Precio */}
            <td className={`${tdClasses} text-right w-16`}>
                {tarea.precio != null && tarea.precio > 0 ? <span className="font-semibold text-emerald-400">${tarea.precio.toFixed(2)}</span> : <span className="text-zinc-600">-</span>}
            </td>
            {/* --- NUEVA CELDA: Ejecuciones --- */}
            <td className={`${tdClasses} text-center w-16 ${ejecucionesCount > 0 ? 'text-cyan-300' : 'text-zinc-500'}`}>
                {ejecucionesCount}
            </td>
            {/* Celda Status */}
            <td className={`${tdClasses} text-center w-20`}>
                <span className={`font-medium px-2 py-0.5 rounded-full ${tarea.status === 'activo' ? 'bg-green-500/20 text-green-300' : 'bg-zinc-600/50 text-zinc-400'}`}>{tarea.status === 'activo' ? 'Activa' : 'Inactiva'}</span>
            </td>
        </tr>
    );
}

// --- Componente Principal ListaTareas ---
export default function ListaTareas() {
    const router = useRouter();
    const [todasLasTareas, setTodasLasTareas] = useState<TareaConDetalles[]>([]);
    const [tareasFiltradas, setTareasFiltradas] = useState<TareaConDetalles[]>([]);
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases Tailwind
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500";
    const categoryButtonBase = "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-150 flex items-center gap-1";
    const categoryButtonInactive = "bg-zinc-700/50 border-zinc-600 text-zinc-300 hover:bg-zinc-600/50 hover:border-zinc-500";
    const categoryButtonActive = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-900";
    const primaryButtonClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md flex items-center gap-1 whitespace-nowrap";

    // Carga inicial de datos
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [tareasData, categoriasData] = await Promise.all([
                obtenerTareasConDetalles(), // Esta acción ahora debe incluir _count.TareaEjecutada
                obtenerCategorias()
            ]);
            const tareasTyped = tareasData as TareaConDetalles[] || [];
            setTodasLasTareas(tareasTyped);
            setTareasFiltradas(tareasTyped);
            setCategorias(categoriasData || []);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Error al cargar las tareas o categorías.");
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Lógica de Filtrado
    useEffect(() => {
        let tareasResult = todasLasTareas;
        if (filtroNombre.trim()) {
            tareasResult = tareasResult.filter(t => t.nombre.toLowerCase().includes(filtroNombre.toLowerCase()));
        }
        if (filtroCategoriaId) {
            tareasResult = tareasResult.filter(t => t.categoriaTareaId === filtroCategoriaId);
        }
        setTareasFiltradas(tareasResult);
    }, [filtroNombre, filtroCategoriaId, todasLasTareas]);

    // DnD Handlers
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = tareasFiltradas.findIndex((t) => t.id === active.id);
            const newIndex = tareasFiltradas.findIndex((t) => t.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedTareas = arrayMove(tareasFiltradas, oldIndex, newIndex);
            setTareasFiltradas(reorderedTareas);

            const tareasParaActualizar = reorderedTareas.map((tarea, index) => ({ id: tarea.id, orden: index }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await actualizarOrdenTareas(tareasParaActualizar);
                if (!result.success) {
                    setError(result.error || "Error al guardar el orden.");
                    setTareasFiltradas(arrayMove(reorderedTareas, newIndex, oldIndex));
                } else {
                    const newOrderMap = new Map(tareasParaActualizar.map(t => [t.id, t.orden]));
                    setTodasLasTareas(prev =>
                        prev.map(t => ({ ...t, orden: newOrderMap.get(t.id) ?? t.orden }))
                            .sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity))
                    );
                }
            } catch (err) {
                setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                setTareasFiltradas(arrayMove(reorderedTareas, newIndex, oldIndex));
            } finally { setIsSavingOrder(false); }
        }
    };

    // Navegación
    const handleRowClick = (tareaId: string) => { router.push(`/admin/tareas/${tareaId}`); };

    // Renderizado
    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 border-b border-zinc-700 pb-3">
                <h3 className="text-base font-semibold text-white whitespace-nowrap">Marketplace de Tareas</h3>
                <div className="flex items-center gap-2">
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <Link href="/admin/tareas/nueva" className={`${primaryButtonClasses} !px-2.5 !py-1`}>+ Nueva Tarea</Link>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-4 space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input type="text" placeholder="Buscar por nombre..." value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} className={`${inputBaseClasses} pl-7`} />
                </div>
                <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5">Filtrar por Categoría:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setFiltroCategoriaId('')} className={`${categoryButtonBase} ${filtroCategoriaId === '' ? categoryButtonActive : categoryButtonInactive}`}>
                            {filtroCategoriaId === '' && <Check size={12} className="-ml-0.5" />} Todas
                        </button>
                        {categorias.map(cat => (
                            <button key={cat.id} onClick={() => setFiltroCategoriaId(cat.id)} className={`${categoryButtonBase} ${filtroCategoriaId === cat.id ? categoryButtonActive : categoryButtonInactive}`}>
                                {filtroCategoriaId === cat.id && <Check size={12} className="-ml-0.5" />} {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && <p className="mb-3 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600">{error}</p>}

            {/* Tabla de Tareas */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex-grow overflow-auto -mx-4 -mb-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando tareas...</span></div>
                    ) : (
                        <table className="min-w-full divide-y divide-zinc-700 border-t border-zinc-700">
                            <thead className="bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    {/* --- Cabeceras Actualizadas --- */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10"></th>{/* Handle */}
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Icono">I</th>
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Galería">G</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre Tarea</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Categoría</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Etiquetas</th>
                                    <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider w-16">Precio</th>
                                    {/* --- NUEVA CABECERA: Ejecuciones --- */}
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-16" title="Ejecuciones">Ejec.</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Status</th>
                                </tr>
                            </thead>
                            <SortableContext items={tareasFiltradas.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700">
                                    {tareasFiltradas.length === 0 ? (
                                        <tr><td colSpan={9} className="text-center py-10 text-sm text-zinc-500 italic"><ListFilter className="h-8 w-8 mx-auto text-zinc-600 mb-2" />No se encontraron tareas...</td></tr>
                                    ) : (
                                        tareasFiltradas.map((tarea) => (
                                            <SortableTableRow key={tarea.id} id={tarea.id} tarea={tarea} onRowClick={handleRowClick} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && todasLasTareas.length > 0 && tareasFiltradas.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-3 px-4 pb-2 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-1' /> para reordenar.</p>
                    )}
                </div>
            </DndContext>
        </div>
    );
}
