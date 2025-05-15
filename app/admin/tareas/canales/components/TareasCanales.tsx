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

// Mantener las importaciones de actions originales
import {
    obtenerCanalesConversacionales,
    crearCanalConversacional,
    editarCanalConversacional,
    eliminarCanalConversacional,
    ordenarCanalesConversacionales
} from '@/app/admin/_lib/canalConversacional.actions';

// --- IMPORTACIONES DE TIPOS ---
import {
    CanalConDetalles, // Para el estado local y la UI
    CanalFormData,    // Para el estado del formulario del modal
    CanalModalSubmitData // Para enviar datos a las actions
} from '@/app/admin/_lib/canalConversacional.type';
import { CanalConversacional as CanalConversacionalBasePrisma } from '@/app/admin/_lib/types';


import {
    Loader2,
    ListChecks,
    PlusIcon,
    Trash2,
    Save,
    XIcon,
    Radio,
    GripVertical,
    MessageSquareText,
    InfoIcon,
    AlertTriangleIcon // Para errores en modal
} from 'lucide-react';

// --- Componente Sortable Table Row (Ajustado según Guía de Estilos) ---
function SortableCanalRow({ id, canal, onEdit }: { id: string; canal: CanalConDetalles; onEdit: () => void }) {
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
    const statusDotClasses = "w-2.5 h-2.5 rounded-full inline-block";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };

    const getCanalIcon = (iconName?: string | null) => {
        // Esta función es solo un placeholder, puedes expandirla con tus propios iconos o lógica
        if (iconName?.toLowerCase().includes('whatsapp')) {
            return <span title="WhatsApp"><MessageSquareText size={14} className="text-green-400 flex-shrink-0" /></span>;
        }
        if (iconName) { // Si hay un nombre de icono, intenta mostrarlo
            return <span className="text-xs font-mono text-zinc-500" title={iconName}>{iconName.substring(0, 3)}</span>; // Muestra primeras 3 letras como placeholder
        }
        return (
            <span title="Canal genérico">
                <MessageSquareText size={14} className="text-zinc-500 flex-shrink-0" />
            </span>
        );
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
            <td className={`${tdBaseClasses} text-center w-12`}>
                <span
                    className={`${statusDotClasses} ${canal.status === 'activo' ? 'bg-green-500' : canal.status === 'beta' ? 'bg-amber-500' : 'bg-zinc-600'}`}
                    title={`Status: ${canal.status}`}
                ></span>
            </td>
            <td className={`${tdBaseClasses} text-zinc-100 font-medium`}>
                <div className="flex items-center gap-2">
                    {getCanalIcon(canal.icono)}
                    <span>{canal.nombre}</span>
                </div>
            </td>
            <td className={`${tdBaseClasses} text-zinc-400 max-w-sm`}>
                {canal.descripcion ? (
                    <div className="flex items-center gap-1">
                        <span title="Descripción">
                            <InfoIcon size={12} className="text-zinc-500 flex-shrink-0" />
                        </span>
                        <span className="line-clamp-1" title={canal.descripcion}>
                            {canal.descripcion}
                        </span>
                    </div>
                ) : (
                    <span className="text-zinc-600 italic">N/A</span>
                )}
            </td>
            <td className={`${tdBaseClasses} text-center text-zinc-300 w-20`}>
                {canal._count?.tareasSoportadas ?? 0}
            </td>
        </tr>
    );
}

