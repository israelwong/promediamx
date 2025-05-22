// Ruta: /app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/components/OfertaEditarForm.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerOfertaPorId,
    editarOferta,
    eliminarOferta, // Se puede añadir un botón de eliminar aquí si se desea
    mejorarDescripcionOfertaIA,
    generarDescripcionOfertaIA,
} from '@/app/admin/_lib/actions/oferta/oferta.actions';
import {
    type EditarOfertaDataInputType as EditarOfertaData, // Usar el tipo de Zod para el envío
    // type OfertaParaEditarType,         // Usar el tipo de Zod para los datos cargados
    type OfertaStatusType,             // Importar el tipo correcto
    TipoOfertaEnumSchema,
    OfertaStatusEnumSchema
} from '@/app/admin/_lib/actions/oferta/oferta.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

import { Loader2, Save, Trash2, Sparkles, Hash, Wand2, AlertCircle, CheckCircle, ArrowLeft, Ticket, CalendarRange, Percent, Link as LinkIconLucide, Info, FileText, Edit2, DollarSign } from 'lucide-react';

interface Props {
    clienteId: string;
    negocioId: string;
    ofertaId: string;
}

// Tipo para el estado del formulario, las fechas serán string para los inputs
type FormState = Omit<EditarOfertaData, 'fechaInicio' | 'fechaFin'> & {
    fechaInicio?: string;
    fechaFin?: string;
};

const TIPOS_OFERTA_OPTIONS = [
    { value: 'DESCUENTO_PORCENTAJE', label: 'Descuento (%)', requiresValue: true, requiresCode: false },
    { value: 'DESCUENTO_MONTO', label: 'Descuento Monetario ($)', requiresValue: true, requiresCode: false },
    { value: 'CODIGO_PROMOCIONAL', label: 'Código Promocional', requiresValue: false, requiresCode: true },
    { value: 'ENVIO_GRATIS', label: 'Envío Gratis', requiresValue: false, requiresCode: false },
    { value: 'COMPRA_X_LLEVA_Y', label: 'Compra X lleva Y', requiresValue: false, requiresCode: false },
    { value: 'GENERAL', label: 'Promoción General', requiresValue: false, requiresCode: false },
];

const STATUS_OFERTA_OPTIONS = [
    { value: 'activo', label: 'Activa' },
    { value: 'inactivo', label: 'Inactiva' },
    { value: 'programada', label: 'Programada' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'borrador', label: 'Borrador' },
];

