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
    obtenerEtiquetasTarea,
    crearEtiquetaTarea,
    editarEtiquetaTarea,
    eliminarEtiquetaTarea,
    ordenarEtiquetasTarea
} from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.actions'; // Ajusta la ruta si es necesario

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    EtiquetaTareaInputSchema,     // El esquema Zod para validación del formulario
    type EtiquetaTareaInput,      // Tipo inferido para los datos del formulario
    type EtiquetaConOrden          // Para el estado local y la UI (definido en schemas.ts)
} from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import type { EtiquetaTarea as EtiquetaTareaPrisma } from '@prisma/client';


// --- ICONOS ---
import {
    Loader2, ListChecks, PlusIcon, Trash2, Save, XIcon, GripVertical, Tags, InfoIcon, AlertTriangleIcon
} from 'lucide-react';

// --- Componente SortableEtiquetaRow ---
// (Tu implementación original se ve bien, asegurar que 'etiqueta' sea de tipo EtiquetaConOrden)
function SortableEtiquetaRow({ id, etiqueta, onEdit }: { id: string; etiqueta: EtiquetaConOrden; onEdit: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, };
    const tdBaseClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest('[data-dnd-handle="true"]')) return;
        onEdit();
    };

    return (
        <tr ref={setNodeRef} style={style} className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500 bg-zinc-700' : ''}`} onClick={handleRowClickInternal}>
            <td className={`${tdBaseClasses} text-center w-10`}><button {...attributes} {...listeners} data-dnd-handle="true" className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Arrastrar para reordenar" onClick={(e) => e.stopPropagation()}><GripVertical size={14} /></button></td>
            <td className={`${tdBaseClasses} text-zinc-100 font-medium`}><div className="flex items-center gap-2"><Tags size={14} className="text-zinc-500 flex-shrink-0" /><span>{etiqueta.nombre}</span></div></td>
            <td className={`${tdBaseClasses} text-zinc-400 max-w-md`}>{etiqueta.descripcion ? <div className="flex items-center gap-1"><span title="Descripción"><InfoIcon size={12} className="text-zinc-500 flex-shrink-0" /></span><span className="line-clamp-1" title={etiqueta.descripcion}>{etiqueta.descripcion}</span></div> : <span className="text-zinc-600 italic">N/A</span>}</td>
            <td className={`${tdBaseClasses} text-center text-zinc-300 w-20`}>{etiqueta._count?.tareas ?? 0}</td>
        </tr>
    );
}

// Tipo para el estado del formulario del modal, incluyendo el id opcional para edición.
type ModalFormState = Partial<EtiquetaTareaInput> & { id?: string };

export default function TareasEtiquetas() {
    const [etiquetas, setEtiquetas] = useState<EtiquetaConOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [etiquetaParaEditar, setEtiquetaParaEditar] = useState<EtiquetaConOrden | null>(null);

    const [modalFormData, setModalFormData] = useState<ModalFormState>({
        nombre: '',
        descripcion: ''
    });
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalValidationErrors, setModalValidationErrors] = useState<Partial<Record<keyof EtiquetaTareaInput, string[]>>>({});

    // ... (Clases de Tailwind y sensores DnD se mantienen igual que en TareasCanales.tsx) ...
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
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;

    const buttonModalBase = "text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150";
    const buttonModalPrimary = `${buttonModalBase} bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalSecondary = `${buttonModalBase} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;
    const buttonModalDanger = `${buttonModalBase} bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mr-auto`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchEtiquetas = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await obtenerEtiquetasTarea(); // Devuelve ActionResult<EtiquetaConOrden[]>
            if (result.success && result.data) {
                setEtiquetas(result.data); // El mapeo ya se hace en la action
            } else {
                throw new Error(result.error || "No se pudieron cargar las etiquetas.");
            }
        } catch (err: unknown) {
            console.error("Error al obtener etiquetas:", err);
            setError(err instanceof Error ? err.message : "No se pudieron cargar las etiquetas.");
            setEtiquetas([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEtiquetas(true); }, [fetchEtiquetas]);

    const 