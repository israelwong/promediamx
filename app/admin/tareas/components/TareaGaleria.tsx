'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image'; // Usar next/image
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
    rectSortingStrategy, // Estrategia para grid
    useSortable,
    sortableKeyboardCoordinates, // Importar para coordenadas de teclado
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

import {
    obtenerImagenesGaleriaPorTareaId,
    eliminarImagenGaleria,
    subirImagen,
    crearRegistroImagenGaleria,
    actualizarOrdenImagenesGaleria // <-- Acción para ordenar
} from '@/app/admin/_lib/tareaGaleria.actions'; // Ajusta ruta
import { TareaGaleria, CrearImagenGaleriaInput } from '@/app/admin/_lib/types'; // Ajusta ruta
import { Loader2, Trash2, Image as ImageIcon, PlusCircle, GripVertical, Star } from 'lucide-react'; // Añadido GripVertical y Star para Portada

interface Props {
    tareaId: string;
}

// --- Componente Sortable Image Item ---
function SortableImageItem({
    id,
    imagen,
    onDelete,
    isDeleting,
    isPortada // <-- NUEVA PROP
}: {
    id: string;
    imagen: TareaGaleria;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    isPortada: boolean; // <-- NUEVA PROP
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases reutilizadas
    const imageCardClasses = "relative group border border-zinc-700 rounded-md overflow-hidden bg-zinc-800 aspect-square flex items-center justify-center shadow-md touch-manipulation"; // Added touch-manipulation
    const imageClasses = "object-contain w-full h-full transition-transform duration-300 group-hover:scale-105";
    const deleteButtonClasses = "absolute top-1.5 right-1.5 z-20 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50";
    const dragHandleClasses = "absolute bottom-1.5 right-1.5 z-20 p-1 bg-zinc-700/60 text-zinc-300 rounded-full cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"; // Moved to bottom-right for better layout
    // --- NUEVO: Estilo para la etiqueta Portada ---
    const portadaBadgeClasses = "absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 bg-amber-500/80 text-white text-[10px] font-semibold rounded-full flex items-center gap-1 backdrop-blur-sm";


    return (
        <div ref={setNodeRef} style={style} className={`${imageCardClasses} ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}>
            {/* --- NUEVO: Etiqueta Portada --- */}
            {isPortada && (
                <div className={portadaBadgeClasses}>
                    <Star size={10} fill="currentColor" />
                    Portada
                </div>
            )}

            {/* Imagen (usando next/image) */}
            <Image
                priority={isPortada} // Marcar portada como priority
                fill // Ocupa el contenedor padre (asegúrate que el padre tenga position relative)
                quality={75} // Calidad por defecto
                src={imagen.imageUrl}
                alt={imagen.altText || `Imagen de galería ${imagen.id}`}
                title={imagen.descripcion || imagen.altText || ''}
                className={imageClasses} // object-contain ya está aquí
                loading={isPortada ? "eager" : "lazy"} // Carga eager para portada
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://placehold.co/300x300/3f3f46/9ca3af?text=Error`;
                }}
            />
            {/* Handle para arrastrar */}
            <button {...attributes} {...listeners} className={dragHandleClasses} aria-label="Arrastrar para reordenar">
                <GripVertical size={14} />
            </button>
            {/* Botón Eliminar */}
            <button onClick={() => onDelete(imagen.id)} className={deleteButtonClasses}
                disabled={isDeleting} title="Eliminar imagen"
            >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
        </div>
    );
}


