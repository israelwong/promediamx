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

// --- ACCIONES ---
import {
    obtenerCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    actualizarOrdenCategorias
} from '@/app/admin/_lib/actions/categoriaTarea/categoriaTarea.actions'; // Ajusta la ruta si es necesario

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    CategoriaTareaInputSchema,   // El esquema Zod para validación del formulario
    type CategoriaTareaInput,    // Tipo inferido para los datos del formulario
    type CategoriaConOrden,      // Para el estado local y la UI
    type CategoriaFormData       // Para el estado del formulario del modal
} from '@/app/admin/_lib/actions/categoriaTarea/categoriaTarea.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { CategoriaTarea as CategoriaTareaPrisma } from '@prisma/client';


// --- ICONOS ---
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, GripVertical, ListTree, AlertTriangleIcon
} from 'lucide-react';

// --- Componente SortableCategoryRow ---
// (Tu implementación se ve bien, solo asegurar que 'categoria' sea de tipo CategoriaConOrden)
function SortableCategoryRow({ id, categoria, onEdit }: { id: string; categoria: CategoriaConOrden; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined };
    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";
    const colorCircleClasses = "inline-block w-3 h-3 rounded-full mr-2 border border-zinc-500 flex-shrink-0"; // Ajuste de tamaño

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };
    const displayColor = categoria.color || '#71717a'; // zinc-500 como fallback

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500 bg-zinc-700' : ''}`} onClick={handleRowClickInternal}>
            <td className={`${tdClasses} text-center w-10`}><button {...attributes} {...listeners} data-dnd-handle="true" className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Arrastrar para reordenar" onClick={(e) => e.stopPropagation()}><GripVertical size={14} /></button></td>
            <td className={`${tdClasses} font-medium text-zinc-100`}>
                <div className="flex items-center">
                    <span className={colorCircleClasses} style={{ backgroundColor: displayColor }} title={`Color: ${displayColor}`}></span>
                    <span>{categoria.nombre}</span>
                </div>
            </td>
            <td className={`${tdClasses} text-zinc-400 max-w-xs`}><p className="line-clamp-1" title={categoria.descripcion || ''}>{categoria.descripcion || <span className="italic text-zinc-500">N/A</span>}</p></td>
            {/* Añadir columna para conteo de tareas */}
            <td className={`${tdClasses} text-center text-zinc-300 w-20`}>{categoria._count?.Tarea ?? 0}</td>
        </tr>
    );
}


