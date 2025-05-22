'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// --- ACCIONES ---
import {
    obtenerTareaPorId,
    actualizarTarea,
    eliminarTarea,
    obtenerCategoriasParaDropdown, // Renombrada para claridad de su uso aquí
} from '@/app/admin/_lib/actions/tarea/tarea.actions';

import { obtenerCanalesActivos } from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.actions'; // Reusamos la de canales
import { obtenerEtiquetasTarea } from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.actions'; // Reusamos la de etiquetas

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    ActualizarTareaInputSchema, // Esquema Zod para validación
    type TareaParaEditar,
    type ActualizarTareaInput,
    type CategoriaTareaSimple, // Para el dropdown de categorías
} from '@/app/admin/_lib/actions/tarea/tarea.schemas';

import type { ActionResult } from '@/app/admin/_lib/types';
import type { CanalConversacionalSimple } from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.schemas'; // Para el dropdown de canales
import type { EtiquetaConOrden as EtiquetaTareaParaSelect } from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.schemas'; // Para el dropdown de etiquetas


// --- ICONOS ---
import { Loader2, Trash2, Save, XIcon, Settings2, MessageSquareText } from 'lucide-react';
import { Button } from '@/app/components/ui/button'; // Asumiendo que existe este componente

import TareaIcono from './TareaIcono'; // Asumiendo que existe este componente

interface Props {
    tareaId: string;
    initialData: TareaParaEditar; // Datos iniciales completos
    currentNombre: string;        // Nombre actual gestionado por el layout
    onNombreChange: (newName: string) => void; // Callback para notificar cambios de nombre
}


