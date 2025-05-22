'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
// --- DnD Imports ---
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- ACCIONES Y SCHEMAS/TIPOS ---
import {
    obtenerTiposCitaAction,
    crearTipoCitaAction,
    actualizarTipoCitaAction,
    eliminarTipoCitaAction,
    actualizarOrdenTiposCitaAction
} from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.actions';
import {
    upsertAgendaTipoCitaFormSchema,
    type AgendaTipoCitaData as BaseAgendaTipoCitaData,
    type UpsertAgendaTipoCitaFormInput,
} from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';

// Extiende el tipo para incluir _count opcionalmente
type AgendaTipoCitaData = BaseAgendaTipoCitaData & {
    _count?: { agendas?: number };
};
// import type { CategoriaTarea as CategoriaTareaPrisma } from '@prisma/client'; // Asumiendo que AgendaTipoCita es similar o tiene su propio tipo Prisma

// --- ICONOS ---
import {
    Loader2, Edit, Trash2, PlusIcon, Save, XIcon, AlertTriangleIcon, CheckSquare, ListPlus,
    Check, GripVertical, Copy, ClockIcon
} from 'lucide-react';

// --- PROPS DEL COMPONENTE ---
interface TiposCitaSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean; // Para deshabilitar si otra parte de la página está guardando
    initialTiposCita?: AgendaTipoCitaData[]; // Datos iniciales opcionales
}

// Estado inicial del formulario modal
const formInicialTipoCita: UpsertAgendaTipoCitaFormInput = {
    nombre: '',
    descripcion: null,
    duracionMinutos: 30,
    todoElDia: false,
    esVirtual: false,
    esPresencial: false,
    limiteConcurrencia: 1,
    activo: true,
};

