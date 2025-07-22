'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// DND Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    MeasuringStrategy, // Importante para algunos layouts de DND
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Nuevas Actions y Schemas/Tipos Zod
import {
    listarCamposPersonalizadosCrmAction,
    crearCampoPersonalizadoCrmAction,
    editarCampoPersonalizadoCrmAction,
    eliminarCampoPersonalizadoCrmAction,
    reordenarCamposPersonalizadosCrmAction
} from '@/app/admin/_lib/actions/crmCampoPersonalizado/crmCampoPersonalizado.actions';
import {
    campoPersonalizadoFormSchema,
    tipoCampoPersonalizadoEnum, // Para el select de tipo
    type CrmCampoPersonalizadoData,
    type CampoPersonalizadoFormData,
    type EditarCampoPersonalizadoFormData, // Para el cast en la acción de editar
} from '@/app/admin/_lib/actions/crmCampoPersonalizado/crmCampoPersonalizado.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';

// Iconos y Componentes UI
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, FileText, ListPlus, Hash, Calendar as CalendarIconLucide, ToggleLeft, Info } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox"; // Tu componente Checkbox recién creado/instalado

interface Props {
    negocioId: string;
}

// Helper para generar nombreCampo
function generarNombreCampo(nombreVisible: string): string {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '_') // Reemplazar espacios con guion bajo
        .replace(/[^a-z0-9_]+/g, '') // Solo letras minúsculas, números y guion bajo
        .replace(/^_+|_+$/g, '')
        .substring(0, 50);
}

// Componente Interno SortableCampoItem
function SortableCampoItem({ campo, onEditClick, isBeingModified }: {
    campo: CrmCampoPersonalizadoData,
    onEditClick: (cp: CrmCampoPersonalizadoData) => void,
    isBeingModified: boolean,
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo.id, disabled: isBeingModified });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 100 : 'auto', cursor: 'grab' };
    const listItemClasses = `flex items-center gap-3 py-2.5 px-2 border-b border-zinc-700/60 transition-colors ${isDragging ? 'bg-zinc-700 shadow-xl' : 'hover:bg-zinc-700/40'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:opacity-50";
    const tipoClasses = "text-xs bg-zinc-600 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap capitalize"; // Añadido capitalize
    const requeridoClasses = "text-xs font-medium text-amber-400 ml-2";

    const TipoIconDisplay = useCallback(() => {
        switch (campo.tipo?.toLowerCase()) {
            case 'texto': return <FileText size={14} className="text-cyan-400" />;
            case 'numero': return <Hash size={14} className="text-emerald-400" />;
            case 'fecha': return <CalendarIconLucide size={14} className="text-purple-400" />;
            case 'booleano': return <ToggleLeft size={14} className="text-rose-400" />;
            default: return <FileText size={14} className="text-zinc-400" />;
        }
    }, [campo.tipo]);

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} className="p-1.5 cursor-grab touch-none text-zinc-500 hover:text-zinc-200 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover campo" disabled={isBeingModified}><GripVertical size={18} /></button>
            <span title={`Tipo: ${campo.tipo}`} className="flex-shrink-0 w-5 h-5 flex items-center justify-center"><TipoIconDisplay /></span>
            <div className="flex-grow mr-2 overflow-hidden">
                <span className="text-sm font-medium text-zinc-200 truncate" title={campo.nombre}>{campo.nombre}</span>
                <span className="block text-xs text-zinc-500 font-mono truncate" title={`ID Interno: ${campo.nombreCampo}`}>({campo.nombreCampo})</span>
                <span className="block text-xs text-zinc-500 font-mono truncate" title={`ID: ${campo.id}`}>ID: {campo.id}</span>
            </div>
            {campo.requerido && <span className={requeridoClasses} title="Campo requerido">* Obligatorio</span>}
            <span className={tipoClasses}>{campo.tipo}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${campo.status === 'activo' ? 'bg-green-500/20 text-green-300' : 'bg-zinc-600 text-zinc-400'}`}>
                {campo.status}
            </span>
            <button onClick={() => onEditClick(campo)} className={buttonEditClasses} title="Editar Campo" disabled={isBeingModified}><PencilIcon size={14} /></button>
        </li>
    );
}


