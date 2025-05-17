// Sugerencia de Ruta: @/app/admin/_components/shared/SharedImageGalleryManager.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import {
    UploadCloud,
    ImageOff,
    Trash2,
    Edit3,
    Loader2,
    AlertTriangle,
    CheckCircle,
    GripVertical,
    Star
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// DND-Kit
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionResult } from '@/app/admin/_lib/types';

// --- Definición del Tipo para las Opciones de Compresión ---
interface BrowserImageCompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    maxIteration?: number;
    exifOrientation?: number;
    onProgress?: (progress: number) => void;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    signal?: AbortSignal;
    preserveExif?: boolean;
    libURL?: string;
}

// --- Tipos Genéricos para el Componente ---
export interface GalleryItemBase {
    id: string;
    imageUrl: string;
    orden: number;
    altText?: string | null;
    descripcion?: string | null;
    tamañoBytes?: number | null;
    createdAt: Date | string;
}

export interface UpdateGalleryItemDetailsData {
    altText?: string | null;
    descripcion?: string | null;
}

export interface ReorderGalleryItemData {
    id: string;
    orden: number;
}

// --- Props del Componente Reutilizable ---
export interface SharedImageGalleryManagerProps<T extends GalleryItemBase> {
    ownerEntityId: string;
    negocioId: string;
    clienteId: string;
    catalogoId?: string;


    actions: {
        fetchItemsAction: (ownerEntityId: string) => Promise<ActionResult<T[]>>;
        addItemAction: (ownerEntityId: string, negocioId: string, clienteId: string, catalogoId: string | undefined, formData: FormData) => Promise<ActionResult<T>>;
        updateItemDetailsAction: (itemId: string, clienteId: string, negocioId: string, ownerEntityId: string, catalogoId: string | undefined, data: UpdateGalleryItemDetailsData) => Promise<ActionResult<T>>;
        deleteItemAction: (itemId: string, negocioId: string, clienteId: string, ownerEntityId: string, catalogoId: string | undefined) => Promise<ActionResult<void>>;
        updateOrderAction: (ownerEntityId: string, negocioId: string, clienteId: string, catalogoId: string | undefined, orderData: ReorderGalleryItemData[]) => Promise<ActionResult<void>>;
    };

    maxImages?: number;
    itemDisplayName?: string;
    itemDisplayNamePlural?: string;
    enableCoverPhotoFeature?: boolean;
    imageCompressionOptions?: BrowserImageCompressionOptions;
    acceptedFileTypes?: { [key: string]: string[] };
}

// --- Modal para Editar Detalles (Componente Interno) ---
interface EditImageDetailsModalProps<T extends GalleryItemBase> {
    isOpen: boolean;
    onClose: () => void;
    image: T | null;
    onSubmit: (id: string, data: UpdateGalleryItemDetailsData) => Promise<void>;
    isLoading: boolean;
    itemDisplayName?: string;
}

