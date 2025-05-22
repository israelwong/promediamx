// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/etiquetas/components/CRMEtiquetas.tsx
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

// --- NUEVAS IMPORTS ---
import {
    listarEtiquetasCrmAction,
    crearEtiquetaCrmAction,
    editarEtiquetaCrmAction,
    eliminarEtiquetaCrmAction,
    reordenarEtiquetasCrmAction
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.actions'; // Ajusta ruta!
import {
    etiquetaCrmFormSchema, // Para el formulario del modal
    type EtiquetaCrmData,    // Para la lista de etiquetas
    type EtiquetaCrmFormData // Para el tipo de datos del formulario
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.schemas'; // Ajusta ruta!
import type { ActionResult } from '@/app/admin/_lib/types';

import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, Tags, Palette } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
// Select no se usa en el form de etiquetas, pero podría ser si el status fuera un select

interface Props {
    negocioId: string;
}

// Componente SortableTagItem (adaptado para EtiquetaCrmData)
function SortableTagItem({ etiqueta, onEditClick, isBeingModified }: {
    etiqueta: EtiquetaCrmData,
    onEditClick: (et: EtiquetaCrmData) => void,
    isBeingModified: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etiqueta.id, disabled: isBeingModified });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, cursor: 'grab' };
    const listItemClasses = `flex items-center gap-2 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:opacity-50";
    const colorDotClasses = "w-3 h-3 rounded-full border border-zinc-500 flex-shrink-0";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} className="p-1.5 cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover etiqueta" disabled={isBeingModified}>
                <GripVertical size={18} />
            </button>
            <span className={colorDotClasses} style={{ backgroundColor: etiqueta.color || 'transparent' }} title={`Color: ${etiqueta.color || 'Ninguno'}`}></span>
            <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={etiqueta.nombre}>{etiqueta.nombre}</span>
            <button onClick={() => onEditClick(etiqueta)} className={buttonEditClasses} title="Editar Etiqueta" disabled={isBeingModified}>
                <PencilIcon size={14} />
            </button>
        </li>
    );
}


export default function CRMEtiquetas({ negocioId }: Props) {
    const [etiquetas, setEtiquetas] = useState<EtiquetaCrmData[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<EtiquetaCrmData | null>(null);
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [pendingOrderToSave, setPendingOrderToSave] = useState<EtiquetaCrmData[] | null>(null);

    const {
        register: registerModal,
        handleSubmit: handleSubmitModal,
        reset: resetModal,
        control: controlModal,
        formState: { errors: modalFormErrors }

    } = useForm<EtiquetaCrmFormData>({ // EtiquetaCrmFormData ahora tiene status: string
        resolver: zodResolver(etiquetaCrmFormSchema), // El resolver ahora espera un schema consistente
        defaultValues: {
            nombre: '',
            color: '#ffffff', // O el default que prefieras para el input color
            status: 'activo' // Este default asegura que 'status' siempre es un string
        }
    });
    // const currentColor = watchModal('color'); // Observar el color para el input de tipo color

    // Clases UI (como las tenías)
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1"; // Quitado space-y-2 para que DnD se vea mejor
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap disabled:opacity-60";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    const colorInputClasses = `${inputBaseClasses} h-10 p-1 cursor-pointer appearance-none`; // appearance-none para mejor control del input color

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) { setError("ID de negocio no disponible."); if (isInitialLoad) setLoading(false); return; }
        if (isInitialLoad) { setLoading(true); setPendingOrderToSave(null); }
        setError(null);
        try {
            const result = await listarEtiquetasCrmAction({ negocioId });
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                // Asegurar que cada etiqueta tenga un 'orden' para dnd-kit, usando index si es null
                const etiquetasConOrden = (result.data.etiquetas || []).map((et, index) => ({
                    ...et,
                    orden: et.orden ?? index + 1,
                }));
                setEtiquetas(etiquetasConOrden);
                if (!result.data.crmId && isInitialLoad) {
                    setError("CRM no configurado. Por favor, configura el CRM para añadir etiquetas.");
                }
            } else { throw new Error(result.error || "Error cargando etiquetas."); }
        } catch (err) {
            setError(`No se pudieron cargar las etiquetas: ${err instanceof Error ? err.message : "Error"}`);
            setEtiquetas([]); setCrmId(null);
        } finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);

    const openModal = (mode: 'create' | 'edit', etiqueta?: EtiquetaCrmData) => {
        if (mode === 'create' && !crmId) { setError("CRM no configurado."); return; }
        setModalMode(mode);
        setEtiquetaParaEditar(mode === 'edit' ? etiqueta || null : null);
        resetModal(
            mode === 'edit' && etiqueta
                ? { nombre: etiqueta.nombre, color: etiqueta.color || '#ffffff', status: etiqueta.status ?? 'activo' }
                : { nombre: '', color: '#ffffff', status: 'activo' }
        );
        setIsModalOpen(true);
        setModalSubmitError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode('create'); setEtiquetaParaEditar(null);
            resetModal({ nombre: '', color: '#ffffff', status: 'activo' });
            setModalSubmitError(null);
        }, 200);
    };

    const onModalFormSubmit: SubmitHandler<EtiquetaCrmFormData> = async (formData) => {
        setIsSubmittingModal(true); setModalSubmitError(null);
        try {
            let result: ActionResult<EtiquetaCrmData | null>;
            const dataToSend = {
                nombre: formData.nombre,
                color: formData.color === '#ffffff' ? null : formData.color, // Blanco como "sin color" -> null
                status: formData.status || 'activo',
            };

            if (modalMode === 'create') {
                if (!crmId) throw new Error("ID de CRM no disponible.");
                result = await crearEtiquetaCrmAction({
                    crmId: crmId,
                    nombre: dataToSend.nombre,
                    color: dataToSend.color,
                    status: dataToSend.status
                });
            } else if (modalMode === 'edit' && etiquetaParaEditar?.id) {
                result = await editarEtiquetaCrmAction({
                    etiquetaId: etiquetaParaEditar.id,
                    datos: dataToSend
                });
            } else { throw new Error("Modo inválido o ID faltante."); }

            if (result?.success && result.data) { await fetchEtiquetas(false); closeModal(); }
            else { throw new Error(result?.error || "Error al guardar."); }
        } catch (err) {
            setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally { setIsSubmittingModal(false); }
    };

    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id) return;
        if (confirm(`¿Eliminar etiqueta "${etiquetaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalSubmitError(null);
            try {
                const result = await eliminarEtiquetaCrmAction({ etiquetaId: etiquetaParaEditar.id });
                if (result?.success) { await fetchEtiquetas(false); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                setModalSubmitError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`);
            } finally { setIsSubmittingModal(false); }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setEtiquetas((prevEtiquetas) => {
                const oldIndex = prevEtiquetas.findIndex((et) => et.id === active.id);
                const newIndex = prevEtiquetas.findIndex((et) => et.id === over.id);
                const newOrderedEtiquetas = arrayMove(prevEtiquetas, oldIndex, newIndex);
                setPendingOrderToSave(newOrderedEtiquetas);
                return newOrderedEtiquetas;
            });
        }
    };

    useEffect(() => {
        const guardarOrden = async () => {
            if (!pendingOrderToSave || !crmId || isSavingOrder) return;
            setIsSavingOrder(true); setError(null);
            const etiquetasConNuevoOrden = pendingOrderToSave.map((et, index) => ({ id: et.id, orden: index + 1 }));
            try {
                const result = await reordenarEtiquetasCrmAction({ crmId, etiquetasOrdenadas: etiquetasConNuevoOrden });
                if (!result.success) throw new Error(result.error || "Error al guardar orden.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar orden.");
                fetchEtiquetas(false);
            } finally { setIsSavingOrder(false); setPendingOrderToSave(null); }
        };
        if (pendingOrderToSave) {
            const timer = setTimeout(guardarOrden, 700);
            return () => clearTimeout(timer);
        }
    }, [pendingOrderToSave, crmId, isSavingOrder, fetchEtiquetas]);

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><Tags size={16} /> Etiquetas CRM</h3>
                <Button onClick={() => openModal('create')} className={buttonPrimaryClasses} disabled={!crmId || loading || isSavingOrder} title={!crmId && !loading ? "Configura CRM" : ""}>
                    <PlusIcon size={14} /> <span>Crear Etiqueta</span>
                </Button>
            </div>

            {error && <p className="mb-3 text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-md border border-red-600/50">{error}</p>}
            {isSavingOrder && <p className="mb-2 text-xs text-sky-400 text-center animate-pulse"><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Guardando orden...</p>}

            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando...</span></div>)
                    : etiquetas.length === 0 && crmId ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay etiquetas.</p></div>)
                        : !crmId && !loading && !error ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>CRM no configurado.</p></div>)
                            : etiquetas.length > 0 && crmId ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
                                    <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                                        <ul className='space-y-0 divide-y divide-zinc-700/50'> {/* Usar divide para líneas sutiles */}
                                            {etiquetas.map((etiqueta) => (
                                                <SortableTagItem key={etiqueta.id} etiqueta={etiqueta} onEditClick={(et) => openModal('edit', et)} isBeingModified={isSubmittingModal || isSavingOrder} />
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
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Etiqueta' : 'Editar Etiqueta'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitModal(onModalFormSubmit)}>
                            <div className={modalBodyClasses}>
                                {modalSubmitError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalSubmitError}</p>}
                                <div className="flex items-end gap-3">
                                    <div className="flex-grow">
                                        <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Etiqueta <span className="text-red-500">*</span></label>
                                        <Input type="text" id="modal-nombre" {...registerModal("nombre")} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={50} placeholder="Ej: VIP, Contactar Luego" />
                                        {modalFormErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalFormErrors.nombre.message}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="modal-color" className={`${labelBaseClasses} text-center flex items-center justify-center gap-1`}><Palette size={12} /> Color</label>
                                        <Input type="color" id="modal-color" {...registerModal("color")} className={colorInputClasses} disabled={isSubmittingModal} />
                                        {/* No es común mostrar error de validación para input color, Zod lo maneja */}
                                    </div>
                                </div>
                                <div> {/* Select para Status */}
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <Controller
                                        name="status"
                                        control={controlModal}
                                        defaultValue="activo"
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingModal}>
                                                <SelectTrigger id="modal-status" className={`${inputBaseClasses} flex justify-between items-center`}>
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
                                {modalMode === 'edit' && etiquetaParaEditar && (
                                    <Button type="button" onClick={handleModalDelete} variant="destructive" size="sm" className="mr-auto" disabled={isSubmittingModal}>
                                        <Trash2 size={14} className="mr-1.5" /> Eliminar
                                    </Button>)}
                                <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSubmittingModal}>Cancelar</Button>
                                <Button type="submit" size="sm" className={buttonPrimaryClasses} disabled={isSubmittingModal || (modalMode === 'create' && !crmId)}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin mr-2 h-4 w-4' /> : <Save size={14} className="mr-1.5" />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}