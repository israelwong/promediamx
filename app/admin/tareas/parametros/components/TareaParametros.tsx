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
// --- Fin DnD Imports ---

import {
    obtenerParametrosRequeridos,
    crearParametroRequerido,
    editarParametroRequerido,
    eliminarParametroRequerido,
    actualizarOrdenParametros
} from '@/app/admin/_lib/unused/tareaParametro.actions'; // Asumo que la ruta es correcta, antes era parametrosTareas.actions

import {
    ParametroConDetalles,
    ParametroFormData
    // Asegúrate que ParametroRequeridoInput también se importe si lo usas para dataToSend
} from '@/app/admin/_lib/unused/tareaParametro.type'; // Asumo que la ruta es correcta, antes era parametrosTareas.type

import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, Variable, GripVertical, InfoIcon,
    Type, Hash, Calendar, Clock, ToggleRight, Mail, Phone, Link as LinkIcon, AlertTriangleIcon
} from 'lucide-react';



const TIPOS_DATO_PARAMETRO = [
    { value: 'texto', label: 'Texto Corto' },
    { value: 'texto_largo', label: 'Texto Largo' },
    { value: 'numero', label: 'Número' },
    { value: 'fecha', label: 'Fecha' },
    { value: 'fecha_hora', label: 'Fecha y Hora' },
    { value: 'booleano', label: 'Sí/No (Booleano)' },
    { value: 'email', label: 'Email' },
    { value: 'telefono', label: 'Teléfono' },
    { value: 'url', label: 'URL' },
];

const tipoDatoIconMap: { [key: string]: React.ReactElement } = {
    texto: <span title="Texto Corto"><Type size={14} className="text-sky-400 mx-auto" /></span>,
    texto_largo: <span title="Texto Largo"><Type size={14} className="text-sky-500 mx-auto" /></span>,
    numero: <span title="Número"><Hash size={14} className="text-emerald-400 mx-auto" /></span>,
    fecha: <span title="Fecha"><Calendar size={14} className="text-amber-400 mx-auto" /></span>,
    fecha_hora: <span title="Fecha y Hora"><Clock size={14} className="text-amber-500 mx-auto" /></span>,
    booleano: <span title="Sí/No"><ToggleRight size={14} className="text-rose-400 mx-auto" /></span>,
    email: <span title="Email"><Mail size={14} className="text-indigo-400 mx-auto" /></span>,
    telefono: <span title="Teléfono"><Phone size={14} className="text-lime-400 mx-auto" /></span>,
    url: <span title="URL"><LinkIcon size={14} className="text-cyan-400 mx-auto" /></span>,
};

const getTipoDatoDisplay = (tipo: string): React.ReactElement => {
    return tipoDatoIconMap[tipo] || <span title={tipo} className="text-zinc-500 text-xs">?</span>;
};

const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
};

function SortableParametroRow({ id, parametro, onEdit }: { id: string; parametro: ParametroConDetalles; onEdit: () => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const tdBaseClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500 bg-zinc-700' : ''}`}
            onClick={handleRowClickInternal}
        >
            <td className={`${tdBaseClasses} text-center w-10`}>
                <button
                    {...attributes} {...listeners} data-dnd-handle="true"
                    className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </button>
            </td>
            <td className={`${tdBaseClasses} text-center w-16`}>
                {getTipoDatoDisplay(parametro.tipoDato)}
            </td>
            <td className={`${tdBaseClasses} text-zinc-100 font-medium`}>
                {parametro.nombreVisible}
            </td>
            <td className={`${tdBaseClasses} font-mono text-zinc-400`}>
                {parametro.nombreInterno}
            </td>
            <td className={`${tdBaseClasses} text-zinc-400 max-w-xs`}>
                <div className="flex items-center gap-1">
                    {parametro.descripcion ? (
                        <>
                            <span title="Descripción">
                                <InfoIcon size={12} className="text-zinc-500 flex-shrink-0" />
                            </span>
                            <span className="line-clamp-1" title={parametro.descripcion}>
                                {parametro.descripcion}
                            </span>
                        </>
                    ) : (
                        <span className="text-zinc-600 italic">N/A</span>
                    )}
                </div>
            </td>
            <td className={`${tdBaseClasses} text-center text-zinc-300 w-20`}>
                {parametro._count?.funciones ?? 0}
            </td>
        </tr>
    );
}

