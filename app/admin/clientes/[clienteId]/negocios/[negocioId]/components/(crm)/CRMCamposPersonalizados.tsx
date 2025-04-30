'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerCamposPersonalizadosCRM,
    crearCampoPersonalizadoCRM,
    editarCampoPersonalizadoCRM,
    eliminarCampoPersonalizadoCRM,
    ordenarCamposPersonalizadosCRM
} from '@/app/admin/_lib/crmCampoPersonalizado.actions';
// **IMPORTANTE: Asegúrate que este tipo ahora tenga 'nombre' y 'nombreCampo'**
import { CRMCampoPersonalizado, CRM } from '@/app/admin/_lib/types';
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, FileText, Hash, Calendar as CalendarIcon, ToggleLeft, Info } from 'lucide-react'; // Iconos

// Imports de dnd-kit
// ... (imports de dnd-kit sin cambios) ...
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

// Interfaz extendida para el estado local
interface CampoConOrden extends CRMCampoPersonalizado {
    orden: number;
    // Asegurarse que los campos del tipo base estén aquí si son necesarios
    id: string;
    nombre: string;
    nombreCampo: string; // Nombre interno/variable
    tipo: string;
    requerido: boolean;
    status: string;
    crmId: string;
    crm?: CRM | null; // Reemplazar 'any' con tipo CRM real si se importa
    createdAt: Date;
    updatedAt: Date;
}


// Tipo para el formulario modal (usa nombre y nombreCampo)
type CampoFormData = Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'nombreCampo' | 'tipo' | 'requerido' | 'status'>>;

// --- Helper para generar nombreCampo ---
function generarNombreCampo(nombreVisible: string): string {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 50);
}


