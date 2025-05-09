'use client';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import TareaIcono from './TareaIcono'; // Asegúrate que la ruta sea correcta
import TareaFuncionFormulario from './TareaFuncionFormulario';

// Importar acciones y tipos actualizados
import {
    obtenerTareaPorId,
    actualizarTarea,
    eliminarTarea,
    obtenerFuncionesTareaDisponibles,
    // obtenerParametrosPorFuncionId,
    obtenerCategorias,
    obtenerTodosCanalesConversacionales,
    obtenerTodasEtiquetasTarea,
    mejorarTareaGemini
} from '@/app/admin/_lib/tareas.actions'; // Ajusta ruta
// Importar tipos base necesarios
import {
    Tarea,
    CategoriaTarea,
    CanalConversacional,
    EtiquetaTarea,
    // TareaFuncion,
    // ParametroRequerido,
    ActualizarTareaConRelacionesInput,
    TareaParaEditar,
    SugerenciasTarea // Asegúrate que este tipo esté definido correctamente
} from '@/app/admin/_lib/types'; // Ajusta ruta
import { Loader2, Trash2, Save, XIcon, Settings2, MessageSquareText, Sparkles } from 'lucide-react'; // Iconos

interface Props {
    tareaId: string;
}

// Tipo para el estado del formulario
type TareaEditFormState = Partial<Omit<Tarea, 'id' | 'orden' | 'createdAt' | 'updatedAt' | 'CategoriaTarea' | 'tareaFuncion' | 'etiquetas' | 'canalesSoportados' | 'camposPersonalizadosRequeridos' | 'AsistenteTareaSuscripcion' | 'TareaEjecutada' | '_count' | 'TareaGaleria'>> & { // Corregido: TareaGaleria en lugar de galeria
    canalIds?: string[];
    etiquetaIds?: string[];
};

// Tipo para los detalles de la tarea original
type TareaOriginalConDetalles = TareaParaEditar;

