// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/campos/components/CRMCamposPersonalizados.tsx
'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerCamposPersonalizadosCRM,
    crearCampoPersonalizadoCRM,
    editarCampoPersonalizadoCRM,
    eliminarCampoPersonalizadoCRM,
    ordenarCamposPersonalizadosCRM
} from '@/app/admin/_lib/crmCampoPersonalizado.actions'; // Ajusta ruta!
import { CRMCampoPersonalizado, CRM } from '@/app/admin/_lib/types'; // Ajusta ruta!
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, GripVertical, FileText, ListPlus, Hash, Calendar as CalendarIcon, ToggleLeft, Info } from 'lucide-react'; // Iconos

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

// --- IMPORTACIÓN de shadcn/ui ELIMINADA ---
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from "@/components/ui/select";

interface Props {
    negocioId: string;
}

// Interfaz extendida para el estado local (sin cambios)
interface CampoConOrden extends CRMCampoPersonalizado {
    orden: number;
    id: string;
    nombre: string;
    nombreCampo: string;
    tipo: string;
    requerido: boolean;
    status: string;
    crmId: string;
    crm?: CRM;
    createdAt: Date;
    updatedAt: Date;
}

// Tipo para el formulario modal (sin cambios)
type CampoFormData = Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'nombreCampo' | 'tipo' | 'requerido' | 'status'>>;

// --- Helper para generar nombreCampo (sin cambios) ---
function generarNombreCampo(nombreVisible: string): string {
    if (!nombreVisible) return '';
    return nombreVisible
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 50);
}


