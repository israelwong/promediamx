'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';

// Ajusta rutas según tu estructura
import {
    obtenerNegocioEtiquetas,
    crearNegocioEtiqueta,
    actualizarNegocioEtiqueta,
    eliminarNegocioEtiqueta,
    actualizarOrdenNegocioEtiquetas // <-- Asegúrate que esta acción exista
} from '@/app/admin/_lib/negocioEtiqueta.actions'; // Asegúrate que las acciones estén aquí

import { NegocioEtiqueta } from '@/app/admin/_lib/types'; // Asegúrate que incluya 'orden'
import { Loader2, ListX, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical } from 'lucide-react'; // Iconos

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

interface Props {
    negocioId: string;
}

// Interfaz actualizada para incluir orden
interface NegocioEtiquetaConOrden extends NegocioEtiqueta {
    orden?: number | null;
}

// Tipo para el formulario dentro del modal
type EtiquetaFormData = Partial<Pick<NegocioEtiqueta, 'nombre' | 'descripcion'>>;

// --- Componente Interno para la Fila Arrastrable (sin cambios) ---
function SortableTagItem({ etiqueta, onEditClick }: { etiqueta: NegocioEtiquetaConOrden, onEditClick: (et: NegocioEtiquetaConOrden) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: etiqueta.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, cursor: isDragging ? 'grabbing' : 'grab' };
    const listItemClasses = `flex items-center gap-2 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover etiqueta" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={18} />
            </button>
            <div className="flex-grow mr-2 overflow-hidden" onClick={() => onEditClick(etiqueta)} title={`Editar: ${etiqueta.nombre}`}>
                <p className="text-sm font-medium text-zinc-200 truncate">{etiqueta.nombre}</p>
                {etiqueta.descripcion && (<p className="text-xs text-zinc-400 line-clamp-1" title={etiqueta.descripcion}>{etiqueta.descripcion}</p>)}
            </div>
            <button onClick={() => onEditClick(etiqueta)} className={buttonEditClasses} title="Editar Etiqueta">
                <PencilIcon size={16} />
            </button>
        </li>
    );
}

// --- Componente Principal ---
export default function NegocioEtiquetas({ negocioId }: Props) {
    const [etiquetas, setEtiquetas] = useState<NegocioEtiquetaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<NegocioEtiquetaConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<EtiquetaFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    // --- AJUSTE: Sin padding superior, fondo transparente ---
    const containerClasses = "bg-zinc-800/0 flex flex-col h-full";
    // const headerClasses = "..."; // Cabecera eliminada
    const listContainerClasses = "flex-grow overflow-y-auto space-y-0"; // Quitado space-y
    // Clases Modal (sin cambios)
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    // --- NUEVA CLASE PARA BOTÓN CREAR INTERNO ---
    const crearButtonClasses = "w-full mt-3 border-2 border-dashed border-zinc-600 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-lg p-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";

    // Sensores para dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Función para cargar etiquetas (sin cambios) ---
    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            const data = await obtenerNegocioEtiquetas(negocioId);
            const etiquetasConOrden = (data || []).map((et, index) => ({ ...et, orden: et.orden ?? index + 1, }));
            setEtiquetas(etiquetasConOrden);
        } catch (err) { console.error("Error al obtener las etiquetas:", err); setError("No se pudieron cargar las etiquetas."); setEtiquetas([]); }
        finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);

    // --- Manejadores del Modal (sin cambios) ---
    const openModal = (mode: 'create' | 'edit', etiqueta?: NegocioEtiquetaConOrden) => {
        setModalMode(mode); setEtiquetaParaEditar(mode === 'edit' ? etiqueta || null : null);
        setModalFormData(mode === 'edit' && etiqueta ? { nombre: etiqueta.nombre, descripcion: etiqueta.descripcion } : { nombre: '', descripcion: '' });
        setIsModalOpen(true); setModalError(null);
    };
    const closeModal = () => { setIsModalOpen(false); setTimeout(() => { setModalMode(null); setEtiquetaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); }, 300); };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setModalFormData(prev => ({ ...prev, [name]: value })); setModalError(null); };
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);
        try {
            const dataToSend = { nombre: modalFormData.nombre.trim(), descripcion: modalFormData.descripcion?.trim() || null, };
            if (modalMode === 'create') { const nuevoOrden = etiquetas.length + 1; await crearNegocioEtiqueta({ ...dataToSend, negocioId: negocioId, orden: nuevoOrden, /* itemEtiquetas: [] */ }); } // Removido itemEtiquetas si no pertenece aquí
            else if (modalMode === 'edit' && etiquetaParaEditar?.id) { await actualizarNegocioEtiqueta(etiquetaParaEditar.id, dataToSend); }
            await fetchEtiquetas(); closeModal();
        } catch (err) { console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} etiqueta:`, err); const message = err instanceof Error ? err.message : "Ocurrió un error"; setModalError(`Error: ${message}`); setIsSubmittingModal(false); }
    };
    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar la etiqueta "${etiquetaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try { await eliminarNegocioEtiqueta(etiquetaParaEditar.id); await fetchEtiquetas(); closeModal(); }
            catch (err) { console.error("Error eliminando etiqueta:", err); const message = err instanceof Error ? err.message : "Ocurrió un error"; setModalError(`Error al eliminar: ${message}`); setIsSubmittingModal(false); }
        }
    };

    // --- Manejador Drag End para Etiquetas (sin cambios) ---
    const handleDragEndEtiquetas = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etiquetas.findIndex((et) => et.id === active.id); const newIndex = etiquetas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedEtiquetas = arrayMove(etiquetas, oldIndex, newIndex);
            const finalEtiquetas = reorderedEtiquetas.map((et, index) => ({ ...et, orden: index + 1 }));
            setEtiquetas(finalEtiquetas);
            const ordenData = finalEtiquetas.map(({ id, orden }) => ({ id, orden: orden as number }));
            setIsSavingOrder(true); setError(null);
            try { await actualizarOrdenNegocioEtiquetas(ordenData); } // Asegúrate que esta acción exista
            catch (saveError) { console.error('Error al guardar el orden de etiquetas:', saveError); setError('Error al guardar el nuevo orden.'); setEtiquetas(etiquetas); } // Revertir
            finally { setIsSavingOrder(false); }
        }
    }, [etiquetas]);

    // --- Función para renderizar contenido interno ---
    const renderInternalContent = () => {
        if (loading) return <div className="flex items-center justify-center py-6 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Cargando...</span></div>;
        if (error && !isSavingOrder) return <div className="flex flex-col items-center justify-center text-center py-6"><ListX className="h-6 w-6 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>;

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndEtiquetas}>
                <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                    {etiquetas.length === 0 && !error ? (
                        <div className="flex flex-col items-center justify-center text-center py-6"><ListChecks className="h-6 w-6 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay etiquetas definidas.</p></div>
                    ) : (
                        <ul className='divide-y divide-zinc-700'> {/* Usar divide */}
                            {etiquetas.map((etiqueta) => (
                                <SortableTagItem
                                    key={etiqueta.id}
                                    etiqueta={etiqueta}
                                    onEditClick={(etiqueta) => openModal('edit', etiqueta)}
                                />
                            ))}
                        </ul>
                    )}
                </SortableContext>
            </DndContext>
        );
    }

    // --- Renderizado Principal ---
    return (
        <div className={containerClasses}>
            {/* --- CABECERA ELIMINADA --- */}

            {/* Indicador de guardado de orden */}
            {isSavingOrder && (<div className="mb-2 flex items-center justify-center text-xs text-blue-300"> <Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden... </div>)}

            {/* Contenido Principal: Lista (con D&D) */}
            <div className={listContainerClasses}>
                {renderInternalContent()}
            </div>

            {/* --- NUEVO: Botón Crear Etiqueta Apilado --- */}
            {!loading && !error && (
                <div className="mt-auto pt-3"> {/* mt-auto empuja al fondo */}
                    <button
                        onClick={() => openModal('create')}
                        className={crearButtonClasses}
                        title="Crear nueva etiqueta"
                    >
                        <PlusIcon size={16} />
                        <span>Crear Etiqueta</span>
                    </button>
                </div>
            )}
            {/* --------------------------------------- */}

            {/* Modal para Crear/Editar Etiqueta (sin cambios) */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}> <h3 className="text-lg font-semibold text-white"> {modalMode === 'create' ? 'Crear Nueva Etiqueta' : 'Editar Etiqueta'} </h3> <button onClick={closeModal} className="text-zinc-400 hover:text-white" aria-label="Cerrar modal"> <XIcon size={20} /> </button> </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div> <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label> <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} /> </div>
                                <div> <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label> <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} /> </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClasses} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 text-sm px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClasses} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-sm`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClasses} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-sm`} disabled={isSubmittingModal}> {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} {modalMode === 'create' ? 'Crear' : 'Guardar'} </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
