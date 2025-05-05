'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
// --- DnD Imports ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Lightbox Imports ---
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
// --- Actions and Types ---
import {
    obtenerImagenesDeGaleria,
    añadirImagenAGaleria,
    actualizarDetallesImagenGaleriaNegocio,
    eliminarImagenDeGaleria,
    actualizarOrdenImagenesGaleriaNegocio
} from '@/app/admin/_lib/imagenGaleriaNegocio.actions'; // Ajusta la ruta
import { ImagenGaleriaNegocio } from '@prisma/client'; // Importa el tipo de Prisma
import { ImagenGaleriaNegocioDetallesInput, ImagenGaleriaNegocioOrdenData } from '@/app/admin/_lib/imagenGaleriaNegocio.actions'; // Importa tipos específicos
// --- Icons ---
import { Loader2, Trash2, PlusCircle, GripVertical, Star, Pencil, Save, XIcon, AlertCircle, GalleryHorizontal } from 'lucide-react';

// Límite de imágenes
const MAX_IMAGES = 20; // Usa el mismo límite que en las acciones

interface Props {
    galeriaId: string; // Recibe el ID de la GaleriaNegocio
    // Podrías pasar el nombre de la galería si quieres mostrarlo
    // nombreGaleria?: string;
}

// --- Componente Miniatura Arrastrable (Adaptado para ImagenGaleriaNegocio) ---
function SortableImagenGaleriaNegocioThumbnail({ id, imagen, index, onEdit, onDelete, onImageClick }: {
    id: string;
    imagen: ImagenGaleriaNegocio; // Tipo adaptado
    index: number;
    onEdit: (img: ImagenGaleriaNegocio) => void;
    onDelete: (id: string) => void;
    onImageClick: (index: number) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined, };
    const isPortada = index === 0;
    const thumbnailClasses = "aspect-square w-full relative rounded-md overflow-hidden border border-zinc-700 group bg-zinc-700 shadow-md touch-manipulation";
    const imageClasses = "object-cover w-full h-full transition-transform duration-200 group-hover:scale-105";
    const actionButtonClasses = "p-1 text-white rounded-full focus:outline-none focus:ring-1 focus:ring-white/50 focus:ring-offset-1 focus:ring-offset-black/50 transition-opacity duration-200 disabled:opacity-50";
    const portadaBadgeClasses = "absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-amber-500/80 text-white text-[10px] font-semibold rounded-full flex items-center gap-0.5 backdrop-blur-sm";
    const overlayClasses = "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 cursor-pointer";

    return (
        <div ref={setNodeRef} style={style} className={`${thumbnailClasses} ${isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}>
            {isPortada && (<div className={portadaBadgeClasses}><Star size={10} fill="currentColor" /> Portada</div>)}
            <Image src={imagen.imageUrl} alt={imagen.altText || `Imagen Galería ${index + 1}`} fill className={imageClasses} sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 10vw" priority={isPortada} loading={isPortada ? 'eager' : 'lazy'} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className={overlayClasses} onClick={() => onImageClick(index)} >
                <button onClick={(e) => { e.stopPropagation(); onEdit(imagen); }} className={`${actionButtonClasses} bg-blue-600/70 hover:bg-blue-700`} title="Editar detalles"> <Pencil size={12} /> </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(imagen.id); }} className={`${actionButtonClasses} bg-red-600/70 hover:bg-red-700`} title="Eliminar imagen"> <Trash2 size={12} /> </button>
            </div>
            <button {...attributes} {...listeners} className="absolute bottom-1 right-1 z-30 cursor-grab p-1 opacity-0 group-hover:opacity-50 text-zinc-300 focus:outline-none" aria-label="Reordenar"> <GripVertical size={14} /> </button>
        </div>
    );
}

// --- Componente Modal para Editar Detalles (Adaptado para ImagenGaleriaNegocio) ---
function EditImagenGaleriaNegocioDetailsModal({ imagen, isOpen, onClose, onSave }: {
    imagen: ImagenGaleriaNegocio | null; // Tipo adaptado
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: ImagenGaleriaNegocioDetallesInput) => Promise<void>; // Tipo adaptado
}) {
    const [altText, setAltText] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    useEffect(() => { if (imagen) { setAltText(imagen.altText || ''); setDescripcion(imagen.descripcion || ''); } setModalError(null); }, [imagen]);
    if (!isOpen || !imagen) return null;
    const handleSave = async () => { setIsSaving(true); setModalError(null); try { await onSave(imagen.id, { altText, descripcion }); onClose(); } catch (err) { setModalError(err instanceof Error ? err.message : "Error al guardar"); } finally { setIsSaving(false); } };
    // Clases Modal reutilizadas
    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-3 border-b border-zinc-700 ";
    const modalBodyClasses = "p-4 space-y-3 overflow-y-auto max-h-[60vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-3 border-t border-zinc-700 bg-zinc-800/50";
    const labelClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50";
    const buttonClasses = "text-white font-medium px-4 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-1 text-sm";

    return (
        <div className={modalOverlayClasses} onClick={onClose}>
            <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                <div className={modalHeaderClasses}> <h3 className="text-base font-semibold text-white">Editar Detalles de Imagen</h3> <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700"><XIcon size={18} /></button> </div>
                <div className={modalBodyClasses}>
                    {modalError && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-xs">{modalError}</p>}
                    <div className='flex justify-center mb-2 max-h-48'> <Image src={imagen.imageUrl} alt="Preview" width={400} height={400} className="object-contain rounded border border-zinc-600" /> </div>
                    <div> <label htmlFor="altText" className={labelClasses}>Texto Alternativo (Alt)</label> <input type="text" id="altText" value={altText} onChange={(e) => setAltText(e.target.value)} className={inputClasses} disabled={isSaving} maxLength={150} placeholder="Describe la imagen..." /> <p className="text-xs text-zinc-500 mt-1">Importante para accesibilidad.</p> </div>
                    <div> <label htmlFor="descripcion" className={labelClasses}>Descripción (Lightbox)</label> <textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputClasses} min-h-[60px]`} disabled={isSaving} rows={2} maxLength={250} placeholder="Contexto adicional..." /> </div>
                </div>
                <div className={modalFooterClasses}>
                    <button type="button" onClick={onClose} className={`${buttonClasses} bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-400`} disabled={isSaving}>Cancelar</button>
                    <button type="button" onClick={handleSave} className={`${buttonClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSaving}> {isSaving ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} Guardar </button>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal GaleriaImagenesPanel ---
export default function GaleriaImagenesPanel({ galeriaId }: Props) {
    const [imagenes, setImagenes] = useState<ImagenGaleriaNegocio[]>([]); // Tipo adaptado
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [editingImage, setEditingImage] = useState<ImagenGaleriaNegocio | null>(null); // Tipo adaptado

    // Clases Tailwind
    const containerClasses = "p-4 bg-zinc-800 rounded-lg border border-zinc-700/50 min-h-[300px] h-full flex flex-col";
    const headerClasses = "text-sm font-semibold text-zinc-200 border-b border-zinc-600 pb-2 mb-3 flex items-center justify-between gap-2";
    const gridContainerClasses = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2 flex-grow overflow-y-auto pr-1"; // Ajustar columnas responsivas
    const addButtonClasses = "text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2 py-1 rounded-md flex items-center gap-1 disabled:bg-blue-800/50 disabled:cursor-not-allowed";
    const dropzoneClasses = "border-2 border-dashed border-zinc-600 rounded-lg p-4 text-center text-zinc-500 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer";
    const uploadingIndicatorClasses = "aspect-square flex items-center justify-center flex-col text-center text-blue-400 bg-zinc-800/50 border-2 border-dashed border-blue-500/50 rounded-lg p-2";
    const loadingContainerClasses = "flex-grow flex items-center justify-center text-zinc-400 bg-zinc-900 rounded-b-lg";

    // --- Carga de Datos ---
    const fetchImagenes = useCallback(async () => {
        if (!galeriaId) { setError("ID de galería no válido."); setLoading(false); return; };
        setLoading(true); setError(null);
        try {
            const data = await obtenerImagenesDeGaleria(galeriaId); // Llamar a la acción correcta
            setImagenes(data || []);
        } catch (err) { setError(err instanceof Error ? err.message : "Error al cargar imágenes"); setImagenes([]); }
        finally { setLoading(false); }
    }, [galeriaId]);

    useEffect(() => { fetchImagenes(); }, [fetchImagenes]);

    // --- Limpiar mensaje de éxito ---
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    // --- Handlers ---
    const handleAddClick = () => { if (!isUploading) fileInputRef.current?.click(); };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading || imagenes.length >= MAX_IMAGES) return;
        event.target.value = '';
        setIsUploading(true); setError(null); setSuccessMessage(null);
        try {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) throw new Error(`Máximo ${Math.round(maxSize / 1024 / 1024)}MB`);
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) throw new Error('Tipo no permitido (JPG, PNG, WEBP, SVG).');
            // Llamar a la acción correcta
            const result = await añadirImagenAGaleria(galeriaId, file, file.name);
            if (!result.success || !result.data) throw new Error(result.error || "Error al añadir imagen");
            setImagenes(prev => [...prev, result.data!]);
            setSuccessMessage("Imagen añadida.");
        } catch (err) { setError(err instanceof Error ? err.message : "Error desconocido al subir"); }
        finally { setIsUploading(false); }
    };

    const handleDelete = async (imagenId: string) => {
        if (isDeleting) return;
        if (confirm("¿Eliminar imagen permanentemente?")) {
            setIsDeleting(imagenId); setError(null); setSuccessMessage(null);
            try {
                // Llamar a la acción correcta
                const result = await eliminarImagenDeGaleria(imagenId);
                if (!result.success) throw new Error(result.error || "Error al eliminar");
                setImagenes(prev => prev.filter(img => img.id !== imagenId));
                setSuccessMessage("Imagen eliminada.");
            } catch (err) { setError(err instanceof Error ? err.message : "Error al eliminar"); }
            finally { setIsDeleting(null); }
        }
    };

    const handleEditDetails = (imagen: ImagenGaleriaNegocio) => { setEditingImage(imagen); };

    const handleSaveDetails = async (id: string, data: ImagenGaleriaNegocioDetallesInput) => {
        try {
            // Llamar a la acción correcta
            const result = await actualizarDetallesImagenGaleriaNegocio(id, data);
            if (!result.success || !result.data) throw new Error(result.error || "Error al guardar detalles");
            setImagenes(prev => prev.map(img => img.id === id ? { ...img, ...result.data } : img));
            setSuccessMessage("Detalles actualizados.");
        } catch (err) { console.error("Error save details:", err); throw err; }
    };

    // --- DnD Handlers ---
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = imagenes.findIndex((img) => img.id === active.id);
            const newIndex = imagenes.findIndex((img) => img.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reordered = arrayMove(imagenes, oldIndex, newIndex);
            const finalOrder = reordered.map((img, index) => ({ ...img, orden: index }));
            setImagenes(finalOrder);
            const ordenData: ImagenGaleriaNegocioOrdenData[] = finalOrder.map(({ id, orden }) => ({ id, orden: orden as number }));
            setIsSavingOrder(true); setError(null);
            try {
                // Llamar a la acción correcta
                const result = await actualizarOrdenImagenesGaleriaNegocio(galeriaId, ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
                setSuccessMessage("Orden guardado.");
            } catch (err) { setError(err instanceof Error ? err.message : "Error al guardar orden"); fetchImagenes(); }
            finally { setIsSavingOrder(false); }
        }
    };

    // --- Preparar slides y abrir Lightbox ---
    const slides = imagenes.map(img => ({ src: img.imageUrl, alt: img.altText || '', title: img.descripcion || '' }));
    const canUpload = imagenes.length < MAX_IMAGES;
    const openLightbox = (index: number) => { setLightboxIndex(index); setLightboxOpen(true); };

    return (
        <div className={containerClasses}>
            {/* Input oculto */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp, image/svg+xml" disabled={isUploading || !canUpload} />

            {/* Cabecera */}
            <div className={headerClasses}>
                {/* Podrías pasar el nombre de la galería como prop si quieres mostrarlo */}
                <h3 className="flex items-center gap-2"><GalleryHorizontal size={14} /> Imágenes de la Galería ({imagenes.length}/{MAX_IMAGES})</h3>
                <div className='flex items-center gap-2'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando...</span>}
                    <button onClick={handleAddClick} className={addButtonClasses} title={!canUpload ? `Límite ${MAX_IMAGES}` : "Añadir imagen"} disabled={isUploading || !canUpload}>
                        <PlusCircle size={14} /> <span>Añadir</span>
                    </button>
                </div>
            </div>

            {/* Mensajes */}
            {error && <p className="my-2 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50 flex items-center justify-center gap-1"><AlertCircle size={14} /> {error}</p>}
            {successMessage && <p className="my-2 text-center text-xs text-green-400 bg-green-900/30 p-1.5 rounded border border-green-600/50">{successMessage}</p>}

            {/* Contenido Galería */}
            {loading ? (
                <div className={loadingContainerClasses}> <Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando galería...</span> </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={imagenes.map(img => img.id)} strategy={rectSortingStrategy}>
                        <div className={gridContainerClasses}>
                            {isUploading && (<div className={uploadingIndicatorClasses}> <Loader2 size={24} className="animate-spin mb-1" /> <span className="text-xs">Subiendo...</span> </div>)}
                            {canUpload && !isUploading && (<div onClick={handleAddClick} className={`${dropzoneClasses} aspect-square flex items-center justify-center flex-col border-zinc-700 hover:border-blue-500 self-start`}> <PlusCircle size={20} className="mb-1" /> <span className="text-xs">Añadir</span> </div>)}
                            {imagenes.map((img, index) => (
                                <SortableImagenGaleriaNegocioThumbnail
                                    key={img.id} id={img.id} imagen={img} index={index}
                                    onEdit={handleEditDetails}
                                    onDelete={isDeleting === img.id ? () => { } : handleDelete}
                                    onImageClick={openLightbox}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    {!loading && imagenes.length > 0 && (<p className="text-xs text-center text-zinc-500 mt-2 italic">Arrastra para reordenar.</p>)}
                    {!loading && imagenes.length === 0 && !isUploading && (<p className="text-xs text-center text-zinc-500 mt-4">Aún no hay imágenes en esta galería.</p>)}
                </DndContext>
            )}

            {/* Lightbox */}
            <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={slides} index={lightboxIndex} />
            {/* Modal Editar Detalles */}
            <EditImagenGaleriaNegocioDetailsModal imagen={editingImage} isOpen={!!editingImage} onClose={() => setEditingImage(null)} onSave={handleSaveDetails} />
        </div>
    );
}

