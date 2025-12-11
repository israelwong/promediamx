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
    obtenerCanalesConversacionales,
    crearCanalConversacional,
    editarCanalConversacional,
    eliminarCanalConversacional,
    ordenarCanalesConversacionales
} from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.actions'; // Ajusta la ruta si la mueves

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    CanalConversacionalInputSchema, // El esquema Zod para validación
    type CanalConversacionalInput,  // El tipo inferido para los datos del formulario
    type CanalConDetalles            // Para el estado local y la UI (definido en schemas.ts)
} from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.schemas';
import type { ActionResult } from '@/app/admin/_lib/types'; // Tu ActionResult global

// Asumimos que CanalConversacionalPrisma es el tipo que devuelve Prisma (podrías importarlo)
import type { CanalConversacional as CanalConversacionalPrisma } from '@prisma/client';


// --- ICONOS ---
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, Radio, GripVertical,
    MessageSquareText, InfoIcon, AlertTriangleIcon
} from 'lucide-react';

// --- Componente SortableCanalRow (Tu implementación original se ve bien, solo asegurar que 'canal' sea de tipo CanalConDetalles) ---
// (Tu código de SortableCanalRow aquí... sin cambios mayores si 'canal' ya es CanalConDetalles)
function SortableCanalRow({ id, canal, onEdit }: { id: string; canal: CanalConDetalles; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined };
    const tdBaseClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";
    const statusDotClasses = "w-2.5 h-2.5 rounded-full inline-block";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };

    const getCanalIcon = (iconName?: string | null) => {
        if (iconName?.toLowerCase().includes('whatsapp')) return <span title="WhatsApp"><MessageSquareText size={14} className="text-green-400 flex-shrink-0" /></span>;
        if (iconName) return <span className="text-xs font-mono text-zinc-500" title={iconName}>{iconName.substring(0, 3)}</span>;
        return <span title="Canal genérico"><MessageSquareText size={14} className="text-zinc-500 flex-shrink-0" /></span>;
    };

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500 bg-zinc-700' : ''}`} onClick={handleRowClickInternal}>
            <td className={`${tdBaseClasses} text-center w-10`}>
                <button {...attributes} {...listeners} data-dnd-handle="true" className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Arrastrar para reordenar" onClick={(e) => e.stopPropagation()}><GripVertical size={14} /></button>
            </td>
            <td className={`${tdBaseClasses} text-center w-12`}><span className={`${statusDotClasses} ${canal.status === 'activo' ? 'bg-green-500' : canal.status === 'beta' ? 'bg-amber-500' : 'bg-zinc-600'}`} title={`Status: ${canal.status}`}></span></td>
            <td className={`${tdBaseClasses} text-zinc-100 font-medium`}><div className="flex items-center gap-2">{getCanalIcon(canal.icono)}<span>{canal.nombre}</span></div></td>
            <td className={`${tdBaseClasses} text-zinc-400 max-w-sm`}>{canal.descripcion ? <div className="flex items-center gap-1"><span title="Descripción"><InfoIcon size={12} className="text-zinc-500 flex-shrink-0" /></span><span className="line-clamp-1" title={canal.descripcion}>{canal.descripcion}</span></div> : <span className="text-zinc-600 italic">N/A</span>}</td>
            <td className={`${tdBaseClasses} text-center text-zinc-300 w-20`}>{canal._count?.tareasSoportadas ?? 0}</td>
        </tr>
    );
}


// El tipo para el estado del formulario del modal ahora puede ser CanalConversacionalInput de Zod
// o un tipo específico si necesitas manejar campos no directamente en el schema (como 'id' en modo edición).
// Por simplicidad, si el modal siempre envía un subconjunto de CanalConversacionalInput, podemos usarlo.
// O mantener tu CanalFormData si es más conveniente para el estado intermedio del modal.
// Vamos a usar un tipo derivado o parcial para el estado del modal, ya que 'nombre' puede estar vacío inicialmente.
type ModalFormState = Partial<CanalConversacionalInput> & { id?: string };


