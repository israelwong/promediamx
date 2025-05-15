'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
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
    rectSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

// --- IMPORTACIONES DE ACTIONS ACTUALIZADAS ---
import {
    obtenerImagenesGaleriaPorTareaId,
    eliminarImagenGaleria,
    crearRegistroImagenGaleria,
    actualizarOrdenImagenesGaleria
} from '@/app/admin/_lib/tareaGaleria.actions'; // Actions para la BD de TareaGaleria

import {
    subirImagenStorage
} from '@/app/admin/_lib/imageHandler.actions'; // Action para subir a Supabase Storage

import { TareaGaleria, CrearImagenGaleriaInput } from '@/app/admin/_lib/types';
import { Loader2, Trash2, Image as ImageIcon, PlusCircle, GripVertical, Star, AlertTriangleIcon, CheckIcon } from 'lucide-react'; // Agregado CheckIcon

interface Props {
    tareaId: string;
}

// --- Componente Sortable Image Item (UI sin cambios lógicos) ---
function SortableImageItem({
    id,
    imagen,
    onDelete,
    isDeleting,
    isPortada
}: {
    id: string;
    imagen: TareaGaleria;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    isPortada: boolean;
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

    const imageCardClasses = "relative group border border-zinc-700 rounded-lg overflow-hidden bg-zinc-800 aspect-square flex items-center justify-center shadow-lg touch-manipulation";
    const imageClasses = "object-contain w-full h-full transition-transform duration-300 group-hover:scale-105";
    const deleteButtonClasses = "absolute top-2 right-2 z-20 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50 disabled:bg-red-800";
    const dragHandleClasses = "absolute bottom-2 right-2 z-20 p-1.5 bg-zinc-700/70 text-zinc-200 rounded-full cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-zinc-600";
    const portadaBadgeClasses = "absolute top-2 left-2 z-10 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow";


    return (
        <div ref={setNodeRef} style={style} className={`${imageCardClasses} ${isDragging ? 'ring-2 ring-blue-500' : ''}`}>
            {isPortada && (
                <div className={portadaBadgeClasses}>
                    <Star size={11} fill="currentColor" />
                    <span>PORTADA</span>
                </div>
            )}
            <Image
                priority={isPortada}
                fill
                quality={75}
                src={imagen.imageUrl}
                alt={imagen.altText || ``}
                title={imagen.descripcion || imagen.altText || `Imagen ${imagen.id}`}
                className={imageClasses}
                loading={isPortada ? "eager" : "lazy"}
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://placehold.co/300x300/3f3f46/9ca3af?text=Error%20Img`;
                }}
            />
            <button {...attributes} {...listeners} className={dragHandleClasses} aria-label="Arrastrar para reordenar">
                <GripVertical size={16} />
            </button>
            <button
                onClick={() => onDelete(imagen.id)}
                className={deleteButtonClasses}
                disabled={isDeleting}
                title="Eliminar imagen"
            >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
        </div>
    );
}

