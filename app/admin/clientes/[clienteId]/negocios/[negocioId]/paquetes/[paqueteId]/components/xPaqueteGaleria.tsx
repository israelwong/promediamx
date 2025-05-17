// // Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteGaleria.tsx
// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useDropzone } from 'react-dropzone';
// import Image from 'next/image';
// import { Button } from '@/app/components/ui/button';
// import {
//     UploadCloud,
//     ImageOff,
//     Trash2,
//     Edit3,
//     Loader2,
//     AlertTriangle,
//     CheckCircle,
//     GripVertical,
//     Star // Icono para Portada
// } from 'lucide-react';

// // Importar browser-image-compression
// import imageCompression from 'browser-image-compression';

// import {
//     NegocioPaqueteGaleriaItem,
//     ActualizarDetallesImagenGaleriaPaqueteData,
//     ReordenarImagenesGaleriaPaqueteData
// } from '@/app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.schemas';
// import {
//     obtenerImagenesGaleriaPaqueteAction,
//     agregarImagenAGaleriaPaqueteAction,
//     actualizarDetallesImagenGaleriaPaqueteAction,
//     eliminarImagenDeGaleriaPaqueteAction,
//     actualizarOrdenImagenesGaleriaPaqueteAction
// } from '@/app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.actions';

// // DND-Kit
// import {
//     DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
// } from '@dnd-kit/core';
// import {
//     arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
// } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';

// const MAX_IMAGES = 10; // Límite visual o funcional

// interface PaqueteGaleriaProps {
//     paqueteId: string;
//     negocioId: string;
//     clienteId: string;
// }

// // --- Modal para Editar Detalles de Imagen ---
// interface EditImageDetailsModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     image: NegocioPaqueteGaleriaItem | null;
//     onSubmit: (id: string, data: ActualizarDetallesImagenGaleriaPaqueteData) => Promise<void>;
//     isLoading: boolean;
// }

