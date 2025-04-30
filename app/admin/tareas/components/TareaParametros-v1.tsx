'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
// --- DnD Imports ---
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
// --- Fin DnD Imports ---

// Ajusta rutas según tu estructura
import {
    obtenerParametrosRequeridos,
    crearParametroRequerido,
    editarParametroRequerido,
    eliminarParametroRequerido,
    actualizarOrdenParametros // Nueva acción para ordenar
} from '@/app/admin/_lib/parametrosTareas.actions';
// Asegúrate que ParametroRequerido tiene: id, nombreVisible, nombreInterno, tipoDato, descripcion?, orden?
import { ParametroRequerido } from '@/app/admin/_lib/types';
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Variable, GripVertical } from 'lucide-react'; // Añadido GripVertical

// Interfaz para el tipo ParametroRequerido con conteo opcional
interface ParametroConDetalles extends ParametroRequerido {
    _count?: {
        funciones?: number;
    };
}

// Tipo para el formulario del modal (solo campos editables)
type ParametroFormData = Partial<Pick<ParametroRequerido, 'nombreVisible' | 'tipoDato' | 'descripcion'>> & {
    // Añadimos nombreInterno aquí solo para mostrarlo en el modal de creación
    nombreInterno?: string;
};


// Opciones para el tipo de dato (sin cambios)
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

// --- Helper para generar nombre interno (sin cambios) ---
const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_');
};

// --- Componente Sortable Item (para DnD) ---
function SortableParametroItem({ id, parametro, onEdit }: { id: string; parametro: ParametroConDetalles; onEdit: (param: ParametroConDetalles) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging, // Estado para saber si se está arrastrando
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1, // Reduce opacidad al arrastrar
        zIndex: isDragging ? 10 : undefined, // Poner encima al arrastrar
    };

    // Clases comunes de los items (extraídas para reutilizar)
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start justify-between gap-3";
    const tagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 inline-flex items-center gap-1";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`${listItemClasses} ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`} // Estilo al arrastrar
        >
            {/* Handle para arrastrar */}
            <button
                {...attributes}
                {...listeners}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 self-center mr-1" // touch-none importante para PointerSensor
                aria-label="Arrastrar para reordenar"
            >
                <GripVertical size={16} />
            </button>

            {/* Contenido del item (igual que antes) */}
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5" title={parametro.nombreVisible}>
                    {parametro.nombreVisible}
                    <span className="font-mono text-xs text-zinc-500">({parametro.nombreInterno})</span>
                    <span className={tagClasses}>{parametro.tipoDato}</span>
                </p>
                {parametro.descripcion && <p className="text-xs text-zinc-400 line-clamp-2 mt-1" title={parametro.descripcion}>{parametro.descripcion}</p>}
            </div>
            {parametro._count?.funciones !== undefined && (
                <span className="text-xs text-zinc-500 flex-shrink-0 self-center ml-2" title={`${parametro._count.funciones} función(es) usan este parámetro`}>
                    {parametro._count.funciones === 1 ? '1 Función' : `${parametro._count.funciones} Funciones`}
                </span>
            )}
            <button onClick={() => onEdit(parametro)} className={`${buttonEditClasses} self-center`} title="Editar Parámetro">
                <PencilIcon size={16} />
            </button>
        </li>
    );
}