export default function CRMCamposPersonalizados({ negocioId }: Props) {
    const [campos, setCampos] = useState<CrmCampoPersonalizadoData[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [campoParaEditar, setCampoParaEditar] = useState<CrmCampoPersonalizadoData | null>(null);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [pendingOrderToSave, setPendingOrderToSave] = useState<CrmCampoPersonalizadoData[] | null>(null);

    const {
        register: registerModal,
        handleSubmit: handleSubmitModal,
        reset: resetModal,
        control: controlModal,
        watch: watchModalNombre,
        formState: { errors: modalFormErrors }
    } = useForm<CampoPersonalizadoFormData>({
        resolver: zodResolver(campoPersonalizadoFormSchema),
        defaultValues: { nombre: '', tipo: 'texto', requerido: false, status: 'activo' }
    });

    const modalNombreVisible = watchModalNombre('nombre');
    const [generatedNombreCampoDisplay, setGeneratedNombreCampoDisplay] = useState('');

    useEffect(() => {
        if (modalMode === 'create') {
            setGeneratedNombreCampoDisplay(generarNombreCampo(modalNombreVisible || ''));
        }
    }, [modalNombreVisible, modalMode]);

    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap disabled:opacity-60";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    // const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300 ml-2 cursor-pointer";
    const readOnlyInputClasses = `${inputBaseClasses} bg-zinc-950 text-zinc-500 cursor-not-allowed font-mono text-xs`;
    const checkboxContainerClasses = "flex items-center mb-4 cursor-pointer";


    const fetchCampos = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) { setError("ID de negocio no disponible."); if (isInitialLoad) setLoading(false); return; }
        if (isInitialLoad) { setLoading(true); setPendingOrderToSave(null); }
        setError(null);
        try {
            const result = await listarCamposPersonalizadosCrmAction({ negocioId });
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setCampos(result.data.campos || []);
                if (!result.data.crmId && isInitialLoad) {
                    setError("CRM no configurado. Por favor, configura el CRM para añadir campos.");
                }
            } else { throw new Error(result.error || "Error cargando campos."); }
        } catch (err) {
            setError(`No se pudieron cargar los campos: ${err instanceof Error ? err.message : "Error"}`);
            setCampos([]); setCrmId(null);
        } finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchCampos(true); }, [fetchCampos]);

    const openModal = (mode: 'create' | 'edit', campo?: CrmCampoPersonalizadoData) => {
        if (mode === 'create' && !crmId) { setError("CRM no configurado."); return; }
        setModalMode(mode);
        setCampoParaEditar(mode === 'edit' ? campo || null : null);
        if (mode === 'edit' && campo) {
            resetModal({
                nombre: campo.nombre,
                tipo: campo.tipo,
                requerido: campo.requerido,
                status: campo.status
            });
            setGeneratedNombreCampoDisplay(campo.nombreCampo); // Mostrar el nombreCampo existente
        } else {
            resetModal({ nombre: '', tipo: 'texto', requerido: false, status: 'activo' });
            setGeneratedNombreCampoDisplay(''); // Limpiar para nuevo
        }
        setIsModalOpen(true);
        setModalSubmitError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode('create'); setCampoParaEditar(null);
            resetModal({ nombre: '', tipo: 'texto', requerido: false, status: 'activo' });
            setModalSubmitError(null);
            setGeneratedNombreCampoDisplay('');
        }, 200);
    };

    const onModalFormSubmit: SubmitHandler<CampoPersonalizadoFormData> = async (formData) => {
        setIsSubmittingModal(true); setModalSubmitError(null);
        try {
            let result: ActionResult<CrmCampoPersonalizadoData | null>;

            if (modalMode === 'create') {
                if (!crmId) throw new Error("ID de CRM no disponible.");
                const nombreCampoFinal = generarNombreCampo(formData.nombre);
                if (!nombreCampoFinal) {
                    setModalSubmitError("El nombre visible debe generar un nombre de campo interno válido.");
                    setIsSubmittingModal(false); return;
                }
                result = await crearCampoPersonalizadoCrmAction({
                    crmId: crmId,
                    nombre: formData.nombre,
                    nombreCampo: nombreCampoFinal,
                    tipo: formData.tipo,
                    requerido: formData.requerido,
                    status: formData.status,
                    // descripcionParaIA: formData.descripcionParaIA // Si lo añades al form
                });
            } else if (modalMode === 'edit' && campoParaEditar?.id) {
                const datosEdit: EditarCampoPersonalizadoFormData = { // Usar el tipo específico para editar
                    nombre: formData.nombre,
                    requerido: formData.requerido,
                    status: formData.status,
                    // descripcionParaIA: formData.descripcionParaIA, // Si lo añades al form
                    // Tipo y nombreCampo no se editan
                };
                result = await editarCampoPersonalizadoCrmAction({
                    campoId: campoParaEditar.id,
                    datos: datosEdit
                });
            } else { throw new Error("Modo inválido o ID faltante."); }

            if (result?.success && result.data) { await fetchCampos(false); closeModal(); }
            else { throw new Error(result?.error || "Error al guardar."); }
        } catch (err) {
            setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Error"}`);
        } finally { setIsSubmittingModal(false); }
    };

    const handleModalDelete = async () => {
        if (!campoParaEditar?.id) return;
        if (confirm(`¿Eliminar campo "${campoParaEditar.nombre}"? Esta acción es irreversible.`)) {
            setIsSubmittingModal(true); setModalSubmitError(null);
            try {
                const result = await eliminarCampoPersonalizadoCrmAction({ campoId: campoParaEditar.id });
                if (result?.success) { await fetchCampos(false); closeModal(); }
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
            setCampos((prevCampos) => {
                const oldIndex = prevCampos.findIndex((c) => c.id === active.id);
                const newIndex = prevCampos.findIndex((c) => c.id === over.id);
                const reordered = arrayMove(prevCampos, oldIndex, newIndex);
                setPendingOrderToSave(reordered);
                return reordered;
            });
        }
    };

    useEffect(() => {
        const guardarOrden = async () => {
            if (!pendingOrderToSave || !crmId || isSavingOrder) return;
            setIsSavingOrder(true); setError(null);
            const camposConNuevoOrden = pendingOrderToSave.map((c, index) => ({ id: c.id, orden: index + 1 }));
            try {
                const result = await reordenarCamposPersonalizadosCrmAction({ crmId, camposOrdenados: camposConNuevoOrden });
                if (!result.success) throw new Error(result.error || "Error al guardar orden.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar orden.");
                fetchCampos(false);
            } finally { setIsSavingOrder(false); setPendingOrderToSave(null); }
        };
        if (pendingOrderToSave) {
            const timer = setTimeout(guardarOrden, 700);
            return () => clearTimeout(timer);
        }
    }, [pendingOrderToSave, crmId, isSavingOrder, fetchCampos]);

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><ListPlus size={16} /> Campos Personalizados</h3>
                <Button onClick={() => openModal('create')} className={buttonPrimaryClasses} disabled={!crmId || loading || isSavingOrder} title={!crmId && !loading ? "Configura CRM" : ""}>
                    <PlusIcon size={14} /> <span>Crear Campo</span>
                </Button>
            </div>

            {error && <p className="mb-3 text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-md border border-red-600/50">{error}</p>}
            {isSavingOrder && <p className="mb-2 text-xs text-sky-400 text-center animate-pulse"><Loader2 className="inline mr-1 h-3 w-3 animate-spin" />Guardando orden...</p>}

            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando...</span></div>)
                    : campos.length === 0 && crmId ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay campos definidos.</p></div>)
                        : !crmId && !loading && !error ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>CRM no configurado.</p></div>)
                            : campos.length > 0 && crmId ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}>
                                    <SortableContext items={campos.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                        <ul className='space-y-0 divide-y divide-zinc-700/50'> {/* Usar divide para líneas sutiles */}
                                            {campos.map((campo) => (
                                                <SortableCampoItem key={campo.id} campo={campo} onEditClick={() => openModal('edit', campo)} isBeingModified={isSubmittingModal || isSavingOrder} />
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
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Campo Personalizado' : `Editar: ${campoParaEditar?.nombre || ''}`}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitModal(onModalFormSubmit)}>
                            <div className={modalBodyClasses}>
                                {modalSubmitError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalSubmitError}</p>}

                                <div>
                                    <label htmlFor="modal-cp-nombre" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <Input type="text" id="modal-cp-nombre" {...registerModal("nombre")} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Fecha de Cumpleaños" />
                                    {modalFormErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalFormErrors.nombre.message}</p>}
                                </div>

                                <div>
                                    <label htmlFor="modal-cp-nombreCampo" className={labelBaseClasses}>Nombre Interno (Automático)</label>
                                    <Input
                                        type="text"
                                        id="modal-cp-nombreCampo"
                                        value={modalMode === 'create' ? generatedNombreCampoDisplay : (campoParaEditar?.nombreCampo || '')}
                                        className={readOnlyInputClasses}
                                        readOnly
                                        disabled
                                        title="Se genera del nombre visible. No editable después de crear."
                                    />
                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Info size={12} /> No se puede cambiar después de crear. Solo minúsculas, números y &apos;_&apos;.</p>
                                </div>

                                <div>
                                    <label htmlFor="modal-cp-tipo" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <Controller
                                        name="tipo"
                                        control={controlModal}
                                        defaultValue={'texto'}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                disabled={isSubmittingModal || modalMode === 'edit'} // No editable en modo edición
                                            >
                                                <SelectTrigger id="modal-cp-tipo" className={`${inputBaseClasses} ${modalMode === 'edit' ? 'bg-zinc-950 cursor-not-allowed' : ''}`}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tipoCampoPersonalizadoEnum.options.map(option => (
                                                        <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {modalMode === 'edit' && <p className="text-xs text-zinc-500 mt-1">El tipo de dato no se puede cambiar después de crear.</p>}
                                    {modalFormErrors.tipo && <p className="text-xs text-red-400 mt-1">{modalFormErrors.tipo.message}</p>}
                                </div>

                                <div className={checkboxContainerClasses}>
                                    <Controller
                                        name="requerido"
                                        control={controlModal}
                                        render={({ field }) => (
                                            <Checkbox
                                                id="modal-cp-requerido"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={isSubmittingModal}
                                            />
                                        )}
                                    />
                                    <label htmlFor="modal-cp-requerido" className={checkboxLabelClasses}>¿Es un campo obligatorio?</label>
                                </div>
                                {modalFormErrors.requerido && <p className="text-xs text-red-400 ml-6 -mt-2">{modalFormErrors.requerido.message}</p>}

                                <div> {/* Select para Status (opcional en el form, pero útil si se quiere cambiar) */}
                                    <label htmlFor="modal-cp-status" className={labelBaseClasses}>Status del Campo</label>
                                    <Controller
                                        name="status"
                                        control={controlModal}
                                        defaultValue="activo"
                                        render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingModal}>
                                                <SelectTrigger id="modal-cp-status" className={inputBaseClasses}><SelectValue /></SelectTrigger>
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
                                {modalMode === 'edit' && campoParaEditar && (
                                    <Button type="button" onClick={handleModalDelete} variant="destructive" size="sm" className="mr-auto" disabled={isSubmittingModal}>
                                        <Trash2 size={14} className="mr-1.5" /> Eliminar
                                    </Button>)}
                                <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSubmittingModal}>Cancelar</Button>
                                <Button type="submit" size="sm" className={buttonPrimaryClasses} disabled={isSubmittingModal || (modalMode === 'create' && !crmId)}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin mr-2 h-4 w-4' /> : <Save size={14} className="mr-1.5" />}
                                    {modalMode === 'create' ? 'Crear Campo' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}