// --- Componente SortableTipoCitaRow ---
function SortableTipoCitaRow({
    tipoCita, onEdit, onDelete, onClone, isSubmittingModal, isSavingGlobal
}: {
    tipoCita: AgendaTipoCitaData; // Usar AgendaTipoCitaData que ya incluye orden como number|null
    onEdit: (tipo: AgendaTipoCitaData) => void;
    onDelete: (id: string, nombre: string) => void;
    onClone: (tipo: AgendaTipoCitaData) => void;
    isSubmittingModal: boolean;
    isSavingGlobal: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tipoCita.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, };
    const tdClasses = "px-3 py-2.5 text-sm text-zinc-300 whitespace-nowrap";
    const buttonIconClasses = "p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed";
    const checkIconClasses = "text-green-400";
    const noCheckIconClasses = "text-zinc-600";

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800/50 hover:bg-zinc-700/40 transition-colors cursor-pointer ${isDragging ? 'shadow-xl ring-1 ring-blue-500' : ''}`} onClick={() => onEdit(tipoCita)}>
            <td className={`${tdClasses} w-10 text-center`}><button type="button" {...attributes} {...listeners} className={`${buttonIconClasses} cursor-grab active:cursor-grabbing touch-none`} title="Reordenar" onClick={(e) => e.stopPropagation()}><GripVertical size={16} /></button></td>
            <td className={`${tdClasses} font-medium text-zinc-100`}>{tipoCita.nombre}</td>
            <td className={`${tdClasses} text-center w-32`}>{tipoCita.todoElDia ? <span className="flex items-center justify-center gap-1 text-sky-400"><ClockIcon size={14} /> Todo el día</span> : (tipoCita.duracionMinutos ? `${tipoCita.duracionMinutos} min` : <span className="text-zinc-500 italic">N/A</span>)}</td>
            <td className={`${tdClasses} text-center w-24`}>{tipoCita.limiteConcurrencia}</td>
            <td className={`${tdClasses} text-center w-24`}>{tipoCita.esPresencial ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}</td>
            <td className={`${tdClasses} text-center w-20`}>{tipoCita.esVirtual ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}</td>
            <td className={`${tdClasses} max-w-xs truncate text-zinc-400`} title={tipoCita.descripcion || ''}>{tipoCita.descripcion || <span className="text-zinc-500 italic">N/A</span>}</td>
            <td className={`${tdClasses} text-center w-20`}>{tipoCita._count?.agendas ?? 0}</td>
            <td className={`${tdClasses} text-right w-[130px]`}>
                <button type="button" onClick={(e) => { e.stopPropagation(); onClone(tipoCita); }} className={buttonIconClasses} title="Clonar" disabled={isSavingGlobal || isSubmittingModal}><Copy size={15} /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(tipoCita); }} className={buttonIconClasses} title="Editar" disabled={isSavingGlobal || isSubmittingModal}><Edit size={15} /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(tipoCita.id, tipoCita.nombre); }} className={`${buttonIconClasses} hover:text-red-400`} title="Eliminar" disabled={isSavingGlobal || isSubmittingModal || (tipoCita._count?.agendas ?? 0) > 0}><Trash2 size={15} /></button>
            </td>
        </tr>
    );
}

// --- Componente Principal TiposCitaSeccion ---
export default function TiposCitaSeccion({ negocioId, isSavingGlobal, initialTiposCita }: TiposCitaSeccionProps) {
    const [tiposCita, setTiposCita] = useState<AgendaTipoCitaData[]>(initialTiposCita || []);
    const [loadingTiposCita, setLoadingTiposCita] = useState(!initialTiposCita);
    const [errorTiposCita, setErrorTiposCita] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
    const [currentTipoCita, setCurrentTipoCita] = useState<AgendaTipoCitaData | null>(null);
    const [formData, setFormData] = useState<UpsertAgendaTipoCitaFormInput>(formInicialTipoCita);
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof UpsertAgendaTipoCitaFormInput, string[]>>>({});
    const [modalSuccess, setModalSuccess] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases UI
    const tableClasses = "min-w-full";
    const headerClasses = "flex items-center justify-between mb-3 pb-3 border-b border-zinc-600";
    const titleClasses = "text-md font-semibold text-zinc-100 flex items-center gap-2";
    const buttonAddClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50";
    const alertSectionErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2 my-3";
    const modalOverlayClasses = "fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-240px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-500 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950 h-10";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px] h-auto resize-none`;
    const checkboxLabelClasses = "flex items-center gap-2.5 p-2.5 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer text-sm text-zinc-200 transition-colors";
    const checkboxInputClasses = "h-4 w-4 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50";
    const alertModalErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const alertModalSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2";
    const buttonModalPrimary = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 min-w-[100px]";
    const buttonModalSecondary = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonModalDanger = "bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 mr-auto";

    const fetchTiposCitaLocal = useCallback(async (showLoadingIndicator = true) => {
        if (!negocioId) {
            setErrorTiposCita("ID de negocio no disponible para cargar tipos de cita.");
            setLoadingTiposCita(false);
            setTiposCita([]);
            return;
        }
        if (showLoadingIndicator) setLoadingTiposCita(true);
        setErrorTiposCita(null);
        const result: ActionResult<AgendaTipoCitaData[]> = await obtenerTiposCitaAction(negocioId);
        if (result.success && result.data) {
            setTiposCita(result.data);
        } else {
            setErrorTiposCita(result.error || "Error cargando tipos de cita.");
            setTiposCita([]);
        }
        if (showLoadingIndicator) setLoadingTiposCita(false);
    }, [negocioId]);

    useEffect(() => {
        if (initialTiposCita) {
            setTiposCita(initialTiposCita.map((tc, index) => ({ ...tc, orden: tc.orden ?? index, activo: tc.activo ?? true })));
            setLoadingTiposCita(false);
        } else if (negocioId) {
            fetchTiposCitaLocal(true);
        } else {
            setLoadingTiposCita(false);
            setTiposCita([]);
        }
    }, [fetchTiposCitaLocal, initialTiposCita, negocioId]);

    const openModal = (mode: 'create' | 'edit' | 'clone', tipoCita?: AgendaTipoCitaData) => {
        setModalMode(mode); setModalError(null); setModalSuccess(null); setModalValidationErrors({});
        if ((mode === 'edit' || mode === 'clone') && tipoCita) {
            setCurrentTipoCita(tipoCita);
            setFormData({
                nombre: mode === 'clone' ? `${tipoCita.nombre} (Copia)` : tipoCita.nombre,
                descripcion: tipoCita.descripcion,
                duracionMinutos: tipoCita.todoElDia ? null : tipoCita.duracionMinutos, // Si es todo el día, duración es null
                todoElDia: tipoCita.todoElDia ?? false,
                esVirtual: tipoCita.esVirtual,
                esPresencial: tipoCita.esPresencial,
                limiteConcurrencia: tipoCita.limiteConcurrencia,
                activo: tipoCita.activo ?? true,
            });
        } else {
            setCurrentTipoCita(null); setFormData(formInicialTipoCita);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setCurrentTipoCita(null); setFormData(formInicialTipoCita);
            setModalError(null); setModalSuccess(null); setModalValidationErrors({});
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type, checked } = target;
        setFormData(prev => {
            const newState = {
                ...prev,
                [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? null : parseInt(value, 10)) : value)
            };
            // Lógica para 'todoElDia' y 'duracionMinutos'
            if (name === 'todoElDia') {
                newState.duracionMinutos = checked ? null : (prev.duracionMinutos || 30); // Si se activa todoElDia, duración null, sino, valor previo o default
            }
            if (name === 'duracionMinutos' && newState.todoElDia) { // Si se cambia duración y todoElDia está activo, desactivar todoElDia
                newState.todoElDia = false;
            }
            return newState;
        });
        setModalError(null); setModalSuccess(null); setModalValidationErrors({});
    };

    const handleSubmitModal = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setModalError(null); setModalSuccess(null); setModalValidationErrors({});

        const dataToValidate: UpsertAgendaTipoCitaFormInput = {
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            duracionMinutos: formData.todoElDia ? null : (formData.duracionMinutos ?? 0),
            todoElDia: formData.todoElDia || false,
            esVirtual: formData.esVirtual || false,
            esPresencial: formData.esPresencial || false,
            limiteConcurrencia: formData.limiteConcurrencia ?? 1,
            activo: formData.activo ?? true,
        };

        const validationResult = upsertAgendaTipoCitaFormSchema.safeParse(dataToValidate);
        if (!validationResult.success) {
            setModalValidationErrors(validationResult.error.flatten().fieldErrors as Partial<Record<keyof UpsertAgendaTipoCitaFormInput, string[]>>);
            setModalError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmittingModal(true);
        try {
            let result: ActionResult<AgendaTipoCitaData>;
            const validatedData = validationResult.data;

            if (modalMode === 'create' || modalMode === 'clone') {
                result = await crearTipoCitaAction(negocioId, validatedData);
            } else if (modalMode === 'edit' && currentTipoCita?.id) {
                result = await actualizarTipoCitaAction(currentTipoCita.id, validatedData);
            } else {
                throw new Error("Modo de operación o ID no válidos.");
            }

            if (result.success && result.data) {
                setModalSuccess(`"${result.data.nombre}" ${modalMode === 'create' || modalMode === 'clone' ? 'creado' : 'actualizado'}.`);
                await fetchTiposCitaLocal(false);
                setTimeout(() => closeModal(), 1500);
            } else {
                setModalError(result.error || "Error desconocido.");
                if (result.validationErrors) {
                    setModalValidationErrors(result.validationErrors as Partial<Record<keyof UpsertAgendaTipoCitaFormInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            setModalError(err instanceof Error ? err.message : "Error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleDeleteTipoCita = async (tipoCitaId: string, nombre: string) => {
        if (isSubmittingModal || isSavingGlobal || isSavingOrder) return;
        if (confirm(`¿Eliminar tipo de cita "${nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null); setErrorTiposCita(null);
            const result = await eliminarTipoCitaAction(tipoCitaId);
            if (result.success) {
                await fetchTiposCitaLocal(false);
                if (currentTipoCita?.id === tipoCitaId && isModalOpen) closeModal();
                setModalSuccess("Tipo de cita eliminado."); // Mensaje de éxito
                setTimeout(() => setModalSuccess(null), 2000);
            } else {
                const errorMsg = result.error || "Error al eliminar.";
                if (isModalOpen && currentTipoCita?.id === tipoCitaId) setModalError(errorMsg);
                else setErrorTiposCita(errorMsg);
            }
            setIsSubmittingModal(false);
        }
    };

    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEndTiposCita = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = tiposCita.findIndex((item) => item.id === active.id);
            const newIndex = tiposCita.findIndex((item) => item.id === over.id);
            const reorderedItems = arrayMove(tiposCita, oldIndex, newIndex);
            const finalOrder = reorderedItems.map((item, index) => ({ ...item, orden: index }));
            setTiposCita(finalOrder);

            const ordenData = { negocioId, items: finalOrder.map(({ id, orden }) => ({ id, orden: orden as number })) };
            setIsSavingOrder(true); setErrorTiposCita(null);
            const result = await actualizarOrdenTiposCitaAction(ordenData);
            if (!result.success) {
                setErrorTiposCita(result.error || "Error al guardar orden.");
                await fetchTiposCitaLocal(false);
            }
            setIsSavingOrder(false);
        }
    }, [negocioId, fetchTiposCitaLocal, tiposCita]);

    // --- RENDERIZADO ---
    if (loadingTiposCita && !initialTiposCita && negocioId) {
        return <div className="py-8 flex items-center justify-center text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando tipos de cita...</div>;
    }
    if (!negocioId) {
        return <div className="py-8 px-4 bg-zinc-900/30 border border-dashed border-zinc-700 rounded-md text-center"><p className="text-orange-400 text-sm">Se requiere un ID de negocio para gestionar los tipos de cita.</p></div>;
    }

    return (
        <div className="space-y-3 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700"> {/* Contenedor con padding y estilos base */}
            <div className={headerClasses}>
                <h3 className={titleClasses}><ListPlus size={18} className="text-blue-400" /> Tipos de Cita / Servicios</h3>
                <button onClick={() => openModal('create')} className={buttonAddClasses} disabled={isSavingGlobal || isSubmittingModal || isSavingOrder}><PlusIcon size={14} /> Añadir</button>
            </div>

            {isSavingOrder && <p className="text-xs text-blue-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Guardando orden...</p>}
            {errorTiposCita && <p className={alertSectionErrorClasses}><AlertTriangleIcon size={16} />{errorTiposCita}</p>}

            {tiposCita.length === 0 && !loadingTiposCita && !errorTiposCita ? (
                <div className="text-center py-6 px-4 bg-zinc-900/30 border border-dashed border-zinc-700 rounded-md"><p className="text-zinc-400 text-sm">No has añadido tipos de cita.</p><p className="text-zinc-500 text-xs mt-1">Clic en &quot;Añadir&quot; para empezar.</p></div>
            ) : (
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTiposCita}>
                    <div className="overflow-x-auto rounded-md border border-zinc-700 bg-zinc-900/30">
                        <table className={tableClasses}>
                            <thead className="bg-zinc-800/60">{/* Un poco más claro que el cuerpo */}
                                <tr>
                                    <th className="px-3 py-2.5 w-10"></th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase">Nombre</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-400 uppercase">Duración</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-400 uppercase">Concurr.</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-400 uppercase">Presencial</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-400 uppercase">Virtual</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase">Descripción</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-medium text-zinc-400 uppercase">Agendas</th>
                                    <th className="px-3 py-2.5 text-right w-[130px]"></th>
                                </tr>
                            </thead>
                            <SortableContext items={tiposCita.map(tc => tc.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700/50">{tiposCita.map((tipo) => (<SortableTipoCitaRow key={tipo.id} tipoCita={tipo} onEdit={openModal.bind(null, 'edit')} onDelete={handleDeleteTipoCita} onClone={openModal.bind(null, 'clone')} isSubmittingModal={isSubmittingModal} isSavingGlobal={isSavingGlobal} />))}</tbody>
                            </SortableContext>
                        </table>
                    </div>
                </DndContext>
            )}
            {tiposCita.length > 0 && <p className="text-xs text-zinc-500 italic mt-2 text-center">Arrastra <GripVertical size={12} className="inline -mt-px" /> para reordenar.</p>}

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSubmitModal}>
                            <div className={modalHeaderClasses}><h4 className={modalTitleClasses}>{modalMode === 'create' && 'Añadir Tipo de Cita'}{modalMode === 'edit' && `Editar: ${currentTipoCita?.nombre || ''}`}{modalMode === 'clone' && `Clonar: ${currentTipoCita?.nombre || ''}`}</h4><button type="button" onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700"><XIcon size={20} /></button></div>
                            <div className={modalBodyClasses}>
                                {modalError && !Object.keys(modalValidationErrors).length && <p className={alertModalErrorClasses}><AlertTriangleIcon size={16} /> {modalError}</p>}
                                {modalSuccess && <p className={alertModalSuccessClasses}><CheckSquare size={16} /> {modalSuccess}</p>}
                                <div className="space-y-4"> {/* Aumentado espaciado en el modal */}
                                    <div><label htmlFor="nombre-modal" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label><input type="text" name="nombre" id="nombre-modal" value={formData.nombre} onChange={handleFormChange} className={`${inputBaseClasses} ${modalValidationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: Consulta General" />{modalValidationErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.nombre.join(', ')}</p>}</div>
                                    <div><label htmlFor="descripcion-modal" className={labelBaseClasses}>Descripción</label><textarea name="descripcion" id="descripcion-modal" value={formData.descripcion || ''} onChange={handleFormChange} className={`${textareaBaseClasses} ${modalValidationErrors.descripcion ? 'border-red-500' : ''}`} rows={2} disabled={isSubmittingModal || !!modalSuccess} placeholder="Detalles adicionales..." />{modalValidationErrors.descripcion && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.descripcion.join(', ')}</p>}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 items-end">
                                        <div className="sm:col-span-1 flex flex-col justify-end"> {/* Contenedor para alinear el checkbox con los inputs */}
                                            <label htmlFor="todoElDia-modal" className={`${checkboxLabelClasses} ${formData.todoElDia ? 'bg-blue-600/30 border-blue-500' : ''} h-10`}> {/* h-10 para alinear con inputs */}
                                                <input type="checkbox" name="todoElDia" id="todoElDia-modal" checked={formData.todoElDia} onChange={handleFormChange} className={checkboxInputClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                                <span>Todo el Día</span> <ClockIcon size={15} className="text-zinc-400 ml-auto" />
                                            </label>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label htmlFor="duracionMinutos-modal" className={labelBaseClasses}>Duración (min)</label>
                                            <input type="number" name="duracionMinutos" id="duracionMinutos-modal" value={formData.duracionMinutos ?? ''} onChange={handleFormChange} className={`${inputBaseClasses} ${modalValidationErrors.duracionMinutos ? 'border-red-500' : ''}`} disabled={isSubmittingModal || !!modalSuccess || formData.todoElDia} placeholder="Ej: 30" min="0" step="5" />
                                            {modalValidationErrors.duracionMinutos && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.duracionMinutos.join(', ')}</p>}
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label htmlFor="limiteConcurrencia-modal" className={labelBaseClasses}>Concurrencia</label>
                                            <input type="number" name="limiteConcurrencia" id="limiteConcurrencia-modal" value={formData.limiteConcurrencia ?? ''} onChange={handleFormChange} className={`${inputBaseClasses} ${modalValidationErrors.limiteConcurrencia ? 'border-red-500' : ''}`} disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: 1" min="1" step="1" />
                                            {modalValidationErrors.limiteConcurrencia && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.limiteConcurrencia.join(', ')}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-1">
                                        <p className={labelBaseClasses}>Modalidad:</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className={`${checkboxLabelClasses} ${formData.esPresencial ? 'bg-blue-600/30 border-blue-500' : ''}`}><input type="checkbox" name="esPresencial" checked={formData.esPresencial} onChange={handleFormChange} className={checkboxInputClasses} disabled={isSubmittingModal || !!modalSuccess} /><span>Presencial</span></label>
                                            <label className={`${checkboxLabelClasses} ${formData.esVirtual ? 'bg-sky-600/30 border-sky-500' : ''}`}><input type="checkbox" name="esVirtual" checked={formData.esVirtual} onChange={handleFormChange} className={checkboxInputClasses} disabled={isSubmittingModal || !!modalSuccess} /><span>Virtual</span></label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`${labelBaseClasses} flex items-center gap-2 cursor-pointer mt-3 ${formData.activo ? 'bg-green-600/30 border-green-500' : ''} p-2.5 rounded-md border border-zinc-700 hover:bg-zinc-700/30`}>
                                            <input type="checkbox" name="activo" id="activo-modal" checked={formData.activo} onChange={handleFormChange} className={checkboxInputClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                            <span>Activo (disponible para agendar)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && currentTipoCita && (<button type="button" onClick={() => handleDeleteTipoCita(currentTipoCita.id, currentTipoCita.nombre)} className={buttonModalDanger} disabled={isSubmittingModal || !!modalSuccess || (currentTipoCita._count?.agendas ?? 0) > 0} title={(currentTipoCita._count?.agendas ?? 0) > 0 ? `No se puede eliminar: Usado por ${currentTipoCita._count?.agendas} agendas.` : 'Eliminar'}><Trash2 size={16} />Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={buttonModalSecondary} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonModalPrimary} disabled={isSubmittingModal || !formData.nombre?.trim() || !!modalSuccess} >{isSubmittingModal ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{modalMode === 'create' || modalMode === 'clone' ? 'Crear' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}