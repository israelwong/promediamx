'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangleIcon, CheckSquare, Save, XIcon, CalendarOff, PlusIcon, Edit, Trash2, CalendarPlus } from 'lucide-react';

// NUEVAS IMPORTS de Actions y Schemas/Types
import {
    obtenerExcepcionesHorarioAction,
    crearExcepcionHorarioAction,
    actualizarExcepcionHorarioAction,
    eliminarExcepcionHorarioAction,
} from '@/app/admin/_lib/actions/agendaExcepcionHorario/agendaExcepcionHorario.actions';
import type {
    ExcepcionHorarioData,
    UpsertExcepcionHorarioFormInput,
} from '@/app/admin/_lib/actions/agendaExcepcionHorario/agendaExcepcionHorario.schemas';
// ActionResult ya debería ser un tipo global
// import type { ActionResult } from '@/app/admin/_lib/types';


interface ExcepcionesHorarioSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean;
    // Opcional: si el componente padre AgendaConfiguracion carga estos datos
    initialExcepciones?: ExcepcionHorarioData[];
}

const formInicialExcepcion: UpsertExcepcionHorarioFormInput = {
    fecha: new Date().toISOString().split('T')[0], // Default a hoy
    descripcion: null,
    esDiaNoLaborable: true,
    horaInicio: null,
    horaFin: null,
};

const generarOpcionesDeHora = (): string[] => {
    const horas = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return horas;
};
const OPCIONES_HORA = generarOpcionesDeHora();


