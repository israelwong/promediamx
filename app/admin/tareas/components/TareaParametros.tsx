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

// Ajusta rutas según tu estructura
import {
    obtenerParametrosRequeridos,
    crearParametroRequerido,
    editarParametroRequerido,
    eliminarParametroRequerido,
    actualizarOrdenParametros
} from '@/app/admin/_lib/parametrosTareas.actions';
import { ParametroRequerido } from '@/app/admin/_lib/types';
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, Variable, GripVertical,
    Type, Hash, Calendar, Clock, ToggleRight, Mail, Phone, Link as LinkIcon // Importar iconos para tipos
} from 'lucide-react';

// Interfaz para el tipo ParametroRequerido con conteo opcional
interface ParametroConDetalles extends ParametroRequerido {
    _count?: {
        funciones?: number;
    };
}

// Tipo para el formulario del modal
type ParametroFormData = Partial<Pick<ParametroRequerido, 'nombreVisible' | 'tipoDato' | 'descripcion'>> & {
    nombreInterno?: string;
};

// Opciones para el tipo de dato (se mantiene para el modal)
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

// --- Mapeo de Tipos a Iconos ---
const tipoDatoIconMap: { [key: string]: React.ReactElement } = {
    texto: <span title="Texto Corto"><Type size={12} className="text-sky-400 mx-auto" /></span>,
    texto_largo: <span title="Texto Largo"><Type size={12} className="text-sky-500 mx-auto" /></span>,
    numero: <span title="Número"><Hash size={12} className="text-emerald-400 mx-auto" /></span>,
    fecha: <span title="Fecha"><Calendar size={12} className="text-amber-400 mx-auto" /></span>,
    fecha_hora: <span title="Fecha y Hora"><Clock size={12} className="text-amber-500 mx-auto" /></span>,
    booleano: <span title="Sí/No"><ToggleRight size={12} className="text-rose-400 mx-auto" /></span>,
    email: <span title="Email"><Mail size={12} className="text-indigo-400 mx-auto" /></span>,
    telefono: <span title="Teléfono"><Phone size={12} className="text-lime-400 mx-auto" /></span>,
    url: <span title="URL"><LinkIcon size={12} className="text-cyan-400 mx-auto" /></span>,
};

const getTipoDatoDisplay = (tipo: string): React.ReactElement => {
    return tipoDatoIconMap[tipo] || <span title={tipo}>?</span>; // Fallback
};


// --- Helper para generar nombre interno ---
const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
};

// --- Componente Sortable Table Row (Minimalista) ---
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

    // Clases reutilizables
    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle"; // align-middle ahora

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('button[data-dnd-handle="true"]')) return;
        onEdit();
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500' : ''}`}
            onClick={handleRowClickInternal}
        >
            {/* Celda Handle DnD */}
            <td className={`${tdClasses} text-center w-10`}>
                <button
                    {...attributes} {...listeners} data-dnd-handle="true"
                    className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </button>
            </td>
            {/* Celda Nombre Interno (ID) */}
            <td className={`${tdClasses} font-mono text-zinc-300`}>
                {parametro.nombreInterno}
            </td>
            {/* Celda Tipo Dato (Icono) */}
            <td className={`${tdClasses} text-center w-12`}>
                {getTipoDatoDisplay(parametro.tipoDato)}
            </td>
            {/* Celda Uso (Funciones) */}
            <td className={`${tdClasses} text-center text-zinc-400 w-16`}>
                {parametro._count?.funciones ?? 0}
            </td>
            {/* Celda Acciones (Implícita en click) */}
        </tr>
    );
}


