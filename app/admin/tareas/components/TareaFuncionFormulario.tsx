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
import {
    Loader2, Save, XIcon, PencilIcon, Link2Off, PlusIcon, Cog, ChevronDown, ChevronUp,
    ClipboardCopy, Check
} from 'lucide-react';

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
type FuncionFormData = Partial<Pick<TareaFuncion, 'nombreInterno' | 'descripcion'>>;


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
    const [modoEdicion, setModoEdicion] = useState(false);
    const [formData, setFormData] = useState<FuncionFormData>({});
    const [nombreVisibleInterno, setNombreVisibleInterno] = useState('');
    const [selectedParams, setSelectedParams] = useState<{ [paramId: string]: { esObligatorio: boolean } }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

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
    const copyButtonClasses = "absolute inset-y-0 right-0 flex items-center pr-2";

    // --- Carga Inicial de Datos ---
    const cargarDatos = useCallback(async () => { /* ... (sin cambios) ... */
        setIsLoading(true); setError(null);
        try {
            const [funcionData, paramsData] = await Promise.all([
                obtenerFuncionDeTarea(tareaId),
                obtenerParametrosRequeridosDisponibles()
            ]);
            setFuncionActual(funcionData);
            setParametrosDisponibles(paramsData || []);
            setMostrarFormulario(false);
            setNombreVisibleInterno(funcionData?.nombreVisible || '');
        } catch (err) {
            console.error("Error cargando datos:", err);
            setError(`Error al cargar: ${err instanceof Error ? err.message : 'Error'}`);
            setFuncionActual(null); setParametrosDisponibles([]);
        } finally { setIsLoading(false); }
    }, [tareaId]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // --- Funciones para mostrar/ocultar y preparar formulario ---
    const toggleFormulario = (modo: 'create' | 'edit' | null = null) => { /* ... (sin cambios) ... */
        setError(null);
        if (modo === 'create') {
            const nombreVisibleInicial = nombreTareaActual || '';
            setNombreVisibleInterno(nombreVisibleInicial);
            setFormData({ nombreInterno: generarNombreInterno(nombreVisibleInicial), descripcion: '' });
            setSelectedParams({});
            setModoEdicion(false);
            setMostrarFormulario(true);
        } else if (modo === 'edit' && funcionActual) {
            setNombreVisibleInterno(funcionActual.nombreVisible || '');
            setFormData({ nombreInterno: funcionActual.nombreInterno, descripcion: funcionActual.descripcion, });
            const initialSelected: { [paramId: string]: { esObligatorio: boolean } } = {};
            funcionActual.parametrosRequeridos?.forEach(p => { if (p.parametroRequerido?.id) initialSelected[p.parametroRequerido.id] = { esObligatorio: p.esObligatorio }; });
            setSelectedParams(initialSelected);
            setModoEdicion(true);
            setMostrarFormulario(true);
        } else { setMostrarFormulario(prev => !prev); }
    };
    const cancelarFormulario = () => { /* ... (sin cambios) ... */
        setError(null);
        setMostrarFormulario(false);
    };

    // --- Manejadores del Formulario Interno ---
    const handleFormChange = (e: ChangeEvent<HTMLTextAreaElement>) => { /* ... (sin cambios) ... */
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };
    const handleParamCheckboxChange = (paramId: string, checked: boolean) => { /* ... (sin cambios) ... */
        setSelectedParams(prev => {
            const newParams = { ...prev };
            if (checked) newParams[paramId] = { esObligatorio: true }; else delete newParams[paramId];
            return newParams;
        });
        setError(null);
    };
    const handleParamObligatorioChange = (paramId: string, checked: boolean) => { /* ... (sin cambios) ... */
        setSelectedParams(prev => {
            if (prev[paramId]) return { ...prev, [paramId]: { ...prev[paramId], esObligatorio: checked } };
            return prev;
        });
        setError(null);
    };

    // --- Guardar Función ---
    const handleGuardarFuncion = async () => {
        if (!formData.nombreInterno?.trim()) { setError("El nombre interno (ID) no puede estar vacío."); return; }
        if (!nombreVisibleInterno?.trim()) { setError("El nombre base (visible) no puede estar vacío."); return; }

        setIsSubmitting(true); setError(null);
        let funcionCreadaId: string | null = null; // Para guardar ID si se crea
        let seIntentoAsociar = false; // Flag para saber si llegamos a la asociación

        try {
            const parametrosParaEnviar = Object.entries(selectedParams).map(([id, config]) => ({ parametroRequeridoId: id, esObligatorio: config.esObligatorio }));
            const nombreVisibleCapitalized = nombreVisibleInterno.charAt(0).toUpperCase() + nombreVisibleInterno.slice(1).trim();
            const descripcionCapitalized = formData.descripcion ? formData.descripcion.charAt(0).toUpperCase() + formData.descripcion.slice(1).trim() : null;

            let result;
            if (modoEdicion && funcionActual?.id) {
                // --- MODO EDICIÓN ---
                const dataToSend: EditarFuncionData = { nombreVisible: nombreVisibleCapitalized, descripcion: descripcionCapitalized, parametros: parametrosParaEnviar };
                result = await editarFuncionTarea(funcionActual.id, dataToSend);
                funcionCreadaId = funcionActual.id; // Mantenemos ID
                if (!result?.success) throw new Error(result?.error || "Error al actualizar función.");

            } else {
                // --- MODO CREACIÓN ---
                const dataToSend: CrearFuncionData = { nombreInterno: formData.nombreInterno!.trim(), nombreVisible: nombreVisibleCapitalized, descripcion: descripcionCapitalized, parametros: parametrosParaEnviar };
                result = await crearFuncionTarea(dataToSend);
                if (!result?.success || !result.data?.id) {
                    // El error "ya existe" se captura aquí
                    throw new Error(result?.error || "Error al crear la función.");
                }
                funcionCreadaId = result.data.id;

                // --- Asociar la nueva función ---
                seIntentoAsociar = true; // Marcamos que intentamos asociar
                const asociacionResult = await asociarFuncionATarea(tareaId, funcionCreadaId);
                if (!asociacionResult.success) {
                    // Si la asociación falla, lanzar error para ir al catch y limpiar
                    throw new Error(asociacionResult.error || "Error al asociar la función a la tarea.");
                }
            }

            // Si todo fue bien, recargar datos
            await cargarDatos();

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            console.error(`Error durante ${modoEdicion ? 'edición' : 'creación/asociación'}:`, err);

            // --- Lógica de Limpieza y Mensaje Mejorado ---
            if (!modoEdicion && funcionCreadaId && seIntentoAsociar) {
                // Si estábamos creando, se creó la función (tenemos ID) pero falló la asociación
                console.warn("Falló la asociación después de crear. Intentando borrar función huérfana:", funcionCreadaId);
                setError(`Error al asociar: ${errorMsg}. Intentando limpiar...`); // Mensaje inicial
                try {
                    const deleteResult = await eliminarFuncionTarea(funcionCreadaId);
                    if (deleteResult.success) {
                        console.log("Función huérfana eliminada.");
                        setError(`Error al asociar la función. La función temporal fue eliminada. Intenta de nuevo.`);
                    } else {
                        console.error("¡FALLO al eliminar función huérfana!", deleteResult.error);
                        setError(`Error CRÍTICO: Falló la asociación y no se pudo eliminar la función creada (${funcionCreadaId}). Contacta soporte.`);
                    }
                } catch (deleteErr) {
                    console.error("¡FALLO EXCEPCIÓN al eliminar función huérfana!", deleteErr);
                    setError(`Error CRÍTICO: Falló la asociación y hubo un error al intentar eliminar la función creada (${funcionCreadaId}). Contacta soporte.`);
                }

            } else if (!modoEdicion && errorMsg.includes('ya existe')) {
                // Si el error original fue "ya existe" en creación
                setError(`Error: El nombre interno '${formData.nombreInterno}' ya existe. Puede que haya quedado de un intento anterior fallido. Intenta desvincular o contacta soporte si el problema persiste.`);
            }
            else {
                // Otros errores (edición, error inicial de creación, etc.)
                setError(`Error: ${errorMsg}`);
            }
            // No ocultar el formulario si hay error
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Desvincular Función (sin cambios lógicos) ---
    const handleDesvincular = async (event: React.MouseEvent<HTMLButtonElement>) => { /* ... (código sin cambios) ... */
        event.stopPropagation();
        if (!funcionActual) return;
        const confirmarDesvinculacion = confirm(`¿Desvincular función "${funcionActual.nombreVisible}"?`);
        if (confirmarDesvinculacion) {
            const eliminarDefinicion = confirm(`Función desvinculada.\n\n¿ELIMINAR también la definición de "${funcionActual.nombreVisible}"?`);
            setIsDeleting(true); setError(null);
            try {
                const desasociarResult = await asociarFuncionATarea(tareaId, null);
                if (!desasociarResult.success) throw new Error(desasociarResult.error || "Error al desvincular.");
                if (eliminarDefinicion) {
                    const eliminarResult = await eliminarFuncionTarea(funcionActual.id);
                    if (!eliminarResult.success) console.warn(`No se pudo eliminar definición: ${eliminarResult.error}`);
                }
                setFuncionActual(null);
                setMostrarFormulario(false);
            } catch (err) {
                console.error("Error al desvincular:", err);
                setError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally { setIsDeleting(false); }
        }
    };

    // --- Handler para copiar (sin cambios) ---
    const handleCopyToClipboard = async () => { /* ... (código sin cambios) ... */
        if (!formData.nombreInterno) return;
        try {
            await navigator.clipboard.writeText(formData.nombreInterno);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 1500);
        } catch (err) {
            console.error('Error al copiar:', err);
            setError("No se pudo copiar el ID.");
        }
    };


    // --- Renderizado (sin cambios visuales significativos, solo el mensaje de error) ---
    if (isLoading) {
        return (<div className={`${containerClasses} p-3`}><p className="text-center text-zinc-400 italic text-xs flex items-center justify-center gap-1"><Loader2 className='animate-spin' size={12} /> Cargando...</p></div>);
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses} onClick={() => !mostrarFormulario && toggleFormulario(funcionActual ? 'edit' : null)}>
                <h3 className={titleClasses}>
                    <Cog size={14} /> Función de Automatización
                    {funcionActual && <span className='text-xs text-blue-400 font-normal ml-1'>({funcionActual.nombreVisible})</span>}
                    {!funcionActual && <span className='text-xs text-zinc-500 font-normal ml-1'>(Ninguna asociada)</span>}
                </h3>
                <div className="flex items-center gap-1">
                    {/* ... (botones sin cambios) ... */}
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
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleFormulario(); }} className={buttonIconClasses} title={mostrarFormulario ? "Ocultar formulario" : "Mostrar/Editar función"}>
                        {mostrarFormulario ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Vista o Formulario */}
            {/* ... (código de la vista sin cambios) ... */}
            {!mostrarFormulario && funcionActual && (<div className="p-4 border-t border-zinc-700"> <div className="space-y-3 text-sm mt-2"> <p><strong className="text-zinc-300 font-medium">Nombre Interno (ID):</strong> <span className="font-mono text-zinc-400">{funcionActual.nombreInterno}</span></p> {funcionActual.descripcion && <p><strong className="text-zinc-300 font-medium">Descripción:</strong> {funcionActual.descripcion}</p>} <div> <strong className="text-zinc-300 font-medium block mb-1">Parámetros Requeridos:</strong> {funcionActual.parametrosRequeridos && funcionActual.parametrosRequeridos.length > 0 ? (<div className="flex flex-wrap gap-1.5"> {funcionActual.parametrosRequeridos.map(({ parametroRequerido, esObligatorio }) => parametroRequerido ? (<span key={parametroRequerido.id} className={paramTagClasses} title={`${parametroRequerido.descripcion || 'Sin descripción'} ${esObligatorio ? '(Obligatorio)' : ''}`}> {parametroRequerido.nombreVisible} {esObligatorio && <span className="text-amber-400 ml-0.5">*</span>} </span>) : null)} </div>) : (<p className="text-zinc-400 italic text-xs">Sin parámetros estándar.</p>)} </div> </div> </div>)}
            {!mostrarFormulario && !funcionActual && (<p className="text-zinc-400 italic text-center text-sm py-4">Click en &apos;+ Crear&apos; para definir la función.</p>)}


            {/* Formulario (condicional) */}
            {mostrarFormulario && (
                <div className={formContainerClasses}>
                    {/* --- Mensaje de Error Mejorado --- */}
                    {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm mb-3">{error}</p>}

                    {/* Nombre Interno con Copiar */}
                    <div>
                        <label htmlFor="form-nombreInterno" className={labelBaseClasses}>Nombre Interno (ID)</label>
                        <div className="relative">
                            <input type="text" id="form-nombreInterno" name="nombreInterno" value={formData.nombreInterno || ''} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed pr-8`} required disabled={isSubmitting || modoEdicion} placeholder="Se genera..." />
                            <div className={copyButtonClasses}>
                                <button type="button" onClick={handleCopyToClipboard} className={`${buttonIconClasses} text-zinc-400 hover:text-blue-400`} title="Copiar ID Interno" disabled={!formData.nombreInterno}>
                                    {copySuccess ? <Check size={14} className="text-green-500" /> : <ClipboardCopy size={14} />}
                                </button>
                            </div>
                        </div>
                        {modoEdicion && funcionActual?.nombreVisible && (<p className="text-xs text-zinc-500 mt-1">Basado en Nombre Visible: &quot;{funcionActual.nombreVisible}&quot;</p>)}
                        {!modoEdicion && (<p className="text-xs text-zinc-500 mt-1">Se genera automáticamente del nombre de la tarea.</p>)}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label htmlFor="form-descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="form-descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleFormChange} className={textareaBaseClasses} disabled={isSubmitting} rows={2} placeholder="Qué hace esta función..." />
                    </div>
                    {/* Selección de Parámetros */}
                    <div className='pt-3 mt-3 border-t border-zinc-700'>
                        <label className={labelBaseClasses}>Parámetros Requeridos</label>
                        {parametrosDisponibles.length === 0 ? (<p className="text-sm text-zinc-500 italic">No hay parámetros globales.</p>) : (
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
                        <button type="button" onClick={handleGuardarFuncion} className={`${primaryButtonClasses} !w-auto min-w-[90px]`} disabled={isSubmitting || (!modoEdicion && !formData.nombreInterno?.trim())}>
                            {isSubmitting ? <Loader2 className='animate-spin' size={14} /> : <Save size={14} />}
                            {modoEdicion ? 'Guardar' : 'Crear'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
