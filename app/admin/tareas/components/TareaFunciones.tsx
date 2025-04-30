'use client';

import React, { useEffect, useState, useCallback } from 'react';
// --- DnD Imports ---
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

// Ajusta rutas según tu estructura
import {
    obtenerFuncionesTareaConParametros,
    eliminarFuncionTarea, // Solo necesitamos esta y la de ordenar
    actualizarOrdenFunciones,
} from '@/app/admin/_lib/tareaFuncion.actions';
import { TareaFuncion, ParametroRequerido, TareaFuncionParametroRequerido } from '@/app/admin/_lib/types'; // Tipos necesarios
import { Loader2, ListChecks, Trash2, Cog, GripVertical } from 'lucide-react'; // Iconos actualizados

// Interfaz extendida para el estado local
interface FuncionConDetalles extends TareaFuncion {
    parametrosRequeridos?: (TareaFuncionParametroRequerido & {
        parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null;
    })[];
    _count?: { tareas?: number };
    orden?: number; // Asegurarse que el orden está
}

// --- Componente Sortable Item (Modificado: Sin Editar, con Eliminar) ---
function SortableFuncionItem({ id, funcion, onDelete }: { id: string; funcion: FuncionConDetalles; onDelete: (id: string, nombre: string) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases reutilizadas
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start justify-between gap-3";
    const buttonDeleteClasses = "text-red-500 hover:text-red-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"; // Clase para botón eliminar
    const paramTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap";

    const canDelete = (funcion._count?.tareas ?? 0) === 0; // Condición para habilitar borrado

    return (
        <li ref={setNodeRef} style={style} className={`${listItemClasses} ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}>
            {/* Handle para arrastrar */}
            <button
                {...attributes} {...listeners}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 self-center mr-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                aria-label="Arrastrar para reordenar"
            >
                <GripVertical size={16} />
            </button>

            {/* Contenido del item */}
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5" title={funcion.nombreVisible}>
                    {funcion.nombreVisible}
                    <span className="text-xs text-zinc-500 font-mono">({funcion.nombreInterno})</span>
                </p>
                {funcion.descripcion && <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5" title={funcion.descripcion}>{funcion.descripcion}</p>}
                {funcion.parametrosRequeridos && funcion.parametrosRequeridos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-zinc-500 mr-1">Params:</span>
                        {funcion.parametrosRequeridos.map(({ parametroRequerido, esObligatorio }) => parametroRequerido ? (
                            <span key={parametroRequerido.id} className={paramTagClasses} title={`ID: ${parametroRequerido.nombreInterno} | Tipo: ${parametroRequerido.tipoDato}${esObligatorio ? ' (Obligatorio)' : ''}`}>
                                {parametroRequerido.nombreVisible}
                                {esObligatorio && <span className="text-amber-400 ml-0.5">*</span>}
                            </span>
                        ) : null)}
                    </div>
                )}
                {(!funcion.parametrosRequeridos || funcion.parametrosRequeridos.length === 0) && (
                    <p className="text-xs text-zinc-500 italic mt-1.5">Sin parámetros estándar asociados.</p>
                )}
            </div>
            {/* Conteo y Botón Eliminar (Condicional) */}
            <div className="flex items-center gap-3 flex-shrink-0 self-center">
                <span
                    className={`text-xs ${canDelete ? 'text-green-500' : 'text-zinc-500'}`}
                    title={`${funcion._count?.tareas ?? 0} tarea(s) usan esta función`}
                >
                    {funcion._count?.tareas ?? 0} Tareas
                </span>
                {/* Botón Eliminar */}
                <button
                    onClick={() => onDelete(funcion.id, funcion.nombreVisible)}
                    className={buttonDeleteClasses}
                    disabled={!canDelete} // Deshabilitado si hay tareas asociadas
                    title={canDelete ? "Eliminar esta función (no está en uso)" : "No se puede eliminar: función en uso por tareas"}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </li>
    );
}


// --- Componente Principal (Simplificado) ---
export default function TareaFunciones() { // Renombrado
    const [funciones, setFunciones] = useState<FuncionConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null); // ID de la función que se está borrando

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";

    // --- Carga de datos ---
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const funcionesData = await obtenerFuncionesTareaConParametros() as FuncionConDetalles[];
            // Asegurar que 'orden' existe para el estado local, aunque no se use para ordenar la carga inicial
            setFunciones((funcionesData || []).map((f, index) => ({ ...f, orden: f.orden ?? index })));
        } catch (err) {
            console.error("Error al obtener datos:", err);
            setError("No se pudieron cargar las funciones.");
            setFunciones([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(true); }, [fetchData]);

    // --- Manejador de Eliminación ---
    const handleDeleteFuncion = async (id: string, nombre: string) => {
        if (isDeleting) return; // Evitar doble click

        if (confirm(`¿Estás seguro de eliminar la función "${nombre}"?\nEsta acción es irreversible.`)) {
            setIsDeleting(id); // Marcar como borrando
            setError(null);
            try {
                const result = await eliminarFuncionTarea(id);
                if (result?.success) {
                    // Eliminar del estado local para feedback inmediato
                    setFunciones(prev => prev.filter(f => f.id !== id));
                } else {
                    throw new Error(result?.error || "Error desconocido al eliminar.");
                }
            } catch (err) {
                console.error("Error eliminando función:", err);
                setError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally {
                setIsDeleting(null); // Quitar estado de borrado
            }
        }
    };

    // --- DnD Handlers ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = funciones.findIndex((f) => f.id === active.id);
            const newIndex = funciones.findIndex((f) => f.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedFunciones = arrayMove(funciones, oldIndex, newIndex);
            // Actualizar orden en el estado local
            const finalOrder = reorderedFunciones.map((func, index) => ({ ...func, orden: index }));
            setFunciones(finalOrder);

            const funcionesParaActualizar = finalOrder.map(({ id, orden }) => ({ id, orden: orden as number }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await actualizarOrdenFunciones(funcionesParaActualizar);
                if (!result.success) {
                    setError(result.error || "Error al guardar el orden.");
                    // Revertir estado local si falla
                    fetchData(); // Recargar para asegurar consistencia
                }
            } catch (err) {
                setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                fetchData(); // Recargar
            } finally { setIsSavingOrder(false); }
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera Simplificada */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Cog size={16} /> Funciones Globales (Solo Lectura/Eliminar)
                </h3>
                {/* Indicador guardando orden */}
                {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                {/* Botón Crear Eliminado */}
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}

            {/* Contenido Principal: Lista Sortable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={funciones.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <ul className={listContainerClasses}>
                        {loading ? (
                            <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                        ) : funciones.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay funciones definidas.</p></div>
                        ) : (
                            funciones.map((func) => (
                                <SortableFuncionItem
                                    key={func.id}
                                    id={func.id}
                                    funcion={func}
                                    onDelete={handleDeleteFuncion} // Pasar el handler de eliminar
                                />
                            ))
                        )}
                        {!loading && funciones.length > 0 && (
                            <p className="text-xs text-center text-zinc-500 mt-3 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom' /> para reordenar.</p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>

            {/* Modal Eliminado */}
        </div>
    );
}