// --- Componente Principal ---
export default function ParametrosRequeridosGestion() {
    const [parametros, setParametros] = useState<ParametroConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false); // Estado para guardar orden

    // Estados para el Modal (sin cambios)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [parametroParaEditar, setParametroParaEditar] = useState<ParametroConDetalles | null>(null);
    const [modalFormData, setModalFormData] = useState<ParametroFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios significativos)
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2"; // Contenedor de la lista sortable
    const buttonPrimaryClasses = "bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Clases Modal (sin cambios)
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

    // --- Carga de datos (sin cambios) ---
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerParametrosRequeridos();
            setParametros(data || []);
        } catch (err) {
            console.error("Error al obtener parámetros:", err);
            setError("No se pudieron cargar los parámetros estándar.");
            setParametros([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // --- Manejadores Modal (actualizados) ---
    const openModal = (mode: 'create' | 'edit', parametro?: ParametroConDetalles) => {
        setModalMode(mode);
        setParametroParaEditar(mode === 'edit' ? parametro || null : null);
        setModalFormData(mode === 'edit' && parametro ?
            // En edición, solo necesitamos los campos editables
            { nombreVisible: parametro.nombreVisible, tipoDato: parametro.tipoDato, descripcion: parametro.descripcion } :
            // En creación, inicializamos y generamos nombreInterno si hay nombreVisible inicial
            { nombreVisible: '', nombreInterno: '', tipoDato: 'texto', descripcion: '' }
        );
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setParametroParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    // Actualizado para generar nombreInterno
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setModalFormData(prev => {
            const updatedData = { ...prev, [name]: value };
            // Generar nombre interno si se cambia el nombre visible en modo creación
            if (modalMode === 'create' && name === 'nombreVisible') {
                updatedData.nombreInterno = generarNombreInterno(value);
            }
            return updatedData;
        });
        setModalError(null);
    };

    // Actualizado para usar nombreVisible y no enviar orden
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombreVisible?.trim()) { setModalError("El nombre visible es obligatorio."); return; }
        if (!modalFormData.tipoDato) { setModalError("Debe seleccionar un tipo de dato."); return; }

        // Validar nombre interno generado en modo creación
        if (modalMode === 'create') {
            const nombreInternoGenerado = generarNombreInterno(modalFormData.nombreVisible);
            if (!nombreInternoGenerado || !/^[a-z0-9_]+$/.test(nombreInternoGenerado)) {
                setModalError("Nombre interno generado inválido (solo minúsculas, números, guion bajo). Ajusta el nombre visible."); return;
            }
        }


        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            // Solo enviar los campos necesarios para crear/editar
            const dataToSend = {
                nombreVisible: modalFormData.nombreVisible.trim(),
                tipoDato: modalFormData.tipoDato,
                descripcion: modalFormData.descripcion?.trim() || null,
            };

            if (modalMode === 'create') {
                result = await crearParametroRequerido(dataToSend);
            } else if (modalMode === 'edit' && parametroParaEditar?.id) {
                result = await editarParametroRequerido(parametroParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchData(); closeModal();
            } else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} parámetro:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmittingModal(false);
        }
    };

    // Actualizado para usar nombreVisible en confirmación
    const handleModalDelete = async () => {
        if (!parametroParaEditar?.id || !parametroParaEditar.nombreVisible) return;
        if (confirm(`¿Estás seguro de eliminar el parámetro "${parametroParaEditar.nombreVisible}" (${parametroParaEditar.nombreInterno})? Asegúrate de que ninguna función lo esté utilizando.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarParametroRequerido(parametroParaEditar.id);
                if (result?.success) { await fetchData(); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                console.error("Error eliminando parámetro:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- DnD Handlers ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                // Delay: 150, // Opcional: pequeño delay para evitar clics accidentales
                distance: 5, // Mover al menos 5px para iniciar arrastre
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id && over) {
            // 1. Actualizar estado local inmediatamente para feedback visual
            const oldIndex = parametros.findIndex((p) => p.id === active.id);
            const newIndex = parametros.findIndex((p) => p.id === over.id);
            const reorderedParametros = arrayMove(parametros, oldIndex, newIndex);
            setParametros(reorderedParametros);

            // 2. Preparar datos para la acción del servidor
            const parametrosParaActualizar = reorderedParametros.map((param, index) => ({
                id: param.id,
                orden: index // El nuevo orden es el índice en el array reordenado
            }));

            // 3. Llamar a la acción del servidor para guardar el nuevo orden
            setIsSavingOrder(true); // Indicar que se está guardando
            setError(null); // Limpiar errores previos
            try {
                const result = await actualizarOrdenParametros(parametrosParaActualizar);
                if (!result.success) {
                    // Si falla, revertir el estado local y mostrar error
                    console.error("Error al guardar orden:", result.error);
                    setError(`Error al guardar el nuevo orden: ${result.error}. Reordenando visualmente.`);
                    // Revertir al estado anterior (antes del arrayMove) podría ser complejo,
                    // una opción más simple es recargar los datos del servidor.
                    await fetchData(); // Recargar para asegurar consistencia
                }
                // Si tiene éxito, el estado local ya está actualizado.
            } catch (err) {
                console.error("Error llamando a actualizarOrdenParametros:", err);
                setError(`Error inesperado al guardar el orden: ${err instanceof Error ? err.message : 'Error desconocido'}. Recargando...`);
                await fetchData(); // Recargar en caso de error inesperado
            } finally {
                setIsSavingOrder(false);
            }
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
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo parámetro estándar">
                        <PlusIcon size={14} /> <span>Crear Parámetro</span>
                    </button>
                </div>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}

            {/* Indicador de guardado de orden */}
            <div className="mb-2 flex justify-center text-xs text-blue-400">
                {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
            </div>

            {/* Contenido Principal: Lista Sortable */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={parametros.map(p => p.id)} // Usar IDs para el contexto
                    strategy={verticalListSortingStrategy}
                >
                    <ul className={listContainerClasses}>
                        {loading ? (
                            <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando parámetros...</span></div>
                        ) : parametros.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay parámetros estándar definidos.</p><p className='text-xs text-zinc-500 mt-1'>Crea parámetros para usarlos en las funciones.</p></div>
                        ) : (
                            parametros.map((param) => (
                                <SortableParametroItem key={param.id} id={param.id} parametro={param} onEdit={openModal.bind(null, 'edit')} />
                            ))
                        )}
                        {!loading && parametros.length > 0 && (
                            <p className="text-xs text-center text-zinc-500 mt-3 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom' /> para reordenar los parámetros.</p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>

            {/* Modal (Actualizado) */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nuevo Parámetro Estándar' : 'Editar Parámetro Estándar'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}

                                {/* Nombre Visible */}
                                <div>
                                    <label htmlFor="modal-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        id="modal-nombreVisible"
                                        name="nombreVisible"
                                        value={modalFormData.nombreVisible || ''}
                                        onChange={handleModalFormChange}
                                        className={inputBaseClasses}
                                        required
                                        disabled={isSubmittingModal}
                                        maxLength={100}
                                        placeholder="Ej: Correo Electrónico Cliente"
                                    />
                                </div>

                                {/* Nombre Interno (Solo visible en creación, no editable) */}
                                {modalMode === 'create' && (
                                    <div>
                                        <label htmlFor="modal-nombreInterno" className={labelBaseClasses}>Nombre Interno (ID Generado)</label>
                                        <input
                                            type="text"
                                            id="modal-nombreInterno"
                                            name="nombreInterno"
                                            value={modalFormData.nombreInterno || ''}
                                            readOnly
                                            className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed`}
                                            aria-describedby='nombre-interno-desc'
                                        />
                                        <p id="nombre-interno-desc" className="text-xs text-zinc-500 mt-1">Se genera del Nombre Visible (minúsculas, _, números).</p>
                                    </div>
                                )}

                                {/* Tipo de Dato */}
                                <div>
                                    <label htmlFor="modal-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select
                                        id="modal-tipoDato"
                                        name="tipoDato"
                                        value={modalFormData.tipoDato || 'texto'}
                                        onChange={handleModalFormChange}
                                        className={selectBaseClasses}
                                        required
                                        disabled={isSubmittingModal}
                                    >
                                        {TIPOS_DATO_PARAMETRO.map(tipo => (
                                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                    <textarea
                                        id="modal-descripcion"
                                        name="descripcion"
                                        value={modalFormData.descripcion || ''}
                                        onChange={handleModalFormChange}
                                        className={textareaBaseClasses}
                                        disabled={isSubmittingModal}
                                        rows={3}
                                        maxLength={250}
                                        placeholder="Describe qué información representa este parámetro..."
                                    />
                                </div>

                                {/* Campo Orden Eliminado del Modal */}

                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (
                                    <button
                                        type="button"
                                        onClick={handleModalDelete}
                                        className={`${buttonBaseClassesModal} !w-auto bg-red-700 hover:bg-red-800 focus:ring-red-600 px-3 py-1.5 mr-auto disabled:bg-red-900/50 disabled:cursor-not-allowed`}
                                        disabled={isSubmittingModal || (parametroParaEditar?._count?.funciones ?? 0) > 0}
                                        title={(parametroParaEditar?._count?.funciones ?? 0) > 0 ? `No se puede eliminar: ${parametroParaEditar?._count?.funciones} función(es) usan este parámetro.` : 'Eliminar parámetro'}
                                    >
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className={`${buttonBaseClassesModal} !w-auto bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`}
                                    disabled={isSubmittingModal}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 min-w-[100px]`}
                                    disabled={isSubmittingModal || !modalFormData.nombreVisible?.trim() || !modalFormData.tipoDato}
                                >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear Parámetro' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
