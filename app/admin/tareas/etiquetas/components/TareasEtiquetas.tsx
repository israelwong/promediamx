'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
// --- DnD Imports ---
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- ACCIONES ---
import {
    obtenerEtiquetasTarea,
    crearEtiquetaTarea,
    editarEtiquetaTarea,
    eliminarEtiquetaTarea,
    ordenarEtiquetasTarea
} from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.actions'; // Ajusta la ruta si es necesario

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    EtiquetaTareaInputSchema,     // El esquema Zod para validación del formulario
    type EtiquetaTareaInput,      // Tipo inferido para los datos del formulario
    type EtiquetaConOrden          // Para el estado local y la UI (definido en schemas.ts)
} from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { EtiquetaTarea as EtiquetaTareaPrisma } from '@prisma/client';


// --- ICONOS ---
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, GripVertical, Tags, InfoIcon, AlertTriangleIcon
} from 'lucide-react';

// --- Componente SortableEtiquetaRow ---
// (Tu implementación original se ve bien, asegurar que 'etiqueta' sea de tipo EtiquetaConOrden)
function SortableEtiquetaRow({ id, etiqueta, onEdit }: { id: string; etiqueta: EtiquetaConOrden; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, };
    const tdBaseClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500 bg-zinc-700' : ''}`} onClick={handleRowClickInternal}>
            <td className={`${tdBaseClasses} text-center w-10`}><button {...attributes} {...listeners} data-dnd-handle="true" className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Arrastrar para reordenar" onClick={(e) => e.stopPropagation()}><GripVertical size={14} /></button></td>
            <td className={`${tdBaseClasses} text-zinc-100 font-medium`}><div className="flex items-center gap-2"><Tags size={14} className="text-zinc-500 flex-shrink-0" /><span>{etiqueta.nombre}</span></div></td>
            <td className={`${tdBaseClasses} text-zinc-400 max-w-md`}>{etiqueta.descripcion ? <div className="flex items-center gap-1"><span title="Descripción"><InfoIcon size={12} className="text-zinc-500 flex-shrink-0" /></span><span className="line-clamp-1" title={etiqueta.descripcion}>{etiqueta.descripcion}</span></div> : <span className="text-zinc-600 italic">N/A</span>}</td>
            <td className={`${tdBaseClasses} text-center text-zinc-300 w-20`}>{etiqueta._count?.tareas ?? 0}</td>
        </tr>
    );
}

// Tipo para el estado del formulario del modal, incluyendo el id opcional para edición.
type ModalFormState = Partial<EtiquetaTareaInput> & { id?: string };

