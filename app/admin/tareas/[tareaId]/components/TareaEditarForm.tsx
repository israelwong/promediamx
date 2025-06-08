// Ruta actual: app/admin/tareas/[tareaId]/components/TareaEditarForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // Para notificaciones

// --- ACCIONES ---
import {
    // obtenerTareaPorId, // Se usa en el layout, pero lo mantenemos aquí para la re-sincronización
    actualizarTarea,
    eliminarTarea,
    obtenerCategoriasParaDropdown,
} from '@/app/admin/_lib/actions/tarea/tarea.actions';

// Ya no necesitaríamos obtenerCanalesActivos si se elimina la sección
// import { obtenerCanalesActivos } from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.actions';
import { obtenerEtiquetasTarea } from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.actions';

// --- TIPOS Y ESQUEMAS ZOD ---
import {
    ActualizarTareaInputSchema,
    type TareaParaEditar,
    type ActualizarTareaInput,
    type CategoriaTareaSimple,
} from '@/app/admin/_lib/actions/tarea/tarea.schemas';

// Ya no necesitaríamos CanalConversacionalSimple si se elimina la sección
// import type { CanalConversacionalSimple } from '@/app/admin/_lib/actions/canalConversacional/canalConversacional.schemas';
import type { EtiquetaConOrden as EtiquetaTareaParaSelect } from '@/app/admin/_lib/actions/etiquetaTarea/etiquetaTarea.schemas';
// import type { ActionResult } from '@/app/admin/_lib/types';

// --- ICONOS ---
import { Loader2, Trash2, Save, XIcon, Settings2, MessageSquareText } from 'lucide-react'; // Añadido BanIcon
import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch'; // Usaremos el Switch de ui/
import { Label } from '@/app/components/ui/label';   // Usaremos Label de ui/

import TareaIcono from './TareaIcono';

interface Props {
    tareaId: string;
    initialData: TareaParaEditar;
    currentNombre: string;
    onNombreChange: (newName: string) => void;
    onIconoUrlChange?: (newUrl: string | null | undefined) => void;
}