export default function TareaEditarForm({ tareaId, initialData, currentNombre, onNombreChange }: Props) {
    const router = useRouter();

    const [tareaOriginal, setTareaOriginal] = useState<TareaParaEditar | null>(null);
    // const [formData, setFormData] = useState<Partial<TareaEditFormState>>({}); // Empezar con Partial para carga inicial

    const [categorias, setCategorias] = useState<CategoriaTareaSimple[]>([]);
    const [canales, setCanales] = useState<CanalConversacionalSimple[]>([]);
    const [etiquetas, setEtiquetas] = useState<EtiquetaTareaParaSelect[]>([]); // Usar el tipo de etiqueta que devuelve la acción

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ActualizarTareaInput, string[]>>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Clases de Tailwind (como en tu componente) ---
    const labelBaseClasses = "text-zinc-300 block mb-1.5 text-sm font-medium";
    const labelWithIAIndicatorClasses = `${labelBaseClasses} flex items-center gap-1.5`;
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500 h-10"; // altura h-10
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px] whitespace-pre-wrap h-auto`; // h-auto para que crezca
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-200 ml-2 cursor-pointer";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer flex-shrink-0";
    const fieldGroupClasses = "space-y-4 p-4 bg-zinc-900/40 rounded-md border border-zinc-700/80";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2 mb-4 flex items-center gap-2";
    const headerButtonClasses = "font-medium py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs sm:text-sm";

    const [formData, setFormData] = useState<Partial<Omit<ActualizarTareaInput, 'nombre'>>>({
        // Inicializar otros campos del formulario a partir de initialData
        descripcionMarketplace: initialData.descripcionMarketplace ?? undefined,
        // descripcionTool: initialData.descripcionTool ?? undefined,
        instruccion: initialData.instruccion ?? undefined,
        precio: initialData.precio ?? undefined,
        rol: initialData.rol ?? undefined,
        personalidad: initialData.personalidad ?? undefined,
        version: initialData.version, // version es requerida por ActualizarTareaInputSchema
        status: initialData.status,   // status es requerido
        categoriaTareaId: initialData.categoriaTareaId ?? undefined,
        iconoUrl: initialData.iconoUrl ?? undefined,
        canalIds: initialData.canalesSoportados?.map(c => c.canalConversacionalId) || [],
        etiquetaIds: initialData.etiquetas?.map(e => e.etiquetaTareaId) || [],
    });


    // --- Carga inicial de datos ---
    useEffect(() => {
        if (!tareaId) {
            setError("No se proporcionó un ID de tarea.");
            setLoading(false);
            return;
        }
        const fetchInitialData = async () => {
            setLoading(true); setError(null); setSuccessMessage(null);
            try {
                const [tareaResult, categoriasResult, canalesResult, etiquetasResult] = await Promise.all([
                    obtenerTareaPorId(tareaId),
                    obtenerCategoriasParaDropdown(), // Acción que devuelve ActionResult<CategoriaTareaSimple[]>
                    obtenerCanalesActivos() as unknown as Promise<ActionResult<CanalConversacionalSimple[]>>, // Forzar el tipo para evitar error de 'never'
                    obtenerEtiquetasTarea()          // Acción que devuelve ActionResult<EtiquetaConOrden[]>
                ]);

                // Categorías
                if (categoriasResult.success && categoriasResult.data) setCategorias(categoriasResult.data);
                else throw new Error(categoriasResult.error || "Error cargando categorías");

                // Canales (ajustar según cómo devuelve la data tu acción)
                if (Array.isArray(canalesResult)) { // Si devuelve array directamente
                    setCanales(canalesResult.map(c => ({ id: c.id, nombre: c.nombre, icono: c.icono ?? null })));
                } else if (canalesResult.success && canalesResult.data) { // Si devuelve ActionResult
                    setCanales(canalesResult.data.map(c => ({ id: c.id, nombre: c.nombre, icono: c.icono ?? null })));
                } else {
                    throw new Error((canalesResult as ActionResult<unknown>).error || "Error cargando canales");
                }

                // Etiquetas
                if (etiquetasResult.success && etiquetasResult.data) setEtiquetas(etiquetasResult.data);
                else throw new Error(etiquetasResult.error || "Error cargando etiquetas");

                // Tarea
                if (tareaResult.success && tareaResult.data) {
                    setTareaOriginal(tareaResult.data);
                    // Mapear TareaParaEditar a TareaEditFormState (que es ActualizarTareaInput)
                    setFormData({
                        // nombre: tareaResult, // nombre es requerido por el schema
                        descripcionMarketplace: tareaResult.data.descripcionMarketplace ?? undefined,
                        // descripcionTool: tareaResult.data.descripcionTool ?? undefined,
                        instruccion: tareaResult.data.instruccion ?? undefined,
                        precio: tareaResult.data.precio ?? undefined,
                        rol: tareaResult.data.rol ?? undefined,
                        personalidad: tareaResult.data.personalidad ?? undefined,
                        version: tareaResult.data.version, // version es requerida
                        status: tareaResult.data.status,     // status es requerido
                        categoriaTareaId: tareaResult.data.categoriaTareaId ?? undefined,
                        iconoUrl: tareaResult.data.iconoUrl ?? undefined,
                        canalIds: tareaResult.data.canalesSoportados?.map(c => c.canalConversacionalId) || [],
                        etiquetaIds: tareaResult.data.etiquetas?.map(e => e.etiquetaTareaId) || [],
                    });
                } else {
                    throw new Error(tareaResult.error || `No se encontró la tarea con ID: ${tareaId}`);
                }
            } catch (err: unknown) {
                console.error("Error fetching initial data:", err);
                setError(`Error al cargar los datos: ${err instanceof Error ? err.message : String(err)}`);
                setTareaOriginal(null); setFormData({});
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [tareaId]);

    // --- Manejador de Cambios ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | undefined | null = value; // Permitir undefined o null

        setError(null); setSuccessMessage(null); setValidationErrors({});

        if (type === 'number') {
            finalValue = value === '' ? undefined : parseFloat(value); // Usar undefined para "no valor" en lugar de null para Zod
            if (isNaN(finalValue as number)) finalValue = undefined;
            // Permitir que la validación Zod maneje version <= 0
        } else if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            const id = checkbox.value;
            const isChecked = checkbox.checked;
            if (name === 'canalIds' || name === 'etiquetaIds') {
                setFormData(prevState => {
                    const currentIds = prevState[name as 'canalIds' | 'etiquetaIds'] || [];
                    const newIds = isChecked ? [...currentIds, id] : currentIds.filter(currentId => currentId !== id);
                    return { ...prevState, [name]: newIds.length > 0 ? newIds : undefined }; // undefined si está vacío
                });
                return;
            } else if (name === 'status') { finalValue = checkbox.checked ? 'activo' : 'inactivo'; }
            // else { finalValue = isChecked; } // No hay otros checkboxes booleanos directos en el form
        } else if ((name === 'categoriaTareaId') && value === '') {
            finalValue = undefined; // Usar undefined para opcionales en Zod
        } else if (name === 'iconoUrl' && value === '') {
            finalValue = undefined;
        }

        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
    };


    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name === 'nombre') { // El nombre se maneja por el prop onNombreChange
            onNombreChange(value); // Notificar al layout del cambio de nombre
        } else {
            // Lógica existente para otros campos (checkboxes, numbers, etc.)
            let finalValue: string | number | boolean | undefined | null = value;
            if (type === 'number') {
                finalValue = value === '' ? undefined : parseFloat(value);
                if (isNaN(finalValue as number)) finalValue = undefined;
            } else if (type === 'checkbox') {
                // ... tu lógica de checkboxes ...
                const checkbox = e.target as HTMLInputElement;
                const id = checkbox.value;
                const isChecked = checkbox.checked;
                if (name === 'canalIds' || name === 'etiquetaIds') {
                    setFormData(prevState => {
                        const currentIds = prevState[name as 'canalIds' | 'etiquetaIds'] || [];
                        const newIds = isChecked ? [...currentIds, id] : currentIds.filter(currentId => currentId !== id);
                        return { ...prevState, [name]: newIds.length > 0 ? newIds : undefined };
                    });
                    return; // Salir temprano para checkboxes de array
                } else if (name === 'status') { finalValue = checkbox.checked ? 'activo' : 'inactivo'; }
            } else if ((name === 'categoriaTareaId') && value === '') {
                finalValue = undefined;
            } else if (name === 'iconoUrl' && value === '') {
                finalValue = undefined;
            }
            setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        }
        setError(null); setSuccessMessage(null); // Limpiar mensajes
    };
    // --- Manejador de Submit ---
    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        setError(null); setSuccessMessage(null); setValidationErrors({});

        // Construir el objeto a validar con Zod, asegurando que los campos opcionales
        // sean undefined si están vacíos, para que Zod los maneje correctamente.
        const dataToValidate: Partial<ActualizarTareaInput> = {
            nombre: currentNombre || '', // nombre es requerido por el schema
            descripcionMarketplace: formData.descripcionMarketplace || undefined,
            // descripcionTool: formData.descripcionTool || undefined,
            instruccion: formData.instruccion || undefined,
            precio: formData.precio === null || formData.precio === undefined || isNaN(formData.precio) ? undefined : Number(formData.precio),
            rol: formData.rol || undefined,
            personalidad: formData.personalidad || undefined,
            version: formData.version === null || formData.version === undefined || isNaN(formData.version) ? undefined : Number(formData.version), // version es requerida
            status: formData.status || 'inactivo', // status es requerido
            categoriaTareaId: formData.categoriaTareaId || undefined,
            iconoUrl: formData.iconoUrl || undefined,
            canalIds: formData.canalIds || [],
            etiquetaIds: formData.etiquetaIds || [],
        };

        const validationResult = ActualizarTareaInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setValidationErrors(validationResult.error.flatten().fieldErrors as Partial<Record<keyof ActualizarTareaInput, string[]>>);
            setError("Por favor, corrige los errores indicados en el formulario.");
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        try {
            // Enviar solo los datos validados por Zod (validationResult.data)
            const result = await actualizarTarea(tareaId, validationResult.data);
            if (result.success && result.data) {
                setSuccessMessage("Tarea actualizada correctamente.");
                const updatedTareaResult = await obtenerTareaPorId(tareaId);
                if (updatedTareaResult.success && updatedTareaResult.data) {
                    setTareaOriginal(updatedTareaResult.data);
                }
            } else {
                setError(result.error || "Error desconocido al actualizar.");
                if (result.validationErrors) {
                    setValidationErrors(result.validationErrors as Partial<Record<keyof ActualizarTareaInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            setError(`Error al actualizar: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => { router.push('/admin/tareas') };

    const handleDelete = async () => {
        if (!tareaOriginal) return;
        const suscripciones = tareaOriginal._count?.AsistenteTareaSuscripcion ?? 0;
        let confirmMessage = `¿Estás seguro de eliminar la Tarea "${tareaOriginal.nombre}"? Esta acción no se puede deshacer.`;
        if (suscripciones > 0) {
            confirmMessage += `\n\nADVERTENCIA: Esta tarea tiene ${suscripciones} asistente(s) activamente suscrito(s). Eliminarla podría afectar su funcionamiento.`;
        }

        if (confirm(confirmMessage)) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarTarea(tareaId);
                if (result.success) {
                    setSuccessMessage("Tarea eliminada. Redirigiendo...");
                    setTimeout(() => router.push('/admin/tareas'), 1500);
                } else {
                    setError(result.error || "Error desconocido al eliminar.");
                }
            } catch (err: unknown) {
                setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // --- Renderizado ---
    if (loading) { /* ... (mismo loading) ... */
        return <div className="p-6 flex justify-center items-center h-full"><Loader2 className='animate-spin h-8 w-8 text-blue-500' /></div>;
    }
    if (error && !tareaOriginal && !isSubmitting) { /* ... (mismo error si no hay tareaOriginal) ... */
        return (
            <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Error al Cargar Tarea</h3>
                <p className="text-red-400">{error}</p>
                <Button onClick={() => router.push('/admin/tareas')} variant="outline" className="mt-4">
                    Volver a la Lista
                </Button>
            </div>
        );
    }
    if (!tareaOriginal) { /* ... (mismo no encontrada) ... */
        return (
            <div className="p-6 text-center">
                <p className="text-zinc-400">Tarea no encontrada (ID: {tareaId}).</p>
                <Button onClick={() => router.push('/admin/tareas')} variant="outline" className="mt-4">
                    Volver a la Lista
                </Button>
            </div>
        );
    }

    // El botón de eliminar se deshabilita si hay suscripciones activas
    // const puedeEliminar = (tareaOriginal._count?.AsistenteTareaSuscripcion ?? 0) === 0;

    return (
        // El JSX del formulario debe usar los nombres de campo de `formData` y `validationErrors`
        // y mostrar el `tareaOriginal.tareaFuncion?.nombre`
        // (El JSX es largo, me enfocaré en la estructura y puntos clave)
        <div>
            {/* --- ENCABEZADO --- */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-zinc-700 pb-4'>
                <div className='flex items-center gap-4'>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ml-3 text-sm font-medium text-zinc-300">{formData.status === 'activo' ? 'Activa' : 'Inactiva'}</span>
                    </label>
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white leading-tight flex items-center gap-2">
                            Editar Tarea
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">ID: {tareaId}</p>
                    </div>
                </div>
                <div className='flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end'>
                    {/* Botones de acción del encabezado */}

                    <Button type="button" onClick={handleCancel} variant="outline" className={`${headerButtonClasses} bg-zinc-700 hover:bg-zinc-600 text-zinc-100 focus:ring-zinc-400`} disabled={isSubmitting}>
                        <XIcon size={16} /> <span className='hidden sm:inline'>Cerrar</span>
                    </Button>


                    <Button onClick={() => handleSubmit()} form="edit-tarea-form" className={`${headerButtonClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                        <span className='hidden sm:inline'>Guardar Cambios</span><span className='sm:hidden'>Guardar</span>
                    </Button>
                </div>
            </div>

            {/* Mensajes Globales (movidos debajo del header para más visibilidad) */}
            {error && !isSubmitting && <p className="mb-4 text-center text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/30 text-sm">{successMessage}</p>}

            <form id="edit-tarea-form" className="grid grid-cols-1 lg:grid-cols-2 gap-6" noValidate>

                {/* --- Columna 1: Configuración Principal --- */}
                <div className="lg:col-span-1 flex flex-col space-y-5">
                    <div className={fieldGroupClasses}>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <TareaIcono
                                    tareaId={tareaId}
                                    iconoUrl={formData.iconoUrl || tareaOriginal.iconoUrl}
                                />
                            </div>
                            <div className="flex-grow min-w-0">
                                <label htmlFor="nombre" className={labelBaseClasses}>Nombre Tarea <span className="text-red-500">*</span></label>
                                <input type="text" id="nombre" name="nombre" value={currentNombre} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmitting} placeholder="Nombre descriptivo" />
                                {validationErrors.nombre && <p className="text-xs text-red-400 mt-1">{validationErrors.nombre.join(', ')}</p>}
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <label htmlFor="precio" className={labelBaseClasses}>Precio</label>
                                        <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.precio ? 'border-red-500' : ''}`} disabled={isSubmitting} step="0.01" min="0" placeholder="0.00" />
                                        {validationErrors.precio && <p className="text-xs text-red-400 mt-1">{validationErrors.precio.join(', ')}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="version" className={labelBaseClasses}>Versión <span className="text-red-500">*</span></label>
                                        <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.version ? 'border-red-500' : ''}`} required step="0.1" min="0.1" disabled={isSubmitting} />
                                        {validationErrors.version && <p className="text-xs text-red-400 mt-1">{validationErrors.version.join(', ')}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className={fieldGroupClasses}>
                        <label htmlFor="descripcionMarketplace" className={labelBaseClasses}>Descripción Marketplace</label>
                        <textarea
                            id="descripcionMarketplace"
                            name="descripcionMarketplace"
                            value={formData.descripcionMarketplace || ''}
                            rows={10}
                            onChange={handleChange}
                            className={`${textareaBaseClasses} ${validationErrors.descripcionMarketplace ? 'border-red-500' : ''}`} disabled={isSubmitting} placeholder="Para el marketplace..." />
                        {validationErrors.descripcionMarketplace && <p className="text-xs text-red-400 mt-1">{validationErrors.descripcionMarketplace.join(', ')}</p>}
                    </div>

                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><Settings2 size={16} /> Organización</h3>
                        <div>
                            <label htmlFor="categoriaTareaId" className={labelBaseClasses}>Categoría <span className="text-red-500">*</span></label>
                            <select id="categoriaTareaId" name="categoriaTareaId" value={formData.categoriaTareaId || ''} onChange={handleChange} className={`${selectBaseClasses} ${validationErrors.categoriaTareaId ? 'border-red-500' : ''}`} required disabled={isSubmitting || categorias.length === 0}>
                                <option value="">-- Selecciona Categoría --</option>
                                {categorias.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                            </select>
                            {validationErrors.categoriaTareaId && <p className="text-xs text-red-400 mt-1">{validationErrors.categoriaTareaId.join(', ')}</p>}
                        </div>
                        <div className="mt-4">
                            <label className={labelBaseClasses}>Canales Soportados</label>
                            {canales.length === 0 ? (<p className="text-sm text-zinc-400 italic">No hay canales.</p>) : (
                                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-zinc-700 rounded-md p-3 bg-zinc-800/50 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                    {canales.map(canal => (
                                        <label key={canal.id} htmlFor={`canal-${canal.id}`} className="flex items-center cursor-pointer hover:bg-zinc-700/50 p-1 rounded-md">
                                            <input type="checkbox" id={`canal-${canal.id}`} name="canalIds" value={canal.id} checked={formData.canalIds?.includes(canal.id) || false} onChange={handleChange} className={checkboxClasses} disabled={isSubmitting} />
                                            <span className={checkboxLabelClasses}>{canal.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <label className={labelBaseClasses}>Etiquetas</label>
                            {etiquetas.length === 0 ? (<p className="text-sm text-zinc-400 italic">No hay etiquetas.</p>) : (
                                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-zinc-700 rounded-md p-3 bg-zinc-800/50 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                    {etiquetas.map(etiqueta => (
                                        <label key={etiqueta.id} htmlFor={`etiqueta-${etiqueta.id}`} className="flex items-center cursor-pointer hover:bg-zinc-700/50 p-1 rounded-md">
                                            <input type="checkbox" id={`etiqueta-${etiqueta.id}`} name="etiquetaIds" value={etiqueta.id} checked={formData.etiquetaIds?.includes(etiqueta.id) || false} onChange={handleChange} className={checkboxClasses} disabled={isSubmitting} />
                                            <span className={checkboxLabelClasses}>{etiqueta.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Columna 2: Configuración IA, Función y Parámetros --- */}
                <div className="lg:col-span-1 flex  flex-col space-y-5">
                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><MessageSquareText size={16} /> Configuración IA</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="rol" className={labelWithIAIndicatorClasses}>Rol Asistente</label>
                                <input type="text" id="rol" name="rol" value={formData.rol || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.rol ? 'border-red-500' : ''}`} disabled={isSubmitting} placeholder="Ej: 'Experto en Ventas'" />
                                {validationErrors.rol && <p className="text-xs text-red-400 mt-1">{validationErrors.rol.join(', ')}</p>}
                            </div>
                            <div>
                                <label htmlFor="personalidad" className={labelWithIAIndicatorClasses}>Personalidad</label>
                                <input type="text" id="personalidad" name="personalidad" value={formData.personalidad || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.personalidad ? 'border-red-500' : ''}`} disabled={isSubmitting} placeholder="Ej: 'Amable y servicial'" />
                                {validationErrors.personalidad && <p className="text-xs text-red-400 mt-1">{validationErrors.personalidad.join(', ')}</p>}
                            </div>
                        </div>
                        {/* <div>
                            <label htmlFor="descripcionTool" className={labelWithIAIndicatorClasses}>Descripción para Tool (IA) <span className="text-red-500">*</span></label>
                            <textarea id="descripcionTool" name="descripcionTool" value={formData.descripcionTool || ''}
                                onChange={handleChange} className={`${textareaBaseClasses} ${validationErrors.descripcionTool ? 'border-red-500' : ''}`}
                                disabled={isSubmitting} rows={8}
                                placeholder="Describe qué hace esta tarea para la IA..."
                            />
                            {validationErrors.descripcionTool && <p className="text-xs text-red-400 mt-1">{validationErrors.descripcionTool.join(', ')}</p>}
                        </div> */}
                        <div>
                            <label htmlFor="instruccion" className={labelWithIAIndicatorClasses}>Instrucción Detallada (IA)</label>
                            <textarea
                                id="instruccion"
                                name="instruccion"
                                value={formData.instruccion || ''}
                                onChange={handleChange}
                                className={`${textareaBaseClasses} ${validationErrors.instruccion ? 'border-red-500' : ''} flex-grow`}
                                disabled={isSubmitting}
                                placeholder="Define paso a paso cómo debe actuar el asistente..."
                                rows={20}
                            />
                            {validationErrors.instruccion && <p className="text-xs text-red-400 mt-1">{validationErrors.instruccion.join(', ')}
                            </p>}
                        </div>
                    </div>

                    <Button type="button" onClick={handleDelete} variant="destructive" className={`${headerButtonClasses}  hover:bg-red-500/10 hover:text-red-400 focus:ring-red-500 disabled:text-zinc-500 disabled:hover:bg-transparent`} disabled={isSubmitting} title={'Eliminar esta tarea permanentemente'}>
                        <Trash2 size={14} /> <span className='hidden sm:inline'>Eliminar Tarea</span>
                    </Button>

                </div>
            </form>
        </div>
    );
}