// --- Componente Interno para Item Arrastrable ---
function SortableCampoItem({ campo, onEditClick }: { campo: CampoConOrden, onEditClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };
    const listItemClasses = `flex items-center gap-3 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const tipoClasses = "text-xs bg-zinc-600 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";
    const requeridoClasses = "text-xs font-medium text-amber-400";

    const TipoIcon = useCallback(() => {
        switch (campo.tipo?.toLowerCase()) {
            case 'texto': return <FileText size={14} className="text-cyan-400" />;
            case 'numero': return <Hash size={14} className="text-emerald-400" />;
            case 'fecha': return <CalendarIcon size={14} className="text-purple-400" />;
            case 'booleano': return <ToggleLeft size={14} className="text-rose-400" />;
            default: return <FileText size={14} className="text-zinc-400" />;
        }
    }, [campo.tipo]);

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover campo"><GripVertical size={18} /></button>
            <span title={`Tipo: ${campo.tipo}`}><TipoIcon /></span>
            <div className="flex-grow mr-2 overflow-hidden">
                <span className="text-sm font-medium text-zinc-200 truncate" title={campo.nombre}>{campo.nombre}</span>
                <span className="block text-xs text-zinc-500 font-mono truncate" title={`ID Interno: ${campo.nombreCampo}`}>({campo.nombreCampo})</span>
                {campo.requerido && <span className={requeridoClasses} title="Campo requerido"> * Requerido</span>}
            </div>
            <span className={tipoClasses}>{campo.tipo}</span>
            <button onClick={onEditClick} className={buttonEditClasses} title="Editar Campo"><PencilIcon size={16} /></button>
        </li>
    );
}


// --- Componente Principal ---
export default function CRMCamposPersonalizados({ crmId }: Props) {
    const [campos, setCampos] = useState<CampoConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [campoParaEditar, setCampoParaEditar] = useState<CampoConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<CampoFormData>({});
    const [generatedNombreCampo, setGeneratedNombreCampo] = useState('');
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios mayores)
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300 ml-2";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50";
    const readOnlyInputClasses = `${inputBaseClasses} bg-zinc-950 text-zinc-500 cursor-not-allowed font-mono text-xs`;


    // Sensores dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Carga de datos ---
    const fetchCampos = useCallback(async (isInitialLoad = false) => {
        if (!crmId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerCamposPersonalizadosCRM(crmId);
            setCampos((data || []).map((c, index) => ({
                id: c.id,
                crmId: c.crmId,
                nombre: c.nombre, // Nombre visible
                nombreCampo: c.nombreCampo ?? '', // Ensure nombreCampo is always a string
                tipo: c.tipo,
                requerido: c.requerido,
                status: c.status,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                orden: c.orden ?? index + 1,
            })));
        } catch (err) {
            console.error("Error al obtener los campos personalizados:", err);
            setError("No se pudieron cargar los campos personalizados.");
            setCampos([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [crmId]);
    useEffect(() => { fetchCampos(true); }, [fetchCampos]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', campo?: CampoConOrden) => {
        setModalMode(mode);
        setCampoParaEditar(mode === 'edit' ? campo || null : null);
        const initialData = mode === 'edit' && campo ?
            { nombre: campo.nombre, nombreCampo: campo.nombreCampo, tipo: campo.tipo, requerido: campo.requerido, status: campo.status } :
            { nombre: '', nombreCampo: '', tipo: 'texto', requerido: false, status: 'activo' };
        setModalFormData(initialData);
        setGeneratedNombreCampo(initialData.nombreCampo || '');
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setCampoParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); setGeneratedNombreCampo('');
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
        const fieldName = name as keyof CampoFormData;

        const newValue: string | boolean | undefined = isCheckbox ? checkedValue : value;
        let newNombreCampo = generatedNombreCampo;

        // **CAMBIO:** Solo generar nombreCampo al cambiar 'nombre' en modo 'create'
        if (fieldName === 'nombre' && modalMode === 'create') {
            newNombreCampo = generarNombreCampo(value);
            setGeneratedNombreCampo(newNombreCampo);
        }

        setModalFormData(prev => ({
            ...prev,
            [fieldName]: newValue,
            // Solo actualizar nombreCampo en el form si estamos creando
            ...(modalMode === 'create' && { nombreCampo: newNombreCampo })
        }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre del campo (visible) es obligatorio."); return; }
        const nombreCampoFinal = modalMode === 'create' ? generatedNombreCampo : campoParaEditar?.nombreCampo;
        if (!nombreCampoFinal) { setModalError("No se pudo determinar un nombre de campo interno válido."); return; }
        if (!modalFormData.tipo) { setModalError("El tipo de dato es obligatorio."); return; }

        //! Confirmación al crear
        // if (modalMode === 'create') {
        // const confirmationMessage = `Confirmar Creación de Campo:\n\nNombre Visible: ${modalFormData.nombre.trim()}\nNombre Interno (ID): ${nombreCampoFinal}\n\n¡IMPORTANTE! El Nombre Interno (ID) no se podrá cambiar después. ¿Deseas continuar?`.trim();
        // if (!window.confirm(confirmationMessage)) { return; }
        // }

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                nombreCampo: nombreCampoFinal,
                tipo: modalFormData.tipo,
                requerido: modalFormData.requerido || false,
                status: modalFormData.status || 'activo',
            };

            if (modalMode === 'create') {
                result = await crearCampoPersonalizadoCRM({
                    crmId: crmId,
                    nombre: dataToSend.nombre,
                    nombreCampo: dataToSend.nombreCampo,
                    tipo: dataToSend.tipo,
                    requerido: dataToSend.requerido
                });
            } else if (modalMode === 'edit' && campoParaEditar?.id) {
                // **CAMBIO: Excluir nombreCampo de los datos a editar**
                const { ...editableData } = dataToSend;
                result = await editarCampoPersonalizadoCRM(campoParaEditar.id, editableData);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) { await fetchCampos(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} campo:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => { /* ... (sin cambios) ... */
        if (!campoParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el campo "${campoParaEditar.nombre}"?\n\n¡IMPORTANTE! Esto eliminará la definición del campo. Los datos existentes para este campo en los Leads NO se borrarán, pero ya no serán visibles ni editables a través de la interfaz estándar. Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCampoPersonalizadoCRM(campoParaEditar.id);
                if (result?.success) { await fetchCampos(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando campo:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Manejador Drag End ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => { /* ... (sin cambios) ... */
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = campos.findIndex((c) => c.id === active.id);
            const newIndex = campos.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedCampos = arrayMove(campos, oldIndex, newIndex);
            const finalCampos = reorderedCampos.map((c, index) => ({ ...c, orden: index + 1 }));
            setCampos(finalCampos);
            const ordenData = finalCampos.map(({ id, orden }) => ({ id, orden }));
            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarCamposPersonalizadosCRM(ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchCampos(); // Revertir
            } finally { setIsSavingOrder(false); }
        }
    }, [campos, fetchCampos]);


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <FileText size={16} /> Campos Personalizados (Lead)
                </h3>
                <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo campo personalizado">
                    <PlusIcon size={14} /> <span>Crear Campo</span>
                </button>
            </div>

            {/* Errores y Guardado Orden */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}
            {isSavingOrder && <div className="mb-2 flex items-center justify-center text-xs text-blue-300"><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...</div>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando campos...</span></div>)
                    : campos.length === 0 && !error ? (<div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay campos personalizados definidos.</p></div>)
                        : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={campos.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <ul className='space-y-0'>
                                        {campos.map((campo) => (
                                            <SortableCampoItem
                                                key={campo.id}
                                                campo={campo}
                                                onEditClick={() => openModal('edit', campo)}
                                            />
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
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Campo Personalizado' : 'Editar Campo Personalizado'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                {/* Input para Nombre (Visible) */}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre del Campo (Visible) <span className="text-red-500">*</span></label>
                                    {/* **CORRECCIÓN: Habilitar input en modo edición** */}
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Fecha de Reunión" />
                                    {/* Quitar el texto que decía que no se podía editar */}
                                </div>
                                {/* Input (read-only) para Nombre Campo (Interno) */}
                                <div>
                                    <label htmlFor="modal-nombreCampo" className={labelBaseClasses}>Nombre Campo (Interno/Automático)</label>
                                    <input type="text" id="modal-nombreCampo" name="nombreCampo" value={generatedNombreCampo} className={readOnlyInputClasses} readOnly disabled title="Identificador único usado internamente (no editable)." />
                                    {/* **CORRECCIÓN: Texto de ayuda actualizado** */}
                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Info size={12} /> Se genera desde el nombre visible. **No se puede cambiar después de crear.**</p>
                                </div>
                                {/* Tipo de Dato */}
                                <div>
                                    <label htmlFor="modal-tipo" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select id="modal-tipo" name="tipo" value={modalFormData.tipo || 'texto'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmittingModal}>
                                        <option value="texto">Texto</option>
                                        <option value="numero">Número</option>
                                        <option value="fecha">Fecha</option>
                                        <option value="booleano">Sí/No (Booleano)</option>
                                    </select>
                                </div>
                                {/* Requerido */}
                                <div className="flex items-center pt-2">
                                    <input type="checkbox" id="modal-requerido" name="requerido" checked={modalFormData.requerido || false} onChange={handleModalFormChange} className={checkboxClasses} disabled={isSubmittingModal} />
                                    <label htmlFor="modal-requerido" className={checkboxLabelClasses}>¿Es un campo obligatorio?</label>
                                </div>
                            </div>
                            {/* Footer Modal */}
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear Campo' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
