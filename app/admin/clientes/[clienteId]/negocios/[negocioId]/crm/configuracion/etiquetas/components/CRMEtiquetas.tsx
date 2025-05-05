// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/etiquetas/components/CRMEtiquetas.tsx
'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerEtiquetasCRM, // <-- Acción refactorizada
    crearEtiquetaCRM,
    editarEtiquetaCRM,
    eliminarEtiquetaCRM,
    ordenarEtiquetasCRM
} from '@/app/admin/_lib/crmEtiqueta.actions'; // Ajusta ruta!
import { EtiquetaCRM } from '@/app/admin/_lib/types'; // Ajusta ruta!
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, Tags, Palette } from 'lucide-react'; // Iconos

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

interface Props {
    negocioId: string;
}

// Interfaz extendida para el estado local
interface EtiquetaCRMConOrden extends EtiquetaCRM {
    orden: number; // Hacer orden no opcional
}

// Tipo para el formulario modal
type EtiquetaFormData = Partial<Pick<EtiquetaCRM, 'nombre' | 'color' | 'status'>>;

// --- Componente Interno para Item Arrastrable (sin cambios) ---
function SortableTagItem({ etiqueta, onEditClick }: { etiqueta: EtiquetaCRMConOrden, onEditClick: (et: EtiquetaCRMConOrden) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: etiqueta.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    const listItemClasses = `flex items-center gap-2 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const colorDotClasses = "w-3 h-3 rounded-full border border-zinc-500 flex-shrink-0";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover etiqueta"><GripVertical size={18} /></button>
            <span className={colorDotClasses} style={{ backgroundColor: etiqueta.color || 'transparent' }} title={`Color: ${etiqueta.color || 'Ninguno'}`}></span>
            <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={etiqueta.nombre}>{etiqueta.nombre}</span>
            <button onClick={() => onEditClick(etiqueta)} className={buttonEditClasses} title="Editar Etiqueta"><PencilIcon size={16} /></button>
        </li>
    );
}

// --- Componente Principal ---
export default function CRMEtiquetas({ negocioId }: Props) {
    const [etiquetas, setEtiquetas] = useState<EtiquetaCRMConOrden[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null); // <-- Estado para crmId
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<EtiquetaCRMConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<EtiquetaFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios)
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const colorInputClasses = `${inputBaseClasses} h-10 p-1 cursor-pointer`;

    // Sensores dnd-kit (sin cambios)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Carga de datos (Modificada) ---
    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) {
            setError("ID de negocio no disponible.");
            setLoading(false);
            return;
        }
        if (isInitialLoad) setLoading(true);
        setError(null);
        setCrmId(null); // Resetear
        setEtiquetas([]); // Limpiar

        try {
            // Llamar a la acción refactorizada
            const result = await obtenerEtiquetasCRM(negocioId);

            if (result.success && result.data) {
                // Almacenar crmId y etiquetas
                setCrmId(result.data.crmId);
                setEtiquetas((result.data.etiquetas || []).map((et, index) => ({ ...et, orden: et.orden ?? index + 1 })));
                if (!result.data.crmId) {
                    setError("CRM no encontrado para este negocio. Debe configurarse primero.");
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar etiquetas.");
            }
        } catch (err) {
            console.error("Error al obtener las etiquetas:", err);
            setError(`No se pudieron cargar las etiquetas: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setEtiquetas([]);
            setCrmId(null);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchEtiquetas(true);
    }, [fetchEtiquetas]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', etiqueta?: EtiquetaCRMConOrden) => {
        // Solo permitir crear si tenemos crmId
        if (mode === 'create' && !crmId) {
            setError("No se puede crear una etiqueta sin un CRM configurado.");
            return;
        }
        setModalMode(mode);
        setEtiquetaParaEditar(mode === 'edit' ? etiqueta || null : null);
        setModalFormData(mode === 'edit' && etiqueta ?
            { nombre: etiqueta.nombre, color: etiqueta.color, status: etiqueta.status } :
            { nombre: '', color: '#ffffff', status: 'activo' } // Color por defecto blanco
        );
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setEtiquetaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                color: modalFormData.color || null, // Enviar null si no hay color
                status: modalFormData.status || 'activo',
            };

            if (modalMode === 'create') {
                if (!crmId) throw new Error("crmId no está disponible para crear la etiqueta."); // Verificación extra
                // Pasar crmId del estado
                result = await crearEtiquetaCRM({ crmId: crmId, nombre: dataToSend.nombre, color: dataToSend.color });
            } else if (modalMode === 'edit' && etiquetaParaEditar?.id) {
                // Editar usa el ID de la etiqueta
                result = await editarEtiquetaCRM(etiquetaParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchEtiquetas(); // Recargar lista
                closeModal();
            } else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} etiqueta:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmittingModal(false); // Asegurar que se desactive
        }
    };

    const handleModalDelete = async () => {
        if (!etiquetaParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar la etiqueta "${etiquetaParaEditar.nombre}"? Se quitará de todos los Leads asociados.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarEtiquetaCRM(etiquetaParaEditar.id);
                if (result?.success) { await fetchEtiquetas(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando etiqueta:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Manejador Drag End (sin cambios) ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = etiquetas.findIndex((et) => et.id === active.id);
            const newIndex = etiquetas.findIndex((et) => et.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedEtiquetas = arrayMove(etiquetas, oldIndex, newIndex);
            const finalEtiquetas = reorderedEtiquetas.map((et, index) => ({ ...et, orden: index + 1 }));

            setEtiquetas(finalEtiquetas); // Optimista

            const ordenData = finalEtiquetas.map(({ id, orden }) => ({ id, orden }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarEtiquetasCRM(ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchEtiquetas(); // Revertir
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [etiquetas, fetchEtiquetas]);

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Tags size={16} /> Etiquetas CRM
                </h3>
                <button
                    onClick={() => openModal('create')}
                    className={buttonPrimaryClasses}
                    title={!crmId ? "Configura el CRM primero" : "Crear nueva etiqueta"}
                    disabled={!crmId || loading} // Deshabilitar si no hay crmId o cargando
                >
                    <PlusIcon size={14} /> <span>Crear Etiqueta</span>
                </button>
            </div>

            {/* Errores y Guardado Orden */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}
            {isSavingOrder && <div className="mb-2 flex items-center justify-center text-xs text-blue-300"><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...</div>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando etiquetas...</span></div>
                ) : etiquetas.length === 0 && !error && crmId ? ( // Mostrar solo si hay crmId pero no etiquetas
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay etiquetas definidas.</p></div>
                ) : !crmId && !loading && !error ? ( // Mensaje si no hay CRM
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>El CRM no está configurado.</p></div>
                ) : etiquetas.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={etiquetas.map(et => et.id)} strategy={verticalListSortingStrategy}>
                            <ul className='space-y-0'> {/* Quitar space-y para que bordes colapsen */}
                                {etiquetas.map((etiqueta) => (
                                    <SortableTagItem key={etiqueta.id} etiqueta={etiqueta} onEditClick={(et) => openModal('edit', et)} />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                ) : null /* No mostrar nada si hay error */}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nueva Etiqueta' : 'Editar Etiqueta'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div className="flex items-end gap-3">
                                    <div className="flex-grow">
                                        <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Etiqueta <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-color" className={`${labelBaseClasses} text-center`}><Palette size={14} className="inline mr-1" /> Color</label>
                                        <input type="color" id="modal-color" name="color" value={modalFormData.color || '#ffffff'} onChange={handleModalFormChange} className={colorInputClasses} disabled={isSubmittingModal} />
                                    </div>
                                </div>
                                {/* Opcional: Editar status si se añade a la acción editar */}
                                {/* <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div> */}
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
