'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
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
    obtenerFuncionesTareaConParametros,
    crearFuncionTarea,
    editarFuncionTarea,
    eliminarFuncionTarea,
    obtenerParametrosRequeridosDisponibles,
    actualizarOrdenFunciones,
} from '@/app/admin/_lib/tareaFuncion.actions';
// Asegúrate que los tipos están actualizados (TareaFuncion con 'orden')
import { TareaFuncion, ParametroRequerido, CrearFuncionData, EditarFuncionData } from '@/app/admin/_lib/types';
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Cog, GripVertical } from 'lucide-react'; // <-- Añadido GripVertical

interface FuncionConDetalles extends Omit<TareaFuncion, 'parametrosRequeridos'> {
    parametrosRequeridos?: ({
        esObligatorio: boolean;
        parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null;
    })[];
    _count?: { tareas?: number };
    // status?: 'activo' | 'inactivo' | 'beta'; // Status no está en el schema TareaFuncion
}

// Tipo para el formulario modal (sin cambios)
type FuncionFormData = Partial<Pick<TareaFuncion, 'nombreInterno' | 'nombreVisible' | 'descripcion'>>;

// --- Helper para generar nombre interno en camelCase ---
const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';

    // 1. Convertir a minúsculas y quitar acentos
    const sinAcentos = nombreVisible
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // 2. Reemplazar caracteres no alfanuméricos (excepto espacios) con espacio
    //    y dividir por espacios o guiones bajos (si se usaron antes)
    const palabras = sinAcentos
        .replace(/[^a-z0-9\s]+/g, ' ') // Reemplaza no alfanuméricos (excepto espacio) con espacio
        .split(/[\s_]+/); // Divide por espacios o guiones bajos

    // 3. Convertir a camelCase
    return palabras
        .map((palabra, index) => {
            if (!palabra) return ''; // Ignorar palabras vacías (por múltiples espacios)
            if (index === 0) {
                // La primera palabra va en minúsculas
                return palabra;
            } else {
                // Capitalizar la primera letra del resto de palabras
                return palabra.charAt(0).toUpperCase() + palabra.slice(1);
            }
        })
        .join(''); // Unir sin espacios
};

