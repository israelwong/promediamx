'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    crearFuncionTarea,
    editarFuncionTarea,
    eliminarFuncionTarea,
    obtenerParametrosRequeridosDisponibles,
} from '@/app/admin/_lib/tareaFuncion.actions';
import {
    asociarFuncionATarea,
    obtenerFuncionDeTarea,
} from '@/app/admin/_lib/tareaFuncion.actions';
import { TareaFuncion, ParametroRequerido, CrearFuncionData, EditarFuncionData } from '@/app/admin/_lib/types';
import { Loader2, Save, XIcon, PencilIcon, Link2Off, PlusIcon, Cog, ChevronDown, ChevronUp } from 'lucide-react';

// --- Tipos ---
interface FuncionConDetalles extends Omit<TareaFuncion, 'parametrosRequeridos'> {
    parametrosRequeridos?: {
        esObligatorio: boolean;
        parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato' | 'descripcion'> | null;
    }[];
}
interface TareaFuncionManagerProps {
    tareaId: string;
    nombreTareaActual: string;
}
type FuncionFormData = Partial<Pick<TareaFuncion, 'nombreInterno' | 'nombreVisible' | 'descripcion'>>;

// --- Helper ---
const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    const sinAcentos = nombreVisible.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const palabras = sinAcentos.replace(/[^a-z0-9\s]+/g, ' ').split(/[\s_]+/);
    return palabras.map((palabra, index) => {
        if (!palabra) return '';
        if (index === 0) return palabra;
        return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    }).join('');
};