export default function TareasEtiquetas() {
    const [etiquetas, setEtiquetas] = useState<EtiquetaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<EtiquetaConOrden | null>(null);

    const [modalFormData, setModalFormData] = useState<ModalFormState>({
        nombre: '',
        descripcion: ''
    });
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof EtiquetaTareaInput, string[]>>>({});

    // ... (Clases de Tailwind y sensores DnD se mantienen igual que en TareasCanales.tsx) ...
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full p-4";
    const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3";
    const headerTitleClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50";
    const errorAlertClasses = "mb-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const tableWrapperClasses = "flex-grow overflow-auto border border-zinc-700 bg-zinc-900/30";

    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";

    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;

    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await obtenerEtiquetasTarea(); // Devuelve ActionResult<EtiquetaConOrden[]>
            if (result.success && result.data) {
                setEtiquetas(result.data); // El mapeo ya se hace en la action
            } else {
                throw new Error(result.error || "No se pudieron cargar las etiquetas.");
            }
        } catch (err: unknown) {
            console.error("Error al obtener etiquetas:", err);
            setError(err instanceof Error ? err.message : "No se pudieron cargar las etiquetas.");
            setEtiquetas([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);

    const openModal = (modeToSet: 'create' | 'edit', etiqueta?: EtiquetaConOrden) => {
        setModalMode(modeToSet);
        setEtiquetaParaEditar(modeToSet === 'edit' ? etiqueta || null : null);
        setModalFormData(modeToSet === 'edit' && etiqueta ?
            {
                id: etiqueta.id, // Guardar id para edición
                nombre: etiqueta.nombre,
                descripcion: etiqueta.descripcion || '',
            } :
            { nombre: '', descripcion: '' }
        );
        setIsModalOpen(true);
        setModalError(null);
        setModalValidationErrors({});
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null);
            setEtiquetaParaEditar(null);
            setModalFormData({ nombre: '', descripcion: '' });
            setModalError(null);
            setModalValidationErrors({});
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
        if (Object.keys(modalValidationErrors).length > 0) setModalValidationErrors({});
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setModalError(null);
        setModalValidationErrors({});

        const dataToValidate: EtiquetaTareaInput = {
            nombre: modalFormData.nombre || '',
            descripcion: modalFormData.descripcion || null,
        };

        const validationResult = EtiquetaTareaInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            const flatErrors = validationResult.error.flatten().fieldErrors;
            setModalValidationErrors(flatErrors as Partial<Record<keyof EtiquetaTareaInput, string[]>>);
            setModalError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmittingModal(true);
        try {
            let result: ActionResult<EtiquetaTareaPrisma>;
            const validatedData = validationResult.data;

            if (modalMode === 'create') {
                result = await crearEtiquetaTarea(validatedData);
            } else if (modalMode === 'edit' && etiquetaParaEditar?.id) {
                result = await editarEtiquetaTarea(etiquetaParaEditar.id, validatedData);
            } else {
                throw new Error("Modo de modal inválido o ID de etiqueta faltante.");
            }

            if (result.success) {
                await fetchEtiquetas();
                closeModal();
            } else {
                setModalError(result.error || "Ocurrió un error desconocido.");
                if (result.validationErrors) {
                    setModalValidationErrors(result.validationErrors as Partial<Record<keyof EtiquetaTareaInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} etiqueta:`, err);
            setModalError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id || !etiquetaParaEditar.nombre) return;
        const tareasCount = etiquetaParaEditar._count?.tareas ?? 0;
        if (tareasCount > 0) {
            setModalError(`No se puede eliminar: Usada por ${tareasCount} tarea(s).`);
            return;
        }
        if (confirm(`¿Seguro que quieres eliminar la etiqueta "${etiquetaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarEtiquetaTarea(etiquetaParaEditar.id);
                if (result.success) {
                    await fetchEtiquetas(); closeModal();
                } else {
                    setModalError(result.error || "Error al eliminar.");
                }
            } catch (err: unknown) {
                setModalError(err instanceof Error ? err.message : "Error al eliminar.");
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etiquetas.findIndex((et) => et.id === active.id);
            const newIndex = etiquetas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedEtiquetas = arrayMove(etiquetas, oldIndex, newIndex);
            setEtiquetas(reorderedEtiquetas);

            const ordenData = reorderedEtiquetas.map((etiqueta, index) => ({ id: etiqueta.id, orden: index }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarEtiquetasTarea(ordenData);
                if (!result.success) {
                    throw new Error(result.error || "Error al guardar el orden en el servidor.");
                }
            } catch (saveError: unknown) {
                setError(saveError instanceof Error ? saveError.message : 'Error al guardar el nuevo orden.');
                await fetchEtiquetas(true);
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [etiquetas, fetchEtiquetas]);

    // --- JSX del Componente ---
    return (
        <div className={containerClasses}>
            <div className={headerSectionClasses}>
                <h2 className={headerTitleClasses}><Tags size={20} /> Etiquetas de Tareas</h2>
                <div className='flex items-center gap-3'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva etiqueta"><PlusIcon size={16} /><span>Crear Etiqueta</span></button>
                </div>
            </div>

            {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} /> {error}</p>}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableWrapperClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando etiquetas...</span></div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-700">
                                <tr>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Reordenar"></th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Tareas</th>
                                </tr>
                            </thead>
                            <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700 bg-zinc-800">
                                    {etiquetas.length === 0 && !error && !loading ? (
                                        <tr><td colSpan={4} className="text-center py-10 text-sm text-zinc-500 italic"><ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />No hay etiquetas definidas.</td></tr>
                                    ) : (
                                        etiquetas.map((etiqueta) => (
                                            <SortableEtiquetaRow key={etiqueta.id} id={etiqueta.id} etiqueta={etiqueta} onEdit={() => openModal('edit', etiqueta)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && etiquetas.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-4 mb-2 italic px-4">
                            Haz clic en una fila para editar o arrastra <GripVertical size={12} className='inline align-text-bottom -mt-0.5 mx-0.5' /> para reordenar.
                        </p>
                    )}
                </div>
            </DndContext>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>{modalMode === 'create' ? 'Crear Nueva Etiqueta' : 'Editar Etiqueta'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && (
                                    <p className="mb-3 text-center text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 text-sm flex items-center gap-2">
                                        <AlertTriangleIcon size={16} className="flex-shrink-0" /> {modalError}
                                    </p>
                                )}
                                <div>
                                    <label htmlFor="modal-etiqueta-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-etiqueta-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={`${inputBaseClasses} ${modalValidationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmittingModal} maxLength={50} placeholder="Ej: Marketing" />
                                    {modalValidationErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.nombre.join(', ')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="modal-etiqueta-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-etiqueta-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={`${textareaBaseClasses} ${modalValidationErrors.descripcion ? 'border-red-500' : ''}`} disabled={isSubmittingModal} rows={3} maxLength={200} placeholder="Breve descripción" />
                                    {modalValidationErrors.descripcion && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.descripcion.join(', ')}</p>}
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={buttonModalDanger} disabled={isSubmittingModal || (etiquetaParaEditar?._count?.tareas ?? 0) > 0} title={(etiquetaParaEditar?._count?.tareas ?? 0) > 0 ? "No se puede eliminar: Usada por tareas." : 'Eliminar Etiqueta'}><Trash2 size={16} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={buttonModalSecondary} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonModalPrimary} disabled={isSubmittingModal || !modalFormData.nombre?.trim()} >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear Etiqueta' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}