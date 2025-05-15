'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerParametrosRequeridosDisponibles,
    editarFuncionTarea,
    // Necesitaremos una action para obtener los detalles de UNA función específica por su ID.
    // Asumiré que tienes una como 'obtenerFuncionTareaPorId' o similar.
    // La action 'obtenerFuncionDeTarea' que tenías tomaba 'tareaId', no 'funcionId'.
    // Usaré la helper 'obtenerFuncionTareaPorId' que estaba al final de tu archivo de actions.
    // Si esta no es una server action exportada, necesitarás crear una.
    // Por ahora, la llamaré directamente para la demo, pero idealmente sería una server action.
} from '@/app/admin/_lib/tareaFuncion.actions'; // Ajusta según tus actions

import {
    TareaFuncionFormState,
    EditarTareaFuncionInput,
    FuncionConDetalles // Para el tipo de la función cargada
} from '@/app/admin/_lib/tareaFuncion.type';

import { obtenerFuncionesTareaConParametros } from '@/app/admin/_lib/tareaFuncion.actions'; // Para obtener todas las funciones y sus parámetros

import { Loader2, Save, XIcon, AlertTriangleIcon, CheckSquare, SearchIcon, Edit3 } from 'lucide-react';

// Helper para generar nombre interno (no se usa para editar nombreInterno, pero puede ser útil para validaciones si se permitiera)
// const generarNombreInterno = (nombreVisible: string): string => { ... }; // Ya lo tienes en el form de creación

interface TareaFuncionEditarFormularioProps {
    funcionId: string;
}