export default function ExcepcionesHorarioSeccion({
    negocioId,
    isSavingGlobal,
    initialExcepciones
}: ExcepcionesHorarioSeccionProps) {
    const [excepciones, setExcepciones] = useState<ExcepcionHorarioData[]>([]);
    const [loadingExcepciones, setLoadingExcepciones] = useState(true);
    const [errorExcepciones, setErrorExcepciones] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [currentExcepcion, setCurrentExcepcion] = useState<ExcepcionHorarioData | null>(null);
    const [formData, setFormData] = useState<UpsertExcepcionHorarioFormInput>(formInicialExcepcion);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalSuccess, setModalSuccess] = useState<string | null>(null);

    // Clases UI (sin cambios)
    const tableClasses = "min-w-full";
    const thClasses = "px-3 py-2.5 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap";
    const tdClasses = "px-3 py-3 text-sm text-zinc-300 whitespace-nowrap";
    const buttonIconClasses = "p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed";
    const buttonPrimaryModal = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSecondaryModal = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonDangerModal = "bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 mr-auto";
    const modalOverlayClasses = "fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalTitleClasses = "text-lg font-semibold text-zinc-100";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-900/30";
    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px] resize-none`;
    const radioLabelClasses = "flex items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer text-sm text-zinc-200";
    const radioClasses = "h-4 w-4 text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50";
    const alertModalErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const alertModalSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2";
    const alertSectionErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2 my-4";


    const fetchExcepcionesLocal = useCallback(async (showLoading = true) => {
        if (showLoading) setLoadingExcepciones(true);
        setErrorExcepciones(null);
        setModalSuccess(null);

        const result = await obtenerExcepcionesHorarioAction(negocioId); // Nueva action

        if (result.success && result.data) {
            setExcepciones(result.data);
        } else {
            setErrorExcepciones(result.error || "Error cargando excepciones de horario.");
            setExcepciones([]);
        }
        if (showLoading) setLoadingExcepciones(false);
    }, [negocioId]);

    useEffect(() => {
        if (initialExcepciones) {
            setExcepciones(initialExcepciones);
            setLoadingExcepciones(false);
        } else {
            fetchExcepcionesLocal();
        }
    }, [fetchExcepcionesLocal, initialExcepciones]);

    const openModal = (mode: 'create' | 'edit', excepcion?: ExcepcionHorarioData) => {
        setModalMode(mode);
        setModalError(null);
        setModalSuccess(null);
        if (mode === 'edit' && excepcion) {
            setCurrentExcepcion(excepcion);
            setFormData({
                fecha: excepcion.fecha, // Ya está en YYYY-MM-DD
                descripcion: excepcion.descripcion,
                esDiaNoLaborable: excepcion.esDiaNoLaborable,
                horaInicio: excepcion.horaInicio,
                horaFin: excepcion.horaFin,
            });
        } else {
            setCurrentExcepcion(null);
            setFormData(formInicialExcepcion);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setCurrentExcepcion(null);
            setFormData(formInicialExcepcion);
            setModalError(null);
            setModalSuccess(null);
            setIsSubmittingModal(false);
        }, 300);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;

        setFormData(prev => {
            let newValue: string | boolean | null = value;
            if (type === 'radio' && name === 'esDiaNoLaborable') {
                newValue = value === 'true';
            } else if (type === 'checkbox') { // Aunque no hay checkboxes directos, por si acaso
                newValue = target.checked;
            } else if ((name === 'horaInicio' || name === 'horaFin') && value === '') {
                newValue = null; // Permitir deseleccionar hora
            }


            const updatedState = { ...prev, [name]: newValue };

            if (name === 'esDiaNoLaborable') {
                if (newValue === true) { // Si es día no laborable
                    updatedState.horaInicio = null;
                    updatedState.horaFin = null;
                } else { // Si es horario especial y no hay horas, poner defaults
                    if (!updatedState.horaInicio) updatedState.horaInicio = '09:00';
                    if (!updatedState.horaFin) updatedState.horaFin = '17:00';
                }
            }
            return updatedState;
        });
        if (modalError) setModalError(null);
        if (modalSuccess) setModalSuccess(null);
    };

    const handleSubmitModal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmittingModal(true);
        setModalError(null);
        setModalSuccess(null);

        // La validación de Zod ocurre en la action, aquí preparamos el objeto.
        const inputForAction: UpsertExcepcionHorarioFormInput = {
            ...formData,
            descripcion: formData.descripcion || null, // Asegurar null si está vacío
            horaInicio: !formData.esDiaNoLaborable ? (formData.horaInicio || null) : null,
            horaFin: !formData.esDiaNoLaborable ? (formData.horaFin || null) : null,
        };

        let result; // Tipo ActionResult<ExcepcionHorarioData>

        try {
            if (modalMode === 'create') {
                result = await crearExcepcionHorarioAction(negocioId, inputForAction);
            } else if (currentExcepcion?.id) {
                result = await actualizarExcepcionHorarioAction(currentExcepcion.id, inputForAction);
            } else {
                throw new Error("Modo de operación o ID no válidos.");
            }

            if (result.success && result.data) {
                setModalSuccess(`Excepción para ${result.data.fecha} ${modalMode === 'create' ? 'creada' : 'actualizada'} exitosamente.`);
                await fetchExcepcionesLocal(false); // Recargar sin loader principal
                setTimeout(() => closeModal(), 1500);
            } else {
                const errorMsg = result.errorDetails
                    ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                    : result.error || "Ocurrió un error desconocido.";
                setModalError(errorMsg);
            }
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "Un error inesperado ocurrió.");
        } finally {
            setIsSubmittingModal(false);
        }
    };

    const handleDeleteExcepcion = async (excepcionId: string, fecha: string) => {
        if (isSubmittingModal || isSavingGlobal) return;
        if (confirm(`¿Estás seguro de eliminar la excepción para la fecha "${formatDateForDisplay(fecha)}"?`)) {
            setIsSubmittingModal(true);
            setModalError(null);
            setErrorExcepciones(null);

            const result = await eliminarExcepcionHorarioAction(excepcionId); // Nueva action

            if (result.success) {
                await fetchExcepcionesLocal(false);
                if (currentExcepcion?.id === excepcionId && isModalOpen) {
                    closeModal();
                }
            } else {
                if (isModalOpen && currentExcepcion?.id === excepcionId) {
                    setModalError(result.error || "Error al eliminar la excepción.");
                } else {
                    setErrorExcepciones(result.error || "Error al eliminar la excepción.");
                }
            }
            setIsSubmittingModal(false);
        }
    };

    const formatDateForDisplay = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const [year, month, day] = dateString.split('-');
            const date = new Date(Number(year), Number(month) - 1, Number(day));
            if (isNaN(date.getTime())) return dateString; // Fallback si la fecha no es válida
            return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        } catch {
            return dateString;
        }
    };

    if (loadingExcepciones && !initialExcepciones) {
        return <div className="py-8 flex items-center justify-center text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando excepciones...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold text-zinc-100 flex items-center gap-2">
                    <CalendarOff size={18} className="text-blue-400" />
                    Excepciones de Horario / Días Festivos
                </h3>
                <button
                    onClick={() => openModal('create')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                    disabled={isSavingGlobal || isSubmittingModal}
                >
                    <PlusIcon size={14} /> Añadir Excepción
                </button>
            </div>

            {errorExcepciones && <p className={alertSectionErrorClasses}><AlertTriangleIcon size={16} className="mr-1" />{errorExcepciones}</p>}

            {excepciones.length === 0 && !errorExcepciones ? (
                <div className="text-center py-8 px-4 bg-zinc-900/30 border border-dashed border-zinc-700 rounded-md">
                    <CalendarPlus size={32} className="mx-auto text-zinc-500 mb-2" />
                    <p className="text-sm text-zinc-400">No has definido excepciones de horario.</p>
                    <p className="text-xs text-zinc-500 mt-1">Añade días festivos o fechas con horarios especiales.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-md border border-zinc-700 bg-zinc-900/30">
                    <table className={tableClasses}>
                        <thead className="bg-zinc-800/50 border-b border-zinc-700">
                            <tr>
                                <th className={thClasses}>Fecha</th>
                                <th className={thClasses}>Descripción</th>
                                <th className={thClasses}>Tipo</th>
                                <th className={`${thClasses} text-right w-28`}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/70">
                            {excepciones.map((ex) => (
                                <tr key={ex.id} className="hover:bg-zinc-700/40 transition-colors">
                                    <td className={`${tdClasses} font-medium text-zinc-100`}>{formatDateForDisplay(ex.fecha)}</td>
                                    <td className={`${tdClasses} max-w-sm truncate text-zinc-400`} title={ex.descripcion || ''}>
                                        {ex.descripcion || <span className="text-zinc-500 italic">N/A</span>}
                                    </td>
                                    <td className={tdClasses}>
                                        {ex.esDiaNoLaborable ? (
                                            <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30">Cerrado</span>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-full border border-teal-500/30">
                                                Horario Especial: {ex.horaInicio || 'N/A'} - {ex.horaFin || 'N/A'}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`${tdClasses} text-right`}>
                                        <button onClick={() => openModal('edit', ex)} className={buttonIconClasses} title="Editar excepción" disabled={isSavingGlobal || isSubmittingModal}><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteExcepcion(ex.id!, ex.fecha)} className={`${buttonIconClasses} text-red-500 hover:text-red-400`} title="Eliminar excepción" disabled={isSavingGlobal || isSubmittingModal}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal para Crear/Editar Excepción */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleSubmitModal}>
                            <div className={modalHeaderClasses}>
                                <h4 className={modalTitleClasses}>
                                    {modalMode === 'create' ? 'Añadir Nueva Excepción' : `Editar Excepción: ${formatDateForDisplay(currentExcepcion?.fecha)}`}
                                </h4>
                                <button type="button" onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500" aria-label="Cerrar modal">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            <div className={modalBodyClasses}>
                                {modalError && <p className={alertModalErrorClasses}><AlertTriangleIcon size={16} className="mr-1" />{modalError}</p>}
                                {modalSuccess && <p className={alertModalSuccessClasses}><CheckSquare size={16} className="mr-1" />{modalSuccess}</p>}

                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="fecha" className={labelBaseClasses}>Fecha <span className="text-red-500">*</span></label>
                                        <input type="date" name="fecha" id="fecha" value={formData.fecha} onChange={handleFormChange} className={inputBaseClasses} required disabled={isSubmittingModal || !!modalSuccess} />
                                    </div>
                                    <div>
                                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                                        <textarea name="descripcion" id="descripcion" value={formData.descripcion || ''} onChange={handleFormChange} className={textareaBaseClasses} rows={2} disabled={isSubmittingModal || !!modalSuccess} placeholder="Ej: Navidad, Mantenimiento Anual" />
                                    </div>

                                    <fieldset className="pt-2">
                                        <legend className={labelBaseClasses}>Tipo de Excepción:</legend>
                                        <div className="space-y-2">
                                            <label className={radioLabelClasses}>
                                                <input type="radio" name="esDiaNoLaborable" value="true" checked={formData.esDiaNoLaborable === true} onChange={handleFormChange} className={radioClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                                <span>Cerrado todo el día</span>
                                            </label>
                                            <label className={radioLabelClasses}>
                                                <input type="radio" name="esDiaNoLaborable" value="false" checked={formData.esDiaNoLaborable === false} onChange={handleFormChange} className={radioClasses} disabled={isSubmittingModal || !!modalSuccess} />
                                                <span>Horario Especial</span>
                                            </label>
                                        </div>
                                    </fieldset>

                                    {!formData.esDiaNoLaborable && (
                                        <div className="space-y-3 pt-2 border-t border-zinc-700/50 mt-3">
                                            <p className="text-xs text-zinc-400">Define el horario especial para esta fecha:</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor="horaInicio" className={labelBaseClasses}>Hora Inicio <span className="text-red-500">*</span></label>
                                                    <select name="horaInicio" id="horaInicio" value={formData.horaInicio || ''} onChange={handleFormChange} className={`${inputBaseClasses} appearance-none`} required={!formData.esDiaNoLaborable} disabled={isSubmittingModal || !!modalSuccess}>
                                                        <option value="">Selecciona...</option>
                                                        {OPCIONES_HORA.map(hora => <option key={`ex-inicio-${hora}`} value={hora}>{hora}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="horaFin" className={labelBaseClasses}>Hora Fin <span className="text-red-500">*</span></label>
                                                    <select name="horaFin" id="horaFin" value={formData.horaFin || ''} onChange={handleFormChange} className={`${inputBaseClasses} appearance-none`} required={!formData.esDiaNoLaborable} disabled={isSubmittingModal || !!modalSuccess}>
                                                        <option value="">Selecciona...</option>
                                                        {OPCIONES_HORA.map(hora => <option key={`ex-fin-${hora}`} value={hora}>{hora}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && currentExcepcion && (
                                    <button type="button" onClick={() => handleDeleteExcepcion(currentExcepcion.id!, currentExcepcion.fecha)} className={buttonDangerModal} disabled={isSubmittingModal || !!modalSuccess}>
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={buttonSecondaryModal} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={buttonPrimaryModal} disabled={isSubmittingModal || !formData.fecha || !!modalSuccess}>
                                    {isSubmittingModal ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {modalMode === 'create' ? 'Crear Excepción' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}