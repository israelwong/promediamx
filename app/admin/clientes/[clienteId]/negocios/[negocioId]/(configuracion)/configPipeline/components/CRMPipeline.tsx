// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/pipeline/components/CRMPipeline.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// DND Kit imports
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, MeasuringStrategy
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Nuevas Actions y Schemas/Tipos Zod
import {
    listarEtapasPipelineCrmAction,
    crearEtapaPipelineCrmAction,
    editarEtapaPipelineCrmAction,
    eliminarEtapaPipelineCrmAction,
    reordenarEtapasPipelineCrmAction
} from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions'; // Ajusta ruta!
import {
    pipelineCrmFormSchema,
    type PipelineCrmData,
    type PipelineCrmFormData
} from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas'; // Ajusta ruta!
import type { ActionResult } from '@/app/admin/_lib/types';

import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, Workflow } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"; // Para el status en modal

interface Props {
    negocioId: string;
}

// Componente Interno SortablePipelineItem (adaptado para PipelineCrmData)
function SortablePipelineItem({ etapa, onEditClick, isBeingModified }: {
    etapa: PipelineCrmData,
    onEditClick: (et: PipelineCrmData) => void,
    isBeingModified: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etapa.id, disabled: isBeingModified });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, cursor: 'grab' };
    const listItemClasses = `flex items-center gap-2 py-2.5 px-2 border-b border-zinc-700/60 transition-colors ${isDragging ? 'bg-zinc-700 shadow-lg' : 'hover:bg-zinc-700/40'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:opacity-50";
    // const colorDotClasses = "w-3 h-3 rounded-full border border-zinc-500 flex-shrink-0"; // Si añades color

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} className="p-1.5 cursor-grab touch-none text-zinc-500 hover:text-zinc-200 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover etapa" disabled={isBeingModified}>
                <GripVertical size={18} />
            </button>
            {/* {etapa.color && <span className={colorDotClasses} style={{ backgroundColor: etapa.color }} title={`Color: ${etapa.color}`}></span>} */}
            <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={etapa.nombre}>{etapa.nombre}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${etapa.status === 'activo' ? 'bg-green-500/20 text-green-300' : 'bg-zinc-600 text-zinc-400'}`}>{etapa.status}</span>
            <button onClick={() => onEditClick(etapa)} className={buttonEditClasses} title="Editar Etapa" disabled={isBeingModified}>
                <PencilIcon size={14} />
            </button>
        </li>
    );
}

