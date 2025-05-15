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
    obtenerEtiquetasTarea,
    crearEtiquetaTarea,
    editarEtiquetaTarea,
    eliminarEtiquetaTarea,
    ordenarEtiquetasTarea // Acción para ordenar
} from '@/app/admin/_lib/etiquetaTareas.actions'; // Ajusta la ruta
import { EtiquetaTarea } from '@/app/admin/_lib/types'; // Importar tipo
import { Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, GripVertical, Tags } from 'lucide-react'; // Iconos

// Interfaz extendida para el estado local
interface EtiquetaConOrden extends EtiquetaTarea {
    orden: number; // Hacer orden no opcional
    _count?: { // Opcional: Añadir conteo de tareas si se necesita
        tareas?: number;
    };
}

// Tipo para el formulario modal
type EtiquetaFormData = Partial<Pick<EtiquetaTarea, 'nombre' | 'descripcion'>>;

// --- Componente Sortable Table Row (Estilo Minimalista) ---
function SortableEtiquetaRow({ id, etiqueta, onEdit }: { id: string; etiqueta: EtiquetaConOrden; onEdit: () => void }) {
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
    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";

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
            {/* Celda Nombre Etiqueta */}
            <td className={`${tdClasses} font-medium text-zinc-100`}>
                {etiqueta.nombre}
            </td>
            {/* Celda Descripción (Truncada) */}
            <td className={`${tdClasses} text-zinc-400 max-w-xs`}>
                <p className="line-clamp-1" title={etiqueta.descripcion || ''}>
                    {etiqueta.descripcion || <span className="italic text-zinc-500">N/A</span>}
                </p>
            </td>
            {/* Celda Uso (Tareas) - Opcional */}
            {/* <td className={`${tdClasses} text-center text-zinc-400 w-16`}>
                {etiqueta._count?.tareas ?? 0}
            </td> */}
            {/* Celda Acciones (Implícita en click) */}
        </tr>
    );
}


// --- Componente Principal ---
export default function TareasEtiquetas() {
    const [etiquetas, setEtiquetas] = useState<EtiquetaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<EtiquetaConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<EtiquetaFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const tableContainerClasses = "flex-grow overflow-auto -mx-4 -mb-4"; // Contenedor tabla
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

    // Sensores dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Carga de datos ---
    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            // Asegúrate que obtenerEtiquetasTarea devuelva el conteo si lo necesitas
            const data = await obtenerEtiquetasTarea();
            setEtiquetas((data || []).map((et, index) => ({ ...et, orden: et.orden ?? index }))); // Orden basado en 0
        } catch (err) {
            console.error("Error al obtener etiquetas:", err);
            setError("No se pudieron cargar las etiquetas.");
            setEtiquetas([]);
        } finally { if (isInitialLoad) setLoading(false); }
    }, []);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);

    // --- Manejadores Modal (sin cambios lógicos) ---
    const openModal = (mode: 'create' | 'edit', etiqueta?: EtiquetaConOrden) => {
        setModalMode(mode);
        setEtiquetaParaEditar(mode === 'edit' ? etiqueta || null : null);
        setModalFormData(mode === 'edit' && etiqueta ?
            { nombre: etiqueta.nombre, descripcion: etiqueta.descripcion } :
            { nombre: '', descripcion: '' }
        );
        setIsModalOpen(true); setModalError(null);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setEtiquetaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("Nombre obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);
        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                descripcion: modalFormData.descripcion?.trim() || null,
            };
            if (modalMode === 'create') {
                result = await crearEtiquetaTarea(dataToSend as EtiquetaTarea);
            } else if (modalMode === 'edit' && etiquetaParaEditar?.id) {
                result = await editarEtiquetaTarea(etiquetaParaEditar.id, dataToSend);
            } else { throw new Error("Modo inválido o ID faltante."); }
            if (result?.success) { await fetchEtiquetas(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }
        } catch (err) {
            console.error(`Error al ${modalMode} etiqueta:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };
    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id) return;
        // Añadir chequeo de conteo si se implementa
        // if ((etiquetaParaEditar._count?.tareas ?? 0) > 0) {
        //     setModalError(`No se puede eliminar: ${etiquetaParaEditar._count?.tareas} tarea(s) usan esta etiqueta.`);
        //     return;
        // }
        if (confirm(`¿Eliminar etiqueta "${etiquetaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarEtiquetaTarea(etiquetaParaEditar.id);
                if (result?.success) { await fetchEtiquetas(); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                console.error("Error eliminando:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- DnD Handler ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etiquetas.findIndex((et) => et.id === active.id);
            const newIndex = etiquetas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(etiquetas, oldIndex, newIndex);
            const finalOrder = reordered.map((et, index) => ({ ...et, orden: index })); // Orden basado en 0

            setEtiquetas(finalOrder); // Optimista

            const ordenData = finalOrder.map(({ id, orden }) => ({ id, orden }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarEtiquetasTarea(ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchEtiquetas(); // Revertir
            } finally { setIsSavingOrder(false); }
        }
    }, [etiquetas, fetchEtiquetas]);


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Tags size={16} /> Etiquetas
                </h3>
                <div className='flex items-center gap-2'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva etiqueta">
                        <PlusIcon size={14} /> <span>Crear</span>
                    </button>
                </div>
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Tabla Sortable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableContainerClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                    ) : (
                        <table className="min-w-full divide-y divide-zinc-700 border-t border-zinc-700">
                            <thead className="bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    {/* --- Cabeceras Minimalistas --- */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10"></th>{/* Handle */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre Etiqueta</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Descripción</th>
                                    {/* <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-16">Uso</th> */}
                                </tr>
                            </thead>
                            <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700">
                                    {etiquetas.length === 0 && !error ? (
                                        <tr>
                                            {/* --- Colspan Actualizado --- */}
                                            <td colSpan={3} className="text-center py-10 text-sm text-zinc-500 italic">
                                                <ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                                No hay etiquetas definidas.
                                            </td>
                                        </tr>
                                    ) : (
                                        etiquetas.map((etiqueta) => (
                                            // --- Renderiza la fila minimalista ---
                                            <SortableEtiquetaRow key={etiqueta.id} id={etiqueta.id} etiqueta={etiqueta} onEdit={() => openModal('edit', etiqueta)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && etiquetas.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-3 px-4 pb-2 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-1' /> para reordenar.</p>
                    )}
                </div>
            </DndContext>

            {/* Modal (sin cambios internos) */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Etiqueta' : 'Editar Etiqueta'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} />
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} maxLength={200} />
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
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