function EditImageDetailsModal<T extends GalleryItemBase>({
    isOpen, onClose, image, onSubmit, isLoading, itemDisplayName = "imagen"
}: EditImageDetailsModalProps<T>) {
    const [altText, setAltText] = useState(image?.altText || '');
    const [descripcion, setDescripcion] = useState(image?.descripcion || '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (image) {
            setAltText(image.altText || '');
            setDescripcion(image.descripcion || '');
        }
        setError(null);
    }, [image, isOpen]);

    if (!isOpen || !image) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null);
        try {
            await onSubmit(image.id, {
                altText: altText.trim() === '' ? null : altText.trim(),
                descripcion: descripcion.trim() === '' ? null : descripcion.trim()
            });
            onClose();
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : `Error al guardar detalles de la ${itemDisplayName}.`);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-lg border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-100 mb-1">Editar Detalles de {itemDisplayName.charAt(0).toUpperCase() + itemDisplayName.slice(1)}</h3>
                {image.imageUrl && (
                    <div className="my-3 w-20 h-20 relative border border-zinc-600 rounded overflow-hidden">
                        <Image src={image.imageUrl} alt="Vista previa" fill style={{ objectFit: 'cover' }} />
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="altTextModalShared" className="block text-sm font-medium text-zinc-300 mb-1">Texto Alternativo (Alt)</label>
                        <input id="altTextModalShared" type="text" value={altText} onChange={(e) => setAltText(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="descripcionModalShared" className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
                        <textarea id="descripcionModalShared" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2" disabled={isLoading} />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-zinc-600 hover:bg-zinc-700">Cancelar</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Guardar Detalles
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Componente DraggableImageItem (Componente Interno) ---
interface DraggableImageItemProps<T extends GalleryItemBase> {
    image: T;
    isCover: boolean;
    onEdit: (image: T) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    currentDeletingId: string | null;
    itemDisplayName?: string;
    enableCoverPhotoFeature?: boolean; // <--- AÑADIDO
}
function DraggableImageItem<T extends GalleryItemBase>({
    image, isCover, onEdit, onDelete, isDeleting, currentDeletingId, itemDisplayName = "imagen", enableCoverPhotoFeature // <--- AÑADIDO
}: DraggableImageItemProps<T>) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined };
    const isCurrentDeleting = isDeleting && currentDeletingId === image.id;

    return (
        <div ref={setNodeRef} style={style} className="bg-zinc-800/60 p-2 rounded-md border border-zinc-700 group relative">
            <button {...attributes} {...listeners} className="absolute top-1 left-1 z-20 p-1 cursor-grab bg-zinc-900/50 rounded-full text-zinc-400 hover:text-zinc-100 opacity-50 group-hover:opacity-100 transition-opacity">
                <GripVertical size={16} />
            </button>
            {isCover && enableCoverPhotoFeature && ( // <--- CORREGIDO: Usar prop
                <div className="absolute top-1 right-1 z-20 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
                    <Star size={10} className="mr-1" /> Portada
                </div>
            )}
            <div className="aspect-square w-full bg-zinc-700 rounded overflow-hidden relative">
                <Image
                    src={image.imageUrl}
                    alt={image.altText || `Galería ${itemDisplayName} ${image.orden + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x200/404040/9ca3af?text=Error"; }}
                />
            </div>
            <div className="mt-2 text-xs space-x-1 text-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-blue-400" onClick={() => onEdit(image)} title={`Editar detalles de ${itemDisplayName}`}>
                    <Edit3 size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => onDelete(image.id)} disabled={isCurrentDeleting} title={`Eliminar ${itemDisplayName}`}>
                    {isCurrentDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                </Button>
            </div>
        </div>
    );
}

// --- Componente Principal Reutilizable ---
export default function SharedImageGalleryManager<T extends GalleryItemBase>({
    ownerEntityId,
    negocioId,
    clienteId,
    catalogoId,
    actions,
    maxImages = 10,
    itemDisplayName = "imagen",
    itemDisplayNamePlural = "imágenes",
    enableCoverPhotoFeature = true,
    imageCompressionOptions: propCompressionOptions,
    acceptedFileTypes = { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.svg'] },
}: SharedImageGalleryManagerProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploadingFilesInfo, setUploadingFilesInfo] = useState<{ name: string; progress?: string }[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [currentItemToEdit, setCurrentItemToEdit] = useState<T | null>(null);
    const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentDeletingId, setCurrentDeletingId] = useState<string | null>(null);

    const defaultCompressionOptions = useMemo((): BrowserImageCompressionOptions => ({
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        ...propCompressionOptions,
    }), [propCompressionOptions]);

    const fetchItems = useCallback(async () => {
        setIsLoading(true); setError(null);
        const result = await actions.fetchItemsAction(ownerEntityId);
        if (result.success && result.data) {
            const sortedItems = result.data.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
            setItems(sortedItems.map(item => ({ ...item, createdAt: new Date(item.createdAt) } as T)));
        } else {
            setError(result.error || `Error al cargar ${itemDisplayNamePlural}.`);
        }
        setIsLoading(false);
    }, [ownerEntityId, actions, itemDisplayNamePlural]); // <--- CORREGIDO: actions añadido

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
        if (items.length + acceptedFiles.length > maxImages) {
            setUploadError(`No puedes subir más de ${maxImages} ${itemDisplayNamePlural} en total.`);
            setTimeout(() => setUploadError(null), 5000); return;
        }
        setUploadingFilesInfo(acceptedFiles.map(file => ({ name: file.name, progress: 'Comprimiendo...' })));
        setUploadError(null);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const originalFile = acceptedFiles[i];
            let fileToUpload = originalFile;
            try {
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Comprimiendo...' } : f));
                if (!originalFile.type.startsWith('image/svg+xml')) {
                    const compressedFile = await imageCompression(originalFile, defaultCompressionOptions);
                    fileToUpload = compressedFile;
                }
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Subiendo...' } : f));
            } catch (compressionError) {
                console.error(`Error al comprimir ${originalFile.name}:`, compressionError);
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Error compresión' } : f));
                setUploadError(prev => `${prev ? prev + '\n' : ''}Error al comprimir ${originalFile.name}.`);
                continue;
            }
            const formData = new FormData();
            formData.append('file', fileToUpload, originalFile.name);

            const result = await actions.addItemAction(ownerEntityId, negocioId, clienteId, catalogoId, formData);
            if (!result.success) {
                setUploadError(prev => `${prev ? prev + '\n' : ''}Error al subir ${originalFile.name}: ${result.error}`);
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Error subida' } : f));
            } else {
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: '¡Subido!' } : f));
            }
        }
        setTimeout(() => setUploadingFilesInfo([]), 5000);
        fetchItems();
    }, [items.length, maxImages, itemDisplayNamePlural, defaultCompressionOptions, actions, ownerEntityId, negocioId, clienteId, catalogoId, fetchItems]); // <--- CORREGIDO: actions añadido

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: acceptedFileTypes, multiple: true,
    });

    const handleOpenEditModal = (image: T) => { setCurrentItemToEdit(image); setIsEditingDetails(true); };
    const handleCloseEditModal = () => { setIsEditingDetails(false); setCurrentItemToEdit(null); };

    const handleUpdateDetailsSubmit = async (id: string, data: UpdateGalleryItemDetailsData) => {
        setIsSubmittingDetails(true);
        const result = await actions.updateItemDetailsAction(id, clienteId, negocioId, ownerEntityId, catalogoId, data);
        if (result.success) {
            handleCloseEditModal(); fetchItems();
        } else { throw new Error(result.error || `Error al actualizar detalles de la ${itemDisplayName}.`); }
        setIsSubmittingDetails(false);
    };

    const handleDeleteImage = async (id: string) => {
        if (confirm(`¿Estás seguro de que quieres eliminar esta ${itemDisplayName}?`)) {
            setIsDeleting(true); setCurrentDeletingId(id);
            await actions.deleteItemAction(id, negocioId, clienteId, ownerEntityId, catalogoId);
            fetchItems();
            setIsDeleting(false); setCurrentDeletingId(null);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = items.findIndex((img) => img.id === active.id);
            const newIndex = items.findIndex((img) => img.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const newOrderedItems = arrayMove(items, oldIndex, newIndex);
            const itemsWithNewOrderField = newOrderedItems.map((img, index) => ({ ...img, orden: index }));
            setItems(itemsWithNewOrderField as T[]);
            const ordenesParaGuardar: ReorderGalleryItemData[] = itemsWithNewOrderField.map((img) => ({ id: img.id, orden: img.orden }));
            setIsSavingOrder(true);
            const result = await actions.updateOrderAction(ownerEntityId, negocioId, clienteId, catalogoId, ordenesParaGuardar);
            if (!result.success) {
                alert("Error al guardar el nuevo orden: " + result.error);
                fetchItems();
            }
            setIsSavingOrder(false);
        }
    };

    const dropzoneClasses = `mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 border-dashed'} rounded-md cursor-pointer hover:border-blue-400 transition-colors min-h-[150px]`;
    const mainContainerClasses = "bg-zinc-800/70 rounded-lg border border-zinc-700 p-4 md:p-6 space-y-4";

    if (isLoading && items.length === 0) {
        return (
            <div className={mainContainerClasses + " flex items-center justify-center min-h-[200px]"}>
                <Loader2 size={32} className="animate-spin text-zinc-400" />
                <p className="ml-3 text-zinc-400">Cargando {itemDisplayNamePlural}...</p>
            </div>
        );
    }

    if (error && items.length === 0) {
        return (
            <div className={mainContainerClasses + " text-center"}>
                <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
                <p className="text-red-400">{error}</p>
                <Button onClick={fetchItems} variant="outline" className="mt-4 border-zinc-600 hover:bg-zinc-700">Reintentar</Button>
            </div>
        );
    }

    return (
        <div className={mainContainerClasses}>
            <h3 className="text-base font-semibold text-zinc-100 mb-0">Galería de {itemDisplayNamePlural.charAt(0).toUpperCase() + itemDisplayNamePlural.slice(1)}</h3>
            {items.length < maxImages && (
                <div {...getRootProps()} className={dropzoneClasses}>
                    <input {...getInputProps()} />
                    <div className="text-center">
                        <UploadCloud size={40} className="mx-auto text-zinc-500 mb-2" />
                        <p className="text-sm text-zinc-400">
                            Arrastra y suelta {itemDisplayNamePlural} aquí, o <span className="text-blue-400">haz clic para seleccionar</span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Máximo {maxImages} {itemDisplayNamePlural}. Tipos: {Object.values(acceptedFileTypes).flat().join(', ')}.</p>
                    </div>
                </div>
            )}
            {uploadingFilesInfo.length > 0 && (
                <div className="space-y-1 mt-2">
                    {uploadingFilesInfo.map((fileInfo, index) => (
                        <div key={index} className="text-xs text-blue-300 flex items-center">
                            {fileInfo.progress === 'Subiendo...' || fileInfo.progress === 'Comprimiendo...' ? <Loader2 className="animate-spin mr-2" size={14} /> :
                                fileInfo.progress === '¡Subido!' ? <CheckCircle className="text-green-400 mr-2" size={14} /> :
                                    <AlertTriangle className="text-red-400 mr-2" size={14} />
                            }
                            {fileInfo.name} - {fileInfo.progress}
                        </div>
                    ))}
                </div>
            )}
            {uploadError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-md flex items-center gap-2 text-xs mt-2">
                    <AlertTriangle size={16} /> <p className="whitespace-pre-line">{uploadError}</p>
                </div>
            )}

            {items.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map(img => img.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                            {items.map((item, index) => (
                                <DraggableImageItem<T>
                                    key={item.id}
                                    image={item}
                                    isCover={enableCoverPhotoFeature && index === 0}
                                    onEdit={handleOpenEditModal}
                                    onDelete={handleDeleteImage}
                                    isDeleting={isDeleting}
                                    currentDeletingId={currentDeletingId}
                                    itemDisplayName={itemDisplayName}
                                    enableCoverPhotoFeature={enableCoverPhotoFeature} // <--- AÑADIDO: Pasar prop
                                />
                            ))}
                        </div>
                    </SortableContext>
                    {isSavingOrder && (
                        <div className="mt-3 text-sm text-blue-300 flex items-center justify-end">
                            <Loader2 className="animate-spin mr-2" size={16} /> Guardando orden...
                        </div>
                    )}
                </DndContext>
            ) : (
                !isLoading && !error && uploadingFilesInfo.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                        <ImageOff size={40} className="mx-auto mb-2" />
                        <p>Esta galería está vacía.</p>
                        <p className="text-xs">Sube la primera {itemDisplayName} usando el área de arriba.</p>
                    </div>
                )
            )}

            {enableCoverPhotoFeature && items.length > 0 && (
                <p className="text-xs text-zinc-500 mt-4 text-center italic">
                    La {itemDisplayName} marcada con la estrella (<Star size={10} className="inline text-amber-500" />) se considera la portada. Puedes reordenar las {itemDisplayNamePlural} arrastrándolas.
                </p>
            )}

            <EditImageDetailsModal<T>
                isOpen={isEditingDetails}
                onClose={handleCloseEditModal}
                image={currentItemToEdit}
                onSubmit={handleUpdateDetailsSubmit}
                isLoading={isSubmittingDetails}
                itemDisplayName={itemDisplayName}
            />
        </div>
    );
}
