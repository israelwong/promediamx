// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/etiquetas/components/CatalogoEtiquetas.tsx
'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';

// Actions desde la nueva ubicación
import {
    obtenerNegocioEtiquetas,
    crearNegocioEtiqueta,
    actualizarNegocioEtiqueta,
    eliminarNegocioEtiqueta,
    actualizarOrdenNegocioEtiquetas
} from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.actions';

// Tipos Zod y ActionResult
import {
    type NegocioEtiquetaType, // Este es el tipo completo de Prisma/Zod
    type CrearNegocioEtiquetaData,
    type ActualizarNegocioEtiquetaData,
    type ActualizarOrdenEtiquetasData
} from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.schemas';
import { ActionResult } from '@/app/admin/_lib/types';

import { Loader2, ListX, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, Tags, AlertCircle, CheckCircle } from 'lucide-react';

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
    clienteId: string; // Añadido para revalidatePath
}

// Usaremos NegocioEtiquetaType directamente o un tipo derivado si es necesario para el estado.
// Por ahora, el componente espera 'orden' como number | null, lo cual es compatible.
// Si NegocioEtiquetaType.orden es 'number | null', está bien.
// La interfaz NegocioEtiquetaConOrden del componente original aseguraba que orden fuera number.
// Lo manejaremos en fetchEtiquetas.

type EtiquetaFormData = Partial<Pick<NegocioEtiquetaType, 'nombre' | 'descripcion'>>;

