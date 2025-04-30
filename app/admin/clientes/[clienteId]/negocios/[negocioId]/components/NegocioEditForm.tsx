'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta rutas según tu estructura
import {
    obtenerNegocioPorId,
    actualizarNegocio,
    // eliminarNegocio
} from '@/app/admin/_lib/negocio.actions'; // Asumiendo acciones aquí
import { Negocio, NegocioCategoria, NegocioEtiqueta } from '@/app/admin/_lib/types'; // Importar tipos
import {
    Loader2, Trash2, Save, Image as ImageIcon, LinkIcon, MapPin, Phone, Mail, Clock, ShieldCheck, FileText, Users, HelpCircle, MessageSquareWarning, BookOpen, XIcon, Edit3, FileBadge, ChevronDown, // Iconos añadidos
    Contact, // Icono para Contacto
    Megaphone, // Icono para Marketing
    MessageCircleQuestion // Icono para FAQ
} from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string; // ID del cliente, opcional
}

// Tipo para los datos editables en este formulario
type NegocioEditFormData = Partial<Omit<Negocio,
    'id' | 'clienteId' | 'cliente' | 'createdAt' | 'updatedAt' |
    'CRM' | 'Catalogo' | 'Promocion' | 'Descuento' | 'AsistenteVirtual' |
    'catalogoDescriptivo' | 'promocionesDescriptivas' | 'descuentosDescriptivos'
>>;

// --- Componente Interno para Modal de Edición de Texto ---
interface FullScreenTextEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fieldName: keyof NegocioEditFormData, newValue: string | null) => void;
    title: string;
    fieldName: keyof NegocioEditFormData;
    initialValue: string | null | undefined;
    placeholder?: string;
    rows?: number;
    textareaBaseClasses: string; // Hereda estilo base
    buttonBaseClasses: string; // Hereda estilo base
}

