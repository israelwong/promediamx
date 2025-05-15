'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerParametrosRequeridosDisponibles,
    editarFuncionTarea,
    obtenerFuncionTareaDetallesPorId
} from '@/app/admin/_lib/tareaFuncion.actions';

import {
    crearParametroRequerido,
    editarParametroRequerido,
    eliminarParametroRequerido
} from '@/app/admin/_lib/tareaParametro.actions';
import {
    ParametroFormData as ParametroGlobalFormData, // Este es el tipo para el form del modal de parámetros
} from '@/app/admin/_lib/tareaParametro.type';


import {
    ParametroSeleccionableEnForm,
    TareaFuncionFormState,
    EditarTareaFuncionInput,
} from '@/app/admin/_lib/tareaFuncion.type';
// No necesitamos ParametroRequeridoBasePrisma si ParametroSeleccionableEnForm lo extiende correctamente.

import {
    Loader2, Save, XIcon, AlertTriangleIcon, CheckSquare, SearchIcon, Edit3, PlusIcon, Trash2, Edit
} from 'lucide-react';

const TIPOS_DATO_PARAMETRO_MODAL = [
    { value: 'texto', label: 'Texto Corto' },
    { value: 'texto_largo', label: 'Texto Largo' },
    { value: 'numero', label: 'Número' },
    { value: 'fecha', label: 'Fecha' },
    { value: 'fecha_hora', label: 'Fecha y Hora' },
    { value: 'booleano', label: 'Sí/No (Booleano)' },
    { value: 'email', label: 'Email' },
    { value: 'telefono', label: 'Teléfono' },
    { value: 'url', label: 'URL' },
];

const generarNombreInternoParametro = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/_{2,}/g, '_');
};

interface TareaFuncionEditarFormularioProps {
    funcionId: string;
}