export default function TareasCategorias() {
    const [categorias, setCategorias] = useState<CategoriaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [categoriaParaEditar, setCategoriaParaEditar] = useState<CategoriaConOrden | null>(null);

    const [modalFormData, setModalFormData] = useState<CategoriaFormData>({
        nombre: '',
        descripcion: '',
        color: '#71717a' // Default color (zinc-500)
    });
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof CategoriaTareaInput, string[]>>>({});

    // ... (Clases Tailwind y sensores DnD se mantienen igual que en tu componente TareasCanales.tsx) ...
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full p-4";
    const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3";
    const headerTitleClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50";
    const errorAlertClasses = "mb-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const tableWrapperClasses = "flex-grow overflow-auto border border-zinc-700 bg-zinc-900/30";

    const modalOverlayClasses = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]"; // Ajustado para evitar scroll excesivo
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";

    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950 h-10";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const colorInputWrapperClasses = "flex items-center gap-3";
    const colorInputClasses = "h-10 w-14 cursor-pointer p-0.5 bg-transparent border border-zinc-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";

    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCategorias = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await obtenerCategorias();
            if (result.success && result.data) {
                setCategorias(result.data); // La acción ya mapea a CategoriaConOrden
            } else {
                throw new Error(result.error || "No se pudieron cargar las categorías.");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
            setCategorias([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCategorias(true); }, [fetchCategorias]);

    const openModal = (mode: 'create' | 'edit', categoria?: CategoriaConOrden) => {
        setModalMode(mode);
        setCategoriaParaEditar(mode === 'edit' ? categoria || null : null);
        setModalFormData(mode === 'edit' && categoria ?
            {
                nombre: categoria.nombre,
                descripcion: categoria.descripcion || '',
                color: categoria.color || '#71717a' // Default color
            } :
            { nombre: '', descripcion: '', color: '#71717a' }
        );
        setIsModalOpen(true);
        setModalError(null);
        setModalValidationErrors({});
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null);
            setCategoriaParaEditar(null);
            setModalFormData({ nombre: '', descripcion: '', color: '#71717a' });
            setModalError(null);
            setModalValidationErrors({});
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
        if (Object.keys(modalValidationErrors).length > 0) setModalValidationErrors({});
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setModalError(null);
        setModalValidationErrors({});

        // Construir el objeto para validar con Zod
        const dataToValidate: CategoriaTareaInput = {
            nombre: modalFormData.nombre || '', // Asegurar que sea string
            descripcion: modalFormData.descripcion || null,
            color: modalFormData.color || null, // Puede ser null si el usuario borra el color o no es obligatorio
        };

        const validationResult = CategoriaTareaInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            const flatErrors = validationResult.error.flatten().fieldErrors;
            setModalValidationErrors(flatErrors as Partial<Record<keyof CategoriaTareaInput, string[]>>);
            setModalError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmittingModal(true);
        try {
            let result: ActionResult<CategoriaTareaPrisma>;
            const validatedData = validationResult.data; // Usar los datos validados por Zod

            if (modalMode === 'create') {
                result = await crearCategoria(validatedData);
            } else if (modalMode === 'edit' && categoriaParaEditar?.id) {
                result = await actualizarCategoria(categoriaParaEditar.id, validatedData);
            } else {
                throw new Error("Modo de modal inválido o ID de categoría faltante.");
            }

            if (result.success) {
                await fetchCategorias();
                closeModal();
            } else {
                setModalError(result.error || "Ocurrió un error desconocido.");
                if (result.validationErrors) {
                    setModalValidationErrors(result.validationErrors as Partial<Record<keyof CategoriaTareaInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} categoría:`, err);
            setModalError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!categoriaParaEditar?.id || !categoriaParaEditar.nombre) return;
        const tareasCount = categoriaParaEditar._count?.Tarea ?? 0; // Ajustado al nombre de relación Tarea
        if (tareasCount > 0) {
            setModalError(`No se puede eliminar: Usada por ${tareasCount} tarea(s).`);
            return;
        }
        if (confirm(`¿Seguro que quieres eliminar la categoría "${categoriaParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCategoria(categoriaParaEditar.id);
                if (result.success) {
                    await fetchCategorias(); closeModal();
                } else {
                    setModalError(result.error || "Error al eliminar.");
                }
            } catch (err: unknown) {
                setModalError(err instanceof Error ? err.message : "Error al eliminar.");
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        // ... (tu lógica de handleDragEnd se mantiene, asegurando que usa ActionResult) ...
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = categorias.findIndex((c) => c.id === active.id);
            const newIndex = categorias.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedCategorias = arrayMove(categorias, oldIndex, newIndex);
            setCategorias(reorderedCategorias);

            const ordenData = reorderedCategorias.map((categoria, index) => ({ id: categoria.id, orden: index }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await actualizarOrdenCategorias(ordenData);
                if (!result.success) {
                    throw new Error(result.error || "Error al guardar el orden en el servidor.");
                }
            } catch (saveError: unknown) {
                setError(saveError instanceof Error ? saveError.message : 'Error al guardar el nuevo orden.');
                await fetchCategorias(true);
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [categorias, fetchCategorias]);

    // --- JSX del Componente ---
    return (
        <div className={containerClasses}>
            <div className={headerSectionClasses}>
                <h2 className={headerTitleClasses}><ListTree size={20} /> Categorías de Tareas</h2>
                <div className='flex items-center gap-3'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva categoría"><PlusIcon size={16} /><span>Crear Categoría</span></button>
                </div>
            </div>

            {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} /> {error}</p>}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableWrapperClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando categorías...</span></div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-700">
                                <tr>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Reordenar"></th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Tareas</th>
                                </tr>
                            </thead>
                            <SortableContext items={categorias.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700 bg-zinc-800">
                                    {categorias.length === 0 && !error && !loading ? (
                                        <tr><td colSpan={4} className="text-center py-10 text-sm text-zinc-500 italic"><ListChecks className="h-8 w-8 mx-auto text-zinc-600 mb-2" />No hay categorías definidas.</td></tr>
                                    ) : (
                                        categorias.map((categoria) => (
                                            <SortableCategoryRow key={categoria.id} id={categoria.id} categoria={categoria} onEdit={() => openModal('edit', categoria)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {!loading && categorias.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-4 mb-2 italic px-4">
                            Haz clic en una fila para editar o arrastra <GripVertical size={12} className='inline align-text-bottom -mt-0.5 mx-0.5' /> para reordenar.
                        </p>
                    )}
                </div>
            </DndContext>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>{modalMode === 'create' ? 'Crear Nueva Categoría' : 'Editar Categoría'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && !Object.keys(modalValidationErrors).length && (
                                    <p className="mb-3 text-center text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 text-sm flex items-center gap-2">
                                        <AlertTriangleIcon size={16} className="flex-shrink-0" /> {modalError}
                                    </p>
                                )}
                                <div>
                                    <label htmlFor="modal-categoria-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-categoria-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={`${inputBaseClasses} ${modalValidationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Ventas, Soporte" />
                                    {modalValidationErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.nombre.join(', ')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="modal-categoria-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-categoria-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={`${textareaBaseClasses} ${modalValidationErrors.descripcion ? 'border-red-500' : ''}`} disabled={isSubmittingModal} rows={3} maxLength={255} placeholder="Breve descripción de la categoría" />
                                    {modalValidationErrors.descripcion && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.descripcion.join(', ')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="modal-categoria-color" className={labelBaseClasses}>Color</label>
                                    <div className={colorInputWrapperClasses}>
                                        <input type="color" id="modal-categoria-color" name="color" value={modalFormData.color || '#71717a'} onChange={handleModalFormChange} className={`${colorInputClasses} ${modalValidationErrors.color ? 'border-red-500' : ''}`} disabled={isSubmittingModal} />
                                        <span className="text-sm text-zinc-400 font-mono uppercase">{modalFormData.color || '(Default)'}</span>
                                    </div>
                                    {modalValidationErrors.color && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.color.join(', ')}</p>}
                                    <p className="text-xs text-zinc-500 mt-1">Selecciona un color para la categoría.</p>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={buttonModalDanger} disabled={isSubmittingModal || (categoriaParaEditar?._count?.Tarea ?? 0) > 0} title={(categoriaParaEditar?._count?.Tarea ?? 0) > 0 ? "No se puede eliminar: Usada por tareas." : 'Eliminar Categoría'}><Trash2 size={16} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={buttonModalSecondary} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonModalPrimary} disabled={isSubmittingModal || !modalFormData.nombre?.trim()} >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear Categoría' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}