export default function TareaGaleriaGestion({ tareaId }: Props) {
    const [imagenes, setImagenes] = useState<TareaGaleria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full";
    const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3";
    const headerTitleClasses = "text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2.5";
    const contentPaddingClasses = "p-4 sm:p-6";

    // --- MODIFICACIÓN AQUÍ para imágenes más grandes ---
    // Original: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 flex-grow overflow-y-auto pr-1 -mr-1"
    // Propuesta: Menos columnas para imágenes más grandes.
    // Si el contenedor de 1/5 es muy angosto, podrías necesitar aún menos columnas (ej. lg:grid-cols-2 o incluso md:grid-cols-1)
    const gridClasses = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 flex-grow overflow-y-auto pr-1 -mr-1";

    const addButtonClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50 disabled:bg-blue-800/60 transition-colors duration-150";
    const alertErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2 mb-3";
    const alertSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2 mb-3";


    const fetchImagenes = useCallback(async () => {
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const data = await obtenerImagenesGaleriaPorTareaId(tareaId);
            const sortedData = data?.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity)) || [];
            setImagenes(sortedData);
        } catch (err) {
            console.error("Error fetching gallery images:", err);
            setError("No se pudieron cargar las imágenes de la galería.");
            setImagenes([]);
        } finally { setLoading(false); }
    }, [tareaId]);

    useEffect(() => {
        fetchImagenes();
    }, [fetchImagenes]);

    const handleEliminar = async (imagenId: string) => {
        if (deletingId) return;
        if (confirm("¿Estás seguro de eliminar esta imagen? Esta acción no se puede deshacer.")) {
            setDeletingId(imagenId); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarImagenGaleria(imagenId, tareaId);
                if (result.success) {
                    setSuccessMessage(result.error || "Imagen eliminada correctamente.");
                    const updatedImages = imagenes.filter(img => img.id !== imagenId);
                    const reorderedAfterDelete = updatedImages.map((img, index) => ({ ...img, orden: index }));
                    setImagenes(reorderedAfterDelete);

                    if (reorderedAfterDelete.length > 0) {
                        const imagenesParaActualizar = reorderedAfterDelete.map(img => ({ id: img.id, orden: img.orden as number }));
                        await actualizarOrdenImagenesGaleria(tareaId, imagenesParaActualizar);
                    }
                } else {
                    throw new Error(result.error || "Error desconocido al eliminar la imagen.");
                }
            } catch (err) {
                setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
            }
            finally { setDeletingId(null); }
        }
    };

    const handleAddClick = () => { if (!isUploading) fileInputRef.current?.click(); };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading) return;
        event.target.value = '';
        setIsUploading(true); setError(null); setSuccessMessage(null);
        try {
            const MAX_IMAGES = 5;
            if (imagenes.length >= MAX_IMAGES) {
                throw new Error(`Se alcanzó el límite de ${MAX_IMAGES} imágenes.`);
            }
            const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) throw new Error("Tipo de archivo no válido (PNG, JPG, GIF, WEBP).");
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) throw new Error(`Archivo demasiado grande (Máx: 5MB).`);

            const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
            const filePath = `tareas_galeria/${tareaId}/${uniqueFileName}`;

            const uploadResult = await subirImagenStorage(file, filePath);
            if (!uploadResult.success || !uploadResult.publicUrl) {
                throw new Error(uploadResult.error || "Error al subir la imagen al almacenamiento.");
            }
            setSuccessMessage("Imagen subida al almacenamiento...");

            const nextOrder = imagenes.length;
            const datosRegistro: CrearImagenGaleriaInput = {
                tareaId: tareaId,
                imageUrl: uploadResult.publicUrl,
                altText: file.name.substring(0, 100),
                descripcion: `Imagen ${file.name.substring(0, 50)}`,
                tamañoBytes: file.size,
                orden: nextOrder
            };
            const createResult = await crearRegistroImagenGaleria(datosRegistro);
            if (!createResult.success || !createResult.data) {
                console.warn("Registro en BD falló después de subir. Intentando eliminar del storage:", uploadResult.publicUrl);
                // La action eliminarImagenGaleria espera el ID de la imagen en la BD, no la URL.
                // Si el registro en BD falló, no tenemos ID de BD para esa imagen.
                // Se necesitaría una action en imageHandler que elimine por URL o filePath directamente si este es el caso.
                // Por ahora, solo logueamos.
                // await eliminarImagenStorage(uploadResult.publicUrl); // Asumiendo que tienes esta action en imageHandler
                throw new Error(createResult.error || "Error al guardar la referencia de la imagen en la base de datos.");
            }

            setSuccessMessage("¡Imagen añadida y guardada exitosamente!");
            setImagenes(prev => [...prev, createResult.data as TareaGaleria].sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity)));

        } catch (err) {
            setError(`Error al añadir imagen: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally { setIsUploading(false); }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = imagenes.findIndex((img) => img.id === active.id);
            const newIndex = imagenes.findIndex((img) => img.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedImagenes = arrayMove(imagenes, oldIndex, newIndex);
            const finalReordered = reorderedImagenes.map((img, index) => ({
                ...img,
                orden: index
            }));
            setImagenes(finalReordered);

            const imagenesParaActualizar = finalReordered.map(img => ({
                id: img.id,
                orden: img.orden as number
            }));

            setIsSavingOrder(true); setError(null); setSuccessMessage(null);
            try {
                const result = await actualizarOrdenImagenesGaleria(tareaId, imagenesParaActualizar);
                if (!result.success) {
                    setError(result.error || "Error al guardar el nuevo orden.");
                    setImagenes(arrayMove(finalReordered, newIndex, oldIndex).map((img, index) => ({ ...img, orden: index })));
                } else {
                    setSuccessMessage("Orden de imágenes guardado.");
                }
            } catch (err) {
                setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                setImagenes(arrayMove(finalReordered, newIndex, oldIndex).map((img, index) => ({ ...img, orden: index })));
            } finally {
                setIsSavingOrder(false);
            }
        }
    };

    return (
        <div className={`${containerClasses} ${contentPaddingClasses}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif, image/webp"
                disabled={isUploading || imagenes.length >= 5}
            />

            <div className={headerSectionClasses.replace('mb-4', 'mb-3')}>
                <h3 className={headerTitleClasses}>
                    <ImageIcon size={18} className="text-zinc-400" />
                    <span>Galería</span>
                    <span className="text-sm text-zinc-500">({imagenes.length}/5)</span>
                </h3>
                <div className="flex items-center gap-2">
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando...</span>}
                    <button
                        onClick={handleAddClick}
                        className={addButtonClasses}
                        title={imagenes.length >= 5 ? "Límite de 5 imágenes alcanzado" : "Añadir nueva imagen"}
                        disabled={isUploading || loading || imagenes.length >= 5}
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                        <span>{isUploading ? 'Subiendo...' : 'Añadir'}</span>
                    </button>
                </div>
            </div>

            {error && <p className={alertErrorClasses}><AlertTriangleIcon size={16} className="flex-shrink-0" /> {error}</p>}
            {successMessage && <p className={alertSuccessClasses}><CheckIcon size={16} className="flex-shrink-0" /> {successMessage}</p>}

            {loading ? (
                <div className="flex-grow flex items-center justify-center text-zinc-400 py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando galería...
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={imagenes.map(img => img.id)} strategy={rectSortingStrategy}>
                        <div className={gridClasses}> {/* La clase gridClasses ahora tiene menos columnas */}
                            {imagenes.map((img, index) => (
                                <SortableImageItem
                                    key={img.id}
                                    id={img.id}
                                    imagen={img}
                                    onDelete={handleEliminar}
                                    isDeleting={deletingId === img.id}
                                    isPortada={index === 0}
                                />
                            ))}
                            {imagenes.length === 0 && !isUploading && (
                                <div className="col-span-full flex flex-col items-center justify-center text-zinc-500 italic text-sm p-8 text-center min-h-[200px]">
                                    <ImageIcon size={32} className="mb-2 text-zinc-600" />
                                    La galería está vacía.
                                    <span className="text-xs block mt-1">Haz clic en &quot;Añadir&quot; para subir imágenes.</span>
                                </div>
                            )}
                        </div>
                    </SortableContext>
                    {!loading && imagenes.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-4 italic">
                            Arrastra las imágenes para reordenarlas. La primera imagen se mostrará como portada.
                        </p>
                    )}
                </DndContext>
            )}
        </div>
    );
}