// --- Componente Principal ---
export default function ParametrosRequeridosGestion() {
    const [parametros, setParametros] = useState<ParametroConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [parametroParaEditar, setParametroParaEditar] = useState<ParametroConDetalles | null>(null);
    const [modalFormData, setModalFormData] = useState<ParametroFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const tableContainerClasses = "flex-grow overflow-auto -mx-4 -mb-4";
    const buttonPrimaryClasses = "bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const selectBaseClasses = inputBaseClasses;
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

    // --- Carga de datos ---
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

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', parametro?: ParametroConDetalles) => {
        setModalMode(mode);
        setParametroParaEditar(mode === 'edit' ? parametro || null : null);
        setModalFormData(mode === 'edit' && parametro ?
            { nombreVisible: parametro.nombreVisible, tipoDato: parametro.tipoDato, descripcion: parametro.descripcion } :
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
        setModalError(null);
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
            const dataToSend = {
                nombreVisible: modalFormData.nombreVisible.trim(),
                tipoDato: modalFormData.tipoDato,
                descripcion: modalFormData.descripcion?.trim() || null,
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
                setIsSubmittingModal(false);
            }
        }
    };

    // --- DnD Handlers ---
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
                if (!result.success) {
                    setError(result.error || "Error al guardar orden.");
                    await fetchData();
                }
            } catch (err) {
                setError(`Error: ${err instanceof Error ? err.message : 'Error'}. Recargando...`);
                await fetchData();
            } finally { setIsSavingOrder(false); }
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Variable size={16} /> Parámetros Globales
                </h3>
                <div className='flex items-center gap-2'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo parámetro estándar">
                        <PlusIcon size={14} /> <span>Crear Parámetro</span>
                    </button>
                </div>
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}

            {/* Contenido Principal: Tabla Sortable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableContainerClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                    ) : (
                        <table className="min-w-full divide-y divide-zinc-700 border-t border-zinc-700">
                            <thead className="bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    {/* --- Cabeceras Actualizadas --- */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10"></th>{/* Handle */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID Interno</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">Tipo</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-16">Uso</th>
                                </tr>
                            </thead>
                            <SortableContext items={parametros.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700">
                                    {parametros.length === 0 && !error ? (
                                        <tr>
                                            {/* --- Colspan Actualizado --- */}
                                            <td colSpan={4} className="text-center py-10 text-sm text-zinc-500 italic">
                                                <ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                                No hay parámetros estándar definidos.
                                            </td>
                                        </tr>
                                    ) : (
                                        parametros.map((param) => (
                                            // --- Renderiza la fila minimalista ---
                                            <SortableParametroRow key={param.id} id={param.id} parametro={param} onEdit={() => openModal('edit', param)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && parametros.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-3 px-4 pb-2 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-1' /> para reordenar.</p>
                    )}
                </div>
            </DndContext>

            {/* Modal (sin cambios internos, pero los campos Nombre Visible y Descripción siguen siendo relevantes aquí) */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Parámetro' : 'Editar Parámetro'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombreVisible" name="nombreVisible" value={modalFormData.nombreVisible || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Correo Cliente" />
                                </div>
                                {modalMode === 'create' && (
                                    <div>
                                        <label htmlFor="modal-nombreInterno" className={labelBaseClasses}>Nombre Interno (ID Generado)</label>
                                        <input type="text" id="modal-nombreInterno" name="nombreInterno" value={modalFormData.nombreInterno || ''} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed`} />
                                        <p className="text-xs text-zinc-500 mt-1">Se genera del Nombre Visible.</p>
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="modal-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select id="modal-tipoDato" name="tipoDato" value={modalFormData.tipoDato || 'texto'} onChange={handleModalFormChange} className={selectBaseClasses} required disabled={isSubmittingModal}>
                                        {TIPOS_DATO_PARAMETRO.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} maxLength={250} placeholder="Describe qué información representa..." />
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (
                                    <button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-700 hover:bg-red-800 focus:ring-red-600 px-3 py-1.5 mr-auto disabled:bg-red-900/50 disabled:cursor-not-allowed`} disabled={isSubmittingModal || (parametroParaEditar?._count?.funciones ?? 0) > 0} title={(parametroParaEditar?._count?.funciones ?? 0) > 0 ? `No se puede eliminar: ${parametroParaEditar?._count?.funciones} func.` : 'Eliminar'}>
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 min-w-[100px]`} disabled={isSubmittingModal || !modalFormData.nombreVisible?.trim() || !modalFormData.tipoDato}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