// --- Componente Principal ---
export default function TareaGaleriaGestion({ tareaId }: Props) {
    // Usar 'imagenes' como el estado principal que se reordena
    const [imagenes, setImagenes] = useState<TareaGaleria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false); // Estado para guardar orden

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-900/40 rounded-md border border-zinc-700/80 h-full flex flex-col";
    const headerClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2 mb-4 flex items-center justify-between gap-2";
    const gridClasses = "grid grid-cols-2 sm:grid-cols-3 gap-3 flex-grow overflow-y-auto pr-1 -mr-1";
    const addButtonClasses = "text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2 py-1 rounded-md flex items-center gap-1 disabled:bg-blue-800/50";


    // --- Carga de Imágenes ---
    const fetchImagenes = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const data = await obtenerImagenesGaleriaPorTareaId(tareaId);
            // Ordenar por 'orden' si existe, si no, mantener el orden de llegada
            const sortedData = data?.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity)) || [];
            setImagenes(sortedData);
        } catch (err) {
            console.error("Error fetching gallery images:", err);
            setError("No se pudieron cargar las imágenes."); setImagenes([]);
        } finally { setLoading(false); }
    }, [tareaId]);

    useEffect(() => {
        fetchImagenes();
    }, [fetchImagenes]); // Depender de la función memoizada

    // --- Manejador para Eliminar ---
    const handleEliminar = async (imagenId: string) => {
        if (deletingId) return;
        if (confirm("¿Estás seguro de eliminar esta imagen?")) {
            setDeletingId(imagenId); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarImagenGaleria(imagenId, tareaId);
                if (result.success) {
                    setSuccessMessage("Imagen eliminada.");
                    // Actualizar estado local para feedback inmediato
                    const updatedImages = imagenes.filter(img => img.id !== imagenId);
                    // Reasignar orden después de eliminar
                    const reorderedAfterDelete = updatedImages.map((img, index) => ({ ...img, orden: index }));
                    setImagenes(reorderedAfterDelete);

                    // Opcional: Guardar el nuevo orden en backend si es necesario tras eliminar
                    // const imagenesParaActualizar = reorderedAfterDelete.map(img => ({ id: img.id, orden: img.orden }));
                    // await actualizarOrdenImagenesGaleria(tareaId, imagenesParaActualizar);

                } else { throw new Error(result.error || "Error desconocido"); }
            } catch (err) { setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`); }
            finally { setDeletingId(null); }
        }
    };

    // --- Manejador para Añadir/Subir ---
    const handleAddClick = () => { if (!isUploading) fileInputRef.current?.click(); };
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading) return;
        event.target.value = ''; // Reset input para permitir subir el mismo archivo de nuevo
        setIsUploading(true); setError(null); setSuccessMessage(null);
        try {
            // Validaciones...
            const MAX_IMAGES = 5; // Límite de imágenes
            if (imagenes.length >= MAX_IMAGES) {
                throw new Error(`Se alcanzó el límite de ${MAX_IMAGES} imágenes.`);
            }

            const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) throw new Error("Tipo de archivo no válido.");

            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) throw new Error(`Archivo demasiado grande (Máx: 5MB).`);

            // Path...
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
            const filePath = `Tareas/${tareaId}/${uniqueFileName}`; // Asegúrate que la carpeta exista o se cree

            // Subir...
            const uploadResult = await subirImagen(file, filePath);
            if (!uploadResult.success || !uploadResult.publicUrl) throw new Error(uploadResult.error || "Error en subida.");

            // Crear registro DB...
            // Asignar el siguiente número de orden
            const nextOrder = imagenes.length;
            const datosRegistro: CrearImagenGaleriaInput = {
                tareaId: tareaId,
                imageUrl: uploadResult.publicUrl,
                altText: file.name,
                tamañoBytes: file.size,
                orden: nextOrder // Guardar el orden al crear
            };
            const createResult = await crearRegistroImagenGaleria(datosRegistro);
            if (!createResult.success || !createResult.data) throw new Error(createResult.error || "Error al guardar registro.");
            setSuccessMessage("¡Imagen añadida!");

            // Actualizar estado local para feedback inmediato, añadiendo al final
            setImagenes(prev => [...prev, createResult.data as TareaGaleria]);

        } catch (err) { setError(`Error al añadir: ${err instanceof Error ? err.message : String(err)}`); }
        finally { setIsUploading(false); }
    };


    // --- DnD Handlers ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Requiere mover un poco antes de activar
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = imagenes.findIndex((img) => img.id === active.id);
            const newIndex = imagenes.findIndex((img) => img.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            // Actualizar UI inmediatamente
            const reorderedImagenes = arrayMove(imagenes, oldIndex, newIndex);
            // Reasignar el campo 'orden' basado en la nueva posición
            const finalReordered = reorderedImagenes.map((img, index) => ({
                ...img,
                orden: index // Actualizar el campo orden
            }));
            setImagenes(finalReordered);

            // Preparar datos para el backend (solo id y nuevo orden)
            const imagenesParaActualizar = finalReordered.map(img => ({
                id: img.id,
                orden: img.orden as number // Asegurar que orden sea number
            }));

            setIsSavingOrder(true); setError(null); setSuccessMessage(null);
            try {
                const result = await actualizarOrdenImagenesGaleria(tareaId, imagenesParaActualizar);
                if (!result.success) {
                    setError(result.error || "Error al guardar el orden.");
                    // Revertir UI si falla el guardado
                    setImagenes(arrayMove(finalReordered, newIndex, oldIndex).map((img, index) => ({ ...img, orden: index })));
                } else {
                    setSuccessMessage("Orden guardado."); // Feedback de éxito
                }
            } catch (err) {
                setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                // Revertir UI si hay excepción
                setImagenes(arrayMove(finalReordered, newIndex, oldIndex).map((img, index) => ({ ...img, orden: index })));
            } finally {
                setIsSavingOrder(false);
            }
        }
    };


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Input oculto */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif, image/webp" // Ser más específico
                disabled={isUploading || imagenes.length >= 5} // Deshabilitar si se alcanzó el límite
            />

            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-zinc-400" /> Galería de Imágenes ({imagenes.length}/5) {/* Mostrar contador */}
                </h3>
                <div className="flex items-center gap-2">
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando...</span>}
                    <button
                        onClick={handleAddClick}
                        className={addButtonClasses}
                        title={imagenes.length >= 5 ? "Límite de 5 imágenes alcanzado" : "Añadir nueva imagen"}
                        disabled={isUploading || loading || imagenes.length >= 5} // Deshabilitar si se alcanzó el límite
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                        <span>{isUploading ? 'Subiendo...' : 'Añadir'}</span>
                    </button>
                </div>
            </div>

            {/* Mensajes */}
            {error && <p className="mb-3 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600">{error}</p>}
            {successMessage && <p className="mb-3 text-center text-xs text-green-400 bg-green-900/30 p-1.5 rounded border border-green-600">{successMessage}</p>}


            {/* Contenido de la Galería (con DnD) */}
            {loading ? (
                <div className="flex-grow flex items-center justify-center text-zinc-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando galería...
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {/* Usar el estado 'imagenes' que se actualiza */}
                    <SortableContext items={imagenes.map(img => img.id)} strategy={rectSortingStrategy}>
                        <div className={gridClasses}>
                            {/* Renderizar imágenes */}
                            {imagenes.map((img, index) => ( // <-- Añadir index aquí
                                <SortableImageItem
                                    key={img.id}
                                    id={img.id}
                                    imagen={img}
                                    onDelete={handleEliminar}
                                    isDeleting={deletingId === img.id}
                                    isPortada={index === 0} // <-- Pasar la prop isPortada
                                />
                            ))}

                            {/* Mensaje si no hay imágenes */}
                            {imagenes.length === 0 && !isUploading && (
                                <div className="col-span-2 sm:col-span-3 flex items-center justify-center text-zinc-500 italic text-sm p-8 text-center">
                                    La galería está vacía.<br /> Haz clic en &quot;Añadir&quot; para subir imágenes.
                                </div>
                            )}
                        </div>
                    </SortableContext>
                    {!loading && imagenes.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-3 italic">Arrastra las imágenes para reordenarlas. La primera será la portada.</p> // Mensaje actualizado
                    )}
                </DndContext>
            )}
        </div>
    );
}