export default function TareasCanales() {
    const [canales, setCanales] = useState<CanalConDetalles[]>([]); // Usar CanalConDetalles de Zod
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [canalParaEditar, setCanalParaEditar] = useState<CanalConDetalles | null>(null);

    // Estado del formulario del modal
    const [modalFormData, setModalFormData] = useState<ModalFormState>({
        nombre: '', // Nombre es string, no puede ser null si es requerido por Zod al enviar
        descripcion: '', // Inicializar como string vacío en lugar de null si Zod espera string
        icono: '',
        status: 'activo',
    });
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof CanalConversacionalInput, string[]>>>({});


    // ... (Clases de Tailwind, sensores DnD como en tu código original) ...
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
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";

    const labelBaseClasses = "block mb-1 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-500 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const selectBaseClasses = `${inputBaseClasses} appearance-none h-10`; // Consistencia altura

    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCanales = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await obtenerCanalesConversacionales(); // Devuelve ActionResult<CanalConversacionalConConteos[]>
            if (result.success && result.data) {
                // Mapear a CanalConDetalles, asegurando que 'orden' sea un número.
                // Y que _count exista o sea un objeto vacío.
                const canalesMapeados: CanalConDetalles[] = result.data.map((c, index) => ({
                    ...c,
                    orden: c.orden ?? index, // Fallback para orden si es null
                    descripcion: c.descripcion ?? null, // Asegurar null si no existe
                    icono: c.icono ?? null,       // Asegurar null si no existe
                    _count: c._count ?? { tareasSoportadas: 0, AsistenteVirtual: 0 }, // Asegurar que _count exista
                }));
                setCanales(canalesMapeados);
            } else {
                throw new Error(result.error || "No se pudieron cargar los canales.");
            }
        } catch (err: unknown) {
            console.error("Error al obtener canales:", err);
            setError(err instanceof Error ? err.message : "No se pudieron cargar los canales.");
            setCanales([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCanales(true); }, [fetchCanales]);

    const openModal = (modeToSet: 'create' | 'edit', canal?: CanalConDetalles) => {
        setModalMode(modeToSet);
        setCanalParaEditar(modeToSet === 'edit' ? canal || null : null);
        setModalFormData(modeToSet === 'edit' && canal ?
            {
                id: canal.id,
                nombre: canal.nombre,
                descripcion: canal.descripcion || '', // Formulario espera string
                icono: canal.icono || '',           // Formulario espera string
                status: canal.status as 'activo' | 'inactivo' | 'beta' // Casteo
            } :
            { nombre: '', descripcion: '', icono: '', status: 'activo' }
        );
        setIsModalOpen(true);
        setModalError(null);
        setModalValidationErrors({});
    };

    const closeModal = () => {
        // ... (tu lógica de closeModal) ...
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null);
            setCanalParaEditar(null);
            setModalFormData({ nombre: '', descripcion: '', icono: '', status: 'activo' });
            setModalError(null);
            setModalValidationErrors({});
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
        if (Object.keys(modalValidationErrors).length > 0) setModalValidationErrors({});
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setModalError(null);
        setModalValidationErrors({});

        // Preparar datos para validación Zod
        const dataToValidate: CanalConversacionalInput = {
            nombre: modalFormData.nombre || '', // Zod espera string, no undefined
            descripcion: modalFormData.descripcion || null, // Zod espera string | null
            icono: modalFormData.icono || null,             // Zod espera string | null
            status: (modalFormData.status || 'activo') as 'activo' | 'inactivo' | 'beta',
        };

        const validationResult = CanalConversacionalInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            const flatErrors = validationResult.error.flatten().fieldErrors;
            setModalValidationErrors(flatErrors as Partial<Record<keyof CanalConversacionalInput, string[]>>);
            setModalError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmittingModal(true);
        try {
            let result: ActionResult<CanalConversacionalPrisma>; // Usar el tipo Prisma o uno específico de salida
            const validatedData = validationResult.data; // Usar los datos validados por Zod

            if (modalMode === 'create') {
                result = await crearCanalConversacional(validatedData);
            } else if (modalMode === 'edit' && canalParaEditar?.id) {
                result = await editarCanalConversacional(canalParaEditar.id, validatedData);
            } else {
                throw new Error("Modo de modal inválido o ID de canal faltante.");
            }

            if (result.success) {
                await fetchCanales(); // Recargar la lista
                closeModal();
            } else {
                setModalError(result.error || "Ocurrió un error desconocido.");
                if (result.validationErrors) { // Errores de validación del backend
                    setModalValidationErrors(result.validationErrors as Partial<Record<keyof CanalConversacionalInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} canal:`, err);
            setModalError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        // ... (tu lógica de handleModalDelete, pero usando ActionResult) ...
        if (!canalParaEditar?.id || !canalParaEditar.nombre) return;
        // La validación de _count se mantiene
        const tareasCount = canalParaEditar._count?.tareasSoportadas ?? 0;
        if (tareasCount > 0) {
            setModalError(`No se puede eliminar: Usado por ${tareasCount} tarea(s).`);
            return;
        }

        if (confirm(`¿Seguro que quieres eliminar "${canalParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCanalConversacional(canalParaEditar.id);
                if (result.success) {
                    await fetchCanales(); closeModal();
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
        // ... (tu lógica de handleDragEnd, pero usando ActionResult) ...
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = canales.findIndex((c) => c.id === active.id);
            const newIndex = canales.findIndex((c) => c.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const re