export default function TareasCanales() {
    const [canales, setCanales] = useState<CanalConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [canalParaEditar, setCanalParaEditar] = useState<CanalConDetalles | null>(null);
    const [modalFormData, setModalFormData] = useState<CanalFormData>({}); // Usa el tipo del .type.ts
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind según la Guía de Estilos
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full"; // Asumiendo que el layout padre da padding
    const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3 px-4 pt-4"; // Padding si containerClasses no lo tiene
    const headerTitleClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50";
    const errorAlertClasses = "mb-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 mx-4 flex items-center gap-2";
    const tableWrapperClasses = "flex-grow overflow-auto"; // Para scroll de la tabla

    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]"; // Ajustado max-h para más espacio
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";

    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;

    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );


    // --- Carga de datos ---
    const fetchCanales = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            // Asegúrate que obtenerCanalesConversacionales devuelva el conteo si lo necesitas
            const data = await obtenerCanalesConversacionales();
            setCanales((data || []).map((c, index) => ({ ...c, orden: c.orden ?? index + 1 })));
        } catch (err) {
            console.error("Error al obtener canales:", err);
            setError("No se pudieron cargar los canales.");
            setCanales([]);
        } finally { if (isInitialLoad) setLoading(false); }
    }, []);

    useEffect(() => { fetchCanales(true); }, [fetchCanales]);

    // Lógica de openModal y closeModal (mantenida de tu original)
    const openModal = (modeToSet: 'create' | 'edit', canal?: CanalConDetalles) => {
        setModalMode(modeToSet);
        setCanalParaEditar(modeToSet === 'edit' ? canal || null : null);
        // Llenar el formulario con datos existentes si es edición
        setModalFormData(modeToSet === 'edit' && canal ?
            { id: canal.id, nombre: canal.nombre, descripcion: canal.descripcion || '', icono: canal.icono || '', status: canal.status } :
            { nombre: '', descripcion: '', icono: '', status: 'activo' } // Defaults para creación
        );
        setIsModalOpen(true);
        setModalError(null); // Limpiar errores previos al abrir
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null);
            setCanalParaEditar(null);
            setModalFormData({});
            setModalError(null);
            setIsSubmittingModal(false);
        }, 300);
    };

    // Lógica de handleModalFormChange (mantenida de tu original)
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
    };

    // Lógica de handleModalFormSubmit (mantenida de tu original, adaptada para CanalModalSubmitData)
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) {
            setModalError("El nombre del canal es obligatorio.");
            return;
        }
        setIsSubmittingModal(true);
        setModalError(null);
        try {
            let result;
            // Preparar datos para enviar a la action
            const dataToSend: CanalModalSubmitData = {
                nombre: modalFormData.nombre.trim(),
                // Solo incluir campos opcionales si tienen valor o son explícitamente null
                descripcion: modalFormData.descripcion?.trim() || null,
                icono: modalFormData.icono?.trim() || null,
                status: modalFormData.status || 'activo',
            };

            if (modalMode === 'create') {
                // La action original espera Pick<CanalConversacional, 'nombre' | 'descripcion' | 'icono' | 'status'>
                // CanalModalSubmitData es compatible con esto.
                result = await crearCanalConversacional(dataToSend as Pick<CanalConversacionalBasePrisma, 'nombre' | 'descripcion' | 'icono' | 'status'>);
            } else if (modalMode === 'edit' && canalParaEditar?.id) {
                // La action original espera Partial<Pick<CanalConversacional, 'nombre' | 'descripcion' | 'icono' | 'status'>>
                // dataToSend es compatible con esto.
                result = await editarCanalConversacional(canalParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo de modal inválido o ID de canal faltante.");
            }

            if (result?.success) {
                await fetchCanales();
                closeModal();
            } else {
                throw new Error(result?.error || "Ocurrió un error desconocido al guardar el canal.");
            }
        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} canal:`, err);
            setModalError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    // Lógica de handleModalDelete (mantenida de tu original, adaptada para _count opcional)
    const handleModalDelete = async () => {
        if (!canalParaEditar?.id || !canalParaEditar.nombre) return;

        // Chequeo de uso antes de confirmar (usando _count si está disponible)
        const tareasCount = canalParaEditar._count?.tareasSoportadas ?? 0;
        // const asistentesCount = canalParaEditar._count?.AsistenteVirtual ?? 0; // Descomentar si la action devuelve este conteo

        if (tareasCount > 0 /*|| asistentesCount > 0*/) {
            let errorMsg = "No se puede eliminar: Usado por";
            if (tareasCount > 0) errorMsg += ` ${tareasCount} tarea(s)`;
            // if (asistentesCount > 0) errorMsg += `${tareasCount > 0 ? ' y' : ''} ${asistentesCount} asistente(s)`;
            setModalError(`${errorMsg.trim()}.`);
            return;
        }

        if (confirm(`¿Estás seguro de que quieres eliminar el canal "${canalParaEditar.nombre}"? Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true);
            setModalError(null);
            try {
                const result = await eliminarCanalConversacional(canalParaEditar.id);
                if (result?.success) {
                    await fetchCanales();
                    closeModal();
                } else {
                    throw new Error(result?.error || "Error al eliminar el canal.");
                }
            } catch (err) {
                console.error("Error eliminando canal:", err);
                setModalError(err instanceof Error ? err.message : "Error al eliminar.");
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    // Lógica de handleDragEnd (mantenida de tu original)
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = canales.findIndex((c) => c.id === active.id);
            const newIndex = canales.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedCanales = arrayMove(canales, oldIndex, newIndex);
            setCanales(reorderedCanales);

            const ordenData = reorderedCanales.map((canal, index) => ({ id: canal.id, orden: index }));

            setIsSavingOrder(true);
            setError(null);
            try {
                const result = await ordenarCanalesConversacionales(ordenData);
                if (!result.success) {
                    throw new Error(result.error || "Error al guardar el orden en el servidor.");
                }
                // Opcional: recargar para consistencia total, aunque ya hay optimistic update.
                // await fetchCanales(); 
            } catch (saveError) {
                console.error('Error al guardar orden:', saveError);
                setError(saveError instanceof Error ? saveError.message : 'Error al guardar el nuevo orden.');
                await fetchCanales(); // Revertir en caso de error
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [canales, fetchCanales]);

    return (
        <div className={containerClasses}>
            <div className={headerSectionClasses}>
                <h2 className={headerTitleClasses}>
                    <Radio size={20} />
                    Canales de Conversación
                </h2>
                <div className='flex items-center gap-3'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button
                        onClick={() => openModal('create')}
                        className={buttonPrimaryClasses}
                        title="Crear nuevo canal de conversación"
                    >
                        <PlusIcon size={16} />
                        <span>Crear Canal</span>
                    </button>
                </div>
            </div>

            {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} className="text-red-400" /> {error}</p>}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableWrapperClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando canales...</span></div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-700">
                                <tr>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Reordenar"></th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-12">Status</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Tareas</th>
                                </tr>
                            </thead>
                            <SortableContext items={canales.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700">
                                    {canales.length === 0 && !error ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-10 text-sm text-zinc-500 italic">
                                                <ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                                No hay canales de conversación definidos.
                                            </td>
                                        </tr>
                                    ) : (
                                        canales.map((canal) => (
                                            <SortableCanalRow key={canal.id} id={canal.id} canal={canal} onEdit={() => openModal('edit', canal)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && canales.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-4 mb-2 italic px-4">
                            Haz clic en una fila para editar o arrastra <GripVertical size={12} className='inline align-text-bottom -mt-0.5 mx-0.5' /> para reordenar los canales.
                        </p>
                    )}
                </div>
            </DndContext>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>
                                {modalMode === 'create' ? 'Crear Nuevo Canal' : 'Editar Canal'}
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
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>
                                        Nombre del Canal <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" id="modal-nombre" name="nombre"
                                        value={modalFormData.nombre || ''} onChange={handleModalFormChange}
                                        className={inputBaseClasses} required disabled={isSubmittingModal}
                                        maxLength={50} placeholder="Ej: WhatsApp Oficial"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                    <textarea
                                        id="modal-descripcion" name="descripcion"
                                        value={modalFormData.descripcion || ''} onChange={handleModalFormChange}
                                        className={textareaBaseClasses} disabled={isSubmittingModal}
                                        rows={3} maxLength={200}
                                        placeholder="Breve descripción del propósito del canal"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="modal-icono" className={labelBaseClasses}>Nombre del Icono (Opcional)</label>
                                    <input
                                        type="text" id="modal-icono" name="icono"
                                        value={modalFormData.icono || ''} onChange={handleModalFormChange}
                                        className={inputBaseClasses} disabled={isSubmittingModal}
                                        maxLength={50} placeholder="Ej: 'whatsapp', 'webchat' (para UI)"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Referencia para mostrar un icono en la UI (ej. nombre de icono de Lucide).</p>
                                </div>
                                <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Estado</label>
                                    <select
                                        id="modal-status" name="status"
                                        value={modalFormData.status || 'activo'} onChange={handleModalFormChange}
                                        className={selectBaseClasses} disabled={isSubmittingModal}
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="beta">Beta (En pruebas)</option>
                                    </select>
                                </div>
                                {modalMode === 'edit' && canalParaEditar?.id && (
                                    <div>
                                        <label htmlFor="modal-id" className={labelBaseClasses}>ID del Canal (Solo lectura)</label>
                                        <input
                                            type="text" id="modal-id" name="id"
                                            value={canalParaEditar.id} readOnly
                                            className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (
                                    <button
                                        type="button" onClick={handleModalDelete}
                                        className={buttonModalDanger}
                                        disabled={isSubmittingModal || (canalParaEditar?._count?.tareasSoportadas ?? 0) > 0 /*|| (canalParaEditar?._count?.AsistenteVirtual ?? 0) > 0*/}
                                        title={
                                            (canalParaEditar?._count?.tareasSoportadas ?? 0) > 0 /*|| (canalParaEditar?._count?.AsistenteVirtual ?? 0) > 0*/
                                                ? `No se puede eliminar: Usado por tareas o asistentes.`
                                                : 'Eliminar Canal'
                                        }
                                    >
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={buttonModalSecondary} disabled={isSubmittingModal}>Cancelar</button>
                                <button
                                    type="submit" className={buttonModalPrimary}
                                    disabled={isSubmittingModal || !modalFormData.nombre?.trim()}
                                >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear Canal' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