function SortableTagItem({ etiqueta, onEditClick }: { etiqueta: NegocioEtiquetaType, onEditClick: (et: NegocioEtiquetaType) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: etiqueta.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, cursor: isDragging ? 'grabbing' : 'grab' };
    const listItemClasses = `flex items-center gap-2 py-2.5 px-3 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg rounded-md' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1.5 flex-shrink-0 rounded-md hover:bg-zinc-600/50";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1" aria-label="Mover etiqueta" onClick={(e) => e.stopPropagation()}>
                <GripVertical size={18} />
            </button>
            <div className="flex-grow mr-2 overflow-hidden cursor-pointer" onClick={() => onEditClick(etiqueta)} title={`Editar: ${etiqueta.nombre}`}>
                <p className="text-sm font-medium text-zinc-100 truncate">{etiqueta.nombre}</p>
                {etiqueta.descripcion && (<p className="text-xs text-zinc-400 line-clamp-1" title={etiqueta.descripcion}>{etiqueta.descripcion}</p>)}
            </div>
            <button onClick={() => onEditClick(etiqueta)} className={buttonEditClasses} title="Editar Etiqueta">
                <PencilIcon size={15} />
            </button>
        </li>
    );
}

export default function CatalogoEtiquetas({ negocioId, clienteId }: Props) {
    const [etiquetas, setEtiquetas] = useState<NegocioEtiquetaType[]>([]); // Usar el tipo Zod/Prisma
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<NegocioEtiquetaType | null>(null);
    const [modalFormData, setModalFormData] = useState<EtiquetaFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const mainCardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerCardClasses = "p-4 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-800 z-10";
    const titleCardClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const createButtonCardClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";
    const listContainerClasses = "flex-grow overflow-y-auto p-1";
    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseModalClasses = "inline-flex items-center justify-center text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150 px-4 py-2 gap-2";

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            const data = await obtenerNegocioEtiquetas(negocioId); // Devuelve PrismaNegocioEtiqueta[]
            // Asegurar que las fechas son objetos Date y orden es un número para el estado local
            const processedData = (data || []).map(et => ({
                ...et,
                createdAt: new Date(et.createdAt),
                updatedAt: new Date(et.updatedAt),
                orden: et.orden ?? 0, // Asegurar que orden sea un número
            }));
            setEtiquetas(processedData as NegocioEtiquetaType[]); // Cast si es necesario, o mapear a NegocioEtiquetaType
        } catch (err) {
            console.error("Error al obtener las etiquetas:", err);
            setError("No se pudieron cargar las etiquetas.");
            setEtiquetas([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    const openModal = (mode: 'create' | 'edit', etiqueta?: NegocioEtiquetaType) => {
        setModalMode(mode);
        setEtiquetaParaEditar(mode === 'edit' ? etiqueta || null : null);
        setModalFormData(mode === 'edit' && etiqueta ? { nombre: etiqueta.nombre, descripcion: etiqueta.descripcion } : { nombre: '', descripcion: '' });
        setIsModalOpen(true);
        setModalError(null);
    };
    const closeModal = () => { setIsModalOpen(false); setTimeout(() => { setModalMode(null); setEtiquetaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); }, 300); };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setModalFormData(prev => ({ ...prev, [name]: value })); setModalError(null); };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validar nombre directamente aquí o confiar en la validación Zod del server action
        if (!modalFormData.nombre?.trim()) {
            setModalError("El nombre es obligatorio.");
            return;
        }
        setIsSubmittingModal(true); setModalError(null); setSuccessMessage(null);

        try {
            let result: ActionResult<NegocioEtiquetaType>; // Esperar el tipo de Prisma/Zod

            // Preparar datos según el schema Zod esperado por la acción
            const dataToSend: CrearNegocioEtiquetaData | ActualizarNegocioEtiquetaData = {
                nombre: modalFormData.nombre.trim(),
                // Zod manejará si descripción es null o string. Si es string vacío, se guarda así.
                descripcion: modalFormData.descripcion?.trim() || null,
            };

            if (modalMode === 'create') {
                result = await crearNegocioEtiqueta(negocioId, clienteId, dataToSend as CrearNegocioEtiquetaData);
            } else if (modalMode === 'edit' && etiquetaParaEditar?.id) {
                result = await actualizarNegocioEtiqueta(etiquetaParaEditar.id, negocioId, clienteId, dataToSend as ActualizarNegocioEtiquetaData);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result.success) {
                await fetchEtiquetas();
                closeModal();
                setSuccessMessage(modalMode === 'create' ? 'Etiqueta creada exitosamente.' : 'Etiqueta actualizada exitosamente.');
            } else {
                let errorMsg = result.error || "Error desconocido.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} etiqueta:`, err);
            setModalError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar la etiqueta "${etiquetaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null); setSuccessMessage(null);
            try {
                const result = await eliminarNegocioEtiqueta(etiquetaParaEditar.id, negocioId, clienteId);
                if (result.success) {
                    await fetchEtiquetas();
                    closeModal();
                    setSuccessMessage('Etiqueta eliminada exitosamente.');
                } else {
                    throw new Error(result.error || "Error desconocido al eliminar.");
                }
            }
            catch (err) {
                console.error("Error eliminando etiqueta:", err);
                setModalError(err instanceof Error ? err.message : "Ocurrió un error");
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    const handleDragEndEtiquetas = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etiquetas.findIndex((et) => et.id === active.id);
            const newIndex = etiquetas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedEtiquetas = arrayMove(etiquetas, oldIndex, newIndex);
            const finalEtiquetas = reorderedEtiquetas.map((et, index) => ({ ...et, orden: index }));
            setEtiquetas(finalEtiquetas);

            const ordenData: ActualizarOrdenEtiquetasData = finalEtiquetas.map(({ id, orden }) => ({
                id,
                orden: orden as number, // El estado local ya tiene orden como número
            }));

            setIsSavingOrder(true); setError(null); setSuccessMessage(null);
            try {
                const result = await actualizarOrdenNegocioEtiquetas(negocioId, clienteId, ordenData);
                if (result.success) {
                    setSuccessMessage("Orden guardado.");
                } else {
                    throw new Error(result.error || "No se pudo guardar el orden.");
                }
            }
            catch (saveError) {
                console.error('Error al guardar el orden de etiquetas:', saveError);
                setError(saveError instanceof Error ? saveError.message : 'Error al guardar el nuevo orden.');
                await fetchEtiquetas();
            }
            finally { setIsSavingOrder(false); }
        }
    }, [etiquetas, fetchEtiquetas, negocioId, clienteId]);

    const renderInternalContent = () => {
        // ... (sin cambios respecto a la versión anterior del componente)
        if (loading) return <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando etiquetas...</span></div>;
        if (error && !isSavingOrder) return <div className="flex flex-col items-center justify-center text-center py-10"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>;

        if (etiquetas.length === 0 && !error) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                    <ListChecks className="h-10 w-10 text-zinc-500 mb-3" />
                    <p className='text-zinc-400 text-base font-medium mb-1'>No hay etiquetas definidas.</p>
                    <p className='text-zinc-500 text-sm'>Crea tu primera etiqueta para organizar mejor tus productos o servicios.</p>
                </div>
            );
        }

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndEtiquetas}>
                <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                    <ul className='divide-y divide-zinc-700'>
                        {etiquetas.map((etiqueta) => (
                            <SortableTagItem
                                key={etiqueta.id}
                                etiqueta={etiqueta}
                                onEditClick={() => openModal('edit', etiqueta)}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        );
    }

    return (
        <div className={mainCardContainerClasses}>
            <div className={headerCardClasses}>
                <h2 className={titleCardClasses}>
                    <Tags size={20} className="text-sky-400" />
                    Gestionar Etiquetas
                </h2>
                <button
                    onClick={() => openModal('create')}
                    className={createButtonCardClasses}
                    title="Crear nueva etiqueta"
                    disabled={loading || isSavingOrder}
                >
                    <PlusIcon size={16} />
                    <span>Nueva Etiqueta</span>
                </button>
            </div>

            <div className="px-4 pt-2">
                {isSavingOrder && (<div className="mb-2 flex items-center justify-center text-xs text-blue-300 p-1.5 bg-blue-500/10 rounded-md border border-blue-500/30"> <Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden... </div>)}
                {successMessage && (<p className="mb-2 text-center text-xs text-green-300 bg-green-500/10 p-1.5 rounded-md border border-green-500/30 flex items-center justify-center gap-1"> <CheckCircle size={14} /> {successMessage} </p>)}
            </div>

            <div className={listContainerClasses}>
                {renderInternalContent()}
            </div>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-zinc-100">
                                {modalMode === 'create' ? 'Crear Nueva Etiqueta' : 'Editar Etiqueta'}
                            </h3>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-700" aria-label="Cerrar modal">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="text-center text-red-400 bg-red-900/30 p-2.5 rounded-md border border-red-600/50 text-sm mb-3 flex items-center gap-2"><AlertCircle size={16} />{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} />
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && etiquetaParaEditar && (
                                    <button
                                        type="button"
                                        onClick={handleModalDelete}
                                        className={`${buttonBaseModalClasses} bg-red-600 hover:bg-red-700 focus:ring-red-500 mr-auto`}
                                        disabled={isSubmittingModal}
                                    >
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className={`${buttonBaseModalClasses} bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-400 text-zinc-100`}
                                    disabled={isSubmittingModal}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`${buttonBaseModalClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white`}
                                    disabled={isSubmittingModal}
                                >
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
