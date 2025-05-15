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
    TouchSensor // Añadido para mejor soporte táctil
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

import {
    obtenerTiposCitaPorNegocioId,
    crearTipoCita,
    actualizarTipoCita,
    eliminarTipoCita,
    actualizarOrdenTiposCita
} from '@/app/admin/_lib/negocioAgenda.actions';

import {
    // Este es el tipo base, usualmente de Prisma o tu types.ts global
    TipoCitaInput,  // Para el formulario
    AgendaActionResult
} from '@/app/admin/_lib/negocioAgenda.type';

import { AgendaTipoCita } from '@prisma/client'; // Asegúrate de que este tipo esté definido correctamente

interface TiposCitaSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean;
}

// Definición local del tipo para el estado, incluyendo 'orden' que es crucial para DnD
// y que podría no estar en AgendaTipoCita si 'orden' es opcional en la BD.
interface TipoCitaConOrden extends AgendaTipoCita {
    id: string; // Aseguramos que 'id' esté presente
    orden: number; // Aseguramos que orden sea un número para el estado local
}

const formInicialTipoCita: TipoCitaInput = {
    nombre: '',
    descripcion: '',
    duracionMinutos: 30,
    esVirtual: false,
    esPresencial: false,
    limiteConcurrencia: 1,
};

