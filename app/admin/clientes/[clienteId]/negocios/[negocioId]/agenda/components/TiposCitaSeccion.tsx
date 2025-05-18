'use client';

import React, { useState, useEffect, useCallback } from 'react';
// --- DnD Imports ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

import {
    Loader2, Edit, Trash2, PlusIcon, Save, XIcon, AlertTriangleIcon, CheckSquare, ListPlus,
    Check, GripVertical, Copy
} from 'lucide-react';

// NUEVAS IMPORTS de Actions y Schemas/Types
import {
    obtenerTiposCitaAction,
    crearTipoCitaAction,
    actualizarTipoCitaAction,
    eliminarTipoCitaAction,
    actualizarOrdenTiposCitaAction
} from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.actions';
import type {
    AgendaTipoCitaData,
    UpsertAgendaTipoCitaFormInput,
    // OrdenAgendaTipoCitaItem,
} from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.schemas';
// ActionResult ya debería ser un tipo global
// import type { ActionResult } from '@/app/admin/_lib/types';


interface TiposCitaSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean; // Para deshabilitar acciones si otra parte de la página principal está guardando
    // initialTiposCita?: AgendaTipoCitaData[]; // Recibirá los datos del componente padre AgendaConfiguracion.tsx
}

// El estado local usará directamente AgendaTipoCitaData y asegurará que `orden` sea un número
// si la carga inicial desde la BD puede tener `orden` como null.
interface TipoCitaLocalState extends AgendaTipoCitaData {
    orden: number; // Para DnD, siempre debe ser un número en el estado local.
}


const formInicialTipoCita: UpsertAgendaTipoCitaFormInput = {
    nombre: '',
    descripcion: null,
    duracionMinutos: 30,
    esVirtual: false,
    esPresencial: false,
    limiteConcurrencia: 1,
};