const FullScreenTextEditModal: React.FC<FullScreenTextEditModalProps> = ({
    isOpen, onClose, onSave, title, fieldName, initialValue, placeholder, rows = 15, textareaBaseClasses, buttonBaseClasses
}) => {
    const [currentValue, setCurrentValue] = useState(initialValue || '');
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentValue(initialValue || '');
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue]);

    const handleSave = () => {
        setIsSaving(true);
        onSave(fieldName, currentValue.trim() === '' ? null : currentValue);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-zinc-900/95 backdrop-blur-md flex flex-col p-4 sm:p-6 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 id="modal-title" className="text-xl font-semibold text-white">{title}</h2>
                <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar" disabled={isSaving}>
                    <XIcon size={24} />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto mb-4">
                {/* Aplicar font-mono y quitar text-sm/xs aquí */}
                <textarea
                    ref={textareaRef}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    // Asegurar font-mono y quitar text-sm/xs
                    className={`${textareaBaseClasses.replace('text-sm', '').replace('text-xs', '')} w-full h-full resize-none !min-h-[60vh] focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                    rows={rows}
                    placeholder={placeholder}
                    disabled={isSaving}
                />
            </div>
            <div className="flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={onClose} className={`${buttonBaseClasses} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSaving}>Cancelar</button>
                <button type="button" onClick={handleSave} className={`${buttonBaseClasses} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSaving}>
                    {isSaving ? <Loader2 className='animate-spin' size={18} /> : <Save size={16} />} Guardar
                </button>
            </div>
        </div>
    );
};
// --- Fin Componente Modal ---


export default function NegocioEditarForm({ negocioId, clienteId }: Props) {
    const router = useRouter();

    const [negocioOriginal, setNegocioOriginal] = useState<Negocio | null>(null);
    const [formData, setFormData] = useState<NegocioEditFormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingImagen] = useState(false);
    const inputImagenRef = useRef<HTMLInputElement>(null);
    // const [clienteInfo, setClienteInfo] = useState<Pick<Cliente, 'id' | 'nombre'> | null>(null);

    // --- Estado para Acordeón ---
    type SectionId = 'contacto' | 'politicas' | 'marketing' | 'faq_objeciones';
    const [openSectionId, setOpenSectionId] = useState<SectionId | null>(); // Iniciar con 'general' abierta
    // --- Fin Estado Acordeón ---

    // Estados para el Modal de Texto
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<keyof NegocioEditFormData | null>(null);
    const [editingFieldTitle, setEditingFieldTitle] = useState('');

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block text-sm font-medium"; // Mantenemos text-sm para labels
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-100 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 font-mono text-sm"; // Añadido text-zinc-100 para mejor contraste
    const textareaBaseClasses = `${inputBaseClasses.replace('font-mono', '')} min-h-[100px]`; // Textareas usan font-sans como antes, pero sin text-sm
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    const modalTriggerButtonClasses = `${labelBaseClasses} w-full text-left flex justify-between items-center hover:text-zinc-100 transition-colors !mb-0 p-2 rounded-md hover:bg-zinc-700/50 cursor-pointer`;

    // Clases para Acordeón
    const accordionButtonClasses = "flex justify-between items-center w-full p-3 font-semibold text-left text-white bg-zinc-700 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-800 transition-colors duration-150 ease-in-out";
    const accordionContentClasses = "p-4 md:p-6 border border-t-0 border-zinc-600 bg-zinc-800/60 rounded-b-md";


    // --- Carga de Datos (sin cambios) ---
    useEffect(() => {
        if (!negocioId) { setError("ID de negocio no proporcionado."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        const fetchNegocio = async () => {
            try {
                const data = await obtenerNegocioPorId(negocioId);
                if (data) {
                    setNegocioOriginal({
                        ...data,
                        cliente: data.cliente ? { ...data.cliente, nombre: data.cliente.nombre || '' } : null,
                        AsistenteVirtual: data.AsistenteVirtual?.map(av => ({
                            ...av,
                            negocioId: negocioId, // Ensure `negocioId` is added to match the expected type
                        })) || [],
                        CRM: data.CRM ? { ...data.CRM, negocioId: 'negocioId' in data.CRM && typeof data.CRM.negocioId === 'string' ? data.CRM.negocioId : negocioId } : null // Ensure CRM matches the expected type
                    });
                    // if (data.cliente) setClienteInfo({ id: data.cliente.id, nombre: data.cliente.nombre });
                    // else setClienteInfo(null);
                    const { ...editableData } = data;
                    setFormData({ ...editableData });
                } else {
                    setError(`Negocio no encontrado (ID: ${negocioId})`);
                    setNegocioOriginal(null); setFormData({});
                    // setClienteInfo(null);
                }
            } catch (err) {
                console.error("Error fetching negocio:", err);
                setError("No se pudo cargar la información del negocio.");
                setNegocioOriginal(null); setFormData({});
                // setClienteInfo(null);
            } finally { setLoading(false); }
        };
        fetchNegocio();
    }, [negocioId]);

    // --- Efecto para enfocar input de imagen (sin cambios) ---
    useEffect(() => { if (editingImagen && inputImagenRef.current) { inputImagenRef.current.focus(); inputImagenRef.current.select(); } }, [editingImagen]);

    // --- Manejadores (sin cambios en handleChange, handleSubmit, handleCancel, handleDelete) ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;
        if (type === 'checkbox') { finalValue = (e.target as HTMLInputElement).checked ? 'activo' : 'inactivo'; }
        else { finalValue = value; }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // if (!formData.nombre?.trim()) { setError("El nombre del negocio es obligatorio."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            const { ...dataToSend } = formData;
            const negocioActualizado = await actualizarNegocio(negocioId, dataToSend as Negocio);

            setSuccessMessage("Negocio actualizado correctamente.");
            setNegocioOriginal(prev => prev ? { ...prev, ...negocioActualizado } : null);

            const { ...editableData } = negocioActualizado;
            setFormData(prev => ({ ...prev, ...editableData }));

        } catch (err) {
            console.error("Error updating negocio:", err);
            const message = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${message}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => { router.push(`/admin/clientes/${clienteId}`); };
    const handleDelete = async () => { /* ... (sin cambios) ... */ };

    // --- Funciones para el Modal de Texto (sin cambios) ---
    const openModalForField = (fieldName: keyof NegocioEditFormData, title: string) => {
        setEditingField(fieldName);
        setEditingFieldTitle(title);
        setIsTextModalOpen(true);
    };

    const closeModal = () => {
        setIsTextModalOpen(false);
        setTimeout(() => { setEditingField(null); setEditingFieldTitle(''); }, 300);
    };

    const handleModalSave = (fieldName: keyof NegocioEditFormData, newValue: string | null) => {
        setFormData(prevState => ({ ...prevState, [fieldName]: newValue }));
    };

    // --- Función para Acordeón ---
    const toggleSection = useCallback((sectionId: SectionId) => {
        setOpenSectionId(prevId => (prevId === sectionId ? null : sectionId));
    }, []);

    // --- Cálculo de Progreso (sin cambios) ---
    const trackedFields = useMemo((): (keyof NegocioEditFormData)[] => [
        'descripcion', 'telefonoLlamadas', 'telefonoWhatsapp', 'email',
        'direccion', 'googleMaps', 'paginaWeb', 'redesSociales', 'horarioAtencion',
        'garantias', 'politicas', 'avisoPrivacidad', 'compentencia', 'clienteIdeal',
        'terminologia', 'preguntasFrecuentes', 'objeciones'
    ], []);

    const isFieldFilled = useCallback((fieldName: keyof NegocioEditFormData): boolean => {
        const value = formData[fieldName];
        if (typeof value === 'string') return value.trim() !== '';
        return value !== null && value !== undefined;
    }, [formData]);

    const { filledCount, completionPercentage } = useMemo(() => {
        let count = 0;
        trackedFields.forEach(field => { if (isFieldFilled(field)) { count++; } });
        const percentage = trackedFields.length > 0 ? Math.round((count / trackedFields.length) * 100) : 0;
        return { filledCount: count, completionPercentage: percentage };
    }, [isFieldFilled, trackedFields]);

    // --- Componente Auxiliar para Botón de Modal (sin cambios) ---
    const ModalTriggerButton: React.FC<{
        fieldName: keyof NegocioEditFormData;
        title: string;
        icon: React.ElementType;
    }> = ({ fieldName, title, icon: Icon }) => (
        <div className="mb-2"> {/* Aumentar espacio inferior */}
            <button type="button" onClick={() => openModalForField(fieldName, title)} className={modalTriggerButtonClasses} disabled={isSubmitting}>
                <span className='flex items-center gap-1.5'>
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled(fieldName) ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    {Icon && <Icon size={14} />} {title}
                </span>
                <Edit3 size={16} className="text-zinc-400" />
            </button>
            {formData[fieldName] && (
                <div className='bg-zinc-900 border border-zinc-700 rounded-md p-2 mt-1'>
                    <p className="mt-1 text-sm text-zinc-400 italic px-2 line-clamp-2">
                        {Array.isArray(formData[fieldName])
                            ? (formData[fieldName] as (NegocioCategoria | NegocioEtiqueta)[]).map(item => item.nombre).join(', ')
                            : formData[fieldName] instanceof Date
                                ? formData[fieldName].toISOString()
                                : typeof formData[fieldName] === 'object'
                                    ? JSON.stringify(formData[fieldName])
                                    : formData[fieldName]}
                    </p>
                </div>
            )}
        </div>
    );

    // --- Renderizado ---
    if (loading) { return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando...</p></div>; }
    if (error && !negocioOriginal) { return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>; }
    if (!negocioOriginal) { return <div className={containerClasses}><p className="text-center text-zinc-400">Negocio no encontrado.</p></div>; }

    return (
        <div className={`${containerClasses} max-w-4xl`}> {/* Ajustar max-w si es necesario */}

            {/* Cabecera (sin cambios) */}
            {/* <div className='border-b border-zinc-700 pb-3 mb-6 flex flex-col sm:flex-row items-start justify-between gap-4'>
                <div><h2 className="text-xl font-semibold text-white leading-tight">Editar Negocio</h2><p className="text-xs text-zinc-400 mt-0.5">ID: {negocioId}</p>{clienteInfo && (<p className="text-xs text-zinc-400 mt-0.5">Cliente: <span className='font-medium text-zinc-300'>{clienteInfo.nombre || clienteInfo.id}</span></p>)}</div>
                <div className="flex items-center gap-3 pt-1"><span className={`${labelBaseClasses}`}>Status:</span><label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}><input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} /><div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div><span className="ml-3 text-sm font-medium text-zinc-300">{formData.status === 'activo' ? 'Activo' : 'Inactivo'}</span></label></div>
            </div> */}

            {/* Indicador de Progreso (sin cambios) */}
            <div className="mb-6">
                <label className="text-sm font-medium text-zinc-300 block mb-1">Progreso de Configuración ({completionPercentage}%)</label>
                <div className="w-full bg-zinc-700 rounded-full h-2.5"><div className="bg-gradient-to-r from-sky-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${completionPercentage}%` }}></div></div>
                <p className="text-xs text-zinc-400 mt-1">Completados: {filledCount} de {trackedFields.length} campos clave.</p>
            </div>

            {/* Mensajes Globales (sin cambios) */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario con Acordeón */}
            <form onSubmit={handleSubmit} className="space-y-3" noValidate> {/* Usar space-y para separar secciones */}

                <div className='mb-5'>
                    <div className="mb-4">
                        <label htmlFor="logo" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('logo') ? 'bg-green-500' : 'bg-amber-500'}`}></span><ImageIcon size={14} /> Logo (URL)</label>
                        <input type="url" id="logo" name="logo" value={formData.logo || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." />
                    </div>
                    <ModalTriggerButton fieldName="descripcion" title="Descripción" icon={Users} />
                </div>


                {/* --- Sección Contacto --- */}
                <div>
                    <button type="button" onClick={() => toggleSection('contacto')} className={`${accordionButtonClasses} ${openSectionId !== 'contacto' ? 'rounded-md' : 'rounded-t-md'}`}>
                        <span className='flex items-center gap-2'><Contact size={16} /> Contacto</span>
                        <ChevronDown size={18} className={`transform transition-transform duration-200 ${openSectionId === 'contacto' ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                    {openSectionId === 'contacto' && (
                        <div className={accordionContentClasses}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div><label htmlFor="telefonoLlamadas" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('telefonoLlamadas') ? 'bg-green-500' : 'bg-amber-500'}`}></span><Phone size={14} /> Tel. Llamadas</label><input type="tel" id="telefonoLlamadas" name="telefonoLlamadas" value={formData.telefonoLlamadas || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                                <div><label htmlFor="telefonoWhatsapp" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('telefonoWhatsapp') ? 'bg-green-500' : 'bg-amber-500'}`}></span><Phone size={14} /> Tel. WhatsApp</label><input type="tel" id="telefonoWhatsapp" name="telefonoWhatsapp" value={formData.telefonoWhatsapp || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            </div>
                            <div className="mb-4"><label htmlFor="email" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('email') ? 'bg-green-500' : 'bg-amber-500'}`}></span><Mail size={14} /> Email</label><input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            {/* Dirección ahora usa Modal */}
                            <ModalTriggerButton fieldName="direccion" title="Dirección" icon={MapPin} />
                            <div className="mb-4"><label htmlFor="googleMaps" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('googleMaps') ? 'bg-green-500' : 'bg-amber-500'}`}></span><MapPin size={14} /> Google Maps</label><input type="url" id="googleMaps" name="googleMaps" value={formData.googleMaps || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="http://..." /></div>
                            <div className="mb-4"><label htmlFor="paginaWeb" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('paginaWeb') ? 'bg-green-500' : 'bg-amber-500'}`}></span><LinkIcon size={14} /> Página Web</label><input type="url" id="paginaWeb" name="paginaWeb" value={formData.paginaWeb || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." /></div>
                            <div className="mb-4"><label htmlFor="horarioAtencion" className={`${labelBaseClasses} flex items-center gap-1.5`}><span className={`h-2 w-2 rounded-full flex-shrink-0 ${isFieldFilled('horarioAtencion') ? 'bg-green-500' : 'bg-amber-500'}`}></span><Clock size={14} /> Horario</label><input type="text" id="horarioAtencion" name="horarioAtencion" value={formData.horarioAtencion || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="Ej: L-V 9am-6pm" /></div>
                            <ModalTriggerButton fieldName="redesSociales" title="Redes Sociales" icon={Users} />
                        </div>
                    )}
                </div>

                {/* --- Sección Políticas --- */}
                <div>
                    <button type="button" onClick={() => toggleSection('politicas')} className={`${accordionButtonClasses} ${openSectionId !== 'politicas' ? 'rounded-md' : 'rounded-t-md'}`}>
                        <span className='flex items-center gap-2'><FileBadge size={16} /> Políticas y Legales</span>
                        <ChevronDown size={18} className={`transform transition-transform duration-200 ${openSectionId === 'politicas' ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                    {openSectionId === 'politicas' && (
                        <div className={accordionContentClasses}>
                            <ModalTriggerButton fieldName="garantias" title="Garantías" icon={ShieldCheck} />
                            <ModalTriggerButton fieldName="politicas" title="Políticas Generales" icon={FileText} />
                            <ModalTriggerButton fieldName="avisoPrivacidad" title="Aviso de Privacidad" icon={FileText} />
                        </div>
                    )}
                </div>

                {/* --- Sección Marketing --- */}
                <div>
                    <button type="button" onClick={() => toggleSection('marketing')} className={`${accordionButtonClasses} ${openSectionId !== 'marketing' ? 'rounded-md' : 'rounded-t-md'}`}>
                        <span className='flex items-center gap-2'><Megaphone size={16} /> Marketing</span>
                        <ChevronDown size={18} className={`transform transition-transform duration-200 ${openSectionId === 'marketing' ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                    {openSectionId === 'marketing' && (
                        <div className={accordionContentClasses}>
                            <ModalTriggerButton fieldName="compentencia" title="Análisis de Competencia" icon={Users} />
                            <ModalTriggerButton fieldName="clienteIdeal" title="Definición de Cliente Ideal" icon={Users} />
                            <ModalTriggerButton fieldName="terminologia" title="Terminología / Jerga" icon={BookOpen} />
                        </div>
                    )}
                </div>

                {/* --- Sección FAQ y Objeciones --- */}
                <div>
                    <button type="button" onClick={() => toggleSection('faq_objeciones')} className={`${accordionButtonClasses} ${openSectionId !== 'faq_objeciones' ? 'rounded-md' : 'rounded-t-md'}`}>
                        <span className='flex items-center gap-2'><MessageCircleQuestion size={16} /> FAQ y Objeciones</span>
                        <ChevronDown size={18} className={`transform transition-transform duration-200 ${openSectionId === 'faq_objeciones' ? 'rotate-180' : 'rotate-0'}`} />
                    </button>
                    {openSectionId === 'faq_objeciones' && (
                        <div className={accordionContentClasses}>
                            <ModalTriggerButton fieldName="preguntasFrecuentes" title="Preguntas Frecuentes (FAQ)" icon={HelpCircle} />
                            <ModalTriggerButton fieldName="objeciones" title="Objeciones Comunes" icon={MessageSquareWarning} />
                        </div>
                    )}
                </div>


                {/* Botones (al final del formulario) */}
                <div className="pt-8 space-y-3 mt-6 border-t border-zinc-600">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando Cambios...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar / Volver
                    </button>
                    <div className="flex justify-center pt-2">
                        <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Negocio</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Renderizar el Modal de Texto (sin cambios) */}
            <FullScreenTextEditModal
                isOpen={isTextModalOpen}
                onClose={closeModal}
                onSave={handleModalSave}
                title={editingFieldTitle}
                fieldName={editingField!}
                initialValue={editingField && typeof formData[editingField] === 'string' ? formData[editingField] : ''}
                placeholder={`Escribe aquí ${editingFieldTitle.toLowerCase()}...`}
                textareaBaseClasses={textareaBaseClasses}
                buttonBaseClasses={buttonBaseClasses}
            />
        </div>
    );
}
