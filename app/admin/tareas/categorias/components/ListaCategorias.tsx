'use client';

import React, { useEffect, useState, useCallback } from 'react';
// Ajusta la ruta si es necesario
import { obtenerCategorias, actualizarOrdenCategorias } from '@/app/admin/_lib/categoriaTarea.actions';
import { CategoriaTarea } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ListChecks, ListX, Loader2, PlusIcon, GripVertical } from 'lucide-react'; // Iconos (añadido GripVertical)

// Imports de dnd-kit
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
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Componente Interno para el Item Arrastrable ---
function SortableCategoriaItem({ categoria }: { categoria: CategoriaTarea }) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases reutilizadas
    const listItemClasses = `border border-zinc-700 rounded-lg px-3 py-2 hover:bg-zinc-700 transition-colors duration-150 flex items-center justify-between gap-3 ${isDragging ? 'shadow-lg ring-2 ring-blue-500 bg-zinc-700' : 'bg-zinc-800/50'}`; // Fondo base y efecto drag

    const handleVerDetalle = (e: React.MouseEvent) => {
        // Evitar que el click navegue si se está interactuando con el drag handle
        // (Aunque dnd-kit suele manejar esto bien, es una precaución extra)
        if ((e.target as HTMLElement).closest('[data-dndkit-drag-handle]')) {
            return;
        }
        router.push(`/admin/IA/tareas/categorias/${categoria.id}`);
    };


    return (
        <li ref={setNodeRef} style={style} className={listItemClasses} onClick={handleVerDetalle} title={`Ver detalles de ${categoria.nombre}`}>
            {/* Contenedor Flex principal */}
            <div className="flex items-center flex-grow gap-2 overflow-hidden">
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    data-dndkit-drag-handle // Identificador para el handle
                    className="cursor-grab touch-none p-1 text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                    aria-label="Mover categoría"
                    onClick={(e) => e.stopPropagation()} // Evitar que el click en el handle navegue
                >
                    <GripVertical size={18} />
                </button>

                {/* Contenido (Nombre y Descripción) */}
                <div className="flex-grow overflow-hidden">
                    <p className="text-base font-medium text-zinc-200 truncate">
                        {categoria.nombre}
                    </p>
                    {categoria.descripcion && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1"> {/* line-clamp-1 para descripción corta */}
                            {categoria.descripcion}
                        </p>
                    )}
                </div>
            </div>

            {/* Icono indicador de navegación */}
            <div className="flex-shrink-0">
                <ChevronRightIcon className="h-5 w-5 text-zinc-500" />
            </div>
        </li>
    );
}


// --- Componente Principal ---
export default function ListaCategorias() {
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Estado para guardar orden
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col overflow-y-auto";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out";

    // Sensores para dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Carga inicial de categorías
    useEffect(() => {
        setLoading(true);
        setError(null);
        const fetchCategorias = async () => {
            try {
                const data = await obtenerCategorias();
                // Ordenar por 'orden' al cargar, si existe
                const sortedData = data.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
                const formattedData = sortedData.map((cat, index) => ({
                    ...cat,
                    nombre: cat.nombre || 'Sin nombre',
                    descripcion: cat.descripcion ?? '',
                    orden: cat.orden ?? index + 1, // Asignar orden inicial si no existe
                }));
                setCategorias(formattedData);
            } catch (err) {
                console.error("Error al obtener las categorias:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al cargar las categorias: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        };
        fetchCategorias();
        return () => { setCategorias([]); setLoading(true); setError(null); };
    }, []);

    // Manejador Drag End
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // 1. Reordenar estado local
            const oldIndex = categorias.findIndex((c) => c.id === active.id);
            const newIndex = categorias.findIndex((c) => c.id === over.id);
            const reorderedCategorias = arrayMove(categorias, oldIndex, newIndex);

            // 2. Actualizar 'orden' en el array reordenado
            const finalCategorias = reorderedCategorias.map((cat, index) => ({
                ...cat,
                orden: index + 1, // Asignar nuevo orden basado en índice (1-based)
            }));

            // Actualizar UI inmediatamente (optimista)
            setCategorias(finalCategorias);

            // 3. Preparar datos y guardar en backend
            const ordenData = finalCategorias.map(({ id, orden }) => ({ id, orden: orden as number })); // Asegurar que orden es number
            setIsSaving(true);
            setError(null); // Limpiar error previo de guardado
            try {
                await actualizarOrdenCategorias(ordenData);
                // Opcional: Mostrar éxito brevemente
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden. Por favor, recarga.');
                // Considerar revertir el estado si falla el guardado
                // setCategorias(categorias); // Revertir simple (puede causar salto visual)
            } finally {
                setIsSaving(false);
            }
        }
    }, [categorias]); // Dependencia del estado actual de categorías


    // Navegación
    const handleCrearNueva = () => { router.push('/admin/IA/tareas/categorias/nueva'); };

    // --- Renderizado Condicional ---
    const renderContent = () => {
        if (loading) { /* ... loading ... */ }
        if (error && categorias.length === 0) { /* ... error ... */ } // Mostrar error solo si no hay nada que mostrar
        if (categorias.length === 0 && !loading && !error) { /* ... empty ... */ }

        // --- Renderizado de la Lista Arrastrable ---
        return (
            <div className="flex-grow overflow-y-auto pr-1 relative">
                {/* Indicador de guardado */}
                {isSaving && (
                    <div className="absolute top-1 right-1 z-20 flex items-center text-xs text-blue-300 bg-zinc-900/80 px-2 py-1 rounded-full border border-blue-500/50">
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                        Guardando orden...
                    </div>
                )}
                {/* Error de guardado (si no es error de carga inicial) */}
                {error && !loading && (
                    <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50">{error}</p>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={categorias.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <ul className='space-y-2'>
                            {categorias.map((categoria) => (
                                <SortableCategoriaItem key={categoria.id} categoria={categoria} />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            </div>
        );
    };


    // --- Renderizado del Componente ---
    if (loading) { /* ... loading state ... */ }
    if (error) { /* ... error state ... */ }

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className="flex items-center justify-between mb-4 border-b border-zinc-700 pb-2">
                <h3 className="text-lg font-semibold text-white">Categorías</h3>
                <div className="flex items-center gap-2">
                    <button onClick={handleCrearNueva} className={buttonPrimaryClasses} title="Crear una nueva categoría">
                        <PlusIcon size={16} /><span>Crear nueva categoría</span>
                    </button>

                    <button onClick={() => router.back()} className={`${buttonPrimaryClasses} bg-zinc-900  rounded-md text-sm font-medium text-zinc-300 hover:text-zinc-200 flex items-center gap-2`}>
                        Cerrar ventana
                    </button>
                </div>
            </div>
            {/* Contenido */}
            {loading ? (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10">
                    <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mb-2" /> <p className="text-zinc-400 text-sm">Cargando categorías...</p>
                </div>
            ) : error && categorias.length === 0 ? ( // Mostrar error solo si no hay datos
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10 border border-red-500/50 rounded-md m-4">
                    <ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p>
                </div>
            ) : categorias.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10">
                    <ListChecks className="h-8 w-8 text-zinc-500 mb-2" /> <p className='text-zinc-400 italic text-sm'>No hay categorías definidas.</p>
                </div>
            ) : (
                renderContent() // Renderiza la lista arrastrable
            )}
        </div>
    );
}
