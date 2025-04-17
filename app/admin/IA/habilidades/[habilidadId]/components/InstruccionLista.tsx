'use client';

import React, { useEffect, useState } from 'react';
import {
    obtenerInstrucciones,
    actualizarOrdenInstrucciones, // Importar la nueva acción
} from '@/app/admin/_lib/instruccion.actions';
import { Instruccion } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ListX, Loader2, GripVertical } from 'lucide-react'; // Importar iconos necesarios
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

interface Props {
    habilidadId: string;
}

// --- Componente Interno para el Item Arrastrable ---
function SortableInstruccionItem({ instruccion, habilidadId }: { instruccion: Instruccion, habilidadId: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging, // Estado para saber si se está arrastrando
    } = useSortable({ id: instruccion.id ?? 'fallback-id' });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1, // Efecto visual al arrastrar
        zIndex: isDragging ? 10 : undefined, // Asegurar que esté por encima al arrastrar
    };

    // Clases reutilizadas del componente padre
    const listItemClasses = "border border-zinc-700 rounded-lg p-4 bg-zinc-800"; // Fondo base para el item
    const detailBoxClasses = "text-sm p-2 rounded-md border";
    const detailLabelClasses = "text-zinc-400 text-xs block mb-0.5";
    const detailValueClasses = "font-semibold text-zinc-300";
    const detailValueItalicClasses = "italic text-zinc-500";

    const router = useRouter();

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`${listItemClasses} ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`} // Añadir sombra o anillo al arrastrar
        >
            <div className="flex items-center justify-between w-full">
                {/* Handle para arrastrar (opcional pero mejora UX) */}
                <div {...attributes} {...listeners} className="cursor-grab touch-none p-2 mr-2 text-zinc-500 hover:text-zinc-300">
                    <GripVertical size={18} />
                </div>

                {/* Contenido principal */}
                <div className="flex-grow mr-4 cursor-pointer" onClick={() => router.push(`/admin/IA/habilidades/instruccion/${instruccion.id}?habilidadId=${habilidadId}`)}>
                    <p className="text-lg font-semibold text-zinc-200 hover:text-blue-400">
                        {instruccion.nombre}
                    </p>
                    {instruccion.descripcion && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                            {instruccion.descripcion}
                        </p>
                    )}
                    {/* Grid para Trigger y Automatización */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3'>
                        {/* Caja Trigger */}
                        <div className={`${detailBoxClasses} ${instruccion.trigger ? 'border-green-500/50' : 'border-amber-500/50'} bg-zinc-900`}>
                            <span className={detailLabelClasses}>Trigger:</span>
                            {instruccion.trigger ? (
                                <p className={detailValueClasses}>{instruccion.trigger}</p>
                            ) : (
                                <p className={detailValueItalicClasses}>No definido</p>
                            )}
                        </div>
                        {/* Caja Automatización */}
                        <div className={`${detailBoxClasses} ${instruccion.automatizacion ? 'border-green-500/50' : 'border-amber-500/50'} bg-zinc-900`}>
                            <span className={detailLabelClasses}>Automatización:</span>
                            {instruccion.automatizacion ? (
                                <p className={detailValueClasses}>{instruccion.automatizacion}</p>
                            ) : (
                                <p className={detailValueItalicClasses}>No definida</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Icono indicador de click (se mantiene) */}
                <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push(`/admin/IA/habilidades/instruccion/${instruccion.id}?habilidadId=${habilidadId}`)}>
                    <ChevronRightIcon className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300" />
                </div>
            </div>
        </li>
    );
}


