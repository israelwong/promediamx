'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerEtapasPipelineCRM, // Usar la acción que trae la lista
    crearPipelineCRM,
    editarPipelineCRM,
    eliminarPipelineCRM,
    ordenarPipelineCRM
} from '@/app/admin/_lib/crmPipeline.actions';
import { PipelineCRM } from '@/app/admin/_lib/types'; // Importar tipo
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, Workflow } from 'lucide-react'; // Iconos

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
    crmId: string;
}

// Interfaz extendida para el estado local, asegurando orden
interface PipelineCRMConOrden extends PipelineCRM {
    orden: number; // Hacer orden no opcional para la lógica de ordenamiento
}

// Tipo para el formulario modal
type PipelineFormData = Partial<Pick<PipelineCRM, 'nombre' | 'status'>>;

// --- Componente Interno para Item Arrastrable ---
function SortablePipelineItem({ etapa, onEditClick }: { etapa: PipelineCRMConOrden, onEditClick: (et: PipelineCRMConOrden) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: etapa.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    const listItemClasses = `flex items-center gap-2 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover etapa"><GripVertical size={18} /></button>
            <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={etapa.nombre}>{etapa.nombre}</span>
            {/* Opcional: Mostrar status */}
            {/* <span className={`text-xs px-1.5 py-0.5 rounded ${etapa.status === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-600 text-zinc-400'}`}>{etapa.status}</span> */}
            <button onClick={() => onEditClick(etapa)} className={buttonEditClasses} title="Editar Etapa"><PencilIcon size={16} /></button>
        </li>
    );
}


// --- Componente Principal ---
export default function CRMPipeline({ crmId }: Props) {
    const [etapas, setEtapas] = useState<PipelineCRMConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etapaParaEditar, setEtapaParaEditar] = useState<PipelineCRMConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<PipelineFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

    // Sensores dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Carga de datos ---
    const fetchEtapas = useCallback(async (isInitialLoad = false) => {
        if (!crmId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerEtapasPipelineCRM(crmId);
            // Asegurar que 'orden' sea numérico para el estado local
            setEtapas((data || []).map((et, index) => ({ ...et, orden: et.orden ?? index + 1 })));
        } catch (err) {
            console.error("Error al obtener las etapas:", err);
            setError("No se pudieron cargar las etapas del pipeline.");
            setEtapas([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [crmId]);

    useEffect(() => {
        fetchEtapas(true);
    }, [fetchEtapas]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', etapa?: PipelineCRMConOrden) => {
        setModalMode(mode);
        setEtapaParaEditar(mode === 'edit' ? etapa || null : null);
        setModalFormData(mode === 'edit' && etapa ? { nombre: etapa.nombre, status: etapa.status } : { nombre: '', status: 'activo' });
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setEtapaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                status: modalFormData.status || 'activo', // Asegurar status
            };

            if (modalMode === 'create') {
                result = await crearPipelineCRM({ crmId: crmId, nombre: dataToSend.nombre });
            } else if (modalMode === 'edit' && etapaParaEditar?.id) {
                result = await editarPipelineCRM(etapaParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchEtapas(); closeModal();
            } else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} etapa:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!etapaParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar la etapa "${etapaParaEditar.nombre}"? Considera mover los Leads asociados primero.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarPipelineCRM(etapaParaEditar.id);
                if (result?.success) { await fetchEtapas(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando etapa:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Manejador Drag End ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etapas.findIndex((et) => et.id === active.id);
            const newIndex = etapas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedEtapas = arrayMove(etapas, oldIndex, newIndex);
            const finalEtapas = reorderedEtapas.map((et, index) => ({ ...et, orden: index + 1 }));

            setEtapas(finalEtapas); // Actualización optimista

            const ordenData = finalEtapas.map(({ id, orden }) => ({ id, orden }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarPipelineCRM(ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchEtapas(); // Revertir si falla
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [etapas, fetchEtapas]);


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Workflow size={16} /> Pipeline de Ventas
                </h3>
                <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva etapa">
                    <PlusIcon size={14} /> <span>Crear Etapa</span>
                </button>
            </div>

            {/* Errores generales o de guardado de orden */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}
            {isSavingOrder && <div className="mb-2 flex items-center justify-center text-xs text-blue-300"><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...</div>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando etapas...</span></div>
                ) : etapas.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay etapas definidas.</p></div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={etapas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                            <ul className='space-y-0'>
                                {etapas.map((etapa) => (
                                    <SortablePipelineItem key={etapa.id} etapa={etapa} onEditClick={(et) => openModal('edit', et)} />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nueva Etapa' : 'Editar Etapa'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Etapa <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} />
                                </div>
                                {/* Opcional: Editar status si es necesario */}
                                {/* <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div> */}
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