export default function TareaEditarForm({ tareaId }: Props) {
    const router = useRouter();

    // --- Estados ---
    const [tareaOriginal, setTareaOriginal] = useState<TareaOriginalConDetalles | null>(null);
    const [formData, setFormData] = useState<TareaEditFormState>({});
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [canales, setCanales] = useState<CanalConversacional[]>([]);
    const [etiquetas, setEtiquetas] = useState<EtiquetaTarea[]>([]);
    // const [funciones, setFunciones] = useState<Pick<TareaFuncion, 'id' | 'nombreVisible' | 'nombreInterno'>[]>([]);
    // const [parametrosDeFuncion, setParametrosDeFuncion] = useState<ParametroRequerido[]>([]);
    const [loading, setLoading] = useState(true);
    // const [loadingParams, setLoadingParams] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImproving, setIsImproving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);


    // --- Clases de Tailwind ---
    const labelBaseClasses = "text-zinc-300 block mb-1.5 text-sm font-medium";
    const labelWithIAIndicatorClasses = `${labelBaseClasses} flex items-center gap-1.5`;
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500";
    // --- IMPORTANTE: Asegurar que whitespace-pre-wrap está aquí ---
    // Esta clase es esencial para que el textarea respete los saltos de línea (\n y \n\n)
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px] whitespace-pre-wrap`;
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-200 ml-2 cursor-pointer";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer flex-shrink-0";
    const fieldGroupClasses = "space-y-4 p-4 bg-zinc-900/40 rounded-md border border-zinc-700/80";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2 mb-4 flex items-center gap-2";
    // const paramTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap";
    const headerButtonClasses = "font-medium py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs sm:text-sm";
    const iaIndicatorIconClasses = "text-indigo-400";

    // --- NUEVA FUNCIÓN HELPER ---
    const generarTrigger = (nombre: string): string => {
        if (!nombre) return '';
        return nombre
            .toLowerCase()
            .normalize("NFD") // Quitar acentos
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s_]/g, '') // Permitir letras, números, espacios, guion bajo
            .replace(/\s+/g, '_') // Reemplazar espacios con guion bajo
            .replace(/__+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
            .replace(/^_+|_+$/g, ''); // Quitar guiones bajos al inicio/final
    };


    // --- Carga inicial de datos ---
    useEffect(() => {
        // ... (sin cambios) ...
        if (!tareaId) {
            setError("No se proporcionó un ID de tarea.");
            setLoading(false);
            return;
        }
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const [tareaData, categoriasData, canalesData, etiquetasData] = await Promise.all([
                    obtenerTareaPorId(tareaId),
                    obtenerCategorias(),
                    obtenerTodosCanalesConversacionales(),
                    obtenerTodasEtiquetasTarea(),
                    obtenerFuncionesTareaDisponibles()
                ]);

                setCategorias(categoriasData || []);
                setCanales(canalesData || []);
                setEtiquetas(etiquetasData || []);
                // setFunciones(funcionesData || []);

                if (tareaData) {
                    setTareaOriginal(tareaData);
                    const initialFormData: TareaEditFormState = {
                        nombre: tareaData.nombre,
                        descripcion: tareaData.descripcion,
                        instruccion: tareaData.instruccion,
                        trigger: tareaData.trigger,
                        precio: tareaData.precio,
                        rol: tareaData.rol,
                        personalidad: tareaData.personalidad,
                        version: tareaData.version,
                        status: tareaData.status,
                        categoriaTareaId: tareaData.categoriaTareaId,
                        tareaFuncionId: tareaData.tareaFuncion?.id || undefined,
                        iconoUrl: tareaData.iconoUrl,
                        canalIds: tareaData.canalesSoportados?.map(c => c.canalConversacional.id) || [],
                        etiquetaIds: tareaData.etiquetas?.map(e => e.etiquetaTarea?.id ?? '') || [],
                    };
                    setFormData(initialFormData);
                    // if (initialFormData.tareaFuncionId) {
                    //     fetchParametrosParaFuncion(initialFormData.tareaFuncionId);
                    // }
                } else {
                    setError(`No se encontró la tarea con ID: ${tareaId}`);
                    setTareaOriginal(null); setFormData({});
                }
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setError(`Error al cargar los datos: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [tareaId])

    // --- Manejador de Cambios ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // ... (sin cambios) ...
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null = value;

        setError(null); setSuccessMessage(null);

        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null;
            if (name === 'version' && (finalValue === null || finalValue <= 0)) finalValue = 0.1;
        } else if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            const id = checkbox.value;
            const isChecked = checkbox.checked;
            if (name === 'canalIds' || name === 'etiquetaIds') {
                setFormData(prevState => {
                    const currentIds = prevState[name] || [];
                    return { ...prevState, [name]: isChecked ? [...currentIds, id] : currentIds.filter(currentId => currentId !== id) };
                });
                return;
            } else if (name === 'status') { finalValue = checkbox.checked ? 'activo' : 'inactivo'; }
            else { finalValue = isChecked; }
        } else if ((name === 'categoriaTareaId' || name === 'tareaFuncionId') && value === '') {
            finalValue = null;
        } else if (name === 'iconoUrl' && value === '') {
            finalValue = null;
        }

        // --- NUEVO: Actualizar Trigger si cambia el Nombre ---
        if (name === 'nombre') {
            const nuevoTrigger = generarTrigger(value);
            setFormData(prevState => ({
                ...prevState,
                [name]: typeof finalValue === 'string' || finalValue === undefined ? finalValue : String(finalValue), // Ensure 'nombre' is a string or undefined
                trigger: nuevoTrigger // Actualiza el trigger generado
            }));
        } else {
            // Actualización normal para otros campos
            setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        }


        setFormData(prevState => ({ ...prevState, [name]: finalValue }));

        // if (name === 'tareaFuncionId') {
        //     fetchParametrosParaFuncion(finalValue as string | undefined);
        // }
    };


    // --- Manejador de Submit ---
    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        // ... (sin cambios en la lógica de submit, solo en la actualización de tareaOriginal si es necesario) ...
        if (e) e.preventDefault();
        if (!formData.nombre?.trim() || typeof formData.version !== 'number' || !formData.status || !formData.categoriaTareaId) {
            setError("Por favor, completa los campos obligatorios (*): Nombre, Versión, Status, Categoría."); return;
        }
        if (formData.version <= 0) { setError("La versión debe ser un número positivo."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        try {
            const dataToSend: ActualizarTareaConRelacionesInput = {
                nombre: formData.nombre?.trim(),
                descripcion: formData.descripcion?.trim() ?? null,
                instruccion: formData.instruccion?.trim() ?? null,
                trigger: formData.trigger?.trim() ?? null,
                precio: formData.precio ?? null,
                rol: formData.rol?.trim() ?? null,
                personalidad: formData.personalidad?.trim() ?? null,
                version: formData.version,
                status: formData.status,
                categoriaTareaId: formData.categoriaTareaId,
                tareaFuncionId: formData.tareaFuncionId || undefined,
                iconoUrl: formData.iconoUrl || undefined,
                canalIds: formData.canalIds || [],
                etiquetaIds: formData.etiquetaIds || [],
            };

            const tareaActualizada = await actualizarTarea(tareaId, dataToSend);
            setSuccessMessage("Tarea actualizada correctamente.");

            // Actualizar estado 'tareaOriginal' para reflejar cambios sin recargar
            setTareaOriginal((prev: TareaOriginalConDetalles | null) => {
                if (!prev) return null;
                // Crear un nuevo objeto basado en el anterior y los datos enviados
                // Asegúrate que la estructura coincida con TareaParaEditar
                const newState: TareaOriginalConDetalles = {
                    ...prev,
                    ...dataToSend, // Sobrescribe campos simples
                    updatedAt: tareaActualizada.updatedAt ?? new Date(), // Actualiza fecha
                    // Reconstruye relaciones complejas basadas en los IDs y datos disponibles
                    canalesSoportados: (dataToSend.canalIds ?? []).map(id => ({
                        tareaId: prev.id,
                        canalConversacionalId: id,
                        // Intenta encontrar el objeto completo, si no, usa solo el ID
                        canalConversacional: canales.find(c => c.id === id) ?? { id: id, nombre: 'Desconocido', icono: null }
                    })) as TareaOriginalConDetalles['canalesSoportados'],
                    etiquetas: (dataToSend.etiquetaIds ?? []).map(id => ({
                        tareaId: prev.id,
                        etiquetaTareaId: id,
                        asignadoEn: new Date(), // Asume fecha actual si se añade
                        // Intenta encontrar el objeto completo, si no, usa solo el ID
                        etiquetaTarea: etiquetas.find(e => e.id === id) ?? { id: id, nombre: 'Desconocido' }
                    })) as TareaOriginalConDetalles['etiquetas'],
                    _count: prev._count
                };
                return newState;
            });

        } catch (err) {
            console.error("Error updating tarea:", err);
            setError(`Error al actualizar: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Manejador de Cancelar ---
    const handleCancel = () => { router.push('/admin/tareas') };

    // --- Manejador de Eliminar ---
    const handleDelete = async () => {
        // ... (sin cambios) ...
        const suscripciones = tareaOriginal?._count?.AsistenteTareaSuscripcion ?? 0;
        if (suscripciones > 0) {
            alert(`No se puede eliminar: ${suscripciones} asistente(s) están suscritos.`);
            return;
        }
        if (confirm("¿Estás seguro de eliminar esta Tarea? Esta acción no se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarTarea(tareaId);
                if (result.success) {
                    setSuccessMessage("Tarea eliminada. Redirigiendo...");
                    setTimeout(() => router.push('/admin/tareas'), 1500);
                } else { throw new Error(result.error || "Error desconocido"); }
            } catch (err) {
                setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
                setIsSubmitting(false);
            }
        }
    };

    // --- Manejador para Mejorar con Gemini ---
    const handleMejorarInstruccion = async () => {
        if (!formData.instruccion?.trim()) {
            setError("La instrucción detallada es necesaria para poder mejorarla.");
            return;
        }
        setIsImproving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            // Llama a la acción del servidor
            const sugerencias = await mejorarTareaGemini(tareaId) as SugerenciasTarea; // Casteo explícito
            if (typeof sugerencias !== 'object' || sugerencias === null) {
                throw new Error("No se recibieron sugerencias válidas del servidor.");
            }
            console.log("Sugerencias recibidas:", sugerencias);

            // --- Procesamiento de la instrucción ---
            // Reemplaza cada salto de línea simple (\n) con un doble salto de línea (\n\n)
            // Esto es lo que permite la separación visual de párrafos en el textarea
            // si tiene la clase CSS 'whitespace-pre-wrap'.
            const instruccionConDobleSalto = sugerencias.sugerencia_instruccion?.replace(/\n/g, '\n\n') || '';

            // --- Log para depurar ---
            // Verifica en la consola del navegador si la cadena contiene '\n\n'
            console.log("Instrucción formateada (antes de setFormData):", JSON.stringify(instruccionConDobleSalto));


            // Actualiza el estado del formulario con las sugerencias
            setFormData(prevState => ({
                ...prevState,
                // Actualiza campos opcionales solo si la sugerencia no es vacía
                descripcion: sugerencias.sugerencia_descripcion || prevState.descripcion,
                rol: sugerencias.sugerencia_rol || prevState.rol,
                personalidad: sugerencias.sugerencia_personalidad || prevState.personalidad,
                // Actualiza la instrucción con la versión formateada
                instruccion: instruccionConDobleSalto || prevState.instruccion,
            }));
            setSuccessMessage("¡Sugerencias aplicadas! Revisa y guarda los cambios si estás de acuerdo.");

        } catch (error) {
            console.error("Error mejorando instrucción:", error);
            setError(`Error al mejorar la instrucción: ${error instanceof Error ? error.message : "Ocurrió un error desconocido"}`);
        } finally {
            setIsImproving(false);
        }
    };


    // --- Renderizado ---
    if (loading) { return <div className="p-6"><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando datos...</p></div>; }
    if (error && !tareaOriginal) { return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20"><p className="text-center text-red-400">Error: {error}</p></div>; }
    if (!tareaOriginal) { return <div className="p-6"><p className="text-center text-zinc-400">Tarea no encontrada (ID: {tareaId}).</p></div>; }

    const puedeEliminar = (tareaOriginal?._count?.AsistenteTareaSuscripcion ?? 0) === 0;
    const puedeMejorar = !!formData.instruccion?.trim();

    return (
        <div>
            {/* --- ENCABEZADO --- */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-zinc-700 pb-4'>
                {/* Izquierda: Status, Título, ID */}
                <div className='flex items-center gap-4'>
                    {/* Status Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-11 h-6 bg-zinc-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                    <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-white leading-tight flex items-center gap-2">
                            Editar Tarea
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">ID: {tareaId}</p>
                    </div>
                </div>
                {/* Derecha: Botones de Acción */}
                <div className='flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end'>
                    <button type="button" onClick={handleDelete} className={`${headerButtonClasses} text-red-500 hover:bg-red-900/30 hover:text-red-400 focus:ring-red-500 disabled:text-zinc-500 disabled:hover:bg-transparent`} disabled={isSubmitting || isImproving || !puedeEliminar} title={!puedeEliminar ? `No se puede eliminar: ${tareaOriginal._count?.AsistenteTareaSuscripcion} asistente(s) suscritos.` : 'Eliminar esta tarea permanentemente'}>
                        <Trash2 size={14} /> <span className='hidden sm:inline'>Eliminar</span>
                    </button>
                    <button type="button" onClick={handleMejorarInstruccion} className={`${headerButtonClasses} bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500`} disabled={isSubmitting || isImproving || !puedeMejorar} title={!puedeMejorar ? "Añade una instrucción detallada para poder mejorarla" : "Usar IA para sugerir mejoras"}>
                        {isImproving ? <Loader2 className='animate-spin' size={14} /> : <Sparkles size={14} />}
                        <span className='hidden sm:inline'>Mejorar</span><span className='sm:hidden'>IA</span>
                    </button>
                    <button type="submit" form="edit-tarea-form" className={`${headerButtonClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`} disabled={isSubmitting || isImproving || loading}>
                        {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                        Guardar Cambios
                    </button>
                    <button type="button" onClick={handleCancel} className={`${headerButtonClasses} bg-zinc-600 hover:bg-zinc-500 text-white focus:ring-zinc-400`} disabled={isSubmitting || isImproving}>
                        <XIcon size={16} /> Cerrar
                    </button>
                </div>
            </div>

            {/* Mensajes Globales */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario Principal */}
            <form onSubmit={handleSubmit} id="edit-tarea-form" className="grid grid-cols-1 lg:grid-cols-3 gap-6" noValidate>

                {/* --- Columna 1: Configuración Principal --- */}
                <div className="lg:col-span-1 flex flex-col space-y-5">

                    {/* Resto de la columna 1 */}
                    <div className={fieldGroupClasses}>
                        {/* <h3 className={sectionTitleClasses}><Settings2 size={16} className="text-zinc-400" /> Configuración Principal</h3> */}
                        {/* Bloque Combinado: Icono y Nombre */}
                        <div className="flex items-start gap-4">

                            {/* Componente del Icono */}
                            <div className="flex-shrink-0">
                                <TareaIcono tareaId={tareaId} iconoUrl={formData.iconoUrl} />
                            </div>

                            {/* Sección del Nombre (ocupa el espacio restante) */}
                            <div className="flex-grow min-w-0"> {/* min-w-0 evita que el input se desborde */}
                                <label htmlFor="nombre" className={labelBaseClasses}>
                                    Nombre Tarea <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre || ''}
                                    onChange={handleChange}
                                    className={inputBaseClasses} // Asegúrate que esta clase tenga w-full
                                    required
                                    disabled={isSubmitting}
                                    placeholder="Nombre descriptivo de la tarea"
                                />
                                {/* Opcional: Texto de ayuda */}
                                {/* <p className="text-xs text-zinc-500 mt-1">El nombre principal que identifica esta tarea.</p> */}
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label htmlFor="precio" className={labelBaseClasses}>Precio Adicional</label>
                                        <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.01" min="0" placeholder="0.00" />
                                    </div>
                                    <div>
                                        <label htmlFor="version" className={labelBaseClasses}>Versión <span className="text-red-500">*</span></label>
                                        <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleChange} className={inputBaseClasses} required step="0.1" min="0.1" disabled={isSubmitting} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="trigger" className={labelBaseClasses}>Activador para la tarea desde API</label>
                        <input type="text" id="trigger" name="trigger" value={formData.trigger || ''} onChange={handleChange} className={`${inputBaseClasses} font-mono`} disabled={isSubmitting} placeholder="ej: compra_realizada" />
                    </div>


                    {/* //! Gestionar de la función API */}
                    <TareaFuncionFormulario
                        tareaId={tareaId}
                        nombreTareaActual={formData.nombre || ''}
                    />

                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><Settings2 size={16} className="text-zinc-400" /> Organización</h3>
                        <div>
                            <label htmlFor="categoriaTareaId" className={labelBaseClasses}>Categoría <span className="text-red-500">*</span></label>
                            <select id="categoriaTareaId" name="categoriaTareaId" value={formData.categoriaTareaId || ''} onChange={handleChange} className={selectBaseClasses} required disabled={isSubmitting}>
                                <option value="">-- Selecciona --</option>
                                {categorias.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className={labelBaseClasses}>Canales Soportados</label>
                            {canales.length === 0 ? (<p className="text-sm text-zinc-400 italic">No hay canales definidos.</p>) : (
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-zinc-700 rounded-md p-3 bg-zinc-800/50 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    {canales.map(canal => (
                                        <label key={canal.id} htmlFor={`canal-${canal.id}`} className="flex items-center cursor-pointer">
                                            <input type="checkbox" id={`canal-${canal.id}`} name="canalIds" value={canal.id} checked={formData.canalIds?.includes(canal.id) || false} onChange={handleChange} className={checkboxClasses} disabled={isSubmitting} />
                                            <span className={checkboxLabelClasses}>{canal.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <label className={labelBaseClasses}>Etiquetas</label>
                            {etiquetas.length === 0 ? (<p className="text-sm text-zinc-400 italic">No hay etiquetas definidas.</p>) : (
                                <div className="max-h-48 overflow-y-auto space-y-2 border border-zinc-700 rounded-md p-3 bg-zinc-800/50 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    {etiquetas.map(etiqueta => (
                                        <label key={etiqueta.id} htmlFor={`etiqueta-${etiqueta.id}`} className="flex items-center cursor-pointer">
                                            <input type="checkbox" id={`etiqueta-${etiqueta.id}`} name="etiquetaIds" value={etiqueta.id} checked={formData.etiquetaIds?.includes(etiqueta.id) || false} onChange={handleChange} className={checkboxClasses} disabled={isSubmitting} />
                                            <span className={checkboxLabelClasses}>{etiqueta.nombre}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Columna 2: Configuración IA e Instrucción --- */}
                <div className="lg:col-span-2 flex flex-col space-y-5">
                    {/* Configuración IA (sin cambios)... */}
                    <div className={fieldGroupClasses}>
                        <h3 className={sectionTitleClasses}><MessageSquareText size={16} className="text-zinc-400" /> Configuración de Comportamiento IA</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="rol" className={labelWithIAIndicatorClasses}>
                                    <Sparkles size={12} className={iaIndicatorIconClasses} /> Rol del Asistente (Opcional)
                                </label>
                                <input type="text" id="rol" name="rol" value={formData.rol || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting || isImproving} placeholder="Ej: 'Experto en Ventas'" />
                            </div>
                            <div>
                                <label htmlFor="personalidad" className={labelWithIAIndicatorClasses}>
                                    <Sparkles size={12} className={iaIndicatorIconClasses} /> Personalidad (Opcional)
                                </label>
                                <input type="text" id="personalidad" name="personalidad" value={formData.personalidad || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting || isImproving} placeholder="Ej: 'Amable y servicial'" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="descripcion" className={labelWithIAIndicatorClasses}>
                                <Sparkles size={12} className={iaIndicatorIconClasses} /> Descripción Tarea (Para IA/OpenAPI)
                            </label>
                            <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting || isImproving} rows={3} placeholder="Describe brevemente qué hace esta tarea..." />
                        </div>
                    </div>

                    {/* Instrucción */}
                    <div className={`${fieldGroupClasses} flex-grow flex flex-col`}>
                        <label htmlFor="instruccion" className={labelWithIAIndicatorClasses}>
                            <Sparkles size={12} className={iaIndicatorIconClasses} /> Instrucción Detallada (Para IA) <span className="text-red-500">*</span>
                        </label>
                        {/* --- TEXTAREA CLAVE --- */}
                        {/* El valor viene de formData.instruccion, que ya debería tener \n\n */}
                        {/* La clase textareaBaseClasses incluye whitespace-pre-wrap, que renderiza \n\n como doble salto */}
                        <textarea
                            id="instruccion"
                            name="instruccion"
                            value={formData.instruccion || ''}
                            onChange={handleChange}
                            className={`${textareaBaseClasses} flex-grow min-h-[300px] lg:min-h-[450px]`}
                            disabled={isSubmitting || isImproving}
                            placeholder="Define paso a paso cómo debe actuar el asistente..."
                        />
                        {/* Sugerencia UX Opcional: */}
                        <p className="text-xs text-zinc-500 mt-2 italic">
                            Nota: Al usar &quot;Mejorar con IA&quot;, los párrafos se separarán con doble salto de línea.
                        </p>
                    </div>
                </div>

            </form>

        </div>
    );
}
