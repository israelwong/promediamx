'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';

// Ajusta rutas según tu estructura
import {
    obtenerNegocioCategorias,
    crearNegocioCategoria,
    actualizarNegocioCategoria,
    eliminarNegocioCategoria,
    actualizarOrdenNegocioCategorias // <-- NUEVA ACCIÓN REQUERIDA
} from '@/app/admin/_lib/negocioCategoria.actions'; // Asegúrate que las acciones estén aquí

import { NegocioCategoria } from '@/app/admin/_lib/types'; // Asegúrate que incluya 'orden'
import { Loader2, ListX, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, LayoutGrid, GripVertical } from 'lucide-react'; // Iconos

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

// Interfaz actualizada para incluir orden
interface NegocioCategoriaConOrden extends NegocioCategoria {
    orden?: number | null; // Campo para reordenamiento
}

// Tipo para el formulario dentro del modal
type CategoriaFormData = Partial<Pick<NegocioCategoria, 'nombre' | 'descripcion'>>;

// --- Componente Interno para la Fila Arrastrable ---
function SortableCategoryItem({ categoria, onEditClick }: { categoria: NegocioCategoriaConOrden, onEditClick: (cat: NegocioCategoriaConOrden) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    // Clases reutilizadas
    const listItemClasses = `flex items-center gap-2 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            {/* Handle para arrastrar */}
            <button
                {...attributes}
                {...listeners}
                data-dndkit-drag-handle
                className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                aria-label="Mover categoría"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={18} />
            </button>
            {/* Contenido de la categoría */}
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate" title={categoria.nombre}>
                    {categoria.nombre}
                </p>
                {categoria.descripcion && (
                    <p className="text-xs text-zinc-400 line-clamp-1" title={categoria.descripcion}>
                        {categoria.descripcion}
                    </p>
                )}
            </div>
            {/* Botón Editar */}
            <button onClick={() => onEditClick(categoria)} className={buttonEditClasses} title="Editar Categoría">
                <PencilIcon size={16} />
            </button>
        </li>
    );
}

// --- Componente Principal ---
export default function NegocioCategorias({ negocioId }: Props) {
    const [categorias, setCategorias] = useState<NegocioCategoriaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [categoriaParaEditar, setCategoriaParaEditar] = useState<NegocioCategoriaConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<CategoriaFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (ajustadas para tarjeta)
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal (sin cambios)
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Sensores para dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Función para cargar categorías ---
    const fetchCategorias = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            // **IMPORTANTE**: La acción debe devolver las categorías ordenadas por 'orden' ASC
            const data = await obtenerNegocioCategorias(negocioId);
            // Asegurar que 'orden' exista, asignar índice si es null/undefined
            const categoriasConOrden = (data || []).map((cat, index) => ({
                ...cat,
                orden: cat.orden ?? index + 1,
            }));
            setCategorias(categoriasConOrden);
        } catch (err) {
            console.error("Error al obtener las categorias:", err);
            setError("No se pudieron cargar las categorías.");
            setCategorias([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    // --- Carga inicial ---
    useEffect(() => {
        fetchCategorias(true);
    }, [fetchCategorias]);

    // --- Manejadores del Modal ---
    const openModal = (mode: 'create' | 'edit', categoria?: NegocioCategoriaConOrden) => {
        setModalMode(mode);
        setCategoriaParaEditar(mode === 'edit' ? categoria || null : null);
        setModalFormData(mode === 'edit' && categoria ? { nombre: categoria.nombre, descripcion: categoria.descripcion } : { nombre: '', descripcion: '' });
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setCategoriaParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);

        try {
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                descripcion: modalFormData.descripcion?.trim() || null,
            };

            if (modalMode === 'create') {
                // Asignar orden inicial
                const nuevoOrden = categorias.length + 1;
                // **IMPORTANTE**: La acción 'crearNegocioCategoria' debe aceptar y guardar 'orden'
                await crearNegocioCategoria({ ...dataToSend, negocioId: negocioId, orden: nuevoOrden });
            } else if (modalMode === 'edit' && categoriaParaEditar?.id) {
                // **IMPORTANTE**: La acción 'actualizarNegocioCategoria' debe existir
                await actualizarNegocioCategoria(categoriaParaEditar.id, dataToSend);
            }

            await fetchCategorias(); // Recargar lista
            closeModal();

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} categoria:`, err);
            const message = err instanceof Error ? err.message : "Ocurrió un error";
            setModalError(`Error: ${message}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!categoriaParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar la categoría "${categoriaParaEditar.nombre}"? Esto podría afectar ítems asociados.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                // **IMPORTANTE**: La acción 'eliminarNegocioCategoria' debe existir
                await eliminarNegocioCategoria(categoriaParaEditar.id);
                await fetchCategorias(); // Recargar lista
                closeModal();
            } catch (err) {
                console.error("Error eliminando categoria:", err);
                const message = err instanceof Error ? err.message : "Ocurrió un error";
                setModalError(`Error al eliminar: ${message}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Manejador Drag End para Categorías ---
    const handleDragEndCategorias = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = categorias.findIndex((cat) => cat.id === active.id);
            const newIndex = categorias.findIndex((cat) => cat.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedCategorias = arrayMove(categorias, oldIndex, newIndex);
            const finalCategorias = reorderedCategorias.map((cat, index) => ({ ...cat, orden: index + 1 }));

            setCategorias(finalCategorias); // Actualización optimista

            const ordenData = finalCategorias.map(({ id, orden }) => ({ id, orden: orden as number }));

            setIsSavingOrder(true); setError(null);
            try {
                // !! NECESITAS CREAR ESTA ACCIÓN !!
                await actualizarOrdenNegocioCategorias(ordenData);
            } catch (saveError) {
                console.error('Error al guardar el orden de categorías:', saveError);
                setError('Error al guardar el nuevo orden.');
                setCategorias(categorias); // Revertir
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [categorias]);

    // --- Función para renderizar contenido interno ---
    const renderInternalContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center py-6 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Cargando categorías...</span></div>;
        }
        if (error && !isSavingOrder) {
            return <div className="flex flex-col items-center justify-center text-center py-6"><ListX className="h-6 w-6 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>;
        }
        if (categorias.length === 0 && !error) {
            return <div className="flex flex-col items-center justify-center text-center py-6"><ListChecks className="h-6 w-6 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay categorías definidas.</p><p className='text-xs text-zinc-500 mt-1'>Crea la primera categoría.</p></div>;
        }
        // Renderizar lista arrastrable
        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategorias}>
                <SortableContext items={categorias.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
                    <ul className='space-y-0'>
                        {categorias.map((categoria) => (
                            <SortableCategoryItem
                                key={categoria.id}
                                categoria={categoria}
                                onEditClick={(cat) => openModal('edit', cat)}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        );
    }

    // --- Renderizado Principal ---
    return (
        <div>

            <div className={containerClasses}>
                {/* Cabecera */}
                <div className={headerClasses}>
                    <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <LayoutGrid size={16} /> Categorías
                    </h3>
                    {!loading && !error && (
                        <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva categoría">
                            <PlusIcon size={14} /> <span>Crear</span>
                        </button>
                    )}
                </div>

                {/* Indicador de guardado de orden */}
                {isSavingOrder && (
                    <div className="mb-2 flex items-center justify-center text-xs text-blue-300">
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...
                    </div>
                )}

                {/* Contenido Principal: Lista (con D&D) */}
                <div className={listContainerClasses}>
                    {renderInternalContent()}
                </div>

                {/* Modal para Crear/Editar Categoría */}
                {isModalOpen && (
                    <div className={modalOverlayClasses} onClick={closeModal}>
                        <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                            {/* Cabecera Modal */}
                            <div className={modalHeaderClasses}>
                                <h3 className="text-lg font-semibold text-white">
                                    {modalMode === 'create' ? 'Crear Nueva Categoría' : 'Editar Categoría'}
                                </h3>
                                <button onClick={closeModal} className="text-zinc-400 hover:text-white" aria-label="Cerrar modal">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            {/* Formulario Modal */}
                            <form onSubmit={handleModalFormSubmit}>
                                <div className={modalBodyClasses}>
                                    {modalError && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                    <div>
                                        <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                        <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} />
                                    </div>
                                </div>
                                {/* Pie Modal */}
                                <div className={modalFooterClasses}>
                                    {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClasses} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 text-sm px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                    <button type="button" onClick={closeModal} className={`${buttonBaseClasses} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-sm`} disabled={isSubmittingModal}>Cancelar</button>
                                    <button type="submit" className={`${buttonBaseClasses} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-sm`} disabled={isSubmittingModal}>
                                        {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                        {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <div>
                {/* Bloque Explicativo Mejorado para Categorías */}
                <div className="mt-4 p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner">
                    {/* Título opcional con icono */}

                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                        <LayoutGrid size={15} className="text-blue-400" />
                        <span>¿Para qué sirven las Categorías?</span>
                    </h4>


                    {/* Descripción Principal */}
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        Las categorías sirven para <strong className="text-zinc-100">agrupar estructuralmente</strong> los ítems de tu catálogo. Piensa en ellas como las secciones principales de un menú o las carpetas de tus productos/servicios.
                    </p>

                    {/* Lista de Ejemplos/Beneficios */}
                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-400 list-disc pl-5">
                        <li>
                            <strong className="text-zinc-300">Ejemplo:</strong> En una barbería, podrían ser <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Cortes</code>, <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Barba</code>, <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Tratamientos</code>, <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Productos</code>. Un ítem pertenece típicamente a <em className="text-zinc-300 not-italic">una</em> categoría.
                        </li>
                        <li>
                            <strong className="text-zinc-300">Beneficio:</strong> Ayudan a entender la <strong className="text-zinc-200">estructura general</strong> de tu oferta, facilitan la navegación y permiten mostrar secciones específicas del catálogo (útil para la IA y los usuarios).
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