export default function CRMPipeline({ negocioId }: Props) {
    const [etapas, setEtapas] = useState<PipelineCrmData[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [etapaParaEditar, setEtapaParaEditar] = useState<PipelineCrmData | null>(null);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [pendingOrderToSave, setPendingOrderToSave] = useState<PipelineCrmData[] | null>(null);

    const {
        register: registerModal,
        handleSubmit: handleSubmitModal,
        reset: resetModal,
        control: controlModal,
        formState: { errors: modalFormErrors }
    } = useForm<PipelineCrmFormData>({
        resolver: zodResolver(pipelineCrmFormSchema),
        defaultValues: { nombre: '', status: 'activo' /*, color: '#ffffff'*/ }
    });

    // Clases UI
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap disabled:opacity-60";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    // const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    // const colorInputClasses = `${inputBaseClasses} h-10 p-1 cursor-pointer appearance-none`; // Si añades color

    const fetchEtapas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) { setError("ID de negocio no disponible."); if (isInitialLoad) setLoading(false); return; }
        if (isInitialLoad) { setLoading(true); setPendingOrderToSave(null); }
        setError(null);
        try {
            const result = await listarEtapasPipelineCrmAction({ negocioId });
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setEtapas(result.data.etapas || []);
                if (!result.data.crmId && isInitialLoad) {
                    setError("CRM no configurado. Por favor, configura el CRM para añadir etapas de pipeline.");
                }
            } else { throw new Error(result.error || "Error cargando etapas."); }
        } catch (err) {
            setError(`No se pudieron cargar las etapas: ${err instanceof Error ? err.message : "Error"}`);
            setEtapas([]); setCrmId(null);
        } finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchEtapas(true); }, [fetchEtapas]);

    const openModal = (mode: 'create' | 'edit', etapa?: PipelineCrmData) => {
        if (mode === 'create' && !crmId) { setError("CRM no configurado."); return; }
        setModalMode(mode);
        setEtapaParaEditar(mode === 'edit' ? etapa || null : null);
        resetModal(
            mode === 'edit' && etapa
                ? { nombre: etapa.nombre, status: etapa.status /*, color: etapa.color || '#ffffff'*/ }
                : { nombre: '', status: 'activo' /*, color: '#ffffff'*/ }
        );
        setIsModalOpen(true);
        setModalSubmitError(null);
    };

    const closeModal = () => { /* (Igual que en CRMEtiquetas) */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode('create'); setEtapaParaEditar(null);
            resetModal({ nombre: '', status: 'activo'/*, color: '#ffffff'*/ });
            setModalSubmitError(null);
        }, 200);
    };

    const onModalFormSubmit: SubmitHandler<PipelineCrmFormData> = async (formData) => {
        setIsSubmittingModal(true); setModalSubmitError(null);
        try {
            let result: ActionResult<PipelineCrmData | null>;
            const dataToSend = {
                nombre: formData.nombre,
                status: formData.status || 'activo',
                // color: formData.color === '#ffffff' ? null : formData.color, // Si añades color
            };

            if (modalMode === 'create') {
                if (!crmId) throw new Error("ID de CRM no disponible.");
                result = await crearEtapaPipelineCrmAction({
                    crmId: crmId,
                    nombre: dataToSend.nombre,
                    status: dataToSend.status,
                    // color: dataToSend.color
                });
            } else if (modalMode === 'edit' && etapaParaEditar?.id) {
                result = await editarEtapaPipelineCrmAction({
                    etapaId: etapaParaEditar.id,
                    datos: dataToSend
                });
            } else { throw new Error("Modo inválido o ID faltante."); }

            if (result?.success && result.data) { await fetchEtapas(false); closeModal(); }
            else { throw new Error(result?.error || "Error al guardar."); }
        } catch (err) {
            setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Error"}`);
        } finally { setIsSubmittingModal(false); }
    };

    const handleModalDelete = async () => {
        if (!etapaParaEditar?.id) return;
        if (confirm(`¿Eliminar etapa "${etapaParaEditar.nombre}"? Los leads en esta etapa podrían necesitar reasignación.`)) {
            setIsSubmittingModal(true); setModalSubmitError(null);
            try {
                const result = await eliminarEtapaPipelineCrmAction({ etapaId: etapaParaEditar.id });
                if (result?.success) { await fetchEtapas(false); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Error"}`);
            } finally { setIsSubmittingModal(false); }
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setEtapas((prevEtapas) => {
                const oldIndex = prevEtapas.findIndex((et) => et.id === active.id);
                const newIndex = prevEtapas.findIndex((et) => et.id === over.id);
                const newOrderedEtapas = arrayMove(prevEtapas, oldIndex, newIndex);
                setPendingOrderToSave(newOrderedEtapas);
                return newOrderedEtapas;
            });
        }
    };

    useEffect(() => {
        const guardarOrden = async () => {
            if (!pendingOrderToSave || !crmId || isSavingOrder) return;
            setIsSavingOrder(true); setError(null);
            const etapasConNuevoOrden = pendingOrderToSave.map((et, index) => ({ id: et.id, orden: index + 1 }));
            try {
                const result = await reordenarEtapasPipelineCrmAction({ crmId, etapasOrdenadas: etapasConNuevoOrden });
                if (!result.success) throw new Error(result.error || "Error al guardar orden.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar orden.");
                fetchEtapas(false);
            } finally { setIsSavingOrder(false); setPendingOrderToSave(null); }
        };
        if (pendingOrderToSave) {
            const timer = setTimeout(guardarOrden, 700);
            return () => clearTimeout(timer);
        }
    }, [pendingOrderToSave, crmId, isSavingOrder, fetchEtapas]);

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><Workflow size={16} /> Pipeline de Ventas</h3>
                <Button onClick={() => openModal('create')} className={buttonPrimaryClasses} disabled={!crmId || loading || isSavingOrder} title={!crmId && !loading ? "Configura CRM" : ""}>
                    <PlusIcon size={14} /> <span>Crear Etapa</span>
                </Button>
            </div>

            {error && <p className="mb-3 text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-md border border-red-600/50">{error}</p>}
            {isSavingOrder && <p className="mb-2 text-xs text-sky-400 text-center animate-pulse"><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Guardando orden...</p>}

            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando...</span></div>)
                    : etapas.length === 0 && crmId ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay etapas definidas.</p></div>)
                        : !crmId && !loading && !error ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>CRM no configurado.</p></div>)
                            : etapas.length > 0 && crmId ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
                                    <SortableContext items={etapas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                                        <ul className='space-y-0 divide-y divide-zinc-700/50'>
                                            {etapas.map((etapa) => (
                                                <SortablePipelineItem key={etapa.id} etapa={etapa} onEditClick={(et) => openModal('edit', et)} isBeingModified={isSubmittingModal || isSavingOrder} />
                                            ))}
                                        </ul>
                                    </SortableContext>
                                </DndContext>
                            ) : null}
            </div>

            {isModalOpen && (
                <div className={modalOverlayClasses}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nueva Etapa' : `Editar Etapa: ${etapaParaEditar?.nombre || ''}`}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitModal(onModalFormSubmit)}>
                            <div className={modalBodyClasses}>
                                {modalSubmitError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalSubmitError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre-etapa" className={labelBaseClasses}>Nombre Etapa <span className="text-red-500">*</span></label>
                                    <Input type="text" id="modal-nombre-etapa" {...registerModal("nombre")} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={50} placeholder="Ej: Contacto Inicial, Propuesta" />
                                    {modalFormErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalFormErrors.nombre.message}</p>}
                                </div>
                                {/* Si añades color al pipelineCrmFormSchema, iría aquí con un input type="color" */}
                                <div>
                                    <label htmlFor="modal-status-etapa" className={labelBaseClasses}>Status</label>
                                    <Controller
                                        name="status"
                                        control={controlModal}
                                        defaultValue="activo"
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingModal}>
                                                <SelectTrigger id="modal-status-etapa" className={`${inputBaseClasses} flex justify-between items-center`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="activo">Activo</SelectItem>
                                                    <SelectItem value="inactivo">Inactivo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {modalFormErrors.status && <p className="text-xs text-red-400 mt-1">{modalFormErrors.status.message}</p>}
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && etapaParaEditar && (
                                    <Button type="button" onClick={handleModalDelete} variant="destructive" size="sm" className="mr-auto" disabled={isSubmittingModal}>
                                        <Trash2 size={14} className="mr-1.5" /> Eliminar
                                    </Button>)}
                                <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSubmittingModal}>Cancelar</Button>
                                <Button type="submit" size="sm" className={buttonPrimaryClasses} disabled={isSubmittingModal || (modalMode === 'create' && !crmId)}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin mr-2 h-4 w-4' /> : <Save size={14} className="mr-1.5" />}
                                    {modalMode === 'create' ? 'Crear Etapa' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}