export default function TareaFuncionEditarFormulario({ funcionId }: TareaFuncionEditarFormularioProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<TareaFuncionFormState>({
        id: funcionId, // Inicializar con el ID
        nombreInterno: '',
        nombreVisible: '',
        descripcion: '',
        parametrosDisponibles: []
    });
    const [loadingData, setLoadingData] = useState(true); // Para carga inicial de función y parámetros
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTermParametros, setSearchTermParametros] = useState('');

    // Clases de UI (similares al formulario de creación)
    const formContainerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-md border border-zinc-700";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 mb-4";
    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} resize-none`;
    const helperTextClasses = "text-xs text-zinc-500 mt-1.5";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSecondaryClasses = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const checkboxWrapperClasses = "flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-md hover:bg-zinc-700/50 transition-colors";
    const checkboxLabelClasses = "text-sm text-zinc-200";
    const checkboxClasses = "h-5 w-5 rounded text-blue-600 bg-zinc-900 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-800 flex-shrink-0";
    const alertErrorClasses = "col-span-full text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const alertSuccessClasses = "col-span-full text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2";
    const searchInputWrapperClasses = "relative mb-4";
    const searchInputClasses = `${inputBaseClasses} pl-10`;

    // Cargar datos de la función y parámetros disponibles
    useEffect(() => {
        async function cargarDatosParaEdicion() {
            setLoadingData(true);
            setError(null);
            try {
                // 1. Obtener todos los parámetros disponibles
                const paramsGlobales = await obtenerParametrosRequeridosDisponibles();

                // 2. Obtener los detalles de la función específica a editar
                //    NECESITARÁS UNA SERVER ACTION PARA ESTO. Usaré una placeholder.
                //    La action 'obtenerFuncionTareaPorId' de tu archivo de actions es una buena base.
                //    Asumiré que la action devuelve un tipo compatible con FuncionConDetalles.

                // Simulación de la llamada a la action. Reemplaza con tu action real.
                // const funcionAEditar: FuncionConDetalles | null = await obtenerFuncionTareaPorIdAction(funcionId); 
                // Por ahora, voy a filtrar de la lista completa para la demo, pero esto NO es lo ideal.
                // DEBES tener una action que obtenga UNA función por ID con sus parámetros.
                const todasLasFunciones = await obtenerFuncionesTareaConParametros(); // No eficiente para una sola función
                const funcionAEditar = todasLasFunciones.find(f => f.id === funcionId) as FuncionConDetalles | undefined;


                if (!funcionAEditar) {
                    setError(`No se encontró la función con ID: ${funcionId}`);
                    setLoadingData(false);
                    return;
                }

                // 3. Mapear parámetros globales y marcar los seleccionados/obligatorios para esta función
                const parametrosParaForm = paramsGlobales.map(pg => {
                    const paramAsociado = funcionAEditar.parametrosRequeridos?.find(
                        pra => pra.parametroRequerido?.id === pg.id
                    );
                    return {
                        ...pg,
                        seleccionado: !!paramAsociado,
                        esObligatorio: paramAsociado?.esObligatorio || false
                    };
                });

                setFormData({
                    id: funcionAEditar.id,
                    nombreInterno: funcionAEditar.nombreInterno || '',
                    nombreVisible: funcionAEditar.nombreVisible || '',
                    descripcion: funcionAEditar.descripcion || '',
                    parametrosDisponibles: parametrosParaForm
                });

            } catch (err) {
                setError("Error al cargar los datos de la función para editar.");
                console.error(err);
            } finally {
                setLoadingData(false);
            }
        }
        if (funcionId) {
            cargarDatosParaEdicion();
        } else {
            setError("No se proporcionó ID de función para editar.");
            setLoadingData(false);
        }
    }, [funcionId]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // No permitir edición de nombreInterno
        if (name === 'nombreInterno') return;

        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const handleParametroChange = (paramId: string) => {
        setFormData(prev => ({
            ...prev,
            parametrosDisponibles: prev.parametrosDisponibles.map(p =>
                p.id === paramId ? { ...p, seleccionado: !p.seleccionado, esObligatorio: !p.seleccionado ? p.esObligatorio : false } : p
            )
        }));
    };

    const handleEsObligatorioChange = (paramId: string) => {
        setFormData(prev => ({
            ...prev,
            parametrosDisponibles: prev.parametrosDisponibles.map(p =>
                p.id === paramId ? { ...p, esObligatorio: !p.esObligatorio } : p
            )
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombreVisible.trim()) { setError("El Nombre Visible es obligatorio."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        const parametrosAEnviar = formData.parametrosDisponibles
            .filter(p => p.seleccionado)
            .map(p => ({ parametroRequeridoId: p.id, esObligatorio: p.esObligatorio }));

        const dataParaEditar: EditarTareaFuncionInput = {
            nombreVisible: formData.nombreVisible,
            descripcion: formData.descripcion.trim() || null,
            parametros: parametrosAEnviar
        };

        try {
            const result = await editarFuncionTarea(funcionId, dataParaEditar);
            if (result.success && result.data) {
                setSuccessMessage(`Función "${result.data.nombreVisible}" actualizada exitosamente!`);
            } else {
                setError(result.error || "Ocurrió un error al actualizar la función.");
            }
        } catch (err) {
            console.error("Error en submit de edición:", err);
            setError(err instanceof Error ? err.message : "Un error inesperado ocurrió.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const parametrosFiltrados = formData.parametrosDisponibles.filter(param =>
        param.nombreVisible?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.nombreInterno?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.descripcion?.toLowerCase().includes(searchTermParametros.toLowerCase())
    );

    if (loadingData) {
        return (
            <div className="flex items-center justify-center h-64 bg-zinc-800 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-zinc-300">Cargando datos de la función...</span>
            </div>
        );
    }

    if (!loadingData && !formData.id && !error) {
        setError("ID de función no válido o función no encontrada.");
    }


    return (
        <div className={formContainerClasses}>
            <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 border-b border-zinc-700">
                    <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                        <Edit3 size={22} /> Editar Función Global
                    </h2>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <div className="flex flex-col space-y-6">
                        {error && (
                            <div className={alertErrorClasses}>
                                <AlertTriangleIcon size={18} /> <span>{error}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className={alertSuccessClasses}>
                                <CheckSquare size={18} /> <span>{successMessage}</span>
                            </div>
                        )}
                        <div className={`${sectionContainerClasses} flex flex-col flex-grow`}>
                            <h3 className={sectionTitleClasses}>Información de la Función</h3>
                            <div className="space-y-4 flex flex-col flex-grow">
                                <div>
                                    <label htmlFor="nombreVisible" className={labelBaseClasses}>
                                        Nombre Visible <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" id="nombreVisible" name="nombreVisible"
                                        value={formData.nombreVisible} onChange={handleInputChange}
                                        className={inputBaseClasses} placeholder="Ej: Agendar Cita Presencial"
                                        required disabled={isSubmitting}
                                    />
                                    <p className={helperTextClasses}>Nombre descriptivo que se mostrará en la UI.</p>
                                </div>
                                <div>
                                    <label htmlFor="nombreInterno" className={labelBaseClasses}>
                                        Nombre Interno (ID)
                                    </label>
                                    <input
                                        type="text" id="nombreInterno" name="nombreInterno"
                                        value={formData.nombreInterno}
                                        readOnly // Hacerlo de solo lectura
                                        className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`}
                                        disabled={isSubmitting} // Deshabilitado también
                                    />
                                    <p className={helperTextClasses}>Identificador único. No editable.</p>
                                </div>
                                <div className="flex flex-col flex-grow">
                                    <label htmlFor="descripcion" className={labelBaseClasses}>
                                        Descripción (Opcional)
                                    </label>
                                    <textarea
                                        id="descripcion" name="descripcion" value={formData.descripcion}
                                        onChange={handleInputChange}
                                        className={`${textareaBaseClasses} flex-grow min-h-[150px] lg:min-h-[200px]`}
                                        placeholder="Describe brevemente qué hace esta función y cuándo se debería usar."
                                        disabled={isSubmitting}
                                    />
                                    <p className={helperTextClasses}>Ayuda a entender el propósito de la función.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`${sectionContainerClasses} flex flex-col`}>
                        <h3 className={sectionTitleClasses}>Parámetros Estándar para la Función</h3>

                        <div className={searchInputWrapperClasses}>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-zinc-500" aria-hidden="true" />
                            </div>
                            <input
                                type="search" name="searchParametros" id="searchParametros"
                                value={searchTermParametros} onChange={(e) => setSearchTermParametros(e.target.value)}
                                className={searchInputClasses} placeholder="Buscar parámetro..."
                                disabled={isSubmitting} // Solo deshabilitar si está enviando, no si carga parámetros
                            />
                        </div>

                        {formData.parametrosDisponibles.length === 0 && !loadingData ? ( // Si no hay parámetros globales
                            <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No hay parámetros estándar globales definidos en el sistema.</p>
                        ) : parametrosFiltrados.length === 0 && searchTermParametros ? ( // Si hay búsqueda pero sin resultados
                            <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No se encontraron parámetros con &quot;{searchTermParametros}&quot;.</p>
                        ) : (
                            <div className="space-y-3 flex-grow overflow-y-auto max-h-[calc(100vh-450px)] min-h-[200px] pr-2">
                                {parametrosFiltrados.map((param) => (
                                    <div key={param.id} className={checkboxWrapperClasses}>
                                        <div className="flex items-center gap-3 flex-grow min-w-0">
                                            <input
                                                type="checkbox" id={`param-${param.id}`}
                                                checked={param.seleccionado} onChange={() => handleParametroChange(param.id)}
                                                className={checkboxClasses} disabled={isSubmitting}
                                            />
                                            <label htmlFor={`param-${param.id}`} className={`${checkboxLabelClasses} cursor-pointer flex flex-col overflow-hidden`}>
                                                <span className="font-medium text-zinc-100 truncate" title={param.nombreVisible}>{param.nombreVisible}</span>
                                                <span className="text-xs text-zinc-400 font-mono truncate" title={param.nombreInterno}>({param.nombreInterno}) - <span className="capitalize">{param.tipoDato}</span></span>
                                                {param.descripcion && <span className="text-xs text-zinc-500 mt-0.5 line-clamp-1" title={param.descripcion}>{param.descripcion}</span>}
                                            </label>
                                        </div>
                                        {param.seleccionado && (
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <input
                                                    type="checkbox" id={`obligatorio-${param.id}`}
                                                    checked={param.esObligatorio} onChange={() => handleEsObligatorioChange(param.id)}
                                                    className={checkboxClasses} disabled={isSubmitting}
                                                />
                                                <label htmlFor={`obligatorio-${param.id}`} className="text-xs text-zinc-300 cursor-pointer whitespace-nowrap">
                                                    Obligatorio
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className={helperTextClasses + " mt-3"}>Selecciona los parámetros que esta función utilizará.</p>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-4 flex justify-end gap-4 border-t border-zinc-700 mt-6">
                    <button
                        type="button"
                        onClick={() => router.back()} // O router.push('/admin/tareas/funciones')
                        className={buttonSecondaryClasses}
                        disabled={isSubmitting}
                    >
                        <XIcon size={18} /> Cerrar
                    </button>
                    <button
                        type="submit"
                        className={buttonPrimaryClasses}
                        disabled={isSubmitting || loadingData} // Deshabilitar si está cargando datos iniciales también
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
}
