'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// --- Actions and Types ---
import {
    obtenerOfertaPorId,
    editarOferta,
    eliminarOferta,
    EditarOfertaInput // Importar el tipo de input
} from '@/app/admin/_lib/oferta.actions'; // Ajusta la ruta
import { Oferta } from '@prisma/client'; // O tu tipo Oferta si es diferente
// --- Icons ---
import { Loader2, Save, Trash2, Sparkles, AlertCircle, Hash } from 'lucide-react';

interface Props {
    clienteId?: string;
    negocioId: string;
    ofertaId: string;
}

// Definir los tipos de oferta permitidos (igual que en OfertaNuevaForm)
const TIPOS_OFERTA = [
    { value: 'DESCUENTO_PORCENTAJE', label: 'Descuento (%)', requiresValue: true, requiresCode: false },
    { value: 'DESCUENTO_MONTO', label: 'Descuento ($)', requiresValue: true, requiresCode: false },
    { value: 'CODIGO_PROMOCIONAL', label: 'Código Promocional', requiresValue: false, requiresCode: true },
    { value: 'ENVIO_GRATIS', label: 'Envío Gratis', requiresValue: false, requiresCode: false },
    { value: 'COMPRA_X_LLEVA_Y', label: 'Compra X lleva Y', requiresValue: false, requiresCode: false },
    { value: 'GENERAL', label: 'Promoción General', requiresValue: false, requiresCode: false },
];

// Tipo para el estado del formulario, incluyendo todos los campos editables
type OfertaEditFormData = Partial<Omit<Oferta, 'id' | 'negocioId' | 'createdAt' | 'updatedAt' | 'negocio' | 'ItemCatalogoOferta' | 'OfertaGaleria'>> & {
    // Usamos string para fechas en el estado para los inputs
    fechaInicio?: string | Date | null;
    fechaFin?: string | Date | null;
};