// function EditImageDetailsModal({ isOpen, onClose, image, onSubmit, isLoading }: EditImageDetailsModalProps) {
//     const [altText, setAltText] = useState(image?.altText || '');
//     const [descripcion, setDescripcion] = useState(image?.descripcion || '');
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         if (image) {
//             setAltText(image.altText || '');
//             setDescripcion(image.descripcion || '');
//         }
//         setError(null);
//     }, [image, isOpen]);

//     if (!isOpen || !image) return null;

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setError(null);
//         try {
//             await onSubmit(image.id, { altText: altText.trim(), descripcion: descripcion.trim() });
//         } catch (submitError: unknown) {
//             if (submitError instanceof Error) {
//                 setError(submitError.message || "Error al guardar detalles.");
//             } else {
//                 setError("Error al guardar detalles.");
//             }
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
//             <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-lg border border-zinc-700">
//                 <h3 className="text-lg font-semibold text-zinc-100 mb-1">Editar Detalles de Imagen</h3>
//                 <Image src={image.imageUrl} alt="Vista previa" width={80} height={80} className="w-20 h-20 object-cover rounded my-3 border border-zinc-600" />
//                 <form onSubmit={handleSubmit} className="space-y-4">
//                     <div>
//                         <label htmlFor="altTextModal" className="block text-sm font-medium text-zinc-300 mb-1">Texto Alternativo (Alt)</label>
//                         <input id="altTextModal" type="text" value={altText} onChange={(e) => setAltText(e.target.value)}
//                             className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2" disabled={isLoading} />
//                     </div>
//                     <div>
//                         <label htmlFor="descripcionModal" className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
//                         <textarea id="descripcionModal" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
//                             className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2" disabled={isLoading} />
//                     </div>
//                     {error && <p className="text-xs text-red-400">{error}</p>}
//                     <div className="mt-6 flex justify-end gap-3">
//                         <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-zinc-600 hover:bg-zinc-700">Cancelar</Button>
//                         <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
//                             {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Guardar Detalles
//                         </Button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// }

// // --- Componente DraggableImageItem ---
// interface DraggableImageItemProps {
//     image: NegocioPaqueteGaleriaItem;
//     isCover: boolean; // NUEVO: Prop para indicar si es la portada
//     onEdit: (image: NegocioPaqueteGaleriaItem) => void;
//     onDelete: (id: string) => void;
//     isDeleting: boolean;
//     currentDeletingId: string | null;
// }
// function DraggableImageItem({ image, isCover, onEdit, onDelete, isDeleting, currentDeletingId }: DraggableImageItemProps) {
//     const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
//     const style = {
//         transform: CSS.Transform.toString(transform),
//         transition,
//         opacity: isDragging ? 0.7 : 1,
//         zIndex: isDragging ? 10 : undefined,
//     };
//     const isCurrentDeleting = isDeleting && currentDeletingId === image.id;

//     return (
//         <div ref={setNodeRef} style={style} className="bg-zinc-800/60 p-2 rounded-md border border-zinc-700 group relative">
//             <button {...attributes} {...listeners} className="absolute top-1 left-1 z-20 p-1 cursor-grab bg-zinc-900/50 rounded-full text-zinc-400 hover:text-zinc-100 opacity-50 group-hover:opacity-100 transition-opacity">
//                 <GripVertical size={16} />
//             </button>
//             {/* NUEVO: Indicador de Portada */}
//             {isCover && (
//                 <div className="absolute top-1 right-1 z-20 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
//                     <Star size={10} className="mr-1" />
//                     Portada
//                 </div>
//             )}
//             <div className="aspect-square w-full bg-zinc-700 rounded overflow-hidden relative">
//                 <Image
//                     src={image.imageUrl}
//                     alt={image.altText || `Imagen de galería ${image.orden + 1}`}
//                     layout="fill"
//                     objectFit="cover"
//                     onError={(e) => {
//                         const target = e.target as HTMLImageElement;
//                         target.onerror = null;
//                         target.src = "https://placehold.co/200x200/404040/9ca3af?text=Error";
//                     }}
//                 />
//             </div>
//             <div className="mt-2 text-xs space-x-1 text-center">
//                 <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-blue-400" onClick={() => onEdit(image)} title="Editar detalles">
//                     <Edit3 size={14} />
//                 </Button>
//                 <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => onDelete(image.id)} disabled={isCurrentDeleting} title="Eliminar imagen">
//                     {isCurrentDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
//                 </Button>
//             </div>
//         </div>
//     );
// }


// export default function PaqueteGaleria({ paqueteId, negocioId, clienteId }: PaqueteGaleriaProps) {
//     const [images, setImages] = useState<NegocioPaqueteGaleriaItem[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [uploadingFilesInfo, setUploadingFilesInfo] = useState<{ name: string; progress?: string }[]>([]);
//     const [uploadError, setUploadError] = useState<string | null>(null);
//     const [isEditingDetails, setIsEditingDetails] = useState(false);
//     const [currentImageToEdit, setCurrentImageToEdit] = useState<NegocioPaqueteGaleriaItem | null>(null);
//     const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
//     const [isSavingOrder, setIsSavingOrder] = useState(false);
//     const [isDeleting, setIsDeleting] = useState(false);
//     const [currentDeletingId, setCurrentDeletingId] = useState<string | null>(null);


//     const fetchImages = useCallback(async () => {
//         setIsLoading(true);
//         setError(null);
//         const result = await obtenerImagenesGaleriaPaqueteAction(paqueteId);
//         if (result.success && result.data) {
//             // Asegurar que las imágenes estén ordenadas por 'orden' al recibirlas
//             const sortedImages = result.data.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
//             setImages(sortedImages);
//         } else {
//             setError(result.error || "Error al cargar galería.");
//         }
//         setIsLoading(false);
//     }, [paqueteId]);

//     useEffect(() => {
//         fetchImages();
//     }, [fetchImages]);

//     const onDrop = useCallback(async (acceptedFiles: File[]) => {
//         if (images.length + acceptedFiles.length > MAX_IMAGES) {
//             setUploadError(`No puedes subir más de ${MAX_IMAGES} imágenes en total.`);
//             setTimeout(() => setUploadError(null), 5000);
//             return;
//         }

//         setUploadingFilesInfo(acceptedFiles.map(file => ({ name: file.name, progress: 'Comprimiendo...' })));
//         setUploadError(null);

//         const options = {
//             maxSizeMB: 1,
//             maxWidthOrHeight: 1920,
//             useWebWorker: true,
//         };

//         for (let i = 0; i < acceptedFiles.length; i++) {
//             const originalFile = acceptedFiles[i];
//             let fileToUpload = originalFile;

//             try {
//                 setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Comprimiendo...' } : f));
//                 const compressedFile = await imageCompression(originalFile, options);
//                 fileToUpload = compressedFile;
//                 setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Subiendo...' } : f));
//             } catch (compressionError) {
//                 console.error(`Error al comprimir ${originalFile.name}:`, compressionError);
//                 setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Error compresión' } : f));
//                 setUploadError(prev => `${prev ? prev + '\n' : ''}Error al comprimir ${originalFile.name}.`);
//                 continue;
//             }

//             const formData = new FormData();
//             formData.append('file', fileToUpload, originalFile.name);

//             const result = await agregarImagenAGaleriaPaqueteAction(paqueteId, negocioId, clienteId, formData);
//             if (!result.success) {
//                 setUploadError(prev => `${prev ? prev + '\n' : ''}Error al subir ${originalFile.name}: ${result.error}`);
//                 setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Error subida' } : f));
//             } else {
//                 setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: '¡Subido!' } : f));
//             }
//         }
//         setTimeout(() => setUploadingFilesInfo([]), 5000);
//         fetchImages();
//     }, [paqueteId, negocioId, clienteId, fetchImages, images.length]);

//     const { getRootProps, getInputProps, isDragActive } = useDropzone({
//         onDrop,
//         accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
//         multiple: true,
//     });

//     const handleOpenEditModal = (image: NegocioPaqueteGaleriaItem) => {
//         setCurrentImageToEdit(image);
//         setIsEditingDetails(true);
//     };

//     const handleCloseEditModal = () => {
//         setIsEditingDetails(false);
//         setCurrentImageToEdit(null);
//     };

//     const handleUpdateDetailsSubmit = async (id: string, data: ActualizarDetallesImagenGaleriaPaqueteData) => {
//         setIsSubmittingDetails(true);
//         const result = await actualizarDetallesImagenGaleriaPaqueteAction(id, clienteId, negocioId, paqueteId, data);
//         if (result.success) {
//             handleCloseEditModal();
//             fetchImages();
//         } else {
//             throw new Error(result.error || "Error al actualizar detalles.");
//         }
//         setIsSubmittingDetails(false);
//     };

//     const handleDeleteImage = async (id: string) => {
//         if (confirm("¿Estás seguro de que quieres eliminar esta imagen?")) {
//             setIsDeleting(true);
//             setCurrentDeletingId(id);
//             await eliminarImagenDeGaleriaPaqueteAction(id, negocioId, clienteId, paqueteId);
//             fetchImages();
//             setIsDeleting(false);
//             setCurrentDeletingId(null);
//         }
//     };

//     const sensors = useSensors(
//         useSensor(PointerSensor),
//         useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
//     );

//     const handleDragEnd = async (event: DragEndEvent) => {
//         const { active, over } = event;
//         if (active.id !== over?.id && over) {
//             const oldIndex = images.findIndex((img) => img.id === active.id);
//             const newIndex = images.findIndex((img) => img.id === over.id);
//             if (oldIndex === -1 || newIndex === -1) return;

//             const newOrderedImages = arrayMove(images, oldIndex, newIndex);
//             // Actualizar el campo 'orden' en cada imagen para la UI antes de guardar
//             const imagesWithNewOrderField = newOrderedImages.map((img, index) => ({ ...img, orden: index }));
//             setImages(imagesWithNewOrderField);

//             const ordenesParaGuardar: ReordenarImagenesGaleriaPaqueteData = imagesWithNewOrderField.map((img) => ({
//                 id: img.id,
//                 orden: img.orden, // Usar el nuevo campo 'orden'
//             }));
//             setIsSavingOrder(true);
//             const result = await actualizarOrdenImagenesGaleriaPaqueteAction(paqueteId, negocioId, clienteId, ordenesParaGuardar);
//             if (!result.success) {
//                 alert("Error al guardar el nuevo orden: " + result.error);
//             }
//             // Siempre re-fetch para asegurar que el orden de la BD es el que se muestra
//             fetchImages();
//             setIsSavingOrder(false);
//         }
//     };

//     const dropzoneClasses = `mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 border-dashed'
//         } rounded-md cursor-pointer hover:border-blue-400 transition-colors min-h-[150px]`;


//     if (isLoading && images.length === 0) {
//         return (
//             <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 flex items-center justify-center min-h-[200px]">
//                 <Loader2 size={32} className="animate-spin text-zinc-400" />
//                 <p className="ml-3 text-zinc-400">Cargando galería...</p>
//             </div>
//         );
//     }

//     if (error && images.length === 0) {
//         return (
//             <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
//                 <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
//                 <p className="text-red-400">{error}</p>
//                 <Button onClick={fetchImages} variant="outline" className="mt-4 border-zinc-600 hover:bg-zinc-700">Reintentar</Button>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-zinc-800/70 rounded-lg border border-zinc-700 p-4 md:p-6 space-y-4">
//             {images.length < MAX_IMAGES && (
//                 <div {...getRootProps()} className={dropzoneClasses}>
//                     <input {...getInputProps()} />
//                     <div className="text-center">
//                         <UploadCloud size={40} className="mx-auto text-zinc-500 mb-2" />
//                         <p className="text-sm text-zinc-400">
//                             Arrastra y suelta imágenes aquí, o <span className="text-blue-400">haz clic para seleccionar</span>
//                         </p>
//                         <p className="text-xs text-zinc-500 mt-1">Máximo {MAX_IMAGES} imágenes. PNG, JPG, GIF, WEBP.</p>
//                     </div>
//                 </div>
//             )}
//             {uploadingFilesInfo.length > 0 && (
//                 <div className="space-y-1 mt-2">
//                     {uploadingFilesInfo.map((fileInfo, index) => (
//                         <div key={index} className="text-xs text-blue-300 flex items-center">
//                             {fileInfo.progress === 'Subiendo...' || fileInfo.progress === 'Comprimiendo...' ? <Loader2 className="animate-spin mr-2" size={14} /> :
//                                 fileInfo.progress === '¡Subido!' ? <CheckCircle className="text-green-400 mr-2" size={14} /> :
//                                     <AlertTriangle className="text-red-400 mr-2" size={14} />
//                             }
//                             {fileInfo.name} - {fileInfo.progress}
//                         </div>
//                     ))}
//                 </div>
//             )}
//             {uploadError && (
//                 <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-md flex items-center gap-2 text-xs mt-2">
//                     <AlertTriangle size={16} /> <p className="whitespace-pre-line">{uploadError}</p>
//                 </div>
//             )}

//             {images.length > 0 ? (
//                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                     <SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}>
//                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
//                             {images.map((image, index) => ( // Añadido 'index' aquí
//                                 <DraggableImageItem
//                                     key={image.id}
//                                     image={image}
//                                     isCover={index === 0} // NUEVO: Pasar isCover si es el primer ítem
//                                     onEdit={handleOpenEditModal}
//                                     onDelete={handleDeleteImage}
//                                     isDeleting={isDeleting}
//                                     currentDeletingId={currentDeletingId}
//                                 />
//                             ))}
//                         </div>
//                     </SortableContext>
//                     {isSavingOrder && (
//                         <div className="mt-3 text-sm text-blue-300 flex items-center justify-end">
//                             <Loader2 className="animate-spin mr-2" size={16} /> Guardando orden...
//                         </div>
//                     )}
//                 </DndContext>
//             ) : (
//                 !isLoading && !error && uploadingFilesInfo.length === 0 && (
//                     <div className="text-center py-8 text-zinc-500">
//                         <ImageOff size={40} className="mx-auto mb-2" />
//                         <p>Esta galería está vacía.</p>
//                         <p className="text-xs">Sube la primera imagen usando el área de arriba.</p>
//                     </div>
//                 )
//             )}

//             {/* Recordatorio de Portada (ya no es necesario aquí si el badge está en la imagen) */}
//             {/* Se podría mantener un texto general si se desea, pero el badge es más directo */}
//             {images.length > 0 && (
//                 <p className="text-xs text-zinc-500 mt-4 text-center italic">
//                     La imagen marcada con la estrella (<Star size={10} className="inline text-amber-500" />) es la portada. Puedes reordenar las imágenes arrastrándolas.
//                 </p>
//             )}


//             <EditImageDetailsModal
//                 isOpen={isEditingDetails}
//                 onClose={handleCloseEditModal}
//                 image={currentImageToEdit}
//                 onSubmit={handleUpdateDetailsSubmit}
//                 isLoading={isSubmittingDetails}
//             />
//         </div>
//     );
// }

