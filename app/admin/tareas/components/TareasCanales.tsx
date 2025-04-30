'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerCanalesConversacionales,
    crearCanalConversacional,
    editarCanalConversacional,
    eliminarCanalConversacional,
    ordenarCanalesConversacionales // Importar acción de ordenar
} from '@/app/admin/_lib/canalConversacional.actions';
import { CanalConversacional } from '@/app/admin/_lib/types';
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Radio, GripVertical } from 'lucide-react'; // Iconos

// Imports de dnd-kit
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

// Interfaz extendida para el estado local
interface CanalConOrden extends CanalConversacional {
    orden: number; // Hacer orden no opcional
}

// Tipo para el formulario modal
type CanalFormData = Partial<Pick<CanalConversacional, 'nombre' | 'descripcion' | 'icono' | 'status'>>;

// --- Componente Interno para Item Arrastrable ---
function SortableCanalItem({ canal, onEditClick }: { canal: CanalConOrden, onEditClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: canal.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };
    const listItemClasses = `flex items-center gap-3 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    // **NUEVO: Clase para el punto de status**
    const statusDotClasses = "w-2.5 h-2.5 rounded-full flex-shrink-0";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover canal"><GripVertical size={18} /></button>
            {/* **NUEVO: Indicador de Status** */}
            <span
                className={`${statusDotClasses} ${canal.status === 'activo' ? 'bg-green-500' : 'bg-zinc-500'}`}
                title={`Status: ${canal.status === 'activo' ? 'Activo' : 'Inactivo'}`}
            ></span>
            {/* Icono (si existe) */}
            {/* <MessageCircle size={18} className="text-zinc-500 flex-shrink-0" /> */}
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-medium text-zinc-100 truncate" title={canal.nombre}>{canal.nombre}</p>
                {canal.descripcion && <p className="text-xs text-zinc-400 line-clamp-1" title={canal.descripcion}>{canal.descripcion}</p>}
            </div>
            <button onClick={onEditClick} className={buttonEditClasses} title="Editar Canal"><PencilIcon size={16} /></button>
        </li>
    );
}


// --- Componente Principal ---
export default function TareasCanales() {
    const [canales, setCanales] = useState<CanalConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false); // Estado para guardado de orden
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [canalParaEditar, setCanalParaEditar] = useState<CanalConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<CanalFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1"; // Quitado space-y-2
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
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
    const fetchCanales = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerCanalesConversacionales(); // Ya viene ordenado por 'orden'
            setCanales((data || []).map((c, index) => ({ ...c, orden: c.orden ?? index + 1 })));
        } catch (err) {
            console.error("Error al obtener los canales:", err);
            setError("No se pudieron cargar los canales.");
            setCanales([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCanales(true);
    }, [fetchCanales]);

    // --- Manejadores Modal (Sin cambios funcionales mayores) ---
    const openModal = (mode: 'create' | 'edit', canal?: CanalConOrden) => { /* ... (sin cambios) ... */
        setModalMode(mode);
        setCanalParaEditar(mode === 'edit' ? canal || null : null);
        setModalFormData(mode === 'edit' && canal ?
            { nombre: canal.nombre, descripcion: canal.descripcion, icono: canal.icono, status: canal.status } :
            { nombre: '', descripcion: '', icono: '', status: 'activo' }
        );
        setIsModalOpen(true);
        setModalError(null);
    };
    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setCanalParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { /* ... (sin cambios) ... */
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => { /* ... (sin cambios) ... */
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);
        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                descripcion: modalFormData.descripcion?.trim() || null,
                icono: modalFormData.icono?.trim() || null,
                status: modalFormData.status || 'activo',
            };
            if (modalMode === 'create') {
                result = await crearCanalConversacional(dataToSend as CanalConversacional);
            } else if (modalMode === 'edit' && canalParaEditar?.id) {
                result = await editarCanalConversacional(canalParaEditar.id, dataToSend);
            } else { throw new Error("Modo inválido o ID faltante."); }
            if (result?.success) { await fetchCanales(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }
        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} canal:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };
    const handleModalDelete = async () => { /* ... (sin cambios) ... */
        if (!canalParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el canal "${canalParaEditar.nombre}"? Asegúrate de que ninguna tarea lo esté utilizando.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCanalConversacional(canalParaEditar.id);
                if (result?.success) { await fetchCanales(); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                console.error("Error eliminando canal:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- **NUEVO: Manejador Drag End** ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = canales.findIndex((c) => c.id === active.id);
            const newIndex = canales.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(canales, oldIndex, newIndex);
            const finalOrder = reordered.map((c, index) => ({ ...c, orden: index + 1 }));

            setCanales(finalOrder); // Optimista

            const ordenData = finalOrder.map(({ id, orden }) => ({ id, orden }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarCanalesConversacionales(ordenData); // Llamar a la nueva acción
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchCanales(); // Revertir
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [canales, fetchCanales]);


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Radio size={16} /> Canales Conversacionales
                </h3>
                <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo canal">
                    <PlusIcon size={14} /> <span>Crear Canal</span>
                </button>
            </div>

            {/* Errores y Guardado Orden */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}
            {isSavingOrder && <div className="mb-2 flex items-center justify-center text-xs text-blue-300"><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...</div>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando canales...</span></div>
                ) : canales.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay canales definidos.</p></div>
                ) : (
                    // **NUEVO: Envolver lista con DndContext y SortableContext**
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={canales.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <ul className='space-y-0'> {/* Quitado space-y-2 */}
                                {canales.map((canal) => (
                                    <SortableCanalItem
                                        key={canal.id}
                                        canal={canal}
                                        onEditClick={() => openModal('edit', canal)}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Modal (Sin cambios funcionales mayores, pero ajustado para status) */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nuevo Canal' : 'Editar Canal'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Canal <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} placeholder="Ej: WhatsApp, Web Chat" />
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={2} maxLength={200} />
                                </div>
                                <div>
                                    <label htmlFor="modal-icono" className={labelBaseClasses}>Icono (Nombre/Clase)</label>
                                    <input type="text" id="modal-icono" name="icono" value={modalFormData.icono || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={50} placeholder="Ej: 'whatsapp', 'message-circle'" />
                                    <p className="text-xs text-zinc-500 mt-1">Opcional. Nombre del icono (ej: de Lucide) o clase CSS.</p>
                                </div>
                                <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="beta">Beta</option>
                                    </select>
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