export default function OfertaEditarForm({ clienteId, negocioId, ofertaId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<OfertaEditFormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Clases de Tailwind ---
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md border border-zinc-700";
    const headerPaddingClasses = "p-3 md:p-4";
    const formPaddingClasses = "p-4 md:p-6";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[120px]`;
    const selectClasses = `${inputBaseClasses} appearance-none`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;
    const dangerButtonClasses = `${buttonBaseClasses} text-red-500 hover:bg-red-900/30 focus:ring-red-500 border border-transparent hover:border-red-600/50`;
    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform";

    // --- Función para formatear Date a yyyy-MM-dd ---
    const formatDateForInput = (date: Date | string | null | undefined): string => {
        if (!date) return '';
        try {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch { return ''; }
    };

    // --- Carga de Datos ---
    const loadOferta = useCallback(async () => {
        if (!ofertaId) { setError("ID de oferta no válido."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const ofertaData = await obtenerOfertaPorId(ofertaId);
            if (!ofertaData) throw new Error("Oferta no encontrada.");

            // Poblar formData con datos existentes
            setFormData({
                nombre: ofertaData.nombre || '',
                descripcion: ofertaData.descripcion || '',
                tipoOferta: ofertaData.tipoOferta || 'GENERAL', // Default si no tiene tipo
                valor: ofertaData.valor ?? null, // Usar null si no hay valor
                codigo: ofertaData.codigo || '',
                fechaInicio: ofertaData.fechaInicio ? new Date(ofertaData.fechaInicio) : undefined,
                fechaFin: ofertaData.fechaFin ? new Date(ofertaData.fechaFin) : undefined,
                status: ofertaData.status || 'inactivo',
                condiciones: ofertaData.condiciones || '',
            });
        } catch (err) {
            console.error("Error al cargar oferta:", err);
            setError(err instanceof Error ? err.message : "Error al cargar los datos.");
            setFormData({});
        } finally { setLoading(false); }
    }, [ofertaId]);

    useEffect(() => { loadOferta(); }, [loadOferta]);

    // --- Limpiar mensaje de éxito ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); }
        return () => clearTimeout(timer);
    }, [successMessage]);

    // --- Handlers ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number | null;

        if (name === 'valor') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null;
            else if (finalValue !== null && finalValue < 0) finalValue = 0;
        } else {
            finalValue = value;
        }

        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleStatusToggle = () => {
        const newStatus = formData.status === 'activo' ? 'inactivo' : 'activo';
        setFormData(prevState => ({ ...prevState, status: newStatus }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        // Validaciones (igual que en la acción editarOferta)
        if (!formData.nombre?.trim()) { setError("Nombre es obligatorio."); return; }
        if (!formData.tipoOferta) { setError("Selecciona un tipo de oferta."); return; }
        if (!formData.fechaInicio) { setError("Fecha de inicio es obligatoria."); return; }
        if (!formData.fechaFin) { setError("Fecha de fin es obligatoria."); return; }

        const selectedTypeInfo = TIPOS_OFERTA.find(t => t.value === formData.tipoOferta);
        if (selectedTypeInfo?.requiresValue && (formData.valor === null || formData.valor === undefined || formData.valor < 0)) {
            setError(`Se requiere un valor positivo para el tipo "${selectedTypeInfo.label}".`); return;
        }
        if (selectedTypeInfo?.requiresCode && !formData.codigo?.trim()) {
            setError(`Se requiere un código para el tipo "${selectedTypeInfo.label}".`); return;
        }

        let inicio: Date, fin: Date;
        try {
            inicio = new Date(formData.fechaInicio);
            fin = new Date(formData.fechaFin);
            if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) throw new Error();
            inicio.setHours(0, 0, 0, 0);
            fin.setHours(23, 59, 59, 999);
            if (inicio >= fin) { setError("La fecha de fin debe ser posterior a la de inicio."); return; }
        } catch { setError("Formato de fecha inválido."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        try {
            // Preparar datos para la acción editarOferta
            const dataToSend: EditarOfertaInput = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                tipoOferta: formData.tipoOferta,
                valor: selectedTypeInfo?.requiresValue ? formData.valor : null,
                codigo: selectedTypeInfo?.requiresCode ? formData.codigo?.trim().toUpperCase() : null,
                fechaInicio: inicio, // Enviar como Date
                fechaFin: fin,       // Enviar como Date
                status: formData.status || 'inactivo',
                condiciones: formData.condiciones?.trim() || null,
            };

            const result = await editarOferta(ofertaId, dataToSend);

            if (result.success) {
                setSuccessMessage("Oferta actualizada exitosamente.");
                router.refresh(); // Refrescar datos del servidor
            } else { throw new Error(result.error || "No se pudo actualizar la oferta."); }
        } catch (err) {
            console.error("Error al actualizar oferta:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => {
        const backUrl = clienteId
            ? `/admin/clientes/${clienteId}/negocios/${negocioId}`
            : `/admin/negocios/${negocioId}`;
        router.push(backUrl);
    };

    const handleDelete = async () => {
        if (!confirm(`¿Eliminar permanentemente la oferta "${formData.nombre || 'esta oferta'}"? Esta acción no se puede deshacer.`)) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            const result = await eliminarOferta(ofertaId);
            if (result.success) {
                setSuccessMessage("Oferta eliminada.");
                setTimeout(() => {
                    const backUrl = clienteId
                        ? `/admin/clientes/${clienteId}/negocios/${negocioId}`
                        : `/admin/negocios/${negocioId}`;
                    router.push(backUrl);
                }, 1500);
            } else { throw new Error(result.error || "No se pudo eliminar la oferta."); }
        } catch (err) {
            console.error("Error al eliminar oferta:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            setIsSubmitting(false);
        }
    };

    const handleMejorarConIA = () => {
        console.log("Llamar a la IA para mejorar descripción:", formData.descripcion);
        alert("Función 'Mejorar con IA' aún no implementada.");
    };

    // --- Renderizado ---
    if (loading) return <div className={`${containerClasses} ${formPaddingClasses} text-center bg-zinc-900`}><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Oferta...</div>;
    if (error && !formData.nombre) return <div className={`${containerClasses} ${formPaddingClasses} border-red-500 bg-red-900/20 text-center text-red-400`}>{error}</div>;
    if (!loading && !formData.nombre) return <div className={`${containerClasses} ${formPaddingClasses} text-center text-zinc-400`}>Oferta no encontrada o error al cargar.</div>;

    const isActivo = formData.status === 'activo';
    const showValorField = TIPOS_OFERTA.find(t => t.value === formData.tipoOferta)?.requiresValue ?? false;
    const showCodigoField = TIPOS_OFERTA.find(t => t.value === formData.tipoOferta)?.requiresCode ?? false;

    return (
        <div className={containerClasses}>
            {/* --- Encabezado con Switch y Botones --- */}
            <div className={`${headerPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4`}>
                <div className='flex items-center gap-3'>
                    <button
                        type="button" onClick={handleStatusToggle}
                        className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`}
                        aria-pressed={isActivo} disabled={isSubmitting}
                        title={isActivo ? 'Oferta Activa' : 'Oferta Inactiva'}
                    >
                        <span className="sr-only">Estado</span>
                        <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <div>
                        <h1 className='text-lg font-semibold text-white'>Editar Oferta</h1>
                        <p className='text-xs text-zinc-400 mt-0.5'>ID: {ofertaId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleDelete} className={`${dangerButtonClasses} px-2`} disabled={isSubmitting} title="Eliminar Oferta"> <Trash2 size={14} /> </button>
                    <button type="button" onClick={handleCancel} className={secondaryButtonClasses} disabled={isSubmitting}> Cancelar </button>
                    <button type="button" onClick={() => handleSubmit()} className={primaryButtonClasses} disabled={isSubmitting || loading}>
                        {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                        <span className="ml-1.5">Guardar Cambios</span>
                    </button>
                </div>
            </div>
            {/* --- Fin Encabezado --- */}

            {/* --- Cuerpo del Formulario --- */}
            <div className={`${formPaddingClasses} space-y-4`}>
                {/* Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}> Nombre Oferta <span className="text-red-500">*</span> </label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} maxLength={100} />
                </div>

                {/* Descripción */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}> Descripción </label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={4} maxLength={250} placeholder="Describe brevemente la oferta..." />
                    <button type="button" onClick={handleMejorarConIA} className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-purple-300 bg-purple-800/30 hover:bg-purple-800/60 border border-purple-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-purple-500" disabled={isSubmitting}> <Sparkles size={12} /> Mejorar con IA </button>
                </div>

                {/* Tipo de Oferta */}
                <div>
                    <label htmlFor="tipoOferta" className={labelBaseClasses}> Tipo de Oferta <span className="text-red-500">*</span> </label>
                    <select id="tipoOferta" name="tipoOferta" value={formData.tipoOferta || ''} onChange={handleChange} required className={selectClasses} disabled={isSubmitting}>
                        <option value="" disabled>Selecciona un tipo...</option>
                        {TIPOS_OFERTA.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                    </select>
                </div>

                {/* Valor (Condicional) */}
                {showValorField && (
                    <div>
                        <label htmlFor="valor" className={labelBaseClasses}> Valor ({formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? '%' : '$'}) <span className="text-red-500">*</span> </label>
                        <input type="number" id="valor" name="valor" value={formData.valor ?? ''} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} step={formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? "0.1" : "0.01"} min="0" placeholder={formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? 'Ej: 15' : 'Ej: 50.00'} />
                    </div>
                )}

                {/* Código (Condicional) */}
                {showCodigoField && (
                    <div>
                        <label htmlFor="codigo" className={labelBaseClasses}> Código Promocional <span className="text-red-500">*</span> </label>
                        <div className="relative">
                            <Hash size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="text" id="codigo" name="codigo" value={formData.codigo || ''} onChange={handleChange} required className={`${inputBaseClasses} pl-7 font-mono uppercase`} disabled={isSubmitting} maxLength={50} placeholder="EJ: BIENVENIDO10" />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">El código debe ser único.</p>
                    </div>
                )}

                {/* Fechas */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div>
                        <label htmlFor="fechaInicio" className={labelBaseClasses}> Fecha Inicio <span className="text-red-500">*</span> </label>
                        <input type="date" id="fechaInicio" name="fechaInicio" value={formatDateForInput(formData.fechaInicio)} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="fechaFin" className={labelBaseClasses}> Fecha Fin <span className="text-red-500">*</span> </label>
                        <input type="date" id="fechaFin" name="fechaFin" value={formatDateForInput(formData.fechaFin)} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} min={formatDateForInput(formData.fechaInicio)} />
                    </div>
                </div>

                {/* Status (Select adicional si necesitas más estados que activo/inactivo) */}
                {/*
                 <div>
                    <label htmlFor="status_select" className={labelBaseClasses}>Status Detallado</label>
                    <select id="status_select" name="status" value={formData.status || 'inactivo'} onChange={handleChange} className={selectClasses} disabled={isSubmitting}>
                         <option value="activo">Activa</option>
                         <option value="inactivo">Inactiva</option>
                         <option value="programada">Programada</option>
                         <option value="finalizada">Finalizada</option>
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Usa el switch para Activo/Inactivo rápido.</p>
                 </div>
                 */}

                {/* Condiciones */}
                <div>
                    <label htmlFor="condiciones" className={labelBaseClasses}>Condiciones Adicionales</label>
                    <textarea id="condiciones" name="condiciones" value={formData.condiciones || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} maxLength={300} placeholder="Ej: Compra mínima de $500, solo para nuevos clientes..." />
                </div>

                {/* Mensajes de Error/Éxito */}
                {error && (
                    <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center gap-2"> <AlertCircle size={16} /> {error} </p>
                )}
                {successMessage && (
                    <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm"> {successMessage} </p>
                )}

                {/* --- Botones de acción eliminados de aquí --- */}
            </div>
        </div>
    );
}