function SortableTipoCitaRow({
    tipoCita,
    onEdit,
    onDelete,
    onClone,
    isSubmittingModal,
    isSavingGlobal
}: {
    tipoCita: TipoCitaConOrden; // Usar el tipo local con 'orden' requerido
    onEdit: (tipo: AgendaTipoCita) => void;
    onDelete: (id: string, nombre: string) => void;
    onClone: (tipo: AgendaTipoCita) => void;
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
    } = useSortable({ id: tipoCita.id }); // id debe ser un string o número único

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const tdClasses = "px-3 py-3 text-sm text-zinc-300 whitespace-nowrap";
    const buttonIconClasses = "p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed";
    const checkIconClasses = "text-green-400";
    const noCheckIconClasses = "text-zinc-600";

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800/50 hover:bg-zinc-700/40 transition-colors ${isDragging ? 'shadow-xl ring-1 ring-blue-500' : ''}`}>
            <td className={`${tdClasses} w-10 text-center`}>
                {/* El botón es el handle de arrastre */}
                <button
                    {...attributes}
                    {...listeners}
                    className={`${buttonIconClasses} cursor-grab active:cursor-grabbing touch-none`} // touch-none para mejor compatibilidad táctil
                    title="Reordenar"
                    // Prevenir que el clic en el handle dispare la edición de la fila si la fila es clickeable
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={16} />
                </button>
            </td>
            <td className={`${tdClasses} font-medium text-zinc-100`} onClick={() => onEdit(tipoCita)}>{tipoCita.nombre}</td>

            <td className={`${tdClasses} text-center w-32`} onClick={() => onEdit(tipoCita)}>
                {tipoCita.duracionMinutos ? `${tipoCita.duracionMinutos} min` : <span className="text-zinc-500 italic">N/A</span>}
            </td>
            <td className={`${tdClasses} text-center w-24`} onClick={() => onEdit(tipoCita)}>
                {tipoCita.limiteConcurrencia ? tipoCita.limiteConcurrencia : <span className="text-zinc-500 italic">N/A</span>}
            </td>
            <td className={`${tdClasses} text-center w-24`} onClick={() => onEdit(tipoCita)}>
                {tipoCita.esPresencial ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}
            </td>
            <td className={`${tdClasses} text-center w-20`} onClick={() => onEdit(tipoCita)}>
                {tipoCita.esVirtual ? <Check size={18} className={checkIconClasses} /> : <XIcon size={18} className={noCheckIconClasses} />}
            </td>
            <td className={`${tdClasses} max-w-xs truncate text-zinc-400`} title={tipoCita.descripcion || ''} onClick={() => onEdit(tipoCita)}>
                {tipoCita.descripcion || <span className="text-zinc-500 italic">N/A</span>}
            </td>
            <td className={`${tdClasses} text-right`}>
                <button onClick={(e) => { e.stopPropagation(); onClone(tipoCita); }} className={buttonIconClasses} title="Clonar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Copy size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(tipoCita); }} className={buttonIconClasses} title="Editar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Edit size={16} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(tipoCita.id, tipoCita.nombre); }} className={`${buttonIconClasses} text-red-500 hover:text-red-400`} title="Eliminar tipo de cita" disabled={isSavingGlobal || isSubmittingModal}><Trash2 size={16} /></button>
            </td>
        </tr>
    );
}

export default function TiposCitaSeccion({
    negocioId,
    isSavingGlobal
}: TiposCitaSeccionProps) {
    const [tiposCita, setTiposCita] = useState<TipoCitaConOrden[]>([]); // Usar el tipo local
    const [loadingTiposCita, setLoadingTiposCita] = useState(true);
    const [errorTiposCita, setErrorTiposCita] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'clone'>('create');
    const [currentTipoCita, setCurrentTipoCita] = useState<AgendaTipoCita | null>(null);
    const [formData, setFormData] = useState<TipoCitaInput>(formInicialTipoCita);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalSuccess, setModalSuccess] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases de UI
    const tableClasses = "min-w-full";
    // const thClasses = "px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap";
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

    const fetchTiposCitaLocal = useCallback(async () => {
        setLoadingTiposCita(true);
        setErrorTiposCita(null);
        try {
            const result = await obtenerTiposCitaPorNegocioId(negocioId);
            if (result.success && result.data) {
                // Asegurar que 'orden' sea un número para el estado y para dnd-kit
                setTiposCita(result.data.map((tc, index) => ({
                    ...tc,
                    orden: typeof tc.orden === 'number' ? tc.orden : index
                })));
            } else {
                throw new Error(result.error || "Error cargando tipos de cita.");
            }
        } catch (err) {
            setErrorTiposCita(err instanceof Error ? err.message : "No se pudieron cargar los tipos de cita.");
            setTiposCita([]);
        } finally {
            setLoadingTiposCita(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchTiposCitaLocal();
    }, [fetchTiposCitaLocal]);

    const openModal = (mode: 'create' | 'edit' | 'clone', tipoCita?: AgendaTipoCita) => {
        setModalMode(mode);
        setModalError(null);
        setModalSuccess(null);
        if ((mode === 'edit' || mode === 'clone') && tipoCita) {
            setCurrentTipoCita(tipoCita);
            setFormData({
                nombre: mode === 'clone' ? `${tipoCita.nombre} (Copia)` : tipoCita.nombre,
                descripcion: tipoCita.descripcion || '',
                duracionMinutos: tipoCita.duracionMinutos || 30,
                esVirtual: tipoCita.esVirtual,
                esPresencial: tipoCita.esPresencial,
            });
        } else {
            setCurrentTipoCita(null);
            setFormData(formInicialTipoCita);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setCurrentTipoCita(null);
            setFormData(formInicialTipoCita);
            setModalError(null);
            setModalSuccess(null);
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type, checked } = target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? (parseInt(value) || 0) : value)
        }));
        if (modalError) setModalError(null);
        if (modalSuccess) setModalSuccess(null);
    };

    const handleSubmitModal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre.trim()) { setModalError("El nombre es obligatorio."); return; }
        if ((formData.duracionMinutos ?? 0) < 0) { setModalError("La duración no puede ser negativa."); return; }

        setIsSubmittingModal(true); setModalError(null); setModalSuccess(null);
        let result: AgendaActionResult<AgendaTipoCita>;
        const inputData: TipoCitaInput = {
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion?.trim() || null,
            duracionMinutos: formData.duracionMinutos || null,
            esVirtual: formData.esVirtual,
            esPresencial: formData.esPresencial,
        };

        try {
            if (modalMode === 'create' || modalMode === 'clone') {
                result = await crearTipoCita(negocioId, inputData);
            } else if (modalMode === 'edit' && currentTipoCita?.id) {
                result = await actualizarTipoCita(currentTipoCita.id, inputData);
            } else { throw new Error("Modo de operación o ID no válidos."); }

            if (result.success && result.data) {
                setModalSuccess(`Tipo de cita "${result.data.nombre}" ${modalMode === 'create' || modalMode === 'clone' ? 'creado' : 'actualizado'} exitosamente.`);
                await fetchTiposCitaLocal();
                setTimeout(() => closeModal(), 1500);
            } else { setModalError(result.error || "Ocurrió un error desconocido."); }
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "Un error inesperado ocurrió.");
        } finally { setIsSubmittingModal(false); }
    };

    const handleDeleteTipoCita = async (tipoCitaId: string, nombre: string) => {
        if (isSubmittingModal || isSavingGlobal) return;
        if (confirm(`¿Estás seguro de eliminar el tipo de cita "${nombre}"? Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true); setModalError(null); setModalSuccess(null); // Usar error/success del modal
            try {
                const result = await eliminarTipoCita(tipoCitaId);
                if (result.success) {
                    await fetchTiposCitaLocal();
                    if (currentTipoCita?.id === tipoCitaId) closeModal(); // Cerrar modal si el item actual fue eliminado
                    // Opcional: Mostrar un mensaje de éxito general en la sección si se desea
                    // setErrorTiposCita(null); // Limpiar error de sección
                } else {
                    // Mostrar error en el modal si está abierto, o en la sección si no
                    if (isModalOpen) setModalError(result.error || "Error al eliminar el tipo de cita.");
                    else setErrorTiposCita(result.error || "Error al eliminar el tipo de cita.");
                }
            } catch (err) {
                if (isModalOpen) setModalError(err instanceof Error ? err.message : "Error al eliminar.");
                else setErrorTiposCita(err instanceof Error ? err.message : "Error al eliminar.");
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    // Sensores para DnD, incluyendo TouchSensor
    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }), // Para táctil
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEndTiposCita = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = tiposCita.findIndex((tc) => tc.id === active.id);
            const newIndex = tiposCita.findIndex((tc) => tc.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(tiposCita, oldIndex, newIndex);
            const finalOrder = reordered.map((tc, index) => ({ ...tc, orden: index }));
            setTiposCita(finalOrder);

            const ordenData = finalOrder.map(({ id, orden }) => ({ id, orden: orden as number }));

            setIsSavingOrder(true); setErrorTiposCita(null);
            try {
                const result = await actualizarOrdenTiposCita(negocioId, ordenData);
                if (!result.success) {
                    setErrorTiposCita(result.error || "Error al guardar el nuevo orden.");
                    await fetchTiposCitaLocal();
                }
            } catch {
                setErrorTiposCita("Error crítico al guardar el orden.");
                await fetchTiposCitaLocal();
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [tiposCita, negocioId, fetchTiposCitaLocal]);


    if (loadingTiposCita) { /* ... (loader sin cambios) ... */ }

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

            {tiposCita.length === 0 && !loadingTiposCita && !errorTiposCita ? (
                <div className="text-center py-8 px-4 bg-zinc-900/30 border border-zinc-700 rounded-md">
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
                                    <th className="px-3 py-2.5 text-right w-[100px]"></th>
                                </tr>
                            </thead>
                            <SortableContext items={tiposCita.map(tc => tc.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700/70">
                                    {tiposCita.map((tipo) => (
                                        <SortableTipoCitaRow
                                            key={tipo.id}
                                            // id={tipo.id} // 'id' ya está en 'tipo'
                                            tipoCita={tipo} // Pasar el objeto completo que incluye 'id'
                                            onEdit={(tipo) => openModal('edit', tipo)} // Llama a openModal con el modo 'edit' y el tipo
                                            onDelete={handleDeleteTipoCita}
                                            onClone={(tipo) => openModal('clone', tipo)} // Ajustado para coincidir con la firma esperada
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
            {tiposCita.length > 0 && <p className="text-xs text-zinc-500 italic mt-2 text-center">Arrastra <GripVertical size={12} className="inline -mt-px" /> para reordenar los tipos de cita.</p>}

            {/* Modal para Crear/Editar Tipo de Cita */}
            {isModalOpen && (
                <div className={modalOverlayClasses}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSubmitModal}>
                            <div className={modalHeaderClasses}>
                                <h4 className={modalTitleClasses}>
                                    {modalMode === 'create' ? 'Añadir Nuevo Tipo de Cita' : 'Editar Tipo de Cita'}
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
                                        <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Servicio/Tipo de Cita <span className="text-red-500">*</span></label>
                                        <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} placeholder="Ej: Consulta General, Corte de Cabello" />
                                    </div>
                                    <div>
                                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                        <textarea name="descripcion" id="descripcion" value={formData.descripcion || ''} onChange={handleFormChange} className={textareaBaseClasses} rows={3} disabled={isSubmittingModal} placeholder="Detalles adicionales sobre el servicio..." />
                                    </div>
                                    <div>
                                        <label htmlFor="duracionMinutos" className={labelBaseClasses}>Duración Estimada (minutos)</label>
                                        <input type="number" name="duracionMinutos" id="duracionMinutos" value={formData.duracionMinutos || ''} onChange={handleFormChange} className={inputBaseClasses} disabled={isSubmittingModal} placeholder="Ej: 30" min="0" step="5" />
                                    </div>
                                    <div>
                                        <label htmlFor="limiteConcurrencia" className={labelBaseClasses}>Límite de Concurrencia (Máx. citas simultáneas)</label>
                                        <input type="number" name="limiteConcurrencia" id="limiteConcurrencia" value={formData.limiteConcurrencia || ''} onChange={handleFormChange} className={inputBaseClasses} disabled={isSubmittingModal} placeholder="Ej: 1" min="1" step="1" />
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <p className={labelBaseClasses}>Modalidad del Servicio:</p>
                                        <label className={checkboxLabelClasses}>
                                            <input type="checkbox" name="esPresencial" checked={formData.esPresencial} onChange={handleFormChange} className={checkboxClasses} disabled={isSubmittingModal} />
                                            <span>Servicio Presencial</span>
                                        </label>
                                        <label className={checkboxLabelClasses}>
                                            <input type="checkbox" name="esVirtual" checked={formData.esVirtual} onChange={handleFormChange} className={checkboxClasses} disabled={isSubmittingModal} />
                                            <span>Servicio Virtual / En línea</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && currentTipoCita && (
                                    <button type="button" onClick={() => handleDeleteTipoCita(currentTipoCita.id, currentTipoCita.nombre)} className={buttonDangerModal} disabled={isSubmittingModal}>
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={buttonSecondaryModal} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonPrimaryModal} disabled={isSubmittingModal || !formData.nombre.trim()}>
                                    {isSubmittingModal ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear Tipo de Cita' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