// --- Componente Principal ---
export default function InstruccionLista({ habilidadId }: Props) {
    const [instrucciones, setInstrucciones] = useState<Instruccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // Estado para guardar orden
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md";

    // Configuración de sensores para dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Efecto para cargar instrucciones
    useEffect(() => {
        if (!habilidadId) {
            setError("No se proporcionó ID de habilidad.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        obtenerInstrucciones(habilidadId)
            .then((data) => {
                // Ordenar por 'orden' si existe, sino por defecto
                const sortedData = data.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
                const formattedData = sortedData.map((item, index) => ({
                    ...item,
                    instruccion: item.instruccion ?? '',
                    // Asegurar que 'orden' exista si no viene de la BD inicialmente
                    orden: item.orden ?? index + 1,
                }));
                setInstrucciones(formattedData);
            })
            .catch((error) => {
                console.error('Error al obtener las instrucciones:', error);
                setError("No se pudieron cargar las instrucciones.");
            })
            .finally(() => {
                setLoading(false);
            });

        return () => {
            setInstrucciones([]);
            setLoading(true);
            setError(null);
        };
    }, [habilidadId]);

    // Manejador para cuando termina el arrastre
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // 1. Reordenar en el estado local
            const oldIndex = instrucciones.findIndex((item) => item.id === active.id);
            const newIndex = instrucciones.findIndex((item) => item.id === over.id);
            const reorderedInstrucciones = arrayMove(instrucciones, oldIndex, newIndex);

            // 2. Actualizar la propiedad 'orden' en base al nuevo índice
            const finalInstrucciones = reorderedInstrucciones.map((item, index) => ({
                ...item,
                orden: index + 1, // Asignar orden basado en la posición (1-based)
            }));

            // Actualizar estado local inmediatamente para UI optimista
            setInstrucciones(finalInstrucciones);

            // 3. Llamar a la acción para guardar en el backend
            setIsSaving(true);
            setError(null); // Limpiar errores previos de guardado
            try {
                await actualizarOrdenInstrucciones(habilidadId, finalInstrucciones);
                // Opcional: mostrar mensaje de éxito temporalmente
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden. Intenta de nuevo.');
                // Opcional: Revertir el estado local si falla el guardado
                // (requiere guardar el estado previo al drag)
                // setInstrucciones(instrucciones); // Revertir simple
            } finally {
                setIsSaving(false);
            }
        }
    }

    // --- Renderizado Condicional ---
    if (loading) {
        return (
            <div className={`${containerClasses} flex flex-col items-center justify-center min-h-[150px]`}>
                <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mb-2" />
                <p className="text-zinc-400">Cargando instrucciones...</p>
            </div>
        );
    }
    // ... (estados de error y vacío se mantienen igual) ...
    if (error && instrucciones.length === 0) { // Mostrar error solo si no hay datos que mostrar
        return (
            <div className={`${containerClasses} flex flex-col items-center justify-center min-h-[150px] border border-red-500/50`}>
                <ListX className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (!loading && instrucciones.length === 0) {
        return (
            <div className={`${containerClasses} flex flex-col items-center justify-center min-h-[150px]`}>
                <ListX className="h-8 w-8 text-zinc-500 mb-2" />
                <p className='text-zinc-400 italic'>No hay instrucciones definidas para esta habilidad.</p>
            </div>
        );
    }

    // --- Renderizado de la Lista Arrastrable ---
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className={containerClasses}>
                {/* Indicador de guardado y error de guardado */}
                {isSaving && (
                    <div className="mb-3 flex items-center justify-center text-sm text-blue-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Guardando orden...
                    </div>
                )}
                {error && !loading && ( // Mostrar error de guardado si ocurrió y no estamos cargando datos iniciales
                    <div className="mb-3 text-center text-sm text-red-400 p-1 bg-red-900/30 rounded border border-red-600/50">
                        {error}
                    </div>
                )}

                <SortableContext
                    items={instrucciones.map(i => i.id).filter((id): id is string => id !== undefined)} // IDs para el contexto de ordenamiento
                    strategy={verticalListSortingStrategy}
                >
                    <ul className='space-y-3'>
                        {instrucciones.map((instruccion) => (
                            <SortableInstruccionItem key={instruccion.id} instruccion={instruccion} habilidadId={habilidadId} />
                        ))}
                    </ul>
                </SortableContext>
            </div>
        </DndContext>
    );
}