// --- Componente Principal ---
export default function TareaFuncionManager({ tareaId, nombreTareaActual }: TareaFuncionManagerProps) {

    const [funcionActual, setFuncionActual] = useState<FuncionConDetalles | null>(null);
    const [parametrosDisponibles, setParametrosDisponibles] = useState<ParametroRequerido[]>([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false); // true si editamos, false si creamos
    const [formData, setFormData] = useState<FuncionFormData>({});
    const [selectedParams, setSelectedParams] = useState<{ [paramId: string]: { esObligatorio: boolean } }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Clases de Tailwind (sin cambios) ---
    const containerClasses = "bg-zinc-800/50 rounded-lg border border-zinc-700";
    const headerClasses = "flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700/30 transition-colors duration-150";
    const titleClasses = "text-sm font-semibold text-zinc-100 flex items-center gap-2";
    const buttonIconClasses = "p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed";
    const buttonTextClasses = "text-xs font-medium px-2.5 py-1 rounded-md flex items-center justify-center gap-1 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800";
    const primaryButtonClasses = `${buttonTextClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonTextClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-400`;
    // const dangerButtonClasses = `${buttonTextClasses} bg-red-700 hover:bg-red-800 text-white focus:ring-red-500`;
    // const linkButtonClasses = `${buttonTextClasses} bg-transparent border border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500 focus:ring-zinc-500`;
    const formContainerClasses = "p-4 space-y-4 border-t border-zinc-700";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[70px]`;
    const checkboxLabelClasses = "text-xs font-medium text-zinc-300 ml-2 cursor-pointer";
    const checkboxClasses = "h-3.5 w-3.5 rounded border-zinc-500 bg-zinc-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const paramTagClasses = "text-[0.65rem] px-1.5 py-0.5 rounded bg-zinc-600 text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap";
    const formFooterClasses = "flex justify-end gap-2 pt-4 border-t border-zinc-600 mt-4";

    // --- Carga Inicial de Datos ---
    const cargarDatos = useCallback(async () => {
        // console.log("Cargando datos para TareaFuncionManager..."); // Debug
        setIsLoading(true);
        setError(null);
        try {
            const [funcionData, paramsData] = await Promise.all([
                obtenerFuncionDeTarea(tareaId),
                obtenerParametrosRequeridosDisponibles()
            ]);
            // console.log("Función cargada:", funcionData); // Debug
            setFuncionActual(funcionData);
            setParametrosDisponibles(paramsData || []);
            setMostrarFormulario(false); // Asegurar que el form está oculto al cargar
        } catch (err) {
            console.error("Error cargando datos de función/parámetros:", err);
            setError(`Error al cargar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
            setFuncionActual(null);
            setParametrosDisponibles([]);
        } finally {
            setIsLoading(false);
        }
    }, [tareaId]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // --- Funciones para mostrar/ocultar y preparar formulario ---
    const toggleFormulario = (modo: 'create' | 'edit' | null = null) => {
        setError(null);
        if (modo === 'create') {
            // console.log("Iniciando modo CREACIÓN"); // Debug
            const nombreVisibleInicial = nombreTareaActual || '';
            setFormData({
                nombreVisible: nombreVisibleInicial,
                nombreInterno: generarNombreInterno(nombreVisibleInicial),
                descripcion: ''
            });
            setSelectedParams({});
            setModoEdicion(false); // <-- Asegura modo creación
            setMostrarFormulario(true);
        } else if (modo === 'edit' && funcionActual) {
            // console.log("Iniciando modo EDICIÓN para:", funcionActual.id); // Debug
            setFormData({
                nombreInterno: funcionActual.nombreInterno,
                nombreVisible: funcionActual.nombreVisible,
                descripcion: funcionActual.descripcion,
            });
            const initialSelected: { [paramId: string]: { esObligatorio: boolean } } = {};
            funcionActual.parametrosRequeridos?.forEach(p => {
                if (p.parametroRequerido?.id) {
                    initialSelected[p.parametroRequerido.id] = { esObligatorio: p.esObligatorio };
                }
            });
            setSelectedParams(initialSelected);
            setModoEdicion(true); // <-- Asegura modo edición
            setMostrarFormulario(true);
        } else {
            // console.log("Toggle Mostrar Formulario"); // Debug
            // Simplemente oculta o muestra sin cambiar modo (útil si se hace clic en header sin acción específica)
            setMostrarFormulario(prev => !prev);
        }
    };

    const cancelarFormulario = () => {
        setError(null);
        setMostrarFormulario(false);
        // Opcional: Resetear formData y selectedParams si se desea
        // setFormData({});
        // setSelectedParams({});
    };

    // --- Manejadores del Formulario Interno (sin cambios) ---
    const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updatedData = { ...prev, [name]: value };
            if (!modoEdicion && name === 'nombreVisible') {
                updatedData.nombreInterno = generarNombreInterno(value);
            }
            return updatedData;
        });
        setError(null);
    };
    const handleParamCheckboxChange = (paramId: string, checked: boolean) => {
        setSelectedParams(prev => {
            const newParams = { ...prev };
            if (checked) newParams[paramId] = { esObligatorio: true };
            else delete newParams[paramId];
            return newParams;
        });
        setError(null);
    };
    const handleParamObligatorioChange = (paramId: string, checked: boolean) => {
        setSelectedParams(prev => {
            if (prev[paramId]) {
                return { ...prev, [paramId]: { ...prev[paramId], esObligatorio: checked } };
            }
            return prev;
        });
        setError(null);
    };

    // --- Guardar Función ---
    const handleGuardarFuncion = async () => {
        // console.log("Intentando guardar. Modo Edición:", modoEdicion); // Debug
        if (!formData.nombreVisible?.trim()) { setError("Nombre visible es obligatorio."); return; }
        // Validar nombre interno solo si estamos creando (en edición es readOnly)
        if (!modoEdicion && !formData.nombreInterno?.trim()) { setError("Nombre interno no puede estar vacío."); return; }

        setIsSubmitting(true); setError(null);
        try {
            let result;
            const parametrosParaEnviar = Object.entries(selectedParams).map(([id, config]) => ({ parametroRequeridoId: id, esObligatorio: config.esObligatorio }));
            const nombreVisibleCapitalized = formData.nombreVisible.charAt(0).toUpperCase() + formData.nombreVisible.slice(1).trim();
            const descripcionCapitalized = formData.descripcion ? formData.descripcion.charAt(0).toUpperCase() + formData.descripcion.slice(1).trim() : null;
            let funcionGuardadaId: string | undefined;

            // --- Lógica clave: decidir si crear o editar ---
            if (modoEdicion && funcionActual?.id) {
                // console.log("Llamando a editarFuncionTarea con ID:", funcionActual.id); // Debug
                const dataToSend: EditarFuncionData = { nombreVisible: nombreVisibleCapitalized, descripcion: descripcionCapitalized, parametros: parametrosParaEnviar };
                result = await editarFuncionTarea(funcionActual.id, dataToSend);
                funcionGuardadaId = funcionActual.id; // Mantenemos el ID existente
            } else { // Asumimos creación si no estamos en modo edición
                // console.log("Llamando a crearFuncionTarea"); // Debug
                const dataToSend: CrearFuncionData = { nombreInterno: formData.nombreInterno!.trim(), nombreVisible: nombreVisibleCapitalized, descripcion: descripcionCapitalized, parametros: parametrosParaEnviar };
                result = await crearFuncionTarea(dataToSend);
                funcionGuardadaId = result?.data?.id; // Obtenemos el ID de la nueva función
            }
            // --- Fin lógica clave ---

            if (result?.success && funcionGuardadaId) {
                // Si fue creación, necesitamos asociarla a la tarea
                if (!modoEdicion) { // Solo asociar si se creó una nueva
                    // console.log(`Asociando nueva función ${funcionGuardadaId} a tarea ${tareaId}`); // Debug
                    const asociacionResult = await asociarFuncionATarea(tareaId, funcionGuardadaId);
                    if (!asociacionResult.success) throw new Error(asociacionResult.error || "Error al asociar la función.");
                }
                await cargarDatos(); // Recarga datos (y oculta el form al setear modo 'view')
            } else {
                throw new Error(result?.error || "Error desconocido al guardar la función.");
            }
        } catch (err) {
            console.error(`Error al ${modoEdicion ? 'editar' : 'crear'} función:`, err);
            setError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Desvincular Función (Corregido) ---
    const handleDesvincular = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!funcionActual) return;

        const confirmarDesvinculacion = confirm(`¿Estás seguro de que deseas desvincular la función "${funcionActual.nombreVisible}" de esta tarea?`);

        if (confirmarDesvinculacion) {
            const eliminarDefinicion = confirm(`Función desvinculada.\n\n¿Deseas también ELIMINAR PERMANENTEMENTE la definición de la función "${funcionActual.nombreVisible}"?\n\nPresiona 'Aceptar' para ELIMINARLA o 'Cancelar' para CONSERVARLA.`);

            setIsDeleting(true); setError(null);
            try {
                const desasociarResult = await asociarFuncionATarea(tareaId, null);
                if (!desasociarResult.success) {
                    throw new Error(desasociarResult.error || "Error al desvincular la función.");
                }
                if (eliminarDefinicion) {
                    const eliminarResult = await eliminarFuncionTarea(funcionActual.id);
                    if (!eliminarResult.success) {
                        console.warn(`No se pudo eliminar la definición: ${eliminarResult.error}`);
                        // Opcional: setError(`Función desvinculada, pero no se pudo eliminar definición: ${eliminarResult.error}`);
                    }
                }
                setFuncionActual(null);
                setMostrarFormulario(false);
            } catch (err) {
                console.error("Error al desvincular/eliminar función:", err);
                setError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally {
                setIsDeleting(false);
            }
        }
    };


    // --- Renderizado ---
    if (isLoading) {
        // ... (sin cambios) ...
        return (
            <div className={`${containerClasses} p-3`}>
                <p className="text-center text-zinc-400 italic text-xs flex items-center justify-center gap-1">
                    <Loader2 className='animate-spin' size={12} /> Cargando función...
                </p>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera Clickable */}
            <div className={headerClasses} onClick={() => toggleFormulario()}>
                <h3 className={titleClasses}>
                    <Cog size={14} /> Función de Automatización
                    {funcionActual && <span className='text-xs text-blue-400 font-normal'>({funcionActual.nombreVisible})</span>}
                    {!funcionActual && <span className='text-xs text-zinc-500 font-normal'>(Ninguna asociada)</span>}
                </h3>
                <div className="flex items-center gap-1">
                    {/* Botones de acción en modo VISTA */}
                    {!mostrarFormulario && funcionActual && (
                        <>
                            <button type="button" onClick={handleDesvincular} className={buttonIconClasses} title="Desvincular Función" disabled={isDeleting || isSubmitting}>
                                {isDeleting ? <Loader2 className='animate-spin' size={14} /> : <Link2Off size={14} />}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleFormulario('edit'); }} className={buttonIconClasses} title="Editar Función" disabled={isSubmitting}>
                                <PencilIcon size={14} />
                            </button>
                        </>
                    )}
                    {!mostrarFormulario && !funcionActual && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleFormulario('create'); }} className={primaryButtonClasses} disabled={isSubmitting}>
                            <PlusIcon size={14} /> Crear
                        </button>
                    )}
                    {/* Icono para expandir/colapsar */}
                    <span className="text-zinc-500 ml-2">
                        {mostrarFormulario ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                </div>
            </div>

            {/* Contenido Principal (Vista o Formulario) */}
            {/* Mostrar la vista solo si el formulario NO está visible Y hay una función actual */}
            {!mostrarFormulario && funcionActual && (
                <div className="p-4 border-t border-zinc-700"> {/* Añadir padding y borde si se muestra la vista */}
                    <div className="space-y-2 text-sm mt-2">
                        <p><strong className="text-zinc-300 font-medium">Nombre Visible:</strong> <span className='font-mono text-zinc-400'>{funcionActual.nombreVisible}</span>
                        </p>
                        <p><strong className="text-zinc-300 font-medium">Nombre Functon Calling:</strong> <span className="font-mono text-zinc-400">{funcionActual.nombreInterno}</span></p>
                        {funcionActual.descripcion && <p><strong className="text-zinc-300 font-medium">Descripción:</strong>
                            <span className='font-mono text-zinc-400'>
                                {funcionActual.descripcion}
                            </span>
                        </p>}
                        <div>
                            <strong className="text-zinc-300 font-medium block mb-1">Parámetros Requeridos:</strong>
                            {funcionActual.parametrosRequeridos && funcionActual.parametrosRequeridos.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {funcionActual.parametrosRequeridos.map(({ parametroRequerido, esObligatorio }) => parametroRequerido ? (
                                        <span key={parametroRequerido.id} className={paramTagClasses} title={`${parametroRequerido.descripcion || 'Sin descripción'} ${esObligatorio ? '(Obligatorio)' : ''}`}>
                                            {parametroRequerido.nombreVisible}
                                            {esObligatorio && <span className="text-amber-400 ml-0.5">*</span>}
                                        </span>
                                    ) : null)}
                                </div>
                            ) : (
                                <p className="text-zinc-400 italic text-xs">Esta función no utiliza parámetros estándar.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mostrar mensaje 'Ninguna asociada' solo si el form NO está visible Y NO hay función */}
            {!mostrarFormulario && !funcionActual && (
                <p className="text-zinc-400 italic text-center text-sm py-4">Esta tarea no tiene una función de automatización asociada.</p>
            )}


            {/* Formulario (condicional) */}
            {mostrarFormulario && (
                <div className={formContainerClasses}>
                    {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm mb-3">{error}</p>}

                    {/* Campos del Formulario */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                            <label htmlFor="form-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                            <input type="text" id="form-nombreVisible" name="nombreVisible" value={formData.nombreVisible || ''} onChange={handleFormChange} className={inputBaseClasses} required disabled placeholder="Ej: Agendar Cita" />
                        </div>
                        <div>
                            <label htmlFor="form-nombreInterno" className={labelBaseClasses}>Nombre Interno (ID) <span className="text-red-500">*</span></label>
                            <input type="text" id="form-nombreInterno" name="nombreInterno" value={formData.nombreInterno || ''} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed`} required disabled={isSubmitting || modoEdicion} placeholder="Se genera..." />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="form-descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="form-descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleFormChange} className={textareaBaseClasses} disabled={isSubmitting} rows={2} placeholder="Qué hace esta función..." />
                    </div>
                    <div className='pt-3 mt-3 border-t border-zinc-700'>
                        <label className={labelBaseClasses}>Parámetros Requeridos</label>
                        {parametrosDisponibles.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">No hay parámetros globales.</p>
                        ) : (
                            <div className="max-h-40 overflow-y-auto space-y-2 border border-zinc-600 rounded-md p-2 bg-zinc-900/50 shadow-inner">
                                {parametrosDisponibles.map(param => (
                                    <div key={param.id} className="flex items-center justify-between bg-zinc-800/40 p-1.5 rounded">
                                        <label htmlFor={`form-param-${param.id}`} className="flex items-center cursor-pointer flex-grow mr-3">
                                            <input type="checkbox" id={`form-param-${param.id}`} checked={!!selectedParams[param.id]} onChange={(e) => handleParamCheckboxChange(param.id, e.target.checked)} className={checkboxClasses} disabled={isSubmitting} />
                                            <span className={`${checkboxLabelClasses} ml-2`}>
                                                {param.nombreVisible} <span className="text-zinc-500 text-[0.7rem] font-mono">({param.nombreInterno})</span>
                                            </span>
                                        </label>
                                        {selectedParams[param.id] && (
                                            <label htmlFor={`form-obli-${param.id}`} className="flex items-center cursor-pointer text-xs text-amber-400 hover:text-amber-300 flex-shrink-0">
                                                <input type="checkbox" id={`form-obli-${param.id}`} checked={selectedParams[param.id]?.esObligatorio ?? true} onChange={(e) => handleParamObligatorioChange(param.id, e.target.checked)} className={`${checkboxClasses} !h-3 !w-3 !text-amber-500 !focus:ring-amber-400 border-amber-700/50 bg-amber-900/30`} disabled={isSubmitting} />
                                                <span className="ml-1 font-medium">Oblig.</span>
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Pie del Formulario */}
                    <div className={formFooterClasses}>
                        <button type="button" onClick={cancelarFormulario} className={`${secondaryButtonClasses} !w-auto`} disabled={isSubmitting}>
                            <XIcon size={14} /> Cancelar
                        </button>
                        {/* El texto del botón depende de modoEdicion */}
                        <button type="button" onClick={handleGuardarFuncion} className={`${primaryButtonClasses} !w-auto min-w-[90px]`} disabled={isSubmitting || !formData.nombreVisible?.trim() || (!modoEdicion && !formData.nombreInterno?.trim())}>
                            {isSubmitting ? <Loader2 className='animate-spin' size={14} /> : <Save size={14} />}
                            {modoEdicion ? 'Guardar Cambios' : 'Crear y Asociar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
