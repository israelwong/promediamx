'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCanalItem } from './SortableCanalItem';

import {
    listarCanalesCrmAction,
    crearCanalCrmAction,
    editarCanalCrmAction,
    eliminarCanalCrmAction,
    reordenarCanalesCrmAction,
} from '@/app/admin/_lib/actions/canalCrm/canalCrm.actions';
import {
    canalCrmFormSchema,
    type CanalCrmData,
    type CanalCrmFormData,
} from '@/app/admin/_lib/actions/canalCrm/canalCrm.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';


import { Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, RadioTower } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

interface Props {
    negocioId: string;
}

export default function CRMCanal({ negocioId }: Props) {
    const [canales, setCanales] = useState<CanalCrmData[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [canalParaEditar, setCanalParaEditar] = useState<CanalCrmData | null>(null);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [pendingOrderToSave, setPendingOrderToSave] = useState<CanalCrmData[] | null>(null);

    const {
        register: registerModal,
        handleSubmit: handleSubmitModal,
        reset: resetModal,
        control: controlModal,
        formState: { errors: modalFormErrors }
    } = useForm<CanalCrmFormData>({
        resolver: zodResolver(canalCrmFormSchema),
        defaultValues: { nombre: '', status: 'activo' }
    });

    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3 hover:bg-zinc-700/30 transition-colors";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap disabled:opacity-60";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:opacity-50";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    // const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const containerClasses = "flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg p-4";
    const headerClasses = "flex items-center justify-between mb-4";


    const fetchCanales = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) {
            setError("ID de negocio no disponible.");
            if (isInitialLoad) setLoading(false);
            return;
        }
        if (isInitialLoad) {
            setLoading(true);
            setPendingOrderToSave(null);
        }
        setError(null); // Limpiar error general antes de cada fetch

        try {
            const result = await listarCanalesCrmAction({ negocioId });
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setCanales(result.data.canales || []);
                if (!result.data.crmId && isInitialLoad) {
                    setError("CRM no configurado. Por favor, configura el CRM para añadir canales.");
                }
            } else {
                throw new Error(result.error || "Error cargando canales.");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error desconocido";
            setError(`No se pudieron cargar los canales: ${errorMessage}`);
            setCanales([]);
            setCrmId(null);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchCanales(true);
    }, [fetchCanales]);

    const openModal = (mode: 'create' | 'edit', canal?: CanalCrmData) => {
        if (mode === 'create' && !crmId) {
            setError("No se puede crear un canal: El CRM no está configurado.");
            return;
        }
        setModalMode(mode);
        setCanalParaEditar(mode === 'edit' ? canal || null : null);
        resetModal(
            mode === 'edit' && canal
                ? { nombre: canal.nombre, status: canal.status }
                : { nombre: '', status: 'activo' }
        );
        setIsModalOpen(true);
        setModalSubmitError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Pequeño delay para la animación de salida del modal (opcional)
        // Si no usas animaciones de salida que dependan de isModalOpen, puedes simplificar.
        setTimeout(() => {
            setModalMode('create');
            setCanalParaEditar(null);
            resetModal({ nombre: '', status: 'activo' }); // Reset con valores por defecto
            setModalSubmitError(null);
            // No resetear isSubmittingModal aquí, se maneja en el submit/delete
        }, 200); // Ajusta el tiempo si usas transiciones
    };

    const onModalFormSubmit: SubmitHandler<CanalCrmFormData> = async (formData) => {
        setIsSubmittingModal(true);
        setModalSubmitError(null);

        try {
            let result: ActionResult<CanalCrmData | null>;
            const dataToSend = {
                nombre: formData.nombre,
                status: formData.status || 'activo',
            };

            if (modalMode === 'create') {
                if (!crmId) throw new Error("ID de CRM no disponible.");
                result = await crearCanalCrmAction({
                    crmId: crmId,
                    nombre: dataToSend.nombre,
                    status: dataToSend.status
                });
            } else if (modalMode === 'edit' && canalParaEditar?.id) {
                result = await editarCanalCrmAction({
                    canalId: canalParaEditar.id,
                    datos: dataToSend
                });
            } else {
                throw new Error("Modo de formulario inválido o ID faltante.");
            }

            if (result?.success && result.data) {
                await fetchCanales(false);
                closeModal();
            } else {
                throw new Error(result?.error || "Error al guardar el canal.");
            }
        } catch (err) {
            setModalSubmitError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!canalParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el canal "${canalParaEditar.nombre}"? Los leads asociados a este canal podrían quedar sin canal asignado o se impedirá la eliminación si hay restricciones.`)) {
            setIsSubmittingModal(true);
            setModalSubmitError(null);
            try {
                const result = await eliminarCanalCrmAction({ canalId: canalParaEditar.id });
                if (result?.success) {
                    await fetchCanales(false);
                    closeModal();
                } else {
                    throw new Error(result?.error || "Error al eliminar.");
                }
            } catch (err) {
                setModalSubmitError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`);
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setCanales((prevCanales) => {
                const oldIndex = prevCanales.findIndex((c) => c.id === active.id);
                const newIndex = prevCanales.findIndex((c) => c.id === over.id);
                const newOrderedCanales = arrayMove(prevCanales, oldIndex, newIndex);
                setPendingOrderToSave(newOrderedCanales);
                return newOrderedCanales;
            });
        }
    };

    useEffect(() => {
        const guardarOrden = async () => {
            if (!pendingOrderToSave || !crmId || isSavingOrder) return;

            setIsSavingOrder(true);
            setError(null);

            const canalesConNuevoOrden = pendingOrderToSave.map((canal, index) => ({
                id: canal.id,
                orden: index + 1,
            }));

            try {
                const result = await reordenarCanalesCrmAction({ crmId, canalesOrdenados: canalesConNuevoOrden });
                if (!result.success) throw new Error(result.error || "Error al guardar el nuevo orden.");
                // Opcional: fetchCanales(false); para re-sincronizar completamente si se desea.
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar el orden.");
                await fetchCanales(false); // Revertir/Refrescar en caso de error
            } finally {
                setIsSavingOrder(false);
                setPendingOrderToSave(null);
            }
        };

        if (pendingOrderToSave) {
            const timer = setTimeout(guardarOrden, 700); // Debounce
            return () => clearTimeout(timer);
        }
    }, [pendingOrderToSave, crmId, isSavingOrder, fetchCanales]);

    return (
        <div className={`${containerClasses} `}> {/* Quitada clase height-full, debe heredarla o gestionarla el padre */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <RadioTower size={18} /> Canales de Adquisición
                </h3>
                <Button
                    onClick={() => openModal('create')}
                    className={buttonPrimaryClasses}
                    title={!crmId && !loading ? "Configura el CRM primero para añadir canales" : "Crear nuevo canal"}
                    disabled={!crmId || loading || isSavingOrder}
                >
                    <PlusIcon size={14} /> <span>Crear Canal</span>
                </Button>
            </div>

            {error && <p className="mb-3 text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-md border border-red-600/50">{error}</p>}
            {isSavingOrder && (
                <p className="mb-2 text-xs text-sky-400 text-center animate-pulse">
                    <Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />
                    Guardando nuevo orden...
                </p>
            )}

            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando canales...</span></div>
                ) : canales.length === 0 && crmId ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay canales definidos. ¡Crea el primero!</p></div>
                ) : !crmId && !loading && !error ? ( // Mensaje si no hay CRM y no está cargando ni hay otro error
                    <div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>El CRM no está configurado o no se pudo cargar.</p></div>
                ) : canales.length > 0 && crmId ? ( // Solo mostrar lista si hay crmId
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
                        <SortableContext items={canales.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <ul className='space-y-2'>
                                {canales.map((canal) => (
                                    <SortableCanalItem
                                        key={canal.id}
                                        canal={canal}
                                        onEditClick={(canal) => openModal('edit', canal)}
                                        listItemClasses={listItemClasses} // Pasadas como prop
                                        buttonEditClasses={buttonEditClasses} // Pasadas como prop
                                        isSubmitting={isSubmittingModal}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                ) : null}
            </div>

            {isModalOpen && (
                <div className={modalOverlayClasses}
                // No cerrar al hacer clic fuera para evitar perder datos del form accidentalmente
                // onClick={closeModal} 
                >
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nuevo Canal' : `Editar Canal: ${canalParaEditar?.nombre || ''}`}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitModal(onModalFormSubmit)}>
                            <div className={modalBodyClasses}>
                                {modalSubmitError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalSubmitError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Canal <span className="text-red-500">*</span></label>
                                    <Input type="text" id="modal-nombre" {...registerModal("nombre")} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={50} placeholder="Ej: WhatsApp, Facebook Leads" />
                                    {modalFormErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalFormErrors.nombre.message}</p>}
                                </div>
                                <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <Controller
                                        name="status"
                                        control={controlModal}
                                        defaultValue="activo" // RHF defaultValue
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
                                {modalMode === 'edit' && canalParaEditar && (
                                    <Button type="button" onClick={handleModalDelete} variant="destructive" size="sm" className="mr-auto" disabled={isSubmittingModal}>
                                        <Trash2 size={14} className="mr-1.5" /> Eliminar
                                    </Button>)}
                                <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSubmittingModal}>Cancelar</Button>
                                <Button type="submit" size="sm" className={buttonPrimaryClasses} disabled={isSubmittingModal || (modalMode === 'create' && !crmId)}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin mr-2 h-4 w-4' /> : <Save size={14} className="mr-1.5" />}
                                    {modalMode === 'create' ? 'Crear Canal' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}