export default function OfertaEditarForm({ clienteId, negocioId, ofertaId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<FormState>({
        nombre: '',
        tipoOferta: TipoOfertaEnumSchema.enum.GENERAL,
        status: OfertaStatusEnumSchema.enum.inactivo,
    });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isImprovingDesc, setIsImprovingDesc] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [descripcionOriginalIA, setDescripcionOriginalIA] = useState<string | null | undefined>(null);
    const disableAiButtons = isImprovingDesc || isGeneratingDesc || isSubmitting;

    // Clases de Tailwind actualizadas
    const mainCardClasses = "bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl flex flex-col h-full";
    const headerCardClasses = "p-4 md:p-5 border-b border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sticky top-0 bg-zinc-800 z-20 rounded-t-xl";
    const titleCardClasses = "text-xl font-semibold text-zinc-100 flex items-center gap-2.5";
    const formBodyClasses = "p-4 md:p-6 flex-grow overflow-y-auto space-y-6 custom-scrollbar";

    const labelBaseClasses = "block text-xs font-medium text-zinc-300 mb-1.5";
    // ESTILOS DE INPUT MEJORADOS: Borde más visible, sin shadow-sm
    const inputBaseClasses = "block w-full bg-zinc-900 border border-zinc-600 text-zinc-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm transition-colors";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const selectClasses = `${inputBaseClasses} appearance-none`;

    const buttonBaseClasses = "inline-flex items-center justify-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500`;
    const dangerButtonClasses = `${buttonBaseClasses} text-red-400 hover:bg-red-700/20 focus:ring-red-500 border-transparent hover:border-red-600/40`;

    // const switchButtonClasses = "relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";
    // const switchKnobClasses = "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out";

    const sectionContainerClasses = "bg-zinc-900 border border-zinc-700 rounded-lg p-4 md:p-5";
    const sectionTitleClasses = "text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3";

    const aiButtonBaseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-800 disabled:opacity-50";
    const improveAiButtonClasses = `${aiButtonBaseClasses} text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 focus:ring-purple-500`;
    const generateAiButtonClasses = `${aiButtonBaseClasses} text-teal-300 bg-teal-500/20 hover:bg-teal-500/30 border-teal-500/40 focus:ring-teal-500`;

    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-3 flex items-center gap-2";
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;
    const successBoxClasses = `${messageBoxBaseClasses} bg-green-500/10 border border-green-500/30 text-green-300`;

    const formatDateForInput = (date: Date | string | undefined | null): string => {
        if (!date) return '';
        try { return new Date(date).toISOString().split('T')[0]; }
        catch { return ''; }
    };

    const loadOferta = useCallback(async () => {
        if (!ofertaId || !negocioId) { setError("IDs de contexto no válidos."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const result = await obtenerOfertaPorId(ofertaId, negocioId);
            if (result.success && result.data) {
                const ofertaData = result.data; // Tipo OfertaParaEditarType
                setFormData({
                    nombre: ofertaData.nombre,
                    descripcion: ofertaData.descripcion,
                    tipoOferta: ofertaData.tipoOferta,
                    valor: ofertaData.valor,
                    codigo: ofertaData.codigo,
                    fechaInicio: formatDateForInput(ofertaData.fechaInicio),
                    fechaFin: formatDateForInput(ofertaData.fechaFin),
                    status: ofertaData.status,
                    condiciones: ofertaData.condiciones,
                    linkPago: ofertaData.linkPago,
                });
                setDescripcionOriginalIA(ofertaData.descripcion);
            } else {
                setError(result.error || "Oferta no encontrada.");
            }
        } catch (err) {
            console.error("Error al cargar oferta:", err);
            setError(err instanceof Error ? err.message : "Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    }, [ofertaId, negocioId]);

    useEffect(() => { loadOferta(); }, [loadOferta]);
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3500); } return () => clearTimeout(timer); }, [successMessage]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number | null = value;
        if (name === 'valor') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null; // Mantener null si no es número
        } else if ((name === 'fechaInicio' || name === 'fechaFin') && value === '') {
            finalValue = null; // Para que Zod lo tome como opcional si está vacío
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleStatusChange = (newStatus: OfertaStatusType) => {
        setFormData(prevState => ({ ...prevState, status: newStatus }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        const dataToValidate: EditarOfertaData = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            tipoOferta: formData.tipoOferta,
            valor: formData.valor !== null && formData.valor !== undefined && (typeof formData.valor !== 'string' || formData.valor !== '') ? Number(formData.valor) : null,
            codigo: formData.codigo,
            fechaInicio: formData.fechaInicio ? new Date(formData.fechaInicio) : new Date(), // Default a hoy si está vacío, Zod lo requiere
            fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : new Date(),       // Default a hoy si está vacío, Zod lo requiere
            status: formData.status,
            condiciones: formData.condiciones,
            linkPago: formData.linkPago,
        };
        // Limpiar campos undefined/null que Zod podría no querer si son opcionales
        Object.keys(dataToValidate).forEach(keyStr => {
            const key = keyStr as keyof EditarOfertaData;
            if (dataToValidate[key] === undefined) {
                delete dataToValidate[key];
            }
            if (dataToValidate[key] === '' && (key === 'descripcion' || key === 'codigo' || key === 'condiciones' || key === 'linkPago')) {
                dataToValidate[key] = null;
            }
        });


        try {
            const result = await editarOferta(ofertaId, clienteId, negocioId, dataToValidate);
            if (result.success) {
                setSuccessMessage("Oferta actualizada exitosamente.");
                router.refresh();
            } else {
                let errorMsg = result.error || "No se pudo actualizar la oferta.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error al actualizar oferta:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMejorarDescConIA = async () => {
        const descActual = formData.descripcion?.trim() || descripcionOriginalIA?.trim();
        if (!descActual) { setError("Escribe una descripción primero."); return; }
        setIsImprovingDesc(true); setError(null); setSuccessMessage(null);
        try {
            const result = await mejorarDescripcionOfertaIA(ofertaId, descActual);
            if (result.success && result.data?.sugerencia) {
                setFormData(prev => ({ ...prev, descripcion: result.data?.sugerencia }));
                setSuccessMessage("Descripción mejorada con IA.");
            } else { throw new Error(result.error || "No se pudo obtener la sugerencia."); }
        } catch (err) { setError(err instanceof Error ? err.message : "Error al mejorar con IA."); }
        finally { setIsImprovingDesc(false); }
    };

    const handleGenerarDescConIA = async () => {
        setIsGeneratingDesc(true); setError(null); setSuccessMessage(null);
        try {
            const result = await generarDescripcionOfertaIA(ofertaId);
            if (result.success && result.data?.sugerencia) {
                setDescripcionOriginalIA(formData.descripcion);
                setFormData(prev => ({ ...prev, descripcion: result.data?.sugerencia }));
                setSuccessMessage("Descripción generada con IA.");
            } else { throw new Error(result.error || "No se pudo generar la descripción."); }
        } catch (err) { setError(err instanceof Error ? err.message : "Error al generar con IA."); }
        finally { setIsGeneratingDesc(false); }
    };

    const revertirDescripcionIA = () => {
        if (descripcionOriginalIA !== undefined) {
            setFormData(prev => ({ ...prev, descripcion: descripcionOriginalIA }));
            setSuccessMessage("Descripción revertida al original.");
        }
    };

    const handleCancel = () => router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
    const handleDelete = async () => {
        // La acción eliminarOferta ya fue refactorizada y espera clienteId y negocioId
        if (!confirm(`¿Eliminar permanentemente la oferta "${formData.nombre || 'esta oferta'}"? Esta acción no se puede deshacer.`)) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            const result = await eliminarOferta(ofertaId, clienteId, negocioId);
            if (result.success) {
                setSuccessMessage("Oferta eliminada. Redirigiendo...");
                setTimeout(() => {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
                }, 1500);
            } else {
                throw new Error(result.error || "No se pudo eliminar la oferta.");
            }
        } catch (err) {
            console.error("Error al eliminar oferta:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            setIsSubmitting(false);
        }
    };


    if (loading) return <div className={`${mainCardClasses} items-center justify-center p-10`}><Loader2 className='animate-spin h-8 w-8 text-blue-400' /><p className="mt-3 text-zinc-400">Cargando oferta...</p></div>;
    if (error && !formData.nombre) return <div className={`${mainCardClasses} border-red-500/30 bg-red-500/5 items-center justify-center p-10`}><AlertCircle className="h-10 w-10 text-red-400 mb-3" /><p className="text-red-400 text-center mb-1 font-medium">Error al Cargar</p><p className="text-zinc-400 text-sm text-center mb-4">{error}</p><button onClick={handleCancel} className={secondaryButtonClasses + " w-auto"}><ArrowLeft size={16} /> Volver a Ofertas</button></div>;
    if (!formData.nombre && !loading) return <div className={`${mainCardClasses} items-center justify-center p-10`}><Ticket size={40} className="text-zinc-500 mb-3" /><p className="text-zinc-400 text-center">Oferta no encontrada.</p><button onClick={handleCancel} className={`${secondaryButtonClasses} mt-4`}><ArrowLeft size={16} /> Volver a Ofertas</button></div>;

    const selectedTypeInfo = TIPOS_OFERTA_OPTIONS.find(t => t.value === formData.tipoOferta);
    const showValorField = selectedTypeInfo?.requiresValue ?? false;
    const showCodigoField = selectedTypeInfo?.requiresCode ?? false;
    const disableAllActions = isSubmitting || isImprovingDesc || isGeneratingDesc;

    return (
        <div className={mainCardClasses}>
            <div className={headerCardClasses}>
                <div className="flex-grow">
                    <h1 className={titleCardClasses}><Edit2 size={22} className="text-amber-400" />Editar Oferta</h1>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: <span className="font-mono">{ofertaId}</span></p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                    <button type="button" onClick={handleCancel} className={secondaryButtonClasses} disabled={isSubmitting}><ArrowLeft size={16} /> Cerrar</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={formBodyClasses} noValidate>
                {error && !successMessage && <div className={errorBoxClasses}><AlertCircle size={18} /><span>{error}</span></div>}
                {successMessage && <div className={successBoxClasses}><CheckCircle size={18} /><span>{successMessage}</span></div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Columna Izquierda */}
                    <div className="space-y-5">
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Info size={16} /> Detalles Principales</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Oferta <span className="text-red-500">*</span></label>
                                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} />
                                </div>
                                <div>
                                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[100px]`} disabled={disableAiButtons} rows={3} />
                                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <button type="button" onClick={handleMejorarDescConIA} className={improveAiButtonClasses} disabled={disableAiButtons || !formData.descripcion?.trim()} title={!formData.descripcion?.trim() ? "Escribe descripción para mejorar" : "Mejorar con IA"}>
                                            {isImprovingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Mejorar
                                        </button>
                                        <button type="button" onClick={handleGenerarDescConIA} className={generateAiButtonClasses} disabled={disableAiButtons} title="Generar descripción con IA (usa imagen de portada si existe)">
                                            {isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Generar
                                        </button>
                                        {descripcionOriginalIA !== formData.descripcion && formData.descripcion && (
                                            <button type="button" onClick={revertirDescripcionIA} className={`${aiButtonBaseClasses} text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 focus:ring-yellow-500 text-xs !px-2 !py-1`} disabled={disableAiButtons}>
                                                Revertir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Ticket size={16} /> Tipo y Valor</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="tipoOferta" className={labelBaseClasses}>Tipo de Oferta <span className="text-red-500">*</span></label>
                                    <select id="tipoOferta" name="tipoOferta" value={formData.tipoOferta || ''} onChange={handleChange} required className={selectClasses} disabled={isSubmitting}>
                                        <option value="" disabled>Selecciona un tipo...</option>
                                        {TIPOS_OFERTA_OPTIONS.map(tipo => (<option key={tipo.value} value={tipo.value}>{tipo.label}</option>))}
                                    </select>
                                </div>
                                {showValorField && (
                                    <div>
                                        <label htmlFor="valor" className={labelBaseClasses}>Valor ({formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? '%' : '$'}) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                {formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? <Percent className="h-4 w-4 text-zinc-400" /> : <DollarSign className="h-4 w-4 text-zinc-400" />}
                                            </div>
                                            <input type="number" id="valor" name="valor" value={formData.valor ?? ''} onChange={handleChange} required className={`${inputBaseClasses} pl-9`} disabled={isSubmitting} step={formData.tipoOferta === 'DESCUENTO_PORCENTAJE' ? "0.1" : "0.01"} min="0" />
                                        </div>
                                    </div>
                                )}
                                {showCodigoField && (
                                    <div>
                                        <label htmlFor="codigo" className={labelBaseClasses}>Código Promocional <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Hash size={14} className="text-zinc-400" /></div>
                                            <input type="text" id="codigo" name="codigo" value={formData.codigo || ''} onChange={handleChange} required className={`${inputBaseClasses} pl-9 font-mono uppercase`} disabled={isSubmitting} maxLength={50} placeholder="EJ: VERANO20" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-5">
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><CalendarRange size={16} /> Vigencia y Estado</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="fechaInicio" className={labelBaseClasses}>Fecha Inicio <span className="text-red-500">*</span></label>
                                        <input type="date" id="fechaInicio" name="fechaInicio" value={formData.fechaInicio || ''} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} />
                                    </div>
                                    <div>
                                        <label htmlFor="fechaFin" className={labelBaseClasses}>Fecha Fin <span className="text-red-500">*</span></label>
                                        <input type="date" id="fechaFin" name="fechaFin" value={formData.fechaFin || ''} onChange={handleChange} required className={inputBaseClasses} disabled={isSubmitting} min={formData.fechaInicio || ''} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="status" className={labelBaseClasses + " mb-2"}>Estado de la Oferta</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-zinc-400">Inactiva</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={formData.status === 'activo'}
                                            tabIndex={0}
                                            onClick={() => handleStatusChange(formData.status === 'activo' ? 'inactivo' : 'activo')}
                                            disabled={isSubmitting}
                                            className={`
                                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                                ${formData.status === 'activo' ? 'bg-green-500/80' : 'bg-zinc-600/60'}
                                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800
                                                disabled:opacity-50
                                            `}
                                        >
                                            <span
                                                className={`
                                                    inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition
                                                    ${formData.status === 'activo' ? 'translate-x-5' : 'translate-x-1'}
                                                `}
                                            />
                                        </button>
                                        <span className="text-xs text-green-400">Activa</span>
                                    </div>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status || 'inactivo'}
                                        onChange={(e) => handleStatusChange(e.target.value as OfertaStatusType)}
                                        className="hidden"
                                        disabled={isSubmitting}
                                    >
                                        {STATUS_OFERTA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><FileText size={16} /> Condiciones y Enlaces</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="linkPago" className={labelBaseClasses}>Enlace de Pago Directo (Opcional)</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><LinkIconLucide size={14} className="text-zinc-400" /></div>
                                        <input type="url" id="linkPago" name="linkPago" value={formData.linkPago || ''} onChange={handleChange} className={`${inputBaseClasses} pl-9`} disabled={isSubmitting} maxLength={300} placeholder="https://ej.com/pago-oferta" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="condiciones" className={labelBaseClasses}>Condiciones Adicionales (Opcional)</label>
                                    <textarea id="condiciones" name="condiciones" value={formData.condiciones || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[80px]`} disabled={isSubmitting} rows={3} maxLength={1000} placeholder="Ej: Compra mínima de $X, válido solo en sucursal..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <button type="button" onClick={handleDelete} className={dangerButtonClasses} disabled={isSubmitting}><Trash2 size={16} /> Eliminar Oferta</button>
                    <button type="submit" className={primaryButtonClasses} disabled={isSubmitting || disableAllActions}>{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />} Guardar Cambios</button>
                </div>
            </form>
        </div>
    );
}