// --- Componente Interno para Item Arrastrable (sin cambios) ---
function SortableCampoItem({ campo, onEditClick }: { campo: CampoConOrden, onEditClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campo.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
    };
    const listItemClasses = `flex items-center gap-3 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const tipoClasses = "text-xs bg-zinc-600 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";
    const requeridoClasses = "text-xs font-medium text-amber-400";

    const TipoIcon = useCallback(() => {
        switch (campo.tipo?.toLowerCase()) {
            case 'texto': return <FileText size={14} className="text-cyan-400" />;
            case 'numero': return <Hash size={14} className="text-emerald-400" />;
            case 'fecha': return <CalendarIcon size={14} className="text-purple-400" />;
            case 'booleano': return <ToggleLeft size={14} className="text-rose-400" />;
            default: return <FileText size={14} className="text-zinc-400" />;
        }
    }, [campo.tipo]);

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover campo"><GripVertical size={18} /></button>
            <span title={`Tipo: ${campo.tipo}`}><TipoIcon /></span>
            <div className="flex-grow mr-2 overflow-hidden">
                <span className="text-sm font-medium text-zinc-200 truncate" title={campo.nombre}>{campo.nombre}</span>
                <span className="block text-xs text-zinc-500 font-mono truncate" title={`ID Interno: ${campo.nombreCampo}`}>({campo.nombreCampo})</span>
                {campo.requerido && <span className={requeridoClasses} title="Campo requerido"> * Requerido</span>}
            </div>
            <span className={tipoClasses}>{campo.tipo}</span>
            <button onClick={onEditClick} className={buttonEditClasses} title="Editar Campo"><PencilIcon size={16} /></button>
        </li>
    );
}


// --- Componente Principal ---
export default function CRMCamposPersonalizados({ negocioId }: Props) {
    const [campos, setCampos] = useState<CampoConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [crmId, setCrmId] = useState<string | null>(null); // Estado para crmId

    // Estados para el Modal (sin cambios)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [campoParaEditar, setCampoParaEditar] = useState<CampoConOrden | null>(null);
    const [modalFormData, setModalFormData] = useState<CampoFormData>({});
    const [generatedNombreCampo, setGeneratedNombreCampo] = useState('');
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios)
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300 ml-2";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50";
    const readOnlyInputClasses = `${inputBaseClasses} bg-zinc-950 text-zinc-500 cursor-not-allowed font-mono text-xs`;


    // Sensores dnd-kit (sin cambios)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Carga de datos (sin cambios) ---
    const fetchCampos = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) {
            setError("ID de negocio no disponible.");
            setLoading(false);
            return;
        }
        if (isInitialLoad) setLoading(true);
        setError(null);
        setCrmId(null);
        setCampos([]);

        try {
            const result = await obtenerCamposPersonalizadosCRM(negocioId);
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setCampos((result.data.campos || []).map((c, index) => ({
                    id: c.id,
                    crmId: c.crmId,
                    nombre: c.nombre,
                    nombreCampo: c.nombreCampo ?? '',
                    tipo: c.tipo,
                    requerido: c.requerido,
                    status: c.status,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    orden: c.orden ?? index + 1,
                })));
                if (!result.data.crmId) {
                    setError("CRM no encontrado para este negocio. Debe configurarse primero.");
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar campos.");
            }
        } catch (err) {
            console.error("Error al obtener los campos personalizados:", err);
            setError(`No se pudieron cargar los campos: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setCampos([]);
            setCrmId(null);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => { fetchCampos(true); }, [fetchCampos]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', campo?: CampoConOrden) => {
        if (mode === 'create' && !crmId) {
            setError("No se puede crear un campo sin un CRM configurado.");
            return;
        }
        setModalMode(mode);
        setCampoParaEditar(mode === 'edit' ? campo || null : null);
        const initialData = mode === 'edit' && campo ?
            { nombre: campo.nombre, nombreCampo: campo.nombreCampo, tipo: campo.tipo, requerido: campo.requerido, status: campo.status } :
            { nombre: '', nombreCampo: '', tipo: 'texto', requerido: false, status: 'activo' };
        setModalFormData(initialData);
        setGeneratedNombreCampo(mode === 'create' ? generarNombreCampo(initialData.nombre || '') : (initialData.nombreCampo || ''));
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setCampoParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); setGeneratedNombreCampo('');
        }, 300);
    };

    // Manejador para cambios en inputs y select (unificado)
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { // Añadido HTMLSelectElement
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // Asegurarse de leer 'checked' para checkboxes
        const checkedValue = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
        const fieldName = name as keyof CampoFormData;

        // Usar checkedValue si es checkbox, sino usar value
        const newValue: string | boolean | undefined = isCheckbox ? checkedValue : value;
        let newNombreCampo = generatedNombreCampo;

        if (fieldName === 'nombre' && modalMode === 'create') {
            newNombreCampo = generarNombreCampo(value);
            setGeneratedNombreCampo(newNombreCampo);
        }

        setModalFormData(prev => ({
            ...prev,
            [fieldName]: newValue,
            ...(modalMode === 'create' && { nombreCampo: newNombreCampo })
        }));
        setModalError(null);
    };

    // --- handleSelectChange ELIMINADO ---

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre del campo (visible) es obligatorio."); return; }
        const nombreCampoFinal = modalMode === 'create' ? generatedNombreCampo : campoParaEditar?.nombreCampo;
        if (!nombreCampoFinal) { setModalError("No se pudo determinar un nombre de campo interno válido."); return; }
        if (!modalFormData.tipo) { setModalError("El tipo de dato es obligatorio."); return; }

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                nombreCampo: nombreCampoFinal,
                tipo: modalFormData.tipo,
                requerido: modalFormData.requerido || false,
                status: modalFormData.status || 'activo',
            };

            if (modalMode === 'create') {
                if (!crmId) throw new Error("crmId no está disponible para crear el campo.");
                result = await crearCampoPersonalizadoCRM({
                    crmId: crmId,
                    nombre: dataToSend.nombre,
                    nombreCampo: dataToSend.nombreCampo,
                    tipo: dataToSend.tipo,
                    requerido: dataToSend.requerido
                });
            } else if (modalMode === 'edit' && campoParaEditar?.id) {
                const { ...editableData } = dataToSend;
                result = await editarCampoPersonalizadoCRM(campoParaEditar.id, editableData);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) { await fetchCampos(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} campo:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => { /* ... (sin cambios) ... */
        if (!campoParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el campo "${campoParaEditar.nombre}"?\n\n¡IMPORTANTE! Esto eliminará la definición del campo. Los datos existentes para este campo en los Leads NO se borrarán, pero ya no serán visibles ni editables a través de la interfaz estándar. Esta acción no se puede deshacer.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCampoPersonalizadoCRM(campoParaEditar.id);
                if (result?.success) { await fetchCampos(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando campo:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Manejador Drag End (sin cambios) ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => { /* ... (sin cambios) ... */
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = campos.findIndex((c) => c.id === active.id);
            const newIndex = campos.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedCampos = arrayMove(campos, oldIndex, newIndex);
            const finalCampos = reorderedCampos.map((c, index) => ({ ...c, orden: index + 1 }));
            setCampos(finalCampos);
            const ordenData = finalCampos.map(({ id, orden }) => ({ id, orden }));
            setIsSavingOrder(true); setError(null);
            try {
                const result = await ordenarCamposPersonalizadosCRM(ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
            } catch (saveError) {
                console.error('Error al guardar el orden:', saveError);
                setError('Error al guardar el nuevo orden.');
                fetchCampos();
            } finally { setIsSavingOrder(false); }
        }
    }, [campos, fetchCampos]);


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <ListPlus size={16} /> Campos Personalizados
                </h3>
                <button
                    onClick={() => openModal('create')}
                    className={buttonPrimaryClasses}
                    title={!crmId ? "Configura el CRM primero" : "Crear nuevo campo"}
                    disabled={!crmId || loading}
                >
                    <PlusIcon size={14} /> <span>Crear Campo</span>
                </button>
            </div>

            {/* Errores y Guardado Orden */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}
            {isSavingOrder && <div className="mb-2 flex items-center justify-center text-xs text-blue-300"><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...</div>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando campos...</span></div>)
                    : campos.length === 0 && !error && crmId ? (<div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay campos personalizados definidos.</p></div>)
                        : !crmId && !loading && !error ? (<div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>El CRM no está configurado.</p></div>)
                            : campos.length > 0 ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={campos.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                        <ul className='space-y-0'>
                                            {campos.map((campo) => (
                                                <SortableCampoItem
                                                    key={campo.id}
                                                    campo={campo}
                                                    onEditClick={() => openModal('edit', campo)}
                                                />
                                            ))}
                                        </ul>
                                    </SortableContext>
                                </DndContext>
                            ) : null}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Campo Personalizado' : 'Editar Campo Personalizado'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                {/* Input para Nombre (Visible) */}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre del Campo (Visible) <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleInputChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} placeholder="Ej: Fecha de Reunión" />
                                </div>
                                {/* Input (read-only) para Nombre Campo (Interno) */}
                                <div>
                                    <label htmlFor="modal-nombreCampo" className={labelBaseClasses}>Nombre Campo (Interno/Automático)</label>
                                    <input type="text" id="modal-nombreCampo" name="nombreCampo" value={generatedNombreCampo} className={readOnlyInputClasses} readOnly disabled title="Identificador único usado internamente (no editable)." />
                                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Info size={12} /> Se genera desde el nombre visible. **No se puede cambiar después de crear.**</p>
                                </div>

                                {/* --- SELECT NATIVO RESTAURADO --- */}
                                <div>
                                    <label htmlFor="modal-tipo" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select
                                        id="modal-tipo"
                                        name="tipo" // Asegúrate que el 'name' coincida con la clave en modalFormData
                                        value={modalFormData.tipo || 'texto'}
                                        onChange={handleInputChange} // Usar el manejador general
                                        className={`${inputBaseClasses} appearance-none`} // appearance-none para intentar quitar estilo nativo
                                        required
                                        disabled={isSubmittingModal}
                                    >
                                        <option value="texto">Texto</option>
                                        <option value="numero">Número</option>
                                        <option value="fecha">Fecha</option>
                                        <option value="booleano">Sí/No (Booleano)</option>
                                        {/* Puedes añadir más tipos si los soportas */}
                                    </select>
                                    {/* Nota: El problema de posicionamiento del menú desplegable puede persistir con el select nativo. */}
                                </div>
                                {/* --- FIN SELECT NATIVO RESTAURADO --- */}

                                {/* Requerido */}
                                <div className="flex items-center pt-2">
                                    <input type="checkbox" id="modal-requerido" name="requerido" checked={modalFormData.requerido || false} onChange={handleInputChange} className={checkboxClasses} disabled={isSubmittingModal} />
                                    <label htmlFor="modal-requerido" className={checkboxLabelClasses}>¿Es un campo obligatorio?</label>
                                </div>
                            </div>
                            {/* Footer Modal */}
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear Campo' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


// --------------------------------------------------
// Server Actions (Sin cambios respecto a la versión anterior en este bloque)
// app/admin/_lib/crmCampoPersonalizado.actions.ts (Ajusta la ruta!)
// --------------------------------------------------
/*
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { CRMCampoPersonalizado } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Tipo de Retorno para obtenerCamposPersonalizadosCRM ---
interface ObtenerCamposResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        campos: CRMCampoPersonalizado[];
    } | null;
    error?: string;
}

// --- Obtener crmId y TODOS los campos personalizados para un Negocio, ordenados ---
export async function obtenerCamposPersonalizadosCRM(negocioId: string): Promise<ObtenerCamposResult> {
     if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
     try {
        // Obtener el crmId y los campos directamente
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true,
                        CampoPersonalizado: { // Incluir los campos directamente
                            orderBy: { orden: 'asc' },
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;
        const campos = (negocioConCRM?.CRM?.CampoPersonalizado ?? []) as CRMCampoPersonalizado[];

        return {
            success: true,
            data: {
                crmId: crmId,
                campos: campos
            }
        };

    } catch (error) {
        console.error(`Error fetching custom fields for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los campos personalizados.' };
    }
}


// --- Crear un nuevo campo personalizado (Recibe crmId) ---
export async function crearCampoPersonalizadoCRM(
    data: Pick<CRMCampoPersonalizado, 'crmId' | 'nombre' | 'nombreCampo' | 'tipo' | 'requerido'>
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim() || !data.nombreCampo?.trim() || !data.tipo) {
            return { success: false, error: "crmId, nombre, nombreCampo y tipo son requeridos." };
        }

        // Validar nombreCampo (solo letras minúsculas, números y guiones bajos)
        if (!/^[a-z0-9_]+$/.test(data.nombreCampo)) {
             return { success: false, error: "El Nombre Interno (ID) solo puede contener letras minúsculas, números y guiones bajos (_)." };
        }


        // Calcular el siguiente orden
        const ultimoOrden = await prisma.cRMCampoPersonalizado.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        const newCampo = await prisma.cRMCampoPersonalizado.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                nombreCampo: data.nombreCampo.trim(), // Ya generado y validado
                tipo: data.tipo,
                requerido: data.requerido ?? false,
                orden: nuevoOrden,
                status: 'activo',
            },
        });
        return { success: true, data: newCampo as CRMCampoPersonalizado };
    } catch (error) {
        console.error('Error creating custom field:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             // Asume índice unique(crmId, nombre) O unique(crmId, nombreCampo)
            if (error.meta?.target?.includes('nombreCampo')) {
                 return { success: false, error: `El Nombre Interno (ID) '${data.nombreCampo}' ya existe para este CRM.` };
            }
             if (error.meta?.target?.includes('nombre')) {
                 return { success: false, error: `El Nombre Visible '${data.nombre}' ya existe para este CRM.` };
            }
             return { success: false, error: `Ya existe un campo con un nombre similar.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear campo." };
    }
}

// --- Editar un campo (NO permite editar nombreCampo) ---
export async function editarCampoPersonalizadoCRM(
    id: string,
    data: Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'tipo' | 'requerido' | 'status'>> // Excluye nombreCampo
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };

        const dataToUpdate: Prisma.CRMCampoPersonalizadoUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.tipo !== undefined) dataToUpdate.tipo = data.tipo;
        if (data.requerido !== undefined) dataToUpdate.requerido = data.requerido;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        const updatedCampo = await prisma.cRMCampoPersonalizado.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCampo as CRMCampoPersonalizado };
    } catch (error) {
        console.error(`Error updating custom field ${id}:`, error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             // Asume índice unique(crmId, nombre)
             if (error.meta?.target?.includes('nombre')) {
                 return { success: false, error: `El Nombre Visible '${data.nombre}' ya existe para este CRM.` };
            }
             return { success: false, error: `Ya existe un campo con un nombre similar.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar campo." };
    }
}

// --- Eliminar un campo ---
export async function eliminarCampoPersonalizadoCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };

        // **Consideración**: ¿Qué pasa si una Tarea requiere este campo (TareaCampoPersonalizado)?
        // El schema tiene onDelete: Restrict, por lo que Prisma debería impedir el borrado si está en uso.

        await prisma.cRMCampoPersonalizado.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting custom field ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            // P2014 indica violación de relación requerida (ej. TareaCampoPersonalizado)
            return { success: false, error: "No se puede eliminar el campo porque está siendo utilizado por una o más Tareas." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar campo." };
    }
}

// --- Ordenar Campos ---
export async function ordenarCamposPersonalizadosCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) {
        return { success: true };
    }
    try {
        const updatePromises = items.map(item =>
            prisma.cRMCampoPersonalizado.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating custom fields order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar campos." };
    }
}
*/
