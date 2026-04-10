'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { Button } from '@/app/components/ui/button';
import {
    UploadCloud,
    FileText,
    Trash2,
    Edit3,
    Loader2,
    AlertTriangle,
    CheckCircle,
    GripVertical,
    FileUp,
    Download,
    XCircle
} from 'lucide-react';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionResult } from '@/app/admin/_lib/types'; // Asumo que tienes este tipo

// --- Tipos Genéricos para el Componente ---
export interface DocumentItemBase {
    id: string;
    documentoUrl: string;
    orden: number | null; // Permitir null si no se ha ordenado
    documentoNombre?: string | null;
    documentoTipo?: string | null;
    documentoTamanoBytes?: number | null;
    descripcion?: string | null;
    createdAt: Date | string; // Puede ser string si viene de JSON
}

export interface UpdateDocumentDetailsData {
    documentoNombre?: string | null;
    descripcion?: string | null;
}

export interface ReorderDocumentItemData {
    id: string;
    orden: number;
}

// --- Props del Componente Reutilizable ---
export interface SharedDocumentManagerProps<T extends DocumentItemBase> {
    ownerEntityId: string; // ID de la entidad dueña (ej. ofertaId, paqueteId)
    negocioId: string;     // Para la ruta de storage y actualizar Negocio.almacenamientoUsadoBytes
    clienteId: string;     // Para revalidatePath

    actions: {
        fetchItemsAction: (ownerEntityId: string) => Promise<ActionResult<T[]>>;
        addItemAction: (ownerEntityId: string, negocioId: string, clienteId: string, formData: FormData) => Promise<ActionResult<T>>;
        updateItemDetailsAction: (itemId: string, clienteId: string, negocioId: string, ownerEntityId: string, data: UpdateDocumentDetailsData) => Promise<ActionResult<T>>;
        deleteItemAction: (itemId: string, negocioId: string, clienteId: string, ownerEntityId: string) => Promise<ActionResult<void>>;
        updateOrderAction: (ownerEntityId: string, negocioId: string, clienteId: string, orderData: ReorderDocumentItemData[]) => Promise<ActionResult<void>>;
    };

    maxDocuments?: number;
    itemDisplayName?: string; // Ej: "documento", "contrato", "adjunto"
    itemDisplayNamePlural?: string;
    acceptedFileTypes?: { [key: string]: string[] }; // Para el dropzone
    maxFileSizeMB?: number;
}

// --- Modal para Editar Detalles (Componente Interno) ---
interface EditDocumentDetailsModalProps<T extends DocumentItemBase> {
    isOpen: boolean;
    onClose: () => void;
    documentItem: T | null;
    onSubmit: (id: string, data: UpdateDocumentDetailsData) => Promise<void>;
    isLoading: boolean;
    itemDisplayName?: string;
}