export default function TareaParametros() {
    const [parametros, setParametros] = useState<ParametroConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [parametroParaEditar, setParametroParaEditar] = useState<ParametroConDetalles | null>(null);
    const [modalFormData, setModalFormData] = useState<ParametroFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full";
    const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3 px-4 pt-4"; // Ajustado padding y pb
    const headerTitleClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2"; // Añadido flex y gap
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50";
    const errorAlertClasses = "mb-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 mx-4 flex items-center gap-2"; // Añadido flex y gap
    const tableWrapperClasses = "flex-grow overflow-auto";

    // --- Clases del Modal Ajustadas ---
    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"; // Aumentado z-index
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-xl flex flex-col overflow-hidden"; // Aumentado max-w-xl
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100"; // Clase para título del modal
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]"; // Ajustado max-h para más espacio
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30"; // Fondo sutil

    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300"; // Aumentado mb
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950"; // Aumentado p
    const textareaBaseClasses = `${inputBaseClasses} min-h-[120px]`; // Aumentado min-h, rows se maneja con esto

    // Guía 5.4 Botones (Modal)
    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 min-w-[120px]`; // min-w para consistencia
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;


    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            const data = await obtenerParametrosRequeridos();
            setParametros(data || []);
        } catch (err) {
            console.error("Error al obtener parámetros:", err);
            setError("No se pudieron cargar los parámetros.");
            setParametros([]);
        } finally { if (isInitialLoad) setLoading(false); }
    }, []);

    useEffect(() => { fetchData(true); }, [fetchData]);

    const openModal = (mode: 'create' | 'edit', parametro?: ParametroConDetalles) => {
        setModalMode(mode);
        setParametroParaEditar(mode === 'edit' ? parametro || null : null);
        // --- AJUSTE: Asegurar que nombreInterno se cargue en modo edición ---
        setModalFormData(mode === 'edit' && parametro ?
            {
                nombreVisible: parametro.nombreVisible,
                nombreInterno: parametro.nombreInterno, // Cargar nombreInterno
                tipoDato: parametro.tipoDato,
                descripcion: parametro.descripcion
            } :
            { nombreVisible: '', nombreInterno: '', tipoDato: 'texto', descripcion: '' }
        );
        setIsModalOpen(true); setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setParametroParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => {
            const updatedData = { ...prev, [name]: value };
            if (modalMode === 'create' && name === 'nombreVisible') {
                updatedData.nombreInterno = generarNombreInterno(value);
            }
            return updatedData;
        });
        if (modalError) setModalError(null);
    };
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombreVisible?.trim()) { setModalError("Nombre visible obligatorio."); return; }
        if (!modalFormData.tipoDato) { setModalError("Tipo de dato obligatorio."); return; }
        if (modalMode === 'create') {
            const nombreInternoGenerado = generarNombreInterno(modalFormData.nombreVisible);
            if (!nombreInternoGenerado || !/^[a-z0-9_]+$/.test(nombreInternoGenerado)) {
                setModalError("Nombre interno inválido. Ajusta el nombre visible."); return;
            }
        }

        setIsSubmittingModal(true); setModalError(null);
        try {
            let result;
            // El tipo ParametroRequeridoInput debe coincidir con lo que esperan las actions
            const dataToSend = {
                nombreVisible: modalFormData.nombreVisible.trim(),
                tipoDato: modalFormData.tipoDato,
                descripcion: modalFormData.descripcion?.trim() || null,
                // nombreInterno no se envía para editar, y se genera en backend para crear
            };
            if (modalMode === 'create') {
                result = await crearParametroRequerido(dataToSend);
            } else if (modalMode === 'edit' && parametroParaEditar?.id) {
                result = await editarParametroRequerido(parametroParaEditar.id, dataToSend);
            } else { throw new Error("Modo inválido o ID faltante."); }

            if (result?.success) { await fetchData(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }
        } catch (err) {
            console.error(`Error al ${modalMode} parámetro:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally { setIsSubmittingModal(false); }
    };
    const handleModalDelete = async () => {
        if (!parametroParaEditar?.id || !parametroParaEditar.nombreVisible) return;
        if (confirm(`¿Eliminar parámetro "${parametroParaEditar.nombreVisible}" (${parametroParaEditar.nombreInterno})?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarParametroRequerido(parametroParaEditar.id);
                if (result?.success) { await fetchData(); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                console.error("Error eliminando:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`);
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = parametros.findIndex((p) => p.id === active.id);
            const newIndex = parametros.findIndex((p) => p.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedParametros = arrayMove(parametros, oldIndex, newIndex);
            setParametros(reorderedParametros);
            const parametrosParaActualizar = reorderedParametros.map((p, index) => ({ id: p.id, orden: index }));
            setIsSavingOrder(true); setError(null);
            try {
                const result = await actualizarOrdenParametros(parametrosParaActualizar);
                if (!result.success) { setError(result.error || "Error al guardar orden."); await fetchData(); }
            } catch (err) {
                setError(`Error: ${err instanceof Error ? err.message : 'Error'}. Recargando...`); await fetchData();
            } finally { setIsSavingOrder(false); }
        }
    };

    return (
        <div className={containerClasses}>
            <div className={headerSectionClasses}>
                <h2 className={headerTitleClasses}>
                    <Variable size={20} />
                    Parámetros Globales
                </h2>
                <div className='flex items-center gap-3'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo parámetro estándar">
                        <PlusIcon size={16} />
                        <span>Crear Parámetro</span>
                    </button>
                </div>
            </div>

            {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} className="text-red-400 flex-shrink-0" /> {error}</p>}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableWrapperClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando parámetros...</span></div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-700">
                                <tr>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Reordenar"></th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Tipo</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre Visible</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID Interno</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Uso</th>
                                </tr>
                            </thead>
                            <SortableContext items={parametros.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700">
                                    {parametros.length === 0 && !error ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-sm text-zinc-500 italic">
                                                <ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                                No hay parámetros globales definidos.
                                            </td>
                                        </tr>
                                    ) : (
                                        parametros.map((param) => (
                                            <SortableParametroRow key={param.id} id={param.id} parametro={param} onEdit={() => openModal('edit', param)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && parametros.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-4 mb-2 italic px-4">
                            Haz clic en una fila para editar o arrastra <GripVertical size={12} className='inline align-text-bottom -mt-0.5 mx-0.5' /> para reordenar los parámetros.
                        </p>
                    )}
                </div>
            </DndContext>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>
                                {modalMode === 'create' ? 'Crear Nuevo Parámetro' : 'Editar Parámetro'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500"
                                aria-label="Cerrar modal"
                            >
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && (
                                    <p className="mb-3 text-center text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 text-sm flex items-center gap-2">
                                        <AlertTriangleIcon size={16} className="flex-shrink-0" /> {modalError}
                                    </p>
                                )}
                                <div>
                                    <label htmlFor="modal-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" id="modal-nombreVisible" name="nombreVisible"
                                        value={modalFormData.nombreVisible || ''} onChange={handleModalFormChange}
                                        className={inputBaseClasses} required disabled={isSubmittingModal}
                                        maxLength={100} placeholder="Ej: Correo del Cliente"
                                    />
                                </div>

                                {/* --- AJUSTE: Mostrar ID Interno en modo CREAR y EDITAR --- */}
                                {(modalMode === 'create' || (modalMode === 'edit' && modalFormData.nombreInterno)) && (
                                    <div className="mt-4"> {/* Añadido margen superior */}
                                        <label htmlFor="modal-nombreInterno" className={labelBaseClasses}>
                                            ID Interno
                                        </label>
                                        <input
                                            type="text"
                                            id="modal-nombreInterno"
                                            name="nombreInterno"
                                            value={modalFormData.nombreInterno || ''}
                                            readOnly
                                            className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`}
                                        />
                                        {/* --- AJUSTE: Leyenda condicional --- */}
                                        <p className="text-xs text-zinc-500 mt-1">
                                            {modalMode === 'create'
                                                ? 'Se genera automáticamente del Nombre Visible. No editable.'
                                                : 'Este nombre interno no se puede modificar. Si requiere cambiarlo, necesitaría crear una propiedad nueva.'}
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4"> {/* Añadido margen superior */}
                                    <label htmlFor="modal-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select
                                        id="modal-tipoDato" name="tipoDato"
                                        value={modalFormData.tipoDato || 'texto'} onChange={handleModalFormChange}
                                        className={`${inputBaseClasses} appearance-none`} // appearance-none para select
                                        required disabled={isSubmittingModal}
                                    >
                                        {TIPOS_DATO_PARAMETRO.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                    </select>
                                </div>
                                <div className="mt-4"> {/* Añadido margen superior */}
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                    {/* --- AJUSTE: Textarea más alto --- */}
                                    <textarea
                                        id="modal-descripcion" name="descripcion"
                                        value={modalFormData.descripcion || ''} onChange={handleModalFormChange}
                                        className={textareaBaseClasses} // min-h- ya está en la clase
                                        disabled={isSubmittingModal}
                                        rows={8} // Aumentado rows para más altura inicial
                                        maxLength={2000}
                                        placeholder="Describe brevemente para qué se usa este parámetro o qué información representa. Esta descripción puede ser usada por la IA."
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Máximo 2000 caracteres.</p>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (
                                    <button
                                        type="button"
                                        onClick={handleModalDelete}
                                        className={buttonModalDanger}
                                        disabled={isSubmittingModal || (parametroParaEditar?._count?.funciones ?? 0) > 0}
                                        title={(parametroParaEditar?._count?.funciones ?? 0) > 0 ? `No se puede eliminar: Usado en ${parametroParaEditar?._count?.funciones} función(es).` : 'Eliminar Parámetro'}
                                    >
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button
                                    type="button" onClick={closeModal}
                                    className={buttonModalSecondary}
                                    disabled={isSubmittingModal}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={buttonModalPrimary}
                                    disabled={isSubmittingModal || !modalFormData.nombreVisible?.trim() || !modalFormData.tipoDato}
                                >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