// Componente SortableTipoCitaRow (MODIFICADO para usar AgendaTipoCitaData y permitir edición en toda la fila)
function SortableTipoCitaRow({
    tipoCita, // Ahora es AgendaTipoCitaData o TipoCitaLocalState
    onEdit,
    onDelete,
    onClone,
    isSubmittingModal,
    isSavingGlobal
}: {
    tipoCita: TipoCitaLocalState;
    onEdit: (tipo: AgendaTipoCitaData) => void;
    onDelete: (id: string, nombre: string) => void;
    onClone: (tipo: AgendaTipoCitaData) => void;
    isSubmittingModal: boolean;
    isSavingGlobal: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tipoCita.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const tdClasses = "px-3 py-3 text-sm text-zinc-300 whitespace-nowrap cursor-pointer"; // Añadido cursor-pointer
    const buttonIconClasses = "p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed";
    const checkIconClasses = "text-green-400";
    const noCheckIconClasses = "text-zinc-600";

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800/50 hover:bg-zinc-700/40 transition-colors ${isDragging ? 'shadow-xl ring-1 ring-blue-500' : ''}`}
            onClick={() => onEdit(tipoCita)} // Editar al hacer clic en la fila
        >
            <td className="px-3 py-3 text-sm text-zinc-300 whitespace-nowrap w-10 text-center">
                <button
                    {...attributes}
                    {...listeners}
                    className={`${buttonIconClasses} cursor-grab active:cursor-grabbing touch-none`}
                    title="Reordenar"
                    onClick={(e) => e.stopPropagation()} // Prevenir que se dispare onEdit de la fila
                >
                    <GripVertical size={16} />
                </button>
            </td>
            <td className={`${tdClasses} font-medium text-zinc-100`}>{tipoCita.nombre}</td>
            <td className={`${tdClasses} text-center w-32`}>
                {tipoCita.duracionMinutos ? `${tipoCita.duracionMinutos} min` : <span className="text-zinc-500 italic">N/A</span>}
            </td>
            <td className={`${tdClasses} text-center w-24`}>
                {tipoCita.limiteConcurrencia}
            </td>
            <td className={`${tdClasses} text-center w-24`}>
                {tipoCita.esPresencial ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}
            </td>
            <td className={`${tdClasses} text-center w-20`}>
                {tipoCita.esVirtual ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}
            </td>
            <td className={`${tdClasses} max-w-xs truncate text-zinc-400`} title={tipoCita.descripcion || ''}>
                {tipoCita.descripcion || <span className="text-zinc-500 italic">N/A</span>}
            </td>
            <td className="px-3 py-3 text-sm text-zinc-300 whitespace-nowrap text-right">
                <button onClick={(e) => { e.stopPropagation(); onClone(tipoCita); }} className={buttonIconClasses} title="Clonar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Copy size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(tipoCita); }} className={buttonIconClasses} title="Editar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Edit size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(tipoCita.id, tipoCita.nombre); }} className={`${buttonIconClasses} text-red-500 hover:text-red-400`} title="Eliminar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Trash2 size={16} /></button>
            </td>
        </tr>
    );
}


export default function TiposCitaSeccion({
    negocioId,
    isSavingGlobal,
    initialTiposCita // Desestructurar correctamente la prop opcional
}: TiposCitaSeccionProps & { initialTiposCita?: AgendaTipoCitaData[] }) { // Añadir prop opcional para datos iniciales

    // Estado local para los tipos de cita, compatible con DnD
    const [tiposCita, setTiposCita] = useState<TipoCitaLocalState[]>([]);
    const [loadingTiposCita, setLoadingTiposCita] = useState(true);
    const [errorTiposCita, setErrorTiposCita] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
    const [currentTipoCita, setCurrentTipoCita] = useState<AgendaTipoCitaData | null>(null); // Usar AgendaTipoCitaData
    const [formData, setFormData] = useState<UpsertAgendaTipoCitaFormInput>(formInicialTipoCita);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalSuccess, setModalSuccess] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases UI (sin cambios)
    const tableClasses = "min-w-full";
    const buttonPrimaryModal = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSecondaryModal = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonDangerModal = "bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 mr-auto";
    const modalOverlayClasses = "fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px] resize-none`;
    const checkboxLabelClasses = "flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer text-sm text-zinc-200";
    const checkboxClasses = "h-5 w-5 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50";
    const alertModalErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const alertModalSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2";
    const alertSectionErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2 my-4";


    const mapToLocalState = (data: AgendaTipoCitaData[]): TipoCitaLocalState[] => {
        return data.map((tc, index) => ({
            ...tc,
            orden: typeof tc.orden === 'number' ? tc.orden : index, // Asegura que 'orden' sea un número
        }));
    };

    const fetchTiposCitaLocal = useCallback(async (showLoading = true) => {
        if (showLoading) setLoadingTiposCita(true);
        setErrorTiposCita(null);
        // Usar la nueva action
        const result = await obtenerTiposCitaAction(negocioId);
        if (result.success && result.data) {
            setTiposCita(mapToLocalState(result.data));
        } else {
            setErrorTiposCita(result.error || "Error cargando tipos de cita.");
            setTiposCita([]);
        }
        if (showLoading) setLoadingTiposCita(false);
    }, [negocioId]);

    useEffect(() => {
        // Si initialTiposCita es provisto por el padre, usarlo, sino, cargar.
        // Esto es relevante si AgendaConfiguracion.tsx carga todos los datos al inicio.
        if (initialTiposCita) {
            setTiposCita(mapToLocalState(initialTiposCita));
            setLoadingTiposCita(false);
        } else {
            fetchTiposCitaLocal();
        }
    }, [fetchTiposCitaLocal, initialTiposCita]);


    const openModal = (mode: 'create' | 'edit' | 'clone', tipoCita?: AgendaTipoCitaData) => {
        setModalMode(mode);
        setModalError(null);
        setModalSuccess(null);
        if ((mode === 'edit' || mode === 'clone') && tipoCita) {
            setCurrentTipoCita(tipoCita); // tipoCita ahora es AgendaTipoCitaData
            setFormData({
                nombre: mode === 'clone' ? `${tipoCita.nombre} (Copia)` : tipoCita.nombre,
                descripcion: tipoCita.descripcion, // Ya es nullable
                duracionMinutos: tipoCita.duracionMinutos, // Ya es nullable
                esVirtual: tipoCita.esVirtual,
                esPresencial: tipoCita.esPresencial,
                limiteConcurrencia: tipoCita.limiteConcurrencia,
            });
        } else {
            setCurrentTipoCita(null);
            setFormData(formInicialTipoCita);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Retrasar el reseteo para que no se vea el cambio antes de que cierre la animación del modal
        setTimeout(() => {
            setCurrentTipoCita(null);
            setFormData(formInicialTipoCita);
            setModalError(null);
            setModalSuccess(null);
            setIsSubmittingModal(false); // Asegurar que el submitting se resetee
        }, 300); // Ajustar este tiempo si la animación del modal es diferente
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target; // No necesitamos 'checked' explícitamente si usamos target.checked

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? target.checked
                : (type === 'number'
                    ? (value === '' ? null : parseInt(value, 10)) // Permitir que el campo numérico se vacíe a null
                    : value)
        }));
        if (modalError) setModalError(null);
        if (modalSuccess) setModalSuccess(null);
    };

    const handleSubmitModal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmittingModal(true);
        setModalError(null);
        setModalSuccess(null);

        // La validación de Zod se hace en la Server Action, pero podemos hacer una pre-validación aquí si queremos.
        // upsertAgendaTipoCitaFormSchema.parseAsync(formData) podría usarse aquí, pero es redundante.

        let result; // Tipo ActionResult<AgendaTipoCitaData>
        const inputForAction: UpsertAgendaTipoCitaFormInput = {
            ...formData,
            // Zod schema se encarga de los defaults y transformaciones para nulls
        };

        try {
            if (modalMode === 'create' || modalMode === 'clone') {
                result = await crearTipoCitaAction(negocioId, inputForAction);
            } else if (modalMode === 'edit' && currentTipoCita?.id) {
                result = await actualizarTipoCitaAction(currentTipoCita.id, inputForAction);
            } else {
                throw new Error("Modo de operación o ID no válidos para el modal.");
            }

            if (result.success && result.data) {
                setModalSuccess(`Tipo de cita "${result.data.nombre}" ${modalMode === 'create' || modalMode === 'clone' ? 'creado' : 'actualizado'} exitosamente.`);
                await fetchTiposCitaLocal(false); // Recargar sin mostrar loader principal
                setTimeout(() => closeModal(), 1500);
            } else {
                const errorMsg = result.errorDetails
                    ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                    : result.error || "Ocurrió un error desconocido.";
                setModalError(errorMsg);
            }
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "Un error inesperado ocurrió durante el guardado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleDeleteTipoCita = async (tipoCitaId: string, nombre: string) => {
        if (isSubmittingModal || isSavingGlobal || isSavingOrder) return;

        if (confirm(`¿Estás seguro de eliminar el tipo de cita "${nombre}"? Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true); // Reutilizar este estado para indicar una operación en curso
            setModalError(null); // Limpiar errores previos del modal
            setErrorTiposCita(null); // Limpiar errores de la sección

            const result = await eliminarTipoCitaAction(tipoCitaId);

            if (result.success) {
                await fetchTiposCitaLocal(false); // Recargar lista sin loader principal
                if (currentTipoCita?.id === tipoCitaId && isModalOpen) {
                    closeModal(); // Cerrar el modal si el ítem eliminado era el que se estaba editando
                }
                // Opcional: Mostrar un toast de éxito aquí
            } else {
                // Si el modal está abierto y el error es relevante para el ítem actual, mostrarlo en el modal
                if (isModalOpen && currentTipoCita?.id === tipoCitaId) {
                    setModalError(result.error || "Error al eliminar el tipo de cita.");
                } else {
                    // Si no, mostrar el error a nivel de sección
                    setErrorTiposCita(result.error || "Error al eliminar el tipo de cita.");
                }
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
            setTiposCita((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const reorderedItems = arrayMove(items, oldIndex, newIndex);
                // Actualizar el orden visual inmediatamente
                return reorderedItems.map((item, index) => ({ ...item, orden: index }));
            });

            // Preparar datos para la action después de actualizar el estado visual
            // Necesitamos un breve delay o usar el estado actualizado en el siguiente render
            // o simplemente recalcularlo desde el estado actual
            setTimeout(async () => {
                setIsSavingOrder(true);
                setErrorTiposCita(null);

                // Obtener el estado más reciente de tiposCita para enviar a la action
                // Esto es importante si setTiposCita es asíncrono
                const currentOrderForAction = tiposCita.map(({ id, orden }) => ({ id, orden: orden as number }));

                const result = await actualizarOrdenTiposCitaAction({
                    negocioId: negocioId,
                    items: currentOrderForAction // Usar el orden que se acaba de setear visualmente
                });

                if (!result.success) {
                    setErrorTiposCita(result.error || "Error al guardar el nuevo orden.");
                    await fetchTiposCitaLocal(false); // Revertir al orden del servidor
                }
                // Si es exitoso, el estado local ya refleja el nuevo orden.
                // Se podría llamar a fetchTiposCitaLocal(false) para reconfirmar desde el servidor si se desea.
                setIsSavingOrder(false);
            }, 0);
        }
    }, [negocioId, fetchTiposCitaLocal, tiposCita]); // tiposCita en dependencias para que currentOrderForAction use el valor más reciente

    // ---- RENDERIZADO ----
    if (loadingTiposCita && !initialTiposCita) { // Solo mostrar loader principal si no hay datos iniciales
        return <div className="py-8 flex items-center justify-center text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando tipos de cita...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold text-zinc-100 flex items-center gap-2">
                    <ListPlus size={18} className="text-blue-400" />
                    Servicios / Tipos de Cita Ofrecidos
                </h3>
                <button
                    onClick={() => openModal('create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                    disabled={isSavingGlobal || isSubmittingModal || isSavingOrder}
                >
                    <PlusIcon size={14} /> Añadir Tipo
                </button>
            </div>

            {isSavingOrder && <p className="text-xs text-blue-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Guardando orden...</p>}
            {errorTiposCita && <p className={alertSectionErrorClasses}><AlertTriangleIcon size={16} className="mr-1" />{errorTiposCita}</p>}

            {tiposCita.length === 0 && !errorTiposCita ? (
                <div className="text-center py-8 px-4 bg-zinc-900/30 border border-dashed border-zinc-700 rounded-md">
                    <p className="text-zinc-400 text-sm">Aún no has añadido ningún tipo de cita/servicio.</p>
                    <p className="text-zinc-500 text-xs mt-1">Haz clic en &quot;Añadir Tipo&quot; para empezar.</p>
                </div>
            ) : (
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTiposCita}>
                    <div className="overflow-x-auto rounded-md border border-zinc-700 bg-zinc-900/30">
                        <table className={tableClasses}>
                            <thead className="bg-zinc-800/50">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap w-10"></th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Nombre</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Duración</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Concurrencia</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Presencial</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Virtual</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">Descripción</th>
                                    <th className="px-3 py-2.5 text-right w-[120px]"> {/* Ajustado ancho para acomodar botones */} </th>
                                </tr>
                            </thead>
                            <SortableContext items={tiposCita.map(tc => tc.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700/70">
                                    {tiposCita.map((tipo) => (
                                        <SortableTipoCitaRow
                                            key={tipo.id}
                                            tipoCita={tipo}
                                            onEdit={openModal.bind(null, 'edit')}
                                            onDelete={handleDeleteTipoCita}
                                            onClone={openModal.bind(null, 'clone')}
                                            isSubmittingModal={isSubmittingModal}
                                            isSavingGlobal={isSavingGlobal}
                                        />
                                    ))}
                                </tbody>
                            </SortableContext>
                        </table>
                    </div>
                </DndContext>
            )}
            {tiposCita.length > 0 && <p className="text-xs text-zinc-500 italic mt-2 text-center">Arrastra <GripVertical size={12} className="inline -mt-px" /> para reordenar.</p>}

            {/* Modal para Crear/Editar Tipo de Cita */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal /* Cerrar al hacer clic fuera */}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation() /* Evitar que se cierre al hacer clic dentro */}>
                        <form onSubmit={handleSubmitModal}>
                            <div className={modalHeaderClasses}>
                                <h4 className={modalTitleClasses}>
                                    {modalMode === 'create' && 'Añadir Nuevo Tipo de Cita'}
                                    {modalMode === 'edit' && `Editar: ${currentTipoCita?.nombre || 'Tipo de Cita'}`}
                                    {modalMode === 'clone' && `Clonar: ${currentTipoCita?.nombre || 'Tipo de Cita'}`}
                                </h4>
                                <button type="button" onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            <div className={modalBodyClasses}>
                                {modalError && <p className={alertModalErrorClasses}><AlertTriangleIcon size={16} className="mr-1" />{modalError}</p>}
                                {modalSuccess && <p className={alertModalSuccessClasses}><CheckSquare size={16} className="mr-1" />{modalSuccess}</p>}

                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Servicio <span className="text-red-500">*</span></label>
                                        <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleFormChange} className={inputBaseClasses} required disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: Consulta General" />
                                    </div>
                                    <div>
                                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                                        <textarea name="descripcion" id="descripcion" value={formData.descripcion || ''} onChange={handleFormChange} className={textareaBaseClasses} rows={3} disabled={isSubmittingModal || !!modalSuccess} placeholder="Detalles adicionales..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="duracionMinutos" className={labelBaseClasses}>Duración (minutos)</label>
                                            <input type="number" name="duracionMinutos" id="duracionMinutos" value={formData.duracionMinutos ?? ''} onChange={handleFormChange} className={inputBaseClasses} disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: 30" min="0" step="5" />
                                        </div>
                                        <div>
                                            <label htmlFor="limiteConcurrencia" className={labelBaseClasses}>Concurrencia (máx.)</label>
                                            <input type="number" name="limiteConcurrencia" id="limiteConcurrencia" value={formData.limiteConcurrencia ?? ''} onChange={handleFormChange} className={inputBaseClasses} disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: 1" min="1" step="1" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <p className={labelBaseClasses}>Modalidad del Servicio:</p>
                                        <label className={checkboxLabelClasses}>
                                            <input type="checkbox" name="esPresencial" checked={formData.esPresencial} onChange={handleFormChange} className={checkboxClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                            <span>Servicio Presencial</span>
                                        </label>
                                        <label className={checkboxLabelClasses}>
                                            <input type="checkbox" name="esVirtual" checked={formData.esVirtual} onChange={handleFormChange} className={checkboxClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                            <span>Servicio Virtual / En línea</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {(modalMode === 'edit' || modalMode === 'clone') && currentTipoCita && ( // Mostrar Eliminar solo en edit, no en clone
                                    modalMode === 'edit' && <button type="button" onClick={() => handleDeleteTipoCita(currentTipoCita.id, currentTipoCita.nombre)} className={buttonDangerModal} disabled={isSubmittingModal || !!modalSuccess}>
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={buttonSecondaryModal} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonPrimaryModal} disabled={isSubmittingModal || !formData.nombre.trim() || !!modalSuccess}>
                                    {isSubmittingModal ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' || modalMode === 'clone' ? 'Crear Tipo de Cita' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}