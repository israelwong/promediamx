'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerDescuentosNegocio,
    crearDescuento,
    editarDescuento,
    eliminarDescuento
} from '@/app/admin/_lib/descuentos.actions'; // Asegúrate que las acciones estén aquí
import { Descuento } from '@/app/admin/_lib/types'; // Importar tipo
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Percent, Tag, CalendarDays, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
}

// Tipo para el formulario modal
type DescuentoFormData = Partial<Pick<Descuento, 'nombre' | 'descripcion' | 'porcentaje' | 'monto' | 'fechaInicio' | 'fechaFin' | 'status'>>;
type DiscountValueType = 'porcentaje' | 'monto';

export default function NegocioDescuentos({ negocioId }: Props) {
    const [descuentos, setDescuentos] = useState<Descuento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [descuentoParaEditar, setDescuentoParaEditar] = useState<Descuento | null>(null);
    const [modalFormData, setModalFormData] = useState<DescuentoFormData>({});
    const [discountType, setDiscountType] = useState<DiscountValueType>('porcentaje');
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const radioLabelClasses = "flex items-center gap-2 text-sm text-zinc-300 cursor-pointer";
    const radioInputClasses = "h-4 w-4 text-blue-600 bg-zinc-700 border-zinc-600 focus:ring-blue-500";

    // --- Carga de datos ---
    const fetchDescuentos = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerDescuentosNegocio(negocioId);
            setDescuentos(data || []);
        } catch (err) {
            console.error("Error al obtener los descuentos:", err);
            setError("No se pudieron cargar los descuentos.");
            setDescuentos([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchDescuentos(true);
    }, [fetchDescuentos]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', descuento?: Descuento) => {
        setModalMode(mode);
        setDescuentoParaEditar(mode === 'edit' ? descuento || null : null);

        const formatForInput = (date: Date | string | null | undefined): Date | undefined => date ? new Date(date) : undefined;

        let initialType: DiscountValueType = 'porcentaje';
        let initialData: DescuentoFormData = {};

        if (mode === 'edit' && descuento) {
            initialData = {
                nombre: descuento.nombre,
                descripcion: descuento.descripcion,
                fechaInicio: formatForInput(descuento.fechaInicio) || new Date(),
                fechaFin: formatForInput(descuento.fechaFin),
                status: descuento.status,
                porcentaje: descuento.porcentaje,
                monto: descuento.monto,
            };
            if (typeof descuento.monto === 'number' && descuento.monto > 0) {
                initialType = 'monto';
                initialData.porcentaje = null;
            } else {
                initialType = 'porcentaje';
                initialData.monto = null;
            }
        } else {
            initialData = {
                nombre: '',
                descripcion: '',
                fechaInicio: formatForInput(new Date()),
                fechaFin: formatForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                status: 'activo',
                porcentaje: 0, // Iniciar con 0 o null
                monto: null,
            };
            initialType = 'porcentaje'; // Por defecto porcentaje al crear
        }

        setDiscountType(initialType);
        setModalFormData(initialData);
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setDescuentoParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); setDiscountType('porcentaje');
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({
            ...prev,
            [name]: name === 'porcentaje' || name === 'monto' ? (value ? parseFloat(value) : null) : value,
        }));
    };

    const handleDiscountTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newType = e.target.value as DiscountValueType;
        setDiscountType(newType);
        setModalFormData(prev => ({
            ...prev,
            porcentaje: newType === 'monto' ? null : (prev.porcentaje ?? 0),
            monto: newType === 'porcentaje' ? null : (prev.monto ?? 0),
        }));
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validaciones (igual que en componente anterior)
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        if (!modalFormData.fechaInicio || !modalFormData.fechaFin) { setModalError("Las fechas son obligatorias."); return; }
        try { if (new Date(modalFormData.fechaInicio) >= new Date(modalFormData.fechaFin)) { setModalError("Fecha fin debe ser posterior a inicio."); return; } } catch { setModalError("Formato de fecha inválido."); return; }
        if (discountType === 'porcentaje' && (typeof modalFormData.porcentaje !== 'number' || modalFormData.porcentaje <= 0 || modalFormData.porcentaje > 100)) { setModalError("Porcentaje debe ser entre 1 y 100."); return; }
        if (discountType === 'monto' && (typeof modalFormData.monto !== 'number' || modalFormData.monto <= 0)) { setModalError("Monto debe ser mayor a 0."); return; }

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                descripcion: modalFormData.descripcion?.trim() || null,
                fechaInicio: modalFormData.fechaInicio, // Enviar como string YYYY-MM-DD
                fechaFin: modalFormData.fechaFin,
                status: modalFormData.status || 'activo',
                porcentaje: discountType === 'porcentaje' ? Number(modalFormData.porcentaje) : null,
                monto: discountType === 'monto' ? Number(modalFormData.monto) : null,
            };

            if (modalMode === 'create') {
                result = await crearDescuento({ negocioId: negocioId, ...dataToSend });
            } else if (modalMode === 'edit' && descuentoParaEditar?.id) {
                result = await editarDescuento(descuentoParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) { await fetchDescuentos(); closeModal(); }
            else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} descuento:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!descuentoParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el descuento "${descuentoParaEditar.nombre}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarDescuento(descuentoParaEditar.id);
                if (result?.success) { await fetchDescuentos(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando descuento:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Helpers ---
    const formatDate = (date: Date | string | null | undefined): string => { /* ... (sin cambios) ... */
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Fecha inválida'; }
    };
    const formatDiscountValue = (discount: Descuento): string => { /* ... (sin cambios) ... */
        if (typeof discount.porcentaje === 'number' && discount.porcentaje > 0) return `${discount.porcentaje}%`;
        if (typeof discount.monto === 'number' && discount.monto > 0) return `$${discount.monto.toFixed(2)}`;
        return 'N/A';
    };
    const getStatusInfo = (status: Descuento['status']): { text: string; color: string; icon: React.ElementType } => { /* ... (sin cambios) ... */
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Percent size={16} /> Descuentos
                </h3>
                <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo descuento">
                    <PlusIcon size={14} /> <span>Crear Descuento</span>
                </button>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando descuentos...</span></div>
                ) : descuentos.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay descuentos definidos.</p></div>
                ) : (
                    // Lista de Descuentos
                    <ul className='space-y-2'>
                        {descuentos.map((desc) => {
                            const statusInfo = getStatusInfo(desc.status);
                            const discountValue = formatDiscountValue(desc);
                            const isPercentage = typeof desc.porcentaje === 'number' && desc.porcentaje > 0;
                            return (
                                <li key={desc.id} className={listItemClasses}>
                                    <div className="flex-grow mr-2 overflow-hidden space-y-0.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                <statusInfo.icon size={12} />{statusInfo.text}
                                            </span>
                                            <p className="text-sm font-medium text-zinc-200 truncate" title={desc.nombre}>
                                                {desc.nombre}
                                            </p>
                                            <span className='text-xs font-semibold text-orange-400 flex items-center gap-1 ml-auto sm:ml-2' title='Valor del Descuento'>
                                                {isPercentage ? <Percent size={12} /> : <Tag size={12} />}
                                                {discountValue}
                                            </span>
                                        </div>
                                        <div className='text-xs text-zinc-400 flex items-center gap-1 pl-1'>
                                            <CalendarDays size={12} />
                                            <span>{formatDate(desc.fechaInicio)}</span>
                                            <span>-</span>
                                            <span>{formatDate(desc.fechaFin)}</span>
                                        </div>
                                        {desc.descripcion && (
                                            <p className="text-xs text-zinc-500 line-clamp-1 pl-1" title={desc.descripcion}>
                                                {desc.descripcion}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => openModal('edit', desc)} className={buttonEditClasses} title="Editar Descuento">
                                        <PencilIcon size={16} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nuevo Descuento' : 'Editar Descuento'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Descuento <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                                </div>
                                <div>
                                    <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={2} maxLength={200} />
                                </div>
                                {/* Tipo y Valor del Descuento */}
                                <fieldset className="border border-zinc-700 p-3 rounded-md">
                                    <legend className="text-sm font-medium text-zinc-400 px-1">Valor del Descuento <span className="text-red-500">*</span></legend>
                                    <div className="flex items-center gap-6 mt-2 mb-3">
                                        <label className={radioLabelClasses}><input type="radio" name="discountType" value="porcentaje" checked={discountType === 'porcentaje'} onChange={handleDiscountTypeChange} className={radioInputClasses} disabled={isSubmittingModal} /> Porcentaje (%)</label>
                                        <label className={radioLabelClasses}><input type="radio" name="discountType" value="monto" checked={discountType === 'monto'} onChange={handleDiscountTypeChange} className={radioInputClasses} disabled={isSubmittingModal} /> Monto Fijo ($)</label>
                                    </div>
                                    <div>
                                        {discountType === 'porcentaje' ? (
                                            <><label htmlFor="modal-porcentaje" className={labelBaseClasses}>Porcentaje <span className="text-red-500">*</span></label><input type="number" id="modal-porcentaje" name="porcentaje" value={modalFormData.porcentaje ?? ''} onChange={handleModalFormChange} className={inputBaseClasses} required={discountType === 'porcentaje'} disabled={isSubmittingModal} min="1" max="100" step="0.1" placeholder='Ej: 10' /></>
                                        ) : (
                                            <><label htmlFor="modal-monto" className={labelBaseClasses}>Monto Fijo <span className="text-red-500">*</span></label><input type="number" id="modal-monto" name="monto" value={modalFormData.monto ?? ''} onChange={handleModalFormChange} className={inputBaseClasses} required={discountType === 'monto'} disabled={isSubmittingModal} min="0.01" step="0.01" placeholder='Ej: 50.00' /></>
                                        )}
                                    </div>
                                </fieldset>
                                {/* Fechas y Status */}
                                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                                    <div>
                                        <label htmlFor="modal-fechaInicio" className={labelBaseClasses}>Inicio <span className="text-red-500">*</span></label>
                                        <input type="date" id="modal-fechaInicio" name="fechaInicio" value={modalFormData.fechaInicio ? new Date(modalFormData.fechaInicio).toISOString().split('T')[0] : ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-fechaFin" className={labelBaseClasses}>Fin <span className="text-red-500">*</span></label>
                                        <input type="date" id="modal-fechaFin" name="fechaFin" value={modalFormData.fechaFin ? new Date(modalFormData.fechaFin).toISOString().split('T')[0] : ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                        <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {/* Pie Modal */}
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