export default function TareaEditarForm({ tareaId, initialData, currentNombre, onNombreChange }: Props) {
    const router = useRouter();

    // Estado para los datos del formulario, inicializado desde initialData
    // El nombre se maneja a través de currentNombre (prop)
    const [formData, setFormData] = useState<Partial<Omit<ActualizarTareaInput, 'nombre'>>>({});

    const [categorias, setCategorias] = useState<CategoriaTareaSimple[]>([]);
    // const [canales, setCanales] = useState<CanalConversacionalSimple[]>([]); // Se elimina si la sección se va
    const [etiquetas, setEtiquetas] = useState<EtiquetaTareaParaSelect[]>([]);

    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Nuevo estado para carga inicial
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ActualizarTareaInput, string[]>>>({});

    // Clases de Tailwind
    const labelBaseClasses = "text-zinc-300 block mb-1.5 text-sm font-medium";
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500 h-10";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px] whitespace-pre-wrap h-auto py-2`; // Ajustar padding para textarea
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
    const checkboxClasses = "h-4 w-4 shrink-0 rounded-sm border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";
    const fieldGroupClasses = "space-y-4 p-4 md:p-5 bg-zinc-800/50 rounded-lg border border-zinc-700/70 shadow"; // Fondo ligeramente más claro
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2.5 mb-5 flex items-center gap-2.5";


    const resetFormState = useCallback((data: TareaParaEditar) => {
        setFormData({
            descripcionMarketplace: data.descripcionMarketplace ?? undefined,
            instruccion: data.instruccion ?? undefined,
            precio: data.precio ?? undefined,
            rol: data.rol ?? undefined,
            personalidad: data.personalidad ?? undefined,
            version: data.version ?? 1.0, // Default a 1.0 si es null/undefined
            status: (data.status === 'activo' || data.status === 'inactivo' || data.status === 'beta' || data.status === 'proximamente') ? data.status : 'inactivo',
            categoriaTareaId: data.categoriaTareaId ?? undefined,
            iconoUrl: data.iconoUrl ?? undefined,
            // canalIds: data.canalesSoportados?.map(c => c.canalConversacionalId) || [], // Eliminar si se quita la sección
            etiquetaIds: data.etiquetas?.map(e => e.etiquetaTareaId).filter(Boolean) as string[] || [],
        });
        onNombreChange(data.nombre); // Sincronizar el nombre con el layout
    }, [onNombreChange]);

    useEffect(() => {
        resetFormState(initialData);
        setIsLoadingInitialData(false); // Marcar que initialData se ha procesado
    }, [initialData, resetFormState]);


    // Carga de datos para dropdowns (categorías, etiquetas)
    useEffect(() => {
        const fetchDropdownData = async () => {
            // setIsLoadingInitialData(true); // No es necesario si ya se maneja con initialData
            try {
                const [categoriasResult, etiquetasResult /*, canalesResult */] = await Promise.all([
                    obtenerCategoriasParaDropdown(),
                    obtenerEtiquetasTarea(),
                    // obtenerCanalesActivos() // Eliminar si se quita la sección
                ]);

                if (categoriasResult.success && categoriasResult.data) setCategorias(categoriasResult.data);
                else console.error("Error cargando categorías:", categoriasResult.error);

                if (etiquetasResult.success && etiquetasResult.data) setEtiquetas(etiquetasResult.data);
                else console.error("Error cargando etiquetas:", etiquetasResult.error);

                // if (canalesResult.success && canalesResult.data) setCanales(canalesResult.data); // Eliminar
                // else console.error("Error cargando canales:", canalesResult.error); // Eliminar

            } catch (err) {
                console.error("Error fetching dropdown data:", err);
                toast.error("Error al cargar datos para el formulario.");
            } finally {
                // setIsLoadingInitialData(false); // Ya no es necesario
            }
        };
        fetchDropdownData();
    }, []);


    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setSubmitError(null); setValidationErrors({}); // Limpiar errores al cambiar cualquier campo

        if (name === 'nombre') {
            onNombreChange(value); // Notificar al layout
        } else if (name === 'statusSwitch') { // Manejo especial para el Switch de status
            const isChecked = (e.target as HTMLInputElement).checked;
            setFormData(prevState => ({ ...prevState, status: isChecked ? 'activo' : 'inactivo' }));
        }
        else {
            let finalValue: string | number | undefined | null = value;
            if (type === 'number') {
                finalValue = value === '' ? undefined : parseFloat(value);
                if (isNaN(finalValue as number)) finalValue = undefined;
            } else if ((name === 'categoriaTareaId' || name === 'iconoUrl') && value === '') {
                finalValue = undefined;
            }
            setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        }
    };

    const handleMultiSelectChange = (name: 'etiquetaIds' /* | 'canalIds' */, id: string) => {
        setSubmitError(null); setValidationErrors({});
        setFormData(prevState => {
            const currentIds = prevState[name] || [];
            const newIds = currentIds.includes(id)
                ? currentIds.filter(currentId => currentId !== id)
                : [...currentIds, id];
            return { ...prevState, [name]: newIds };
        });
    };


    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        setSubmitError(null); setValidationErrors({});

        const dataToValidate: ActualizarTareaInput = {
            nombre: currentNombre.trim() || '',
            descripcionMarketplace: formData.descripcionMarketplace || null,
            instruccion: formData.instruccion || null,
            precio: formData.precio === undefined || formData.precio === null ? undefined : Number(formData.precio),
            rol: formData.rol || null,
            personalidad: formData.personalidad || null,
            version: formData.version === undefined || formData.version === null ? undefined : Number(formData.version),
            status: formData.status === 'activo' ? 'activo' : 'inactivo', // Asegurar que sea uno de los valores del enum
            categoriaTareaId: formData.categoriaTareaId || undefined,
            iconoUrl: formData.iconoUrl || null,
            // canalIds: [], // Obligatorio aunque no se use, por el esquema
            etiquetaIds: formData.etiquetaIds || [],
        };

        const validationResult = ActualizarTareaInputSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setValidationErrors(validationResult.error.flatten().fieldErrors as Record<string, string[]>);
            setSubmitError("Por favor, corrige los errores indicados.");
            toast.error("Error de validación. Revisa el formulario.");
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        toast.loading("Guardando cambios...", { id: 'actualizar-tarea' });
        try {
            const result = await actualizarTarea(tareaId, validationResult.data);
            if (result.success && result.data) {
                toast.success("Tarea actualizada correctamente.", { id: 'actualizar-tarea' });
                resetFormState(result.data as unknown as TareaParaEditar); // Cast si el tipo de retorno de actualizarTarea es TareaPrisma
            } else {
                setSubmitError(result.error || "Error desconocido al actualizar.");
                if (result.validationErrors) {
                    setValidationErrors(result.validationErrors as Record<string, string[]>);
                }
                toast.error(result.error || "Error al actualizar.", { id: 'actualizar-tarea' });
            }
        } catch (err: unknown) {
            const errorMsg = `Error al actualizar: ${err instanceof Error ? err.message : String(err)}`;
            setSubmitError(errorMsg);
            toast.error(errorMsg, { id: 'actualizar-tarea' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => router.push('/admin/tareas');

    const handleDelete = async () => {
        if (!initialData) return; // Usa initialData que es TareaParaEditar
        const suscripciones = initialData._count?.AsistenteTareaSuscripcion ?? 0;
        let confirmMessage = `¿Estás seguro de eliminar la Tarea "${currentNombre}"? Esta acción no se puede deshacer.`;
        if (suscripciones > 0) {
            confirmMessage += `\n\nADVERTENCIA: Esta tarea tiene ${suscripciones} asistente(s) activamente suscrito(s). Eliminarla podría afectar su funcionamiento.`;
        }

        if (window.confirm(confirmMessage)) { // Usar window.confirm para simplicidad
            setIsSubmitting(true); setSubmitError(null);
            toast.loading("Eliminando tarea...", { id: 'eliminar-tarea' });
            try {
                const result = await eliminarTarea(tareaId);
                if (result.success) {
                    toast.success("Tarea eliminada. Redirigiendo...", { id: 'eliminar-tarea' });
                    setTimeout(() => router.push('/admin/tareas'), 1500);
                } else {
                    setSubmitError(result.error || "Error desconocido al eliminar.");
                    toast.error(result.error || "Error al eliminar.", { id: 'eliminar-tarea' });
                }
            } catch (err: unknown) {
                const errorMsg = `Error al eliminar: ${err instanceof Error ? err.message : String(err)}`;
                setSubmitError(errorMsg);
                toast.error(errorMsg, { id: 'eliminar-tarea' });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (isLoadingInitialData) {
        return <div className="p-6 flex justify-center items-center h-full"><Loader2 className='animate-spin h-8 w-8 text-blue-500' /></div>;
    }

    if (!initialData && !isLoadingInitialData) {
        return (
            <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center">
                <h3 className="text-lg font-semibold text-red-300 mb-2">Error al Cargar Tarea</h3>
                <p className="text-red-400">{submitError || "No se pudieron cargar los datos iniciales de la tarea."}</p>
                <Button onClick={() => router.push('/admin/tareas')} variant="outline" className="mt-4">
                    Volver a la Lista
                </Button>
            </div>
        );
    }

    return (
        <form id="edit-tarea-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Encabezado con Nombre y Status (ya gestionado por TareaEditLayout a través de props) */}
            {/* El layout ya tiene el título y el switch de status, aquí solo el contenido del form */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Columna Izquierda del Formulario */}
                <div className="space-y-5">
                    <div className={fieldGroupClasses}>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <TareaIcono
                                    tareaId={tareaId}
                                    iconoUrl={formData.iconoUrl || initialData.iconoUrl} // Usa initialData como fallback
                                // onIconoUrlChange={(newUrl) => setFormData(prev => ({...prev, iconoUrl: newUrl || undefined}))}
                                // disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex-grow min-w-0">
                                <Label htmlFor="nombre" className={labelBaseClasses}>Nombre Tarea <span className="text-red-500">*</span></Label>
                                <input type="text" id="nombre" name="nombre" value={currentNombre} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmitting} placeholder="Nombre descriptivo de la tarea" />
                                {validationErrors.nombre && <p className="text-xs text-red-400 mt-1">{validationErrors.nombre.join(', ')}</p>}

                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <Label htmlFor="precio" className={labelBaseClasses}>Precio</Label>
                                        <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.precio ? 'border-red-500' : ''}`} disabled={isSubmitting} step="0.01" min="0" placeholder="0.00" />
                                        {validationErrors.precio && <p className="text-xs text-red-400 mt-1">{validationErrors.precio.join(', ')}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="version" className={labelBaseClasses}>Versión</Label>
                                        <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.version ? 'border-red-500' : ''}`} step="0.1" min="0.1" placeholder="1.0" disabled={isSubmitting} />
                                        {validationErrors.version && <p className="text-xs text-red-400 mt-1">{validationErrors.version.join(', ')}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={fieldGroupClasses}>
                        <Label htmlFor="descripcionMarketplace" className={labelBaseClasses}>Descripción para Marketplace</Label>
                        <textarea id="descripcionMarketplace" name="descripcionMarketplace" value={formData.descripcionMarketplace || ''} onChange={handleInputChange} className={`${textareaBaseClasses} ${validationErrors.descripcionMarketplace ? 'border-red-500' : ''}`} rows={6} disabled={isSubmitting} placeholder="Describe qué hace esta tarea y sus beneficios para el usuario final que la contrataría en el marketplace." />
                        {validationErrors.descripcionMarketplace && <p className="text-xs text-red-400 mt-1">{validationErrors.descripcionMarketplace.join(', ')}</p>}
                    </div>


                    {/* SECCIÓN DE ETIQUETAS (si se mantiene) */}
                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}>Etiquetas</h3>
                        {etiquetas.length === 0 ? (<p className="text-sm text-zinc-400 italic">No hay etiquetas disponibles.</p>) : (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 border border-zinc-700 bg-zinc-800/50 rounded-md shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 custom-scrollbar">
                                {etiquetas.map(etiqueta => (
                                    <Label key={etiqueta.id} htmlFor={`etiqueta-${etiqueta.id}`} className="flex items-center cursor-pointer hover:bg-zinc-700/50 p-1.5 rounded-md transition-colors">
                                        <input
                                            type="checkbox"
                                            id={`etiqueta-${etiqueta.id}`}
                                            name="etiquetaIds"
                                            value={etiqueta.id}
                                            checked={formData.etiquetaIds?.includes(etiqueta.id) || false}
                                            onChange={(e) => handleMultiSelectChange('etiquetaIds', e.target.value)}
                                            className={checkboxClasses}
                                            disabled={isSubmitting}
                                        />
                                        <span className={`${checkboxLabelClasses} ml-2`}>{etiqueta.nombre}</span>
                                    </Label>
                                ))}
                            </div>
                        )}
                        {validationErrors.etiquetaIds && <p className="text-xs text-red-400 mt-1">{validationErrors.etiquetaIds.join(', ')}</p>}
                    </div>
                </div>

                {/* Columna Derecha del Formulario */}
                <div className="space-y-5">

                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><MessageSquareText size={16} /> Instrucción Detallada para la IA</h3>
                        <Label htmlFor="instruccion" className={`${labelBaseClasses} text-zinc-400 text-xs mb-2`}>Define paso a paso cómo debe actuar el asistente o qué información clave debe considerar al usar esta tarea. Esto ayuda a la IA a entender mejor el contexto y los objetivos.</Label>
                        <textarea
                            id="instruccion"
                            name="instruccion"
                            value={formData.instruccion || ''}
                            onChange={handleInputChange}
                            className={`${textareaBaseClasses} ${validationErrors.instruccion ? 'border-red-500' : ''} min-h-[200px]`}
                            disabled={isSubmitting}
                            placeholder="Ej: 1. Saluda al usuario. 2. Pregunta por el producto de interés. 3. Si menciona 'X', ofrece el descuento 'Y'..."
                            rows={8}
                        />
                        {validationErrors.instruccion && <p className="text-xs text-red-400 mt-1">{validationErrors.instruccion.join(', ')}</p>}
                    </div>

                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><Settings2 size={16} /> Organización y Configuración IA</h3>
                        <div>
                            <Label htmlFor="categoriaTareaId" className={labelBaseClasses}>Categoría <span className="text-red-500">*</span></Label>
                            <select id="categoriaTareaId" name="categoriaTareaId" value={formData.categoriaTareaId || ''} onChange={handleInputChange} className={`${selectBaseClasses} ${validationErrors.categoriaTareaId ? 'border-red-500' : ''}`} required disabled={isSubmitting || categorias.length === 0}>
                                <option value="">-- Selecciona Categoría --</option>
                                {categorias.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                            </select>
                            {validationErrors.categoriaTareaId && <p className="text-xs text-red-400 mt-1">{validationErrors.categoriaTareaId.join(', ')}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                            <div>
                                <Label htmlFor="rol" className={labelBaseClasses}>Rol del Asistente (IA)</Label>
                                <input type="text" id="rol" name="rol" value={formData.rol || ''} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.rol ? 'border-red-500' : ''}`} disabled={isSubmitting} placeholder="Ej: 'Experto en Ventas'" />
                                {validationErrors.rol && <p className="text-xs text-red-400 mt-1">{validationErrors.rol.join(', ')}</p>}
                            </div>
                            <div>
                                <Label htmlFor="personalidad" className={labelBaseClasses}>Personalidad (IA)</Label>
                                <input type="text" id="personalidad" name="personalidad" value={formData.personalidad || ''} onChange={handleInputChange} className={`${inputBaseClasses} ${validationErrors.personalidad ? 'border-red-500' : ''}`} disabled={isSubmitting} placeholder="Ej: 'Amable y servicial'" />
                                {validationErrors.personalidad && <p className="text-xs text-red-400 mt-1">{validationErrors.personalidad.join(', ')}</p>}
                            </div>
                        </div>
                        <div className="mt-3">
                            <Label htmlFor="statusSwitch" className={labelBaseClasses}>Estado de la Tarea</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="statusSwitch"
                                    name="statusSwitch"
                                    checked={formData.status === 'activo'}
                                    onCheckedChange={(checked) => handleInputChange({ target: { name: 'statusSwitch', value: String(checked), type: 'checkbox', checked } } as unknown as ChangeEvent<HTMLInputElement>)}
                                    disabled={isSubmitting}
                                />
                                <Label htmlFor="statusSwitch" className="text-sm text-zinc-300">
                                    {formData.status === 'activo' ? 'Activa' : 'Inactiva'}
                                </Label>
                            </div>
                            {validationErrors.status && <p className="text-xs text-red-400 mt-1">{validationErrors.status.join(', ')}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Nueva Sección de Botones al Pie del Formulario --- */}
            <div className="mt-8 pt-6 border-t border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                    <Button
                        type="button"
                        onClick={handleDelete}
                        variant="destructive" // Usa la variante destructiva de tu componente Button
                        className="w-full sm:w-auto text-red-400 hover:text-red-300 bg-transparent hover:bg-red-900/30 border border-red-500/50" // Estilo más sutil para destructive
                        disabled={isSubmitting}
                        title={'Eliminar esta tarea permanentemente'}
                    >
                        <Trash2 size={16} className="mr-2" /> Eliminar Tarea
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <Button
                        type="button"
                        onClick={handleCancel}
                        variant="outline" // Usa la variante outline
                        className="w-full sm:w-auto"
                        disabled={isSubmitting}
                    >
                        <XIcon size={16} className="mr-2" />Cancelar
                    </Button>
                    <Button
                        type="submit" // Este es el botón principal del formulario
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700" // Estilo primario
                        disabled={isSubmitting || isLoadingInitialData}
                    >
                        {isSubmitting ? <Loader2 className='animate-spin h-4 w-4 mr-2' /> : <Save size={16} className="mr-2" />}
                        Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* Mensajes de Error/Éxito Globales del Formulario (opcionalmente aquí también o solo arriba) */}
            {submitError && !isSubmitting && <p className="mt-4 text-center text-red-400 bg-red-500/10 p-2 rounded text-sm">{submitError}</p>}
            {/* successMessage ya no se usa localmente, se maneja con toast */}

        </form>
    );
}