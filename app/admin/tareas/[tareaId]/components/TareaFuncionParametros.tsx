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
    obtenerParametrosPorFuncionId,
    crearParametroParaFuncion,
    editarParametroDeFuncion,
    eliminarParametroDeFuncion,
    ordenarParametrosDeFuncion
} from '@/app/admin/_lib/actions/tareaFuncionParametro/TareaFuncionParametro.actions'; // Nueva ruta

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    TareaFuncionParametroInputSchema,
    type TareaFuncionParametroInput,
    type ParametroParaUILista, // Para el estado de la lista
    type ParametroModalFormData  // Para el estado del formulario del modal
} from '@/app/admin/_lib/actions/tareaFuncionParametro/tareaFuncionParametro.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { TareaFuncionParametro as TareaFuncionParametroPrisma } from '@prisma/client';


// --- ICONOS ---
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, Variable, GripVertical,
    Type, Hash, ToggleRight, AlertTriangleIcon // Renombrado LinkIcon
} from 'lucide-react';

// Constantes y helpers del componente original
const TIPOS_DATO_PARAMETRO = [
    { value: 'string', label: 'Texto (String)' }, // Alineado con SchemaType de Gemini
    { value: 'number', label: 'Número (Number)' },
    { value: 'integer', label: 'Entero (Integer)' },
    { value: 'boolean', label: 'Sí/No (Boolean)' },
    { value: 'array', label: 'Lista (Array)' }, // Para selecciones múltiples o listas de strings/numbers
];

const tipoDatoIconMap: { [key: string]: React.ReactElement } = {
    string: <span title="Texto"><Type size={14} className="text-sky-400 mx-auto" /></span>,
    number: <span title="Número"><Hash size={14} className="text-emerald-400 mx-auto" /></span>,
    integer: <span title="Entero"><Hash size={14} className="text-emerald-500 mx-auto" /></span>,
    boolean: <span title="Sí/No"><ToggleRight size={14} className="text-rose-400 mx-auto" /></span>,
    array: <span title="Lista"><ListChecks size={14} className="text-purple-400 mx-auto" /></span>,
    // ... más iconos si mantienes los tipos de dato detallados
};

const getTipoDatoDisplay = (tipo: string): React.ReactElement => {
    return tipoDatoIconMap[tipo] || <span title={tipo} className="text-zinc-500 text-xs">?</span>;
};

// Función para generar el nombre snake_case para la IA
const generarNombreSnakeCase = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/\s+/g, '_') // Reemplazar espacios con guion bajo
        .replace(/[^a-z0-9_]/g, '') // Eliminar caracteres no alfanuméricos excepto _
        .replace(/__+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
        .replace(/^_+|_+$/g, ''); // Quitar guiones bajos al inicio/final
};