export default function TareaFuncionEditarFormulario({ funcionId }: TareaFuncionEditarFormularioProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<TareaFuncionFormState>({
        id: funcionId,
        nombreInterno: '',
        nombreVisible: '',
        descripcion: '',
        parametrosDisponibles: []
    });
    const [loadingData, setLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Para el formulario principal
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTermParametros, setSearchTermParametros] = useState('');

    // Estados para el modal de CREAR Parámetro Global
    const [isCrearParametroModalOpen, setIsCrearParametroModalOpen] = useState(false);
    const [nuevoParametroFormData, setNuevoParametroFormData] = useState<ParametroGlobalFormData>({
        nombreVisible: '',
        // nombreInterno se autogenera y es parte de ParametroGlobalFormData si lo defines así
        tipoDato: 'texto',
        descripcion: ''
    });
    const [isSubmittingNuevoParametro, setIsSubmittingNuevoParametro] = useState(false);
    const [modalNuevoParametroError, setModalNuevoParametroError] = useState<string | null>(null);
    const [modalNuevoParametroSuccess, setModalNuevoParametroSuccess] = useState<string | null>(null);

    // Estados para el modal de EDITAR Parámetro Global
    const [isEditarParametroModalOpen, setIsEditarParametroModalOpen] = useState(false);
    const [parametroParaEditarGlobal, setParametroParaEditarGlobal] = useState<ParametroSeleccionableEnForm | null>(null);
    const [editarParametroFormData, setEditarParametroFormData] = useState<ParametroGlobalFormData>({});
    const [isSubmittingEditarParametro, setIsSubmittingEditarParametro] = useState(false);
    const [modalEditarParametroError, setModalEditarParametroError] = useState<string | null>(null);
    const [modalEditarParametroSuccess, setModalEditarParametroSuccess] = useState<string | null>(null);

    // Clases de UI
    const formContainerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-md border border-zinc-700";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 mb-4";
    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} resize-none`;
    const helperTextClasses = "text-xs text-zinc-500 mt-1.5";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSecondaryClasses = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSmallSecondaryClasses = "bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50";
    const buttonIconOnlyClasses = "p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed";
    const checkboxWrapperClasses = "p-3 bg-zinc-800 border border-zinc-700 rounded-md hover:bg-zinc-700/50 transition-colors";
    const checkboxLabelClasses = "text-sm text-zinc-200";
    const checkboxClasses = "h-5 w-5 rounded text-blue-600 bg-zinc-900 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-800 flex-shrink-0";
    const alertErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const alertSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2";
    const searchInputWrapperClasses = "relative mb-4";
    const searchInputClasses = `${inputBaseClasses} pl-10`;
    const modalOverlayClasses = "fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-xl flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const modalButtonPrimary = `${buttonPrimaryClasses} px-4 py-2 text-sm`;
    const modalButtonSecondary = `${buttonSecondaryClasses} px-4 py-2 text-sm`;
    // const modalButtonDanger = `${buttonPrimaryClasses.replace('bg-blue-600', 'bg-red-600').replace('hover:bg-blue-700', 'hover:bg-red-700')} px-4 py-2 text-sm mr-auto`;

    const cargarParametrosDisponibles = useCallback(async (showSuccess = false) => {
        try {
            const paramsDisponibles = await obtenerParametrosRequeridosDisponibles();
            setFormData(prev => {
                const parametrosActualizados = paramsDisponibles.map(nuevoP => {
                    const existenteEnForm = prev.parametrosDisponibles.find(p => p.id === nuevoP.id);
                    const countFunciones = (nuevoP as ParametroSeleccionableEnForm)._count?.funciones ?? 0;
                    return {
                        ...nuevoP,
                        seleccionado: existenteEnForm?.seleccionado || false,
                        esObligatorio: existenteEnForm?.esObligatorio || false,
                        _count: { funciones: countFunciones }
                    };
                });
                return { ...prev, parametrosDisponibles: parametrosActualizados };
            });
            if (showSuccess) {
                // Usar el estado de éxito del modal de parámetros, no el general del formulario
                setModalNuevoParametroSuccess("Lista de parámetros actualizada.");
                setTimeout(() => setModalNuevoParametroSuccess(null), 3000);
            }
        } catch (err) {
            // Usar el estado de error del modal de parámetros
            setModalNuevoParametroError("Error al recargar los parámetros disponibles.");
            console.error(err);
        }
    }, []);

    useEffect(() => {
        async function cargarDatosParaEdicion() {
            setLoadingData(true); setError(null); setSuccessMessage(null);
            try {
                const paramsGlobalesPromise = obtenerParametrosRequeridosDisponibles();
                const funcionAEditarPromise = obtenerFuncionTareaDetallesPorId(funcionId);
                const [paramsGlobales, funcionAEditar] = await Promise.all([paramsGlobalesPromise, funcionAEditarPromise]);

                if (!funcionAEditar) {
                    setError(`No se encontró la función con ID: ${funcionId}. Puede haber sido eliminada.`);
                    setLoadingData(false); setFormData(prev => ({ ...prev, id: undefined })); return;
                }

                const parametrosParaForm = paramsGlobales.map((pg): ParametroSeleccionableEnForm => {
                    const paramAsociado = funcionAEditar.parametrosRequeridos?.find(
                        pra => pra.parametroRequerido?.id === pg.id
                    );
                    const countFunciones = (pg as ParametroSeleccionableEnForm)._count?.funciones ?? 0;
                    return {
                        ...pg,
                        seleccionado: !!paramAsociado,
                        esObligatorio: paramAsociado?.esObligatorio || false,
                        _count: { funciones: countFunciones }
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
                setError("Error al cargar los datos de la función para editar. Intenta de nuevo."); console.error(err);
            } finally { setLoadingData(false); }
        }
        if (funcionId) { cargarDatosParaEdicion(); }
        else { setError("No se proporcionó un ID de función para editar."); setLoadingData(false); }
    }, [funcionId, cargarParametrosDisponibles]); // Añadir cargarParametrosDisponibles a dependencias si se usa dentro

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
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
                setFormData(prev => ({ ...prev, nombreVisible: result.data?.nombreVisible || prev.nombreVisible }));
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

    const openCrearParametroModal = () => {
        setNuevoParametroFormData({ nombreVisible: '', nombreInterno: '', tipoDato: 'texto', descripcion: '' });
        setModalNuevoParametroError(null);
        setModalNuevoParametroSuccess(null);
        setIsCrearParametroModalOpen(true);
    };
    const closeCrearParametroModal = () => setIsCrearParametroModalOpen(false);

    const handleNuevoParametroFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNuevoParametroFormData(prev => {
            const updatedData = { ...prev, [name]: value };
            if (name === 'nombreVisible') {
                updatedData.nombreInterno = generarNombreInternoParametro(value);
            }
            return updatedData;
        });
        if (modalNuevoParametroError) setModalNuevoParametroError(null);
    };

    const handleNuevoParametroSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!nuevoParametroFormData.nombreVisible?.trim()) { setModalNuevoParametroError("Nombre visible obligatorio."); return; }
        const nombreInternoGenerado = generarNombreInternoParametro(nuevoParametroFormData.nombreVisible);
        if (!nombreInternoGenerado || !/^[a-z0-9_]+$/.test(nombreInternoGenerado)) {
            setModalNuevoParametroError("Nombre interno inválido (del Nombre Visible)."); return;
        }
        if (!nuevoParametroFormData.tipoDato) { setModalNuevoParametroError("Tipo de dato obligatorio."); return; }

        setIsSubmittingNuevoParametro(true); setModalNuevoParametroError(null); setModalNuevoParametroSuccess(null);
        try {
            const dataToSend = {
                nombreVisible: nuevoParametroFormData.nombreVisible.trim(),
                tipoDato: nuevoParametroFormData.tipoDato,
                descripcion: nuevoParametroFormData.descripcion?.trim() || null,
            };
            const result = await crearParametroRequerido(dataToSend);
            if (result.success && result.data) {
                closeCrearParametroModal();
                await cargarParametrosDisponibles(true); // true para mostrar success en columna 2
            } else { throw new Error(result.error || "Error desconocido al crear el parámetro."); }
        } catch (err) {
            setModalNuevoParametroError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally { setIsSubmittingNuevoParametro(false); }
    };

    const openEditarParametroModal = (param: ParametroSeleccionableEnForm) => {
        setParametroParaEditarGlobal(param);
        setEditarParametroFormData({
            nombreVisible: param.nombreVisible,
            nombreInterno: param.nombreInterno, // Para mostrarlo
            tipoDato: param.tipoDato,
            descripcion: param.descripcion
        });
        setModalEditarParametroError(null);
        setModalEditarParametroSuccess(null);
        setIsEditarParametroModalOpen(true);
    };
    const closeEditarParametroModal = () => {
        setIsEditarParametroModalOpen(false);
        setParametroParaEditarGlobal(null); // Limpiar el parámetro en edición
    };

    const handleEditarParametroFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditarParametroFormData(prev => ({ ...prev, [name]: value }));
        if (modalEditarParametroError) setModalEditarParametroError(null);
    };

    const handleEditarParametroSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!parametroParaEditarGlobal || !editarParametroFormData.nombreVisible?.trim()) {
            setModalEditarParametroError("Nombre visible obligatorio."); return;
        }
        if (!editarParametroFormData.tipoDato) { setModalEditarParametroError("Tipo de dato obligatorio."); return; }

        setIsSubmittingEditarParametro(true); setModalEditarParametroError(null); setModalEditarParametroSuccess(null);
        try {
            const dataToUpdate = {
                nombreVisible: editarParametroFormData.nombreVisible.trim(),
                tipoDato: editarParametroFormData.tipoDato,
                descripcion: editarParametroFormData.descripcion?.trim() || null,
            };
            const result = await editarParametroRequerido(parametroParaEditarGlobal.id, dataToUpdate);
            if (result.success && result.data) {
                closeEditarParametroModal();
                await cargarParametrosDisponibles(true); // true para mostrar success en columna 2
            } else { throw new Error(result.error || "Error desconocido al editar el parámetro."); }
        } catch (err) {
            setModalEditarParametroError(err instanceof Error ? err.message : "Ocurrió un error");
        } finally { setIsSubmittingEditarParametro(false); }
    };

    const handleEliminarParametroGlobal = async (param: ParametroSeleccionableEnForm) => {
        if (!param || !param.id || !param.nombreVisible) return;
        // La validación de si se puede eliminar (param._count.funciones === 0) ya se hace para deshabilitar el botón.
        // Aquí solo confirmamos.
        if (confirm(`¿Eliminar parámetro global "${param.nombreVisible}" (${param.nombreInterno})? Esta acción no se puede deshacer.`)) {
            // Usar un estado de error/éxito específico para la columna de parámetros
            setModalNuevoParametroError(null);
            setModalNuevoParametroSuccess(null);
            setModalEditarParametroError(null);
            setModalEditarParametroSuccess(null);
            try {
                const result = await eliminarParametroRequerido(param.id);
                if (result.success) {
                    await cargarParametrosDisponibles(); // Recargar lista
                    setModalNuevoParametroSuccess(`Parámetro "${param.nombreVisible}" eliminado de la lista global.`);
                    setTimeout(() => setModalNuevoParametroSuccess(null), 4000);
                } else { throw new Error(result.error || "Error al eliminar el parámetro."); }
            } catch (err) {
                setModalNuevoParametroError(err instanceof Error ? err.message : "Ocurrió un error al eliminar el parámetro.");
            }
        }
    };

    const parametrosFiltrados = formData.parametrosDisponibles.filter(param =>
        param.nombreVisible?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.nombreInterno?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.descripcion?.toLowerCase().includes(searchTermParametros.toLowerCase())
    );

    if (loadingData) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-zinc-800 rounded-lg p-6">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-zinc-300">Cargando datos de la función...</span>
            </div>
        );
    }

    if (!loadingData && !formData.id && error) {
        return (
            <div className={`${formContainerClasses} p-6`}>
                <div className="px-6 py-4 border-b border-zinc-700 mb-6">
                    <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                        <Edit3 size={22} /> Editar Función Global
                    </h2>
                </div>
                <div className={alertErrorClasses.replace('col-span-full', '')}>
                    <AlertTriangleIcon size={18} /> <span>{error}</span>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="button" onClick={() => router.back()} className={buttonSecondaryClasses} >
                        <XIcon size={18} /> Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={formContainerClasses}>
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-zinc-700">
                        <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                            <Edit3 size={22} /> Editar Función Global: <span className="text-blue-400">{formData.nombreVisible || formData.nombreInterno}</span>
                        </h2>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        <div className="flex flex-col space-y-6 lg:sticky lg:top-6 self-start">
                            {error && !successMessage && (
                                <div className={alertErrorClasses.replace('col-span-full', '')}>
                                    <AlertTriangleIcon size={18} /> <span>{error}</span>
                                </div>
                            )}
                            {successMessage && (
                                <div className={alertSuccessClasses.replace('col-span-full', '')}>
                                    <CheckSquare size={18} /> <span>{successMessage}</span>
                                </div>
                            )}
                            <div className={`${sectionContainerClasses} flex flex-col flex-grow`}>
                                <h3 className={sectionTitleClasses}>Información de la Función</h3>
                                <div className="space-y-4 flex flex-col flex-grow">
                                    <div>
                                        <label htmlFor="nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                        <input type="text" id="nombreVisible" name="nombreVisible" value={formData.nombreVisible} onChange={handleInputChange} className={inputBaseClasses} required disabled={isSubmitting} />
                                        <p className={helperTextClasses}>Nombre descriptivo que se mostrará en la UI.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="nombreInterno" className={labelBaseClasses}>Nombre Interno (ID)</label>
                                        <input type="text" id="nombreInterno" name="nombreInterno" value={formData.nombreInterno} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`} disabled={isSubmitting} />
                                        <p className={helperTextClasses}>Identificador único. No editable.</p>
                                    </div>
                                    <div className="flex flex-col flex-grow">
                                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                                        <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} className={`${textareaBaseClasses} flex-grow min-h-[150px] lg:min-h-[200px] `} disabled={isSubmitting} />
                                        <p className={helperTextClasses}>Ayuda a entender el propósito de la función.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`${sectionContainerClasses} flex flex-col`}>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className={sectionTitleClasses.replace('mb-4', 'mb-0')}>Parámetros Estándar</h3>
                                <button type="button" onClick={openCrearParametroModal} className={buttonSmallSecondaryClasses} disabled={isSubmitting}>
                                    <PlusIcon size={14} /> Crear Parámetro
                                </button>
                            </div>

                            {modalNuevoParametroError && <p className={`${alertErrorClasses} my-2 text-xs p-2`}><AlertTriangleIcon size={14} className="mr-1" />{modalNuevoParametroError}</p>}
                            {modalNuevoParametroSuccess && <p className={`${alertSuccessClasses} my-2 text-xs p-2`}><CheckSquare size={14} className="mr-1" />{modalNuevoParametroSuccess}</p>}
                            {modalEditarParametroError && <p className={`${alertErrorClasses} my-2 text-xs p-2`}><AlertTriangleIcon size={14} className="mr-1" />{modalEditarParametroError}</p>}
                            {modalEditarParametroSuccess && <p className={`${alertSuccessClasses} my-2 text-xs p-2`}><CheckSquare size={14} className="mr-1" />{modalEditarParametroSuccess}</p>}

                            <div className={searchInputWrapperClasses}>
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-zinc-500" /></div>
                                <input type="search" value={searchTermParametros} onChange={(e) => setSearchTermParametros(e.target.value)} className={searchInputClasses} placeholder="Buscar parámetro..." disabled={isSubmitting} />
                            </div>

                            {formData.parametrosDisponibles.length === 0 && !loadingData ? (
                                <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No hay parámetros. Puedes crear uno nuevo.</p>
                            ) : parametrosFiltrados.length === 0 && searchTermParametros ? (
                                <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No se encontraron parámetros.</p>
                            ) : (
                                <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[calc(100vh-500px)] min-h-[200px] pr-2 py-1">
                                    {parametrosFiltrados.map((param) => {
                                        const isUsedByOtherFunctions = (param._count?.funciones ?? 0) > 0;
                                        const canDeleteGlobal = !isUsedByOtherFunctions;

                                        return (
                                            <div key={param.id} className={`${checkboxWrapperClasses} grid grid-cols-[auto,1fr,auto] gap-3 items-center`}>
                                                <input type="checkbox" id={`param-${param.id}`} checked={param.seleccionado} onChange={() => handleParametroChange(param.id)} className={checkboxClasses} disabled={isSubmitting} />
                                                <label htmlFor={`param-${param.id}`} className={`${checkboxLabelClasses} cursor-pointer flex flex-col overflow-hidden`}>
                                                    <span className="font-medium text-zinc-100 truncate" title={param.nombreVisible || ''}>{param.nombreVisible || 'Sin Nombre'}</span>
                                                    <span className="text-xs text-zinc-400 font-mono truncate" title={param.nombreInterno || ''}>({param.nombreInterno || 'N/A'}) - <span className="capitalize">{param.tipoDato || 'N/A'}</span></span>
                                                    <span className="text-xs text-zinc-500 mt-0.5">Usado en: {param._count?.funciones ?? 0} func.</span>
                                                </label>
                                                <div className="flex items-center gap-1.5">
                                                    {param.seleccionado && (
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <input type="checkbox" id={`obligatorio-${param.id}`} checked={param.esObligatorio} onChange={() => handleEsObligatorioChange(param.id)} className={checkboxClasses} disabled={isSubmitting} />
                                                            <label htmlFor={`obligatorio-${param.id}`} className="text-xs text-zinc-300 cursor-pointer whitespace-nowrap">Obligatorio</label>
                                                        </div>
                                                    )}
                                                    <button type="button" onClick={() => openEditarParametroModal(param)} className={buttonIconOnlyClasses} title="Editar Parámetro Global" disabled={isSubmitting}><Edit size={14} /></button>
                                                    <button type="button" onClick={() => handleEliminarParametroGlobal(param)} className={`${buttonIconOnlyClasses} ${canDeleteGlobal ? 'text-red-500 hover:text-red-400' : 'text-zinc-600 hover:text-zinc-600'}`} title={canDeleteGlobal ? "Eliminar Parámetro Global" : `No se puede eliminar: Usado en ${param._count?.funciones} funciones`} disabled={isSubmitting || !canDeleteGlobal}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <p className={helperTextClasses + " mt-3"}>Selecciona los parámetros que esta función utilizará. Puedes crear o editar parámetros globales desde aquí.</p>
                        </div>
                    </div>

                    <div className="col-span-full px-6 pb-6 pt-4 flex justify-end gap-4 border-t border-zinc-700 mt-6">
                        <button type="button" onClick={() => router.back()} className={buttonSecondaryClasses} disabled={isSubmitting}>
                            <XIcon size={18} /> Cancelar
                        </button>
                        <button type="submit" className={buttonPrimaryClasses} disabled={isSubmitting || loadingData} >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal para Crear Nuevo Parámetro Global */}
            {isCrearParametroModalOpen && (
                <div className={modalOverlayClasses} onClick={closeCrearParametroModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>Crear Nuevo Parámetro Global</h3>
                            <button onClick={closeCrearParametroModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleNuevoParametroSubmit}>
                            <div className={modalBodyClasses}>
                                {modalNuevoParametroError && (
                                    <p className={`${alertErrorClasses} mb-3 text-xs p-2`}> <AlertTriangleIcon size={14} className="mr-1" /> {modalNuevoParametroError}</p>
                                )}
                                {/* Campos del formulario del modal de creación de parámetro */}
                                <div>
                                    <label htmlFor="nuevo-param-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <input type="text" id="nuevo-param-nombreVisible" name="nombreVisible" value={nuevoParametroFormData.nombreVisible || ''} onChange={handleNuevoParametroFormChange} className={inputBaseClasses} required disabled={isSubmittingNuevoParametro} maxLength={100} placeholder="Ej: Correo del Cliente" />
                                </div>
                                <div>
                                    <label htmlFor="nuevo-param-nombreInterno" className={labelBaseClasses}>ID Interno (Generado)</label>
                                    <input type="text" id="nuevo-param-nombreInterno" name="nombreInterno" value={generarNombreInternoParametro(nuevoParametroFormData.nombreVisible || '')} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`} />
                                    <p className="text-xs text-zinc-500 mt-1">Se genera automáticamente del Nombre Visible. No editable.</p>
                                </div>
                                <div>
                                    <label htmlFor="nuevo-param-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select id="nuevo-param-tipoDato" name="tipoDato" value={nuevoParametroFormData.tipoDato || 'texto'} onChange={handleNuevoParametroFormChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmittingNuevoParametro}>
                                        {TIPOS_DATO_PARAMETRO_MODAL.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="nuevo-param-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="nuevo-param-descripcion" name="descripcion" value={nuevoParametroFormData.descripcion || ''} onChange={handleNuevoParametroFormChange} className={`${textareaBaseClasses} min-h-[100px]`} disabled={isSubmittingNuevoParametro} rows={5} maxLength={2000} placeholder="Describe para qué se usa este parámetro..." />
                                    <p className="text-xs text-zinc-500 mt-1">Máximo 2000 caracteres.</p>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                <button type="button" onClick={closeCrearParametroModal} className={modalButtonSecondary} disabled={isSubmittingNuevoParametro}>Cancelar</button>
                                <button type="submit" className={modalButtonPrimary} disabled={isSubmittingNuevoParametro || !nuevoParametroFormData.nombreVisible?.trim() || !nuevoParametroFormData.tipoDato}>
                                    {isSubmittingNuevoParametro ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    Crear Parámetro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Editar Parámetro Global */}
            {isEditarParametroModalOpen && parametroParaEditarGlobal && (
                <div className={modalOverlayClasses} onClick={closeEditarParametroModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className={modalTitleClasses}>Editar Parámetro Global</h3>
                            <button onClick={closeEditarParametroModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditarParametroSubmit}>
                            <div className={modalBodyClasses}>
                                {modalEditarParametroError && <p className={`${alertErrorClasses} mb-3 text-xs p-2`}><AlertTriangleIcon size={14} className="mr-1" />{modalEditarParametroError}</p>}
                                {/* Campos del formulario del modal de edición de parámetro */}
                                <div>
                                    <label htmlFor="editar-param-nombreVisible" className={labelBaseClasses}>Nombre Visible <span className="text-red-500">*</span></label>
                                    <input type="text" id="editar-param-nombreVisible" name="nombreVisible" value={editarParametroFormData.nombreVisible || ''} onChange={handleEditarParametroFormChange} className={inputBaseClasses} required disabled={isSubmittingEditarParametro} maxLength={100} />
                                </div>
                                <div>
                                    <label htmlFor="editar-param-nombreInterno" className={labelBaseClasses}>ID Interno (No editable)</label>
                                    <input type="text" id="editar-param-nombreInterno" name="nombreInterno" value={editarParametroFormData.nombreInterno || parametroParaEditarGlobal.nombreInterno || ''} readOnly className={`${inputBaseClasses} font-mono bg-zinc-950 cursor-not-allowed text-zinc-400`} />
                                    <p className="text-xs text-zinc-500 mt-1">Este nombre interno no se puede modificar. Si requiere cambiarlo, necesitaría crear una propiedad nueva.</p>
                                </div>
                                <div>
                                    <label htmlFor="editar-param-tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                                    <select id="editar-param-tipoDato" name="tipoDato" value={editarParametroFormData.tipoDato || 'texto'} onChange={handleEditarParametroFormChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmittingEditarParametro}>
                                        {TIPOS_DATO_PARAMETRO_MODAL.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="editar-param-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="editar-param-descripcion" name="descripcion" value={editarParametroFormData.descripcion || ''} onChange={handleEditarParametroFormChange} className={`${textareaBaseClasses} min-h-[100px]`} disabled={isSubmittingEditarParametro} rows={5} maxLength={2000} />
                                    <p className="text-xs text-zinc-500 mt-1">Máximo 2000 caracteres.</p>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                <button type="button" onClick={closeEditarParametroModal} className={modalButtonSecondary} disabled={isSubmittingEditarParametro}>Cancelar</button>
                                <button type="submit" className={modalButtonPrimary} disabled={isSubmittingEditarParametro || !editarParametroFormData.nombreVisible?.trim() || !editarParametroFormData.tipoDato}>
                                    {isSubmittingEditarParametro ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