function EditDocumentDetailsModal<T extends DocumentItemBase>({
    isOpen, onClose, documentItem, onSubmit, isLoading, itemDisplayName = "documento"
}: EditDocumentDetailsModalProps<T>) {
    const [docNombre, setDocNombre] = useState(documentItem?.documentoNombre || '');
    const [descripcion, setDescripcion] = useState(documentItem?.descripcion || '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (documentItem) {
            setDocNombre(documentItem.documentoNombre || '');
            setDescripcion(documentItem.descripcion || '');
        }
        setError(null);
    }, [documentItem, isOpen]);

    if (!isOpen || !documentItem) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null);
        try {
            await onSubmit(documentItem.id, {
                documentoNombre: docNombre.trim() === '' ? null : docNombre.trim(),
                descripcion: descripcion.trim() === '' ? null : descripcion.trim()
            });
            onClose();
        } catch (submitError: unknown) {
            setError(submitError instanceof Error ? submitError.message : `Error al guardar detalles del ${itemDisplayName}.`);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-lg border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">Editar Detalles de {itemDisplayName.charAt(0).toUpperCase() + itemDisplayName.slice(1)}</h3>
                <p className="text-xs text-zinc-400 mb-1">URL: <a href={documentItem.documentoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{documentItem.documentoUrl}</a></p>
                <p className="text-xs text-zinc-400 mb-3">Tipo: {documentItem.documentoTipo || 'Desconocido'}, Tamaño: {documentItem.documentoTamanoBytes ? (documentItem.documentoTamanoBytes / 1024).toFixed(2) + ' KB' : 'N/A'}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="docNombreModalShared" className="block text-sm font-medium text-zinc-300 mb-1">Nombre del Documento</label>
                        <input id="docNombreModalShared" type="text" value={docNombre} onChange={(e) => setDocNombre(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="descripcionModalSharedDoc" className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
                        <textarea id="descripcionModalSharedDoc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-300 w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" disabled={isLoading} />
                    </div>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Guardar Detalles
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// --- Componente DraggableDocumentItem (Componente Interno) ---
interface DraggableDocumentItemProps<T extends DocumentItemBase> {
    doc: T;
    onEdit: (doc: T) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    currentDeletingId: string | null;
    itemDisplayName?: string;
}

function DraggableDocumentItem<T extends DocumentItemBase>({
    doc, onEdit, onDelete, isDeleting, currentDeletingId, itemDisplayName = "documento"
}: DraggableDocumentItemProps<T>) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined };
    const isCurrentDeleting = isDeleting && currentDeletingId === doc.id;

    return (
        <div ref={setNodeRef} style={style} className="bg-zinc-800/80 p-3 rounded-md border border-zinc-700 group relative flex items-center gap-3 hover:border-zinc-600">
            <button {...attributes} {...listeners} className="p-1 cursor-grab text-zinc-500 hover:text-zinc-200 opacity-60 group-hover:opacity-100 transition-opacity">
                <GripVertical size={18} />
            </button>
            <FileText size={24} className="text-blue-400 flex-shrink-0" />
            <div className="flex-grow overflow-hidden">
                <p className="text-sm font-medium text-zinc-100 truncate" title={doc.documentoNombre || 'Documento sin nombre'}>
                    {doc.documentoNombre || `Documento #${doc.orden !== null ? doc.orden + 1 : ''}`}
                </p>
                <p className="text-xs text-zinc-400 truncate" title={doc.descripcion || ''}>{doc.descripcion || 'Sin descripción'}</p>
                <p className="text-xs text-zinc-500">
                    {doc.documentoTipo || 'Tipo desc.'} - {doc.documentoTamanoBytes ? (doc.documentoTamanoBytes / 1024).toFixed(1) + ' KB' : 'Tamaño desc.'}
                </p>
            </div>
            <div className="flex-shrink-0 space-x-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-blue-300" onClick={() => onEdit(doc)} title={`Editar detalles de ${itemDisplayName}`}>
                    <Edit3 size={16} />
                </Button>
                <a href={doc.documentoUrl} target="_blank" rel="noopener noreferrer" title="Descargar/Ver Documento">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-green-400">
                        <Download size={16} />
                    </Button>
                </a>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => onDelete(doc.id)} disabled={isCurrentDeleting} title={`Eliminar ${itemDisplayName}`}>
                    {isCurrentDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                </Button>
            </div>
        </div>
    );
}


// --- Componente Principal Reutilizable ---
export default function SharedDocumentManager<T extends DocumentItemBase>({
    ownerEntityId,
    negocioId,
    clienteId,
    actions,
    maxDocuments = 5,
    itemDisplayName = "documento",
    itemDisplayNamePlural = "documentos",
    acceptedFileTypes = { // Tipos de archivo comunes para documentos
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFileSizeMB = 10,
}: SharedDocumentManagerProps<T>) {
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

    const fetchItems = useCallback(async () => {
        setIsLoading(true); setError(null);
        const result = await actions.fetchItemsAction(ownerEntityId);
        if (result.success && Array.isArray(result.data)) {
            const sortedItems = result.data.sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
            setItems(sortedItems.map(item => ({ ...item, createdAt: new Date(item.createdAt) } as T))); // Asegurar que createdAt es Date
        } else {
            setError(result.error || `Error al cargar ${itemDisplayNamePlural}.`);
        }
        setIsLoading(false);
    }, [ownerEntityId, actions, itemDisplayNamePlural]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
        if (items.length + acceptedFiles.length > maxDocuments) {
            setUploadError(`No puedes subir más de ${maxDocuments} ${itemDisplayNamePlural} en total.`);
            setTimeout(() => setUploadError(null), 5000); return;
        }
        setUploadingFilesInfo(acceptedFiles.map(file => ({ name: file.name, progress: 'Iniciando...' })));
        setUploadError(null);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const fileToUpload = acceptedFiles[i];
            // Validación de tamaño en cliente (la action también lo hará en servidor)
            if (fileToUpload.size > maxFileSizeMB * 1024 * 1024) {
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: `Error: Excede ${maxFileSizeMB}MB` } : f));
                setUploadError(prev => `${prev ? prev + '\n' : ''}${fileToUpload.name}: Excede ${maxFileSizeMB}MB.`);
                continue;
            }

            setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Subiendo...' } : f));

            const formData = new FormData();
            formData.append('file', fileToUpload, fileToUpload.name);

            const result = await actions.addItemAction(ownerEntityId, negocioId, clienteId, formData);

            if (!result.success || !result.data) {
                setUploadError(prev => `${prev ? prev + '\n' : ''}Error al subir ${fileToUpload.name}: ${result.error}`);
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 'Error en subida' } : f));
            } else {
                setUploadingFilesInfo(prev => prev.map((f, idx) => idx === i ? { ...f, progress: '¡Subido!' } : f));
            }
        }
        // Ocultar mensajes de progreso y recargar lista
        setTimeout(() => setUploadingFilesInfo([]), 2000);
        fetchItems(); // Recargar lista de documentos
    }, [items.length, maxDocuments, itemDisplayNamePlural, actions, ownerEntityId, negocioId, clienteId, fetchItems, maxFileSizeMB]);

    const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
        onDrop,
        accept: acceptedFileTypes,
        multiple: true,
        noClick: true, // Deshabilitar click en dropzone si usamos un botón separado
        noKeyboard: true,
    });

    const handleOpenEditModal = (doc: T) => { setCurrentItemToEdit(doc); setIsEditingDetails(true); };
    const handleCloseEditModal = () => { setIsEditingDetails(false); setCurrentItemToEdit(null); };

    const handleUpdateDetailsSubmit = async (id: string, data: UpdateDocumentDetailsData) => {
        setIsSubmittingDetails(true);
        const result = await actions.updateItemDetailsAction(id, clienteId, negocioId, ownerEntityId, data);
        if (result.success) {
            handleCloseEditModal(); fetchItems();
        } else { throw new Error(result.error || `Error al actualizar detalles del ${itemDisplayName}.`); }
        setIsSubmittingDetails(false);
    };

    const handleDeleteDocument = async (id: string) => {
        if (confirm(`¿Estás seguro de que quieres eliminar este ${itemDisplayName}? Esta acción no se puede deshacer.`)) {
            setIsDeleting(true); setCurrentDeletingId(id);
            const result = await actions.deleteItemAction(id, negocioId, clienteId, ownerEntityId);
            if (!result.success) {
                alert(`Error al eliminar ${itemDisplayName}: ${result.error}`);
            }
            fetchItems(); // Siempre recargar para reflejar el estado
            setIsDeleting(false); setCurrentDeletingId(null);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Mayor distancia para evitar conflicto con clicks
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = items.findIndex((doc) => doc.id === active.id);
            const newIndex = items.findIndex((doc) => doc.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const newOrderedItems = arrayMove(items, oldIndex, newIndex);
            const itemsWithNewOrderField = newOrderedItems.map((doc, index) => ({ ...doc, orden: index }));
            setItems(itemsWithNewOrderField as T[]); // Actualizar UI inmediatamente

            const ordenesParaGuardar: ReorderDocumentItemData[] = itemsWithNewOrderField.map((doc) => ({ id: doc.id, orden: doc.orden as number }));

            setIsSavingOrder(true);
            const result = await actions.updateOrderAction(ownerEntityId, negocioId, clienteId, ordenesParaGuardar);
            if (!result.success) {
                alert("Error al guardar el nuevo orden: " + result.error);
                fetchItems(); // Revertir a orden de DB si falla
            }
            setIsSavingOrder(false);
        }
    };

    const dropzoneBaseClasses = "mt-1 flex flex-col justify-center items-center p-6 border-2 rounded-md transition-colors";
    const dropzoneActiveClasses = "border-blue-500 bg-blue-500/10";
    const dropzoneInactiveClasses = "border-zinc-600 border-dashed hover:border-blue-400";


    if (isLoading && items.length === 0) return <div className="flex items-center justify-center min-h-[150px] p-4"><Loader2 size={28} className="animate-spin text-zinc-400" /></div>;
    if (error && items.length === 0) return <div className="text-center p-4"><AlertTriangle size={28} className="mx-auto mb-2 text-red-500" /><p className="text-red-400 text-sm">{error}</p><Button onClick={fetchItems} variant="outline" size="sm" className="mt-3">Reintentar</Button></div>;

    return (
        <div className="space-y-4">
            {items.length < maxDocuments && (
                <div {...getRootProps()} className={`${dropzoneBaseClasses} ${isDragActive ? dropzoneActiveClasses : dropzoneInactiveClasses}`}>
                    <input {...getInputProps()} />
                    <div className="text-center">
                        <UploadCloud size={36} className="mx-auto text-zinc-500 mb-2" />
                        <p className="text-sm text-zinc-400">
                            Arrastra y suelta {itemDisplayNamePlural} aquí
                        </p>
                        <Button type="button" variant="link" size="sm" onClick={openFileDialog} className="text-blue-400 text-sm">
                            o haz clic para seleccionar archivos
                        </Button>
                        <p className="text-xs text-zinc-500 mt-1">Máximo {maxDocuments} {itemDisplayNamePlural}. Hasta {maxFileSizeMB}MB por archivo.</p>
                        <p className="text-xs text-zinc-500">Tipos comunes: PDF, DOCX, TXT, XLSX.</p>
                    </div>
                </div>
            )}
            {uploadingFilesInfo.length > 0 && (
                <div className="space-y-1.5 mt-3 text-xs">
                    {uploadingFilesInfo.map((fileInfo, index) => (
                        <div key={index} className={`flex items-center p-2 rounded-md text-zinc-300 ${fileInfo.progress?.startsWith('Error') ? 'bg-red-500/10' : 'bg-zinc-700/50'}`}>
                            {fileInfo.progress === 'Subiendo...' || fileInfo.progress === 'Iniciando...' ? <Loader2 className="animate-spin mr-2 flex-shrink-0" size={14} /> :
                                fileInfo.progress === '¡Subido!' ? <CheckCircle className="text-green-400 mr-2 flex-shrink-0" size={14} /> :
                                    <XCircle className="text-red-400 mr-2 flex-shrink-0" size={14} />
                            }
                            <span className="truncate flex-grow" title={fileInfo.name}>{fileInfo.name}</span>
                            <span className="ml-2 text-zinc-400 flex-shrink-0">{fileInfo.progress}</span>
                        </div>
                    ))}
                </div>
            )}
            {uploadError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-center gap-2 text-sm mt-3">
                    <AlertTriangle size={18} /> <p className="whitespace-pre-line">{uploadError}</p>
                </div>
            )}

            {items.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map(doc => doc.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3 mt-4">
                            {items.map((item) => (
                                <DraggableDocumentItem<T>
                                    key={item.id}
                                    doc={item}
                                    onEdit={handleOpenEditModal}
                                    onDelete={handleDeleteDocument}
                                    isDeleting={isDeleting}
                                    currentDeletingId={currentDeletingId}
                                    itemDisplayName={itemDisplayName}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    {isSavingOrder && (
                        <div className="mt-3 text-sm text-blue-300 flex items-center justify-end">
                            <Loader2 className="animate-spin mr-2" size={16} /> Guardando nuevo orden...
                        </div>
                    )}
                </DndContext>
            ) : (
                !isLoading && !error && uploadingFilesInfo.length === 0 && (
                    <div className="text-center py-6 text-zinc-500 border-2 border-dashed border-zinc-700 rounded-md mt-4">
                        <FileUp size={36} className="mx-auto mb-2" />
                        <p className="text-sm">No hay {itemDisplayNamePlural} adjuntos.</p>
                        <p className="text-xs">Utiliza el área de arriba para subir el primer {itemDisplayName}.</p>
                    </div>
                )
            )}

            <EditDocumentDetailsModal<T>
                isOpen={isEditingDetails}
                onClose={handleCloseEditModal}
                documentItem={currentItemToEdit}
                onSubmit={handleUpdateDetailsSubmit}
                isLoading={isSubmittingDetails}
                itemDisplayName={itemDisplayName}
            />
        </div>
    );
}