// --- Componente SortableParametroRow (Adaptado) ---
function SortableParametroRow({ id, parametro, onEdit }: { id: string; parametro: ParametroParaUILista; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined };
    const tdBaseClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800 hover:bg-zinc-700/50 cursor-pointer ${isDragging ? 'shadow-lg' : ''}`} onClick={onEdit}>
            <td className={`${tdBaseClasses} text-center w-10`}><button {...attributes} {...listeners} data-dnd-handle="true" className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"><GripVertical size={14} /></button></td>
            <td className={`${tdBaseClasses} text-center w-12`}>{getTipoDatoDisplay(parametro.tipoDato)}</td>
            {/* Mostrar nombreVisibleParaUI si se decide mantener y popular ese campo en ParametroParaUILista */}
            {/* O mostrar el 'nombre' (snake_case) y confiar en descripcionParaIA para el contexto humano en la lista */}
            <td className={`${tdBaseClasses} font-mono text-sky-400`}>{parametro.nombre}</td>
            <td className={`${tdBaseClasses} text-zinc-300 max-w-xs`}><p className="line-clamp-2" title={parametro.descripcionParaIA}>{parametro.descripcionParaIA}</p></td>
            <td className={`${tdBaseClasses} text-center w-16`}>{parametro.esObligatorio ? 'Sí' : 'No'}</td>
        </tr>
    );
}

interface Props {
    tareaFuncionId: string; // ID de la TareaFuncion a la que pertenecen estos parámetros
    // Podríamos pasar el nombre de la TareaFuncion para el título si es necesario
    // nombreTareaFuncion?: string; 
}

export default function TareaFuncionParametrosSubcomponente({ tareaFuncionId }: Props) {
    const [parametros, setParametros] = useState<ParametroParaUILista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [parametroParaEditar, setParametroParaEditar] = useState<ParametroParaUILista | null>(null);

    const [modalFormData, setModalFormData] = useState<ParametroModalFormData>({
        nombreVisibleParaUI: '', // Campo para que el usuario escriba
        descripcionParaIA: '',
        tipoDato: 'string', // Default
        esObligatorio: false,
        valorPorDefecto: '',
        ejemploValor: '',
    });
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof TareaFuncionParametroInput, string[]>>>({});


    // ... (Clases Tailwind se pueden reutilizar de TareasEtiquetas/TareasCanales, o definir aquí si son muy específicas) ...
    const sectionClasses = "bg-zinc-800/70 p-4 rounded-lg border border-zinc-700"; // Para el contenedor del subcomponente
    const headerSectionClasses = "flex items-center justify-between mb-3 pb-3 border-b border-zinc-600";
    const headerTitleClasses = "text-md font-semibold text-zinc-100 flex items-center gap-2";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50";
    const errorAlertClasses = "my-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const tableWrapperClasses = "flex-grow overflow-auto max-h-[400px]"; // Max altura para scroll interno

    // DnD sensors setup
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const modalOverlayClasses = "fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"; // Aumentado z-index
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-500 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 h-10";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px] h-auto`;
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-200 ml-2 cursor-pointer";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer";
    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;


    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (!tareaFuncionId) {
            setError("ID de Función de Tarea no proporcionado para cargar parámetros.");
            setLoading(false);
            setParametros([]);
            return;
        }
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await obtenerParametrosPorFuncionId(tareaFuncionId);
            if (result.success && result.data) {
                setParametros(result.data);
            } else {
                throw new Error(result.error || "No se pudieron cargar los parámetros.");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "No se pudieron cargar los parámetros.");
            setParametros([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [tareaFuncionId]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const openModal = (mode: 'create' | 'edit', parametro?: ParametroParaUILista) => {
        console.log('[DEBUG] openModal triggered. Mode:', mode, 'Parametro:', parametro);

        try {
            setModalMode(mode);
            setModalValidationErrors({});
            setModalError(null);

            if (mode === 'edit' && parametro) {
                console.log('[DEBUG] Setting modal for EDIT mode.');
                setParametroParaEditar(parametro);
                const formDataForEdit: ParametroModalFormData = { // Especificar tipo aquí
                    id: parametro.id,
                    nombreVisibleParaUI: parametro.nombreVisibleParaUI || parametro.nombre || '',
                    descripcionParaIA: parametro.descripcionParaIA || '',
                    tipoDato: parametro.tipoDato || 'string',
                    esObligatorio: typeof parametro.esObligatorio === 'boolean' ? parametro.esObligatorio : true,
                    valorPorDefecto: parametro.valorPorDefecto || '',
                    ejemploValor: parametro.ejemploValor || '',
                };
                console.log('[DEBUG] Form data for EDIT:', formDataForEdit);
                setModalFormData(formDataForEdit);
            } else {
                console.log('[DEBUG] Setting modal for CREATE mode.');
                setParametroParaEditar(null);
                const formDataForCreate: ParametroModalFormData = { // Especificar tipo aquí
                    nombreVisibleParaUI: '',
                    descripcionParaIA: '',
                    tipoDato: 'string',
                    esObligatorio: true,
                    valorPorDefecto: '',
                    ejemploValor: '',
                };
                console.log('[DEBUG] Form data for CREATE:', formDataForCreate);
                setModalFormData(formDataForCreate);
            }
            console.log('[DEBUG] Attempting to set isModalOpen to true.');
            setIsModalOpen(true);
            console.log('[DEBUG] isModalOpen should be true now.');

        } catch (e: unknown) {
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            console.error("!!!!!!!!! ERROR CAPTURADO EN openModal !!!!!!!!!");
            console.error(e);
            console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
            alert("Error en openModal (ver consola para detalles): " + (e instanceof Error ? e.message : String(e)));
            // Para asegurar que el modal no intente abrirse si hay un error grave aquí:
            setIsModalOpen(false);
        }
    };

    const closeModal = () => { /* ... (misma lógica que en TareasEtiquetas) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setParametroParaEditar(null);
            setModalFormData({ nombreVisibleParaUI: '', descripcionParaIA: '', tipoDato: 'string', esObligatorio: true, valorPorDefecto: '', ejemploValor: '' });
            setModalError(null); setModalValidationErrors({}); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const inputValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;

        setModalFormData(prev => ({ ...prev, [name]: inputValue }));
        if (modalError) setModalError(null);
        if (Object.keys(modalValidationErrors).length > 0) setModalValidationErrors({});
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setModalError(null);
        setModalValidationErrors({});

        const nombreSnakeCase = generarNombreSnakeCase(modalFormData.nombreVisibleParaUI || '');

        if (!nombreSnakeCase) {
            setModalValidationErrors(prev => ({ ...prev, nombreVisibleParaUI: ["El nombre visible es obligatorio y debe generar un ID interno válido."] }));
            setModalError("El nombre visible es necesario.");
            return;
        }

        const dataToValidate: TareaFuncionParametroInput = {
            nombre: nombreSnakeCase, // Usar el nombre snake_case generado
            descripcionParaIA: modalFormData.descripcionParaIA || '',
            tipoDato: modalFormData.tipoDato || 'string',
            esObligatorio: modalFormData.esObligatorio || false, // Default a false si no está presente
            valorPorDefecto: modalFormData.valorPorDefecto || null,
            ejemploValor: modalFormData.ejemploValor || null,
        };

        const validationResult = TareaFuncionParametroInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            const flatErrors = validationResult.error.flatten().fieldErrors;
            setModalValidationErrors(flatErrors as Partial<Record<keyof TareaFuncionParametroInput, string[]>>);
            setModalError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmittingModal(true);
        try {
            let result: ActionResult<TareaFuncionParametroPrisma>;
            const validatedData = validationResult.data;

            if (modalMode === 'create') {
                result = await crearParametroParaFuncion(tareaFuncionId, validatedData);
            } else if (modalMode === 'edit' && parametroParaEditar?.id) {
                result = await editarParametroDeFuncion(parametroParaEditar.id, validatedData);
            } else {
                throw new Error("Modo de modal inválido o ID de parámetro faltante.");
            }

            if (result.success) {
                await fetchData();
                closeModal();
            } else {
                setModalError(result.error || "Ocurrió un error desconocido.");
                if (result.validationErrors) {
                    setModalValidationErrors(result.validationErrors as Partial<Record<keyof TareaFuncionParametroInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            setModalError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!parametroParaEditar?.id || !parametroParaEditar.nombre) return;
        // No hay conteo de uso para parámetros individuales, se borran directamente
        if (confirm(`¿Seguro que quieres eliminar el parámetro "${parametroParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarParametroDeFuncion(parametroParaEditar.id);
                if (result.success) {
                    await fetchData(); closeModal();
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
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = parametros.findIndex((p) => p.id === active.id);
            const newIndex = parametros.findIndex((p) => p.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedParametros = arrayMove(parametros, oldIndex, newIndex);
            setParametros(reorderedParametros);

            const ordenData = reorderedParametros.map((param, index) => ({ id: param.id, orden: index }));

            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarParametrosDeFuncion(tareaFuncionId, ordenData);
                if (!result.success) {
                    throw new Error(result.error || "Error al guardar el orden en el servidor.");
                }
            } catch (saveError: unknown) {
                setError(saveError instanceof Error ? saveError.message : 'Error al guardar el nuevo orden.');
                await fetchData(true); // Recargar para revertir si falla el guardado
            } finally {
                setIsSavingOrder(false);
            }
        }
    }, [parametros, fetchData, tareaFuncionId]);

    if (!tareaFuncionId && !loading) { // Añadido check para !loading
        return <div className={`${sectionClasses} border-orange-500/50`}><p className="text-sm text-orange-400 p-4 text-center">ID de Función de Tarea no proporcionado. No se pueden cargar los parámetros.</p></div>;
    }

    // --- JSX del Componente ---
    return (
        <div className={sectionClasses}>
            <div className={headerSectionClasses}>
                <h3 className={headerTitleClasses}><Variable size={18} /> Parámetros</h3>
                <div className='flex items-center gap-3'>
                    {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo parámetro para esta función"><PlusIcon size={14} /><span>Agregar</span></button>
                </div>
            </div>

            {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} /> {error}</p>}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className={tableWrapperClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando parámetros...</span></div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-zinc-900/50 sticky top-0 z-10 border-b border-zinc-600">
                                <tr>
                                    <th className="px-2 py-2 w-10"></th>
                                    <th className="px-2 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider w-12 text-center">Tipo</th>
                                    <th className="px-2 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left">Nombre (ID)</th>
                                    <th className="px-2 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider text-left">Descripción (IA)</th>
                                    <th className="px-2 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider w-16 text-center">Oblig.</th>
                                </tr>
                            </thead>
                            <SortableContext items={parametros.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-700/70">
                                    {parametros.length === 0 && !error && !loading ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-sm text-zinc-500 italic"><ListChecks className="h-6 w-6 mx-auto text-zinc-600 mb-1" />Esta función aún no tiene parámetros definidos.</td></tr>
                                    ) : (
                                        parametros.map((param) => (
                                            <SortableParametroRow key={param.id} id={param.id} parametro={param} onEdit={() => openModal('edit', param)} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                </div>
            </DndContext>

            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>{modalMode === 'create' ? 'Crear Nuevo Parámetro' : 'Editar Parámetro'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && !(Object.keys(modalValidationErrors).length > 0) && (
                                    <p className="mb-3 text-center text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 text-sm flex items-center gap-2"><AlertTriangleIcon size={16} /> {modalError}</p>
                                )}
                                <div>
                                    <label htmlFor="modal-nombreVisibleParaUI" className={labelBaseClasses}>Nombre Descriptivo (Etiqueta) <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombreVisibleParaUI" name="nombreVisibleParaUI" value={modalFormData.nombreVisibleParaUI || ''} onChange={handleModalFormChange} className={`${inputBaseClasses} ${modalValidationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Fecha de la Cita" />
                                    {/* Mostrar el nombre_snake_case generado */}
                                    <p className="text-xs text-zinc-400 mt-1">
                                        ID para IA (auto-generado): <span className="font-mono text-sky-400">{generarNombreSnakeCase(modalFormData.nombreVisibleParaUI || '') || '(ninguno)'}</span>
                                    </p>
                                    {modalValidationErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.nombre.join(', ')}</p>}
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcionParaIA" className={labelBaseClasses}>Descripción para IA <span className="text-red-500">*</span></label>
                                    <textarea id="modal-descripcionParaIA" name="descripcionParaIA" value={modalFormData.descripcionParaIA || ''} onChange={handleModalFormChange} className={`${textareaBaseClasses} ${modalValidationErrors.descripcionParaIA ? 'border-red-500' : ''}`} required disabled={isSubmittingModal} rows={8} placeholder="Describe qué es este parámetro y cómo debe usarlo la IA..." />
                                    {modalValidationErrors.descripcionParaIA && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.descripcionParaIA.join(', ')}</p>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="modal-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                        <select id="modal-tipoDato" name="tipoDato" value={modalFormData.tipoDato || 'string'} onChange={handleModalFormChange} className={`${selectBaseClasses} ${modalValidationErrors.tipoDato ? 'border-red-500' : ''}`} required disabled={isSubmittingModal}>
                                            {TIPOS_DATO_PARAMETRO.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                        </select>
                                        {modalValidationErrors.tipoDato && <p className="text-xs text-red-400 mt-1">{modalValidationErrors.tipoDato.join(', ')}</p>}
                                    </div>
                                    <div className="flex items-center pt-6"> {/* Alineación para el checkbox */}
                                        <input type="checkbox" id="modal-esObligatorio" name="esObligatorio" checked={modalFormData.esObligatorio || false} onChange={handleModalFormChange} className={checkboxClasses} disabled={isSubmittingModal} />
                                        <label htmlFor="modal-esObligatorio" className={checkboxLabelClasses}>Es Obligatorio para la IA</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="modal-valorPorDefecto" className={labelBaseClasses}>Valor por Defecto (Opcional)</label>
                                        <input type="text" id="modal-valorPorDefecto" name="valorPorDefecto" value={modalFormData.valorPorDefecto || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={255} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-ejemploValor" className={labelBaseClasses}>Valor de Ejemplo (Opcional)</label>
                                        <input type="text" id="modal-ejemploValor" name="ejemploValor" value={modalFormData.ejemploValor || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={255} />
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={buttonModalDanger} disabled={isSubmittingModal}><Trash2 size={16} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={buttonModalSecondary} disabled={isSubmittingModal}>Cancelar</button>
                                <button className={buttonModalPrimary} disabled={isSubmittingModal || !generarNombreSnakeCase(modalFormData.nombreVisibleParaUI || '') || !modalFormData.descripcionParaIA || !modalFormData.tipoDato} >
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
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