// --- Componente Sortable Item ---
function SortableFuncionItem({ id, funcion, onEdit }: { id: string; funcion: FuncionConDetalles; onEdit: (func: FuncionConDetalles) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases reutilizadas
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start justify-between gap-3";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const paramTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap";

    return (
        <li ref={setNodeRef} style={style} className={`${listItemClasses} ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}>
            {/* Handle para arrastrar */}
            <button
                {...attributes}
                {...listeners}
                className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 self-center mr-1"
                aria-label="Arrastrar para reordenar"
            >
                <GripVertical size={16} />
            </button>

            {/* Contenido del item */}
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5" title={funcion.nombreVisible}>
                    {funcion.nombreVisible}
                    <span className="text-xs text-zinc-500 font-mono">({funcion.nombreInterno})</span>
                </p>
                {funcion.descripcion && <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5" title={funcion.descripcion}>{funcion.descripcion}</p>}
                {funcion.parametrosRequeridos && funcion.parametrosRequeridos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-zinc-500 mr-1">Params:</span>
                        {funcion.parametrosRequeridos.map(({ parametroRequerido, esObligatorio }) => parametroRequerido ? (
                            <span key={parametroRequerido.id} className={paramTagClasses} title={`ID: ${parametroRequerido.nombreInterno} | Tipo: ${parametroRequerido.tipoDato}${esObligatorio ? ' (Obligatorio)' : ''}`}>
                                {parametroRequerido.nombreVisible}
                                {esObligatorio && <span className="text-amber-400 ml-0.5">*</span>}
                            </span>
                        ) : null)}
                    </div>
                )}
                {(!funcion.parametrosRequeridos || funcion.parametrosRequeridos.length === 0) && (
                    <p className="text-xs text-zinc-500 italic mt-1.5">Sin parámetros estándar asociados.</p>
                )}
            </div>
            {/* Conteo y Editar */}
            <div className="flex items-center gap-3 flex-shrink-0 self-center">
                {funcion._count?.tareas !== undefined && (
                    <span className="text-xs text-zinc-500" title={`${funcion._count.tareas} tarea(s) usan esta función`}>
                        {funcion._count.tareas === 1 ? '1 Tarea' : `${funcion._count.tareas} Tareas`}
                    </span>
                )}
                <button onClick={() => onEdit(funcion)} className={buttonEditClasses} title="Editar Función">
                    <PencilIcon size={16} />
                </button>
            </div>
        </li>
    );
}


// --- Componente Principal ---
export default function FuncionesTareasLista() {
    // Usar 'funciones' como el estado principal que se reordena
    const [funciones, setFunciones] = useState<FuncionConDetalles[]>([]);
    const [parametrosDisponibles, setParametrosDisponibles] = useState<ParametroRequerido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false); // Estado para guardar orden

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [funcionParaEditar, setFuncionParaEditar] = useState<FuncionConDetalles | null>(null);
    const [modalFormData, setModalFormData] = useState<FuncionFormData>({});
    const [selectedParams, setSelectedParams] = useState<{ [paramId: string]: { esObligatorio: boolean } }>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [loadingParamsModal, setLoadingParamsModal] = useState(false);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const checkboxLabelClasses = "text-xs font-medium text-zinc-300 ml-2 cursor-pointer";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";


    // --- Carga de datos (Asegurarse que ordena por 'orden') ---
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            // obtenerFuncionesTareaConParametros ya debería ordenar por 'orden'
            const [funcionesData, parametrosData] = await Promise.all([
                obtenerFuncionesTareaConParametros() as Promise<FuncionConDetalles[]>,
                obtenerParametrosRequeridosDisponibles()
            ]);
            setFunciones(funcionesData || []); // Guardar en el estado principal 'funciones'
            setParametrosDisponibles(parametrosData || []);
        } catch (err) {
            console.error("Error al obtener datos:", err);
            setError("No se pudieron cargar las funciones o parámetros.");
            setFunciones([]);
            setParametrosDisponibles([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // --- Manejadores Modal ---
    const openModal = async (mode: 'create' | 'edit', funcion?: FuncionConDetalles) => {
        setError(null);
        setModalError(null);

        // Recargar la lista de parámetros disponibles ANTES de abrir el modal
        setLoadingParamsModal(true);
        try {
            const parametrosData = await obtenerParametrosRequeridosDisponibles();
            setParametrosDisponibles(parametrosData || []);
        } catch (err) {
            console.error("Error al recargar parámetros para modal:", err);
            setModalError("Error al cargar la lista actualizada de parámetros.");
        } finally {
            setLoadingParamsModal(false);
        }

        // Configurar el modal
        setModalMode(mode);
        setFuncionParaEditar(mode === 'edit' ? funcion || null : null);

        // Inicializar parámetros seleccionados
        const initialSelectedParams: { [paramId: string]: { esObligatorio: boolean } } = {};
        if (mode === 'edit' && funcion?.parametrosRequeridos) {
            funcion.parametrosRequeridos.forEach(p => {
                if (p.parametroRequerido?.id) {
                    initialSelectedParams[p.parametroRequerido.id] = { esObligatorio: p.esObligatorio };
                }
            });
        }
        setSelectedParams(initialSelectedParams);

        // Inicializar datos del formulario
        setModalFormData(mode === 'edit' && funcion ?
            { nombreInterno: funcion.nombreInterno, nombreVisible: funcion.nombreVisible, descripcion: funcion.descripcion } :
            { nombreInterno: '', nombreVisible: '', descripcion: '' }
        );

        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setFuncionParaEditar(null); setModalFormData({}); setSelectedParams({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const handleParamCheckboxChange = (paramId: string, checked: boolean) => {
        setSelectedParams(prev => {
            const newParams = { ...prev };
            if (checked) {
                newParams[paramId] = { esObligatorio: true };
            } else {
                delete newParams[paramId];
            }
            return newParams;
        });
        setModalError(null);
    };

    const handleParamObligatorioChange = (paramId: string, checked: boolean) => {
        setSelectedParams(prev => {
            if (prev[paramId]) {
                return { ...prev, [paramId]: { ...prev[paramId], esObligatorio: checked } };
            }
            return prev;
        });
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombreVisible?.trim()) { setModalError("Nombre visible es obligatorio."); return; }
        if (!modalFormData.nombreInterno?.trim()) { setModalError("Nombre interno no puede estar vacío."); return; }

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const parametrosParaEnviar = Object.entries(selectedParams).map(([id, config]) => ({
                parametroRequeridoId: id,
                esObligatorio: config.esObligatorio,
            }));

            // Capitalizar primera letra de nombreVisible y descripcion
            const nombreVisibleCapitalized = modalFormData.nombreVisible
                ? modalFormData.nombreVisible.charAt(0).toUpperCase() + modalFormData.nombreVisible.slice(1).trim()
                : '';
            const descripcionCapitalized = modalFormData.descripcion
                ? modalFormData.descripcion.charAt(0).toUpperCase() + modalFormData.descripcion.slice(1).trim()
                : null;


            if (modalMode === 'create') {
                const dataToSend: CrearFuncionData = {
                    nombreInterno: modalFormData.nombreInterno!.trim(),
                    nombreVisible: nombreVisibleCapitalized,
                    descripcion: descripcionCapitalized,
                    parametros: parametrosParaEnviar,
                };
                result = await crearFuncionTarea(dataToSend);
            } else if (modalMode === 'edit' && funcionParaEditar?.id) {
                const dataToSend: EditarFuncionData = {
                    nombreVisible: nombreVisibleCapitalized,
                    descripcion: descripcionCapitalized,
                    parametros: parametrosParaEnviar,
                };
                result = await editarFuncionTarea(funcionParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchData(); // Recargar lista después de crear/editar
                closeModal();
            } else { throw new Error(result?.error || "Error desconocido al guardar."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} función:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!funcionParaEditar?.id || !funcionParaEditar.nombreVisible) return;
        if (confirm(`¿Estás seguro de eliminar la función "${funcionParaEditar.nombreVisible}"? Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarFuncionTarea(funcionParaEditar.id);
                if (result?.success) {
                    await fetchData(); // Recargar lista después de eliminar
                    closeModal();
                }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                console.error("Error eliminando función:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
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
            // 1. Actualizar estado local 'funciones'
            const oldIndex = funciones.findIndex((f) => f.id === active.id);
            const newIndex = funciones.findIndex((f) => f.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedFunciones = arrayMove(funciones, oldIndex, newIndex);
            setFunciones(reorderedFunciones); // Actualizar UI inmediatamente

            // 2. Preparar datos para el servidor
            const funcionesParaActualizar = reorderedFunciones.map((func, index) => ({
                id: func.id,
                orden: index // El nuevo orden es el índice
            }));

            // 3. Llamar a la acción del servidor
            setIsSavingOrder(true);
            setError(null);
            try {
                const result = await actualizarOrdenFunciones(funcionesParaActualizar);
                if (!result.success) {
                    setError(result.error || "Error al guardar el orden.");
                    // Revertir estado local si falla
                    setFunciones(arrayMove(reorderedFunciones, newIndex, oldIndex));
                }
                // Si tiene éxito, el estado local ya está actualizado.
            } catch (err) {
                setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                setFunciones(arrayMove(reorderedFunciones, newIndex, oldIndex)); // Revertir
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
                    <Cog size={16} /> Funciones de Automatización
                </h3>
                {/* Indicador guardando orden */}
                <div className='flex items-center gap-2'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva función">
                        <PlusIcon size={14} /> <span>Crear Función</span>
                    </button>
                </div>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}

            {/* Contenido Principal: Lista Sortable */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={funciones.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <ul className={listContainerClasses}>
                        {loading ? (
                            <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando funciones...</span></div>
                        ) : funciones.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay funciones definidas.</p></div>
                        ) : (
                            funciones.map((func) => (
                                // Usar el componente SortableFuncionItem
                                <SortableFuncionItem key={func.id} id={func.id} funcion={func} onEdit={openModal.bind(null, 'edit')} />
                            ))
                        )}
                        {!loading && funciones.length > 0 && (
                            <p className="text-xs text-center text-zinc-500 mt-3 italic">Arrastra <GripVertical size={12} className='inline align-text-bottom' /> para reordenar.</p>
                        )}
                    </ul>
                </SortableContext>
            </DndContext>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nueva Función de Automatización' : 'Editar Función de Automatización'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    {/* Nombre Visible Función */}
                                    <div>
                                        <label htmlFor="modal-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombreVisible" name="nombreVisible" value={modalFormData.nombreVisible || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Agendar Cita Cliente" />
                                    </div>
                                    {/* Nombre Interno Función */}
                                    <div>
                                        <label htmlFor="modal-nombreInterno" className={labelBaseClasses}>Nombre Interno (ID) <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombreInterno" name="nombreInterno" value={modalFormData.nombreInterno || ''} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed`} required disabled={isSubmittingModal || modalMode === 'edit'} maxLength={50} placeholder="Se genera automáticamente..." aria-describedby='nombre-interno-desc' />
                                        <p id="nombre-interno-desc" className="text-xs text-zinc-500 mt-1">Se genera del Nombre Visible. No editable después.</p>
                                    </div>
                                </div>
                                {/* Descripción Función */}
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={2} maxLength={250} placeholder="Describe brevemente qué hace esta función..." />
                                </div>

                                {/* Selección de Parámetros Estándar */}
                                <div className='border-t border-zinc-700 pt-4 mt-4'>
                                    <label className={labelBaseClasses}>Parámetros Estándar Requeridos</label>
                                    {loadingParamsModal ? (
                                        <p className="text-sm text-zinc-400 italic flex items-center gap-1"><Loader2 size={12} className='animate-spin' /> Actualizando lista...</p>
                                    ) : parametrosDisponibles.length === 0 ? (
                                        <p className="text-sm text-zinc-500 italic">No hay parámetros estándar definidos.</p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-2.5 border border-zinc-700 rounded-md p-3 bg-zinc-900/50 shadow-inner">
                                            {parametrosDisponibles.map(param => (
                                                <div key={param.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded">
                                                    <label htmlFor={`param-${param.id}`} className="flex items-center cursor-pointer flex-grow mr-4">
                                                        <input
                                                            type="checkbox"
                                                            id={`param-${param.id}`}
                                                            checked={!!selectedParams[param.id]}
                                                            onChange={(e) => handleParamCheckboxChange(param.id, e.target.checked)}
                                                            className={checkboxClasses}
                                                            disabled={isSubmittingModal}
                                                        />
                                                        <span className={`${checkboxLabelClasses} ml-2.5`}>
                                                            {param.nombreVisible}
                                                            <span className="text-zinc-500 text-[0.7rem] ml-1 font-mono">({param.nombreInterno})</span>
                                                            <span className="block text-zinc-400 text-[0.7rem] mt-0.5 italic">{param.descripcion || 'Sin descripción'}</span>
                                                        </span>
                                                    </label>
                                                    {selectedParams[param.id] && (
                                                        <label htmlFor={`obli-${param.id}`} className="flex items-center cursor-pointer text-xs text-amber-400 hover:text-amber-300 flex-shrink-0">
                                                            <input
                                                                type="checkbox"
                                                                id={`obli-${param.id}`}
                                                                checked={selectedParams[param.id]?.esObligatorio ?? true}
                                                                onChange={(e) => handleParamObligatorioChange(param.id, e.target.checked)}
                                                                className={`${checkboxClasses} !h-3.5 !w-3.5 !text-amber-500 !focus:ring-amber-400 border-amber-700/50 bg-amber-900/30`}
                                                                disabled={isSubmittingModal}
                                                            />
                                                            <span className="ml-1.5 font-medium">Obligatorio</span>
                                                        </label>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-zinc-500 mt-1.5">Selecciona los parámetros estándar que esta función necesita. Marca si son obligatorios.</p>
                                </div>
                            </div>
                            {/* Pie del Modal */}
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (
                                    <button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-700 hover:bg-red-800 focus:ring-red-600 px-3 py-1.5 mr-auto disabled:bg-red-900/50 disabled:cursor-not-allowed`} disabled={isSubmittingModal || (funcionParaEditar?._count?.tareas ?? 0) > 0} title={(funcionParaEditar?._count?.tareas ?? 0) > 0 ? `No se puede eliminar: ${funcionParaEditar?._count?.tareas} tarea(s) usan esta función.` : 'Eliminar función'}><Trash2 size={14} /> Eliminar</button>
                                )}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 min-w-[100px]`} disabled={isSubmittingModal || !modalFormData.nombreVisible?.trim() || !modalFormData.nombreInterno?.trim()}><Save size={16} /> {modalMode === 'create' ? 'Crear Función' : 'Guardar Cambios'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
