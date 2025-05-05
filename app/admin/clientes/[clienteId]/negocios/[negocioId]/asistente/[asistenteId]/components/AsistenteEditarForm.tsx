'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerAsistenteVirtualPorId,
    actualizarAsistenteVirtual,
    eliminarAsistenteVirtual,
    obtenerNegociosParaDropdown
} from '@/app/admin/_lib/asistenteVirtual.actions'; // Ajusta ruta
import { AsistenteVirtual, Negocio, Cliente } from '@/app/admin/_lib/types'; // Ajusta ruta
import { Loader2, Trash2, Save, ChevronDown, ChevronUp, Settings, Phone, Mail, CalendarDays } from 'lucide-react'; // Añadidos iconos
import AsistenteImagenAvatar from './AsistenteImagenAvatar'; // Importar componente avatar

interface Props {
    asistenteId: string;
    negocioId?: string;
    clienteId?: string;
}

type AsistenteEditFormData = Partial<Omit<AsistenteVirtual, 'id' | 'createdAt' | 'updatedAt' | 'origen' | 'contratoId' | 'negocioId' | 'negocio' | 'AsistenteTareaSuscripcion' | 'TareaEjecutada' | 'Conversacion' | 'FacturaItem'>> & {
    negocioId?: string | null;
};

type NegocioParaDropdown = Pick<Negocio, 'id' | 'nombre'> & {
    cliente?: Pick<Cliente, 'id' | 'nombre'> | null;
};

// --- Componente Acordeón Simple ---
interface AccordionItemProps {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon: Icon, isOpen, onToggle, children }) => {
    const headerClasses = "flex items-center justify-between p-3 cursor-pointer bg-zinc-700/30 hover:bg-zinc-700/50 rounded-t-md transition-colors duration-150";
    const contentClasses = `p-3 border border-t-0 border-zinc-700 rounded-b-md bg-zinc-900/30 ${isOpen ? 'block' : 'hidden'}`;
    const titleClasses = "text-sm font-medium text-zinc-200 flex items-center gap-2";

    return (
        <div className="border border-zinc-700 rounded-md overflow-hidden">
            <div className={headerClasses} onClick={onToggle}>
                <h3 className={titleClasses}>
                    <Icon size={14} /> {title}
                </h3>
                <span className="text-zinc-400">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
            </div>
            <div className={contentClasses}>
                <div className="space-y-3"> {/* Añadir espaciado interno */}
                    {children}
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal ---
export default function AsistenteEditarForm({ asistenteId, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [asistenteOriginal, setAsistenteOriginal] = useState<AsistenteVirtual | null>(null);
    const [formData, setFormData] = useState<AsistenteEditFormData>({});
    const [negocios, setNegocios] = useState<NegocioParaDropdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingNegocios, setLoadingNegocios] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Cerca del inicio del componente AsistenteEditarForm
    const [openAccordion, setOpenAccordion] = useState<string | null>('whatsapp'); // <-- LÍNEA MODIFICADA

    // Clases de Tailwind reutilizables
    // Clases de Tailwind reutilizables
    // --- CORRECCIÓN: Añadir bg-zinc-800 y padding al contenedor principal ---
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md p-4 md:p-6"; // Añadido fondo y padding
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[70px]`;
    const buttonBaseClasses = "w-full text-white font-medium px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-1.5 min-h-[32px] text-xs";
    // const sectionTitleClasses = "text-base font-semibold text-zinc-200 border-b border-zinc-600 pb-1 mb-3"; // Ya no se usa directamente
    const fieldGroupClasses = "space-y-4"; // Grupo de campos simple
    // --- CORRECCIÓN: Fondo de la columna izquierda ---
    // const leftColumnClasses = "md:col-span-3 space-y-5 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"; // Fondo más sutil o quitarlo si containerClasses es suficiente


    // --- Efecto para cargar datos del Asistente ---
    useEffect(() => {
        // ... (lógica de carga sin cambios) ...
        if (!asistenteId) { setError("No se proporcionó un ID."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        const fetchAsistente = async () => {
            try {
                const data = await obtenerAsistenteVirtualPorId(asistenteId);
                if (data) {
                    setAsistenteOriginal(data);
                    const { ...editableData } = data;
                    setFormData({ ...editableData, negocioId: data.negocioId });
                } else {
                    setError(`Asistente no encontrado (ID: ${asistenteId})`);
                    setAsistenteOriginal(null); setFormData({});
                }
            } catch (err) {
                console.error("Error fetching asistente:", err);
                setError("No se pudo cargar el asistente.");
                setAsistenteOriginal(null); setFormData({});
            } finally { setLoading(false); }
        };
        fetchAsistente();
    }, [asistenteId]);

    // --- Efecto para cargar Negocios ---
    useEffect(() => {
        // ... (lógica de carga sin cambios) ...
        setLoadingNegocios(true);
        obtenerNegociosParaDropdown()
            .then(data => { setNegocios(data || []); })
            .catch(err => { console.error("Error fetching negocios:", err); setError(prev => prev ? `${prev} | Error cargando negocios.` : "Error al cargar negocios."); })
            .finally(() => { setLoadingNegocios(false); });
    }, []);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        // ... (lógica sin cambios) ...
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;
        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null;
        } else if (type === 'checkbox') {
            const input = e.target as HTMLInputElement;
            if (name === 'status') finalValue = input.checked ? 'activo' : 'inactivo';
            else finalValue = input.checked;
        } else { finalValue = value; }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };
    const handleCancel = () => { router.back(); }; // Volver atrás
    const handleDelete = async () => {
        // ... (lógica sin cambios) ...
        if (!confirm("¿Eliminar asistente?")) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            await eliminarAsistenteVirtual(asistenteId);
            setSuccessMessage("Asistente eliminado.");
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);
        } catch (err) {
            console.error("Error deleting:", err);
            setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setIsSubmitting(false); }
    };
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        // ... (lógica sin cambios) ...
        e.preventDefault();
        if (!formData.nombre?.trim()) { setError("Nombre obligatorio."); return; }
        if (formData.version !== null && formData.version !== undefined && formData.version <= 0) { setError("Versión debe ser positiva."); return; }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            if (!asistenteOriginal?.id) throw new Error("ID de asistente falta.");
            // Construir el objeto a enviar asegurando tipos correctos
            const dataToUpdate: Partial<AsistenteVirtual> = {
                nombre: formData.nombre,
                descripcion: formData.descripcion || null,
                version: formData.version ?? 1.0, // Default si es null/undefined
                negocioId: formData.negocioId || null, // Asegurar null si está vacío
                status: formData.status ?? 'inactivo', // Default si es null/undefined
                whatsappBusiness: formData.whatsappBusiness || null,
                phoneNumberId: formData.phoneNumberId || null,
                token: formData.token || null,
                nombreHITL: formData.nombreHITL || null,
                whatsappHITL: formData.whatsappHITL || null,
                emailHITL: formData.emailHITL || null,
                emailCalendario: formData.emailCalendario || null,
                // urlImagen se maneja por AsistenteImagenAvatar
            };
            await actualizarAsistenteVirtual(asistenteId, {
                ...asistenteOriginal,
                ...dataToUpdate,
                id: asistenteOriginal?.id || asistenteId, // Ensure 'id' is always provided
            });
            setSuccessMessage("Asistente actualizado.");
            router.refresh(); // Refrescar datos
        } catch (err) {
            console.error("Error updating:", err);
            setError(`Error al actualizar: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setIsSubmitting(false); }
    };

    // --- Handler para el Acordeón ---
    const handleAccordionToggle = (id: string) => {
        setOpenAccordion(prev => (prev === id ? null : id)); // Abrir/cerrar
    };



    // --- Renderizado ---
    if (loading) {
        return (
            <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md min-h-[400px] flex items-center justify-center">
                <p className="text-xs italic text-zinc-500 text-center flex items-center justify-center gap-1 py-4">
                    <Loader2 size={12} className="animate-spin" /> Cargando stats...
                </p>
            </div>
        );
    }
    if (error && !asistenteOriginal) { return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>; }
    if (!asistenteOriginal) { return <div className="p-6 text-center text-zinc-400">Asistente no encontrado.</div>; }

    return (
        <div className={containerClasses}>

            {/* Cabecera (simplificada, el status se maneja en el form) */}
            <div className='border-b border-zinc-700 pb-3 mb-6 flex items-center justify-between'>
                <div>
                    <h2 className="text-lg font-semibold text-white leading-tight">Editar Asistente Virtual</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {asistenteId}</p>
                </div>
                {/* Status Toggle */}
                <div className="flex items-center gap-3">
                    {/* <span className={`${labelBaseClasses} mb-0`}>Status:</span> */}
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        {/* <span className="ml-2 text-xs font-medium text-zinc-300">{formData.status === 'activo' ? 'Activo' : 'Inactivo'}</span> */}
                    </label>
                </div>
            </div>

            {/* Formulario con Grid */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-6" noValidate> {/* 5 columnas base */}

                {/* --- Columna Izquierda (3/5) --- */}
                <div className="md:col-span-3 space-y-5 bg-zinc-900/30 rounded-lg border border-zinc-700/50 p-5">
                    {/* Bloque Avatar + Nombre/Versión */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="flex-shrink-0">
                            <AsistenteImagenAvatar
                                asistenteId={asistenteId}
                                urlImagenInicial={asistenteOriginal.urlImagen}
                            />
                        </div>
                        <div className="flex-grow space-y-3 w-full">
                            <div>
                                <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                            </div>
                            <div>
                                <label htmlFor="version" className={labelBaseClasses}>Versión</label>
                                <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.1" min="0.1" />
                            </div>
                        </div>
                    </div>

                    {/* Negocio Asociado */}
                    <div className={fieldGroupClasses}>
                        <label htmlFor="negocioId" className={labelBaseClasses}>Negocio Asociado</label>
                        <select id="negocioId" name="negocioId" value={formData.negocioId || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting || loadingNegocios}>
                            <option value="">{loadingNegocios ? 'Cargando...' : '-- Ninguno --'}</option>
                            {negocios.map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.nombre} {n.cliente?.nombre && `(${n.cliente.nombre})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Descripción */}
                    <div className={fieldGroupClasses}>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={4} />
                    </div>

                    {/* Fechas solo lectura */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-700">
                        <div><label className={labelBaseClasses}>Creado</label><div className={valueDisplayClasses}>{asistenteOriginal?.createdAt ? new Date(asistenteOriginal.createdAt).toLocaleDateString('es-MX') : 'N/A'}</div></div>
                        <div><label className={labelBaseClasses}>Actualizado</label><div className={valueDisplayClasses}>{asistenteOriginal?.updatedAt ? new Date(asistenteOriginal.updatedAt).toLocaleString('es-MX') : 'N/A'}</div></div>
                    </div>
                </div>

                {/* --- Columna Derecha (2/5) --- */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-base font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                        <Settings size={16} /> Configuraciones Avanzadas
                    </h3>
                    {/* Acordeón */}
                    <div className="space-y-2">
                        <AccordionItem title="WhatsApp" icon={Phone} isOpen={openAccordion === 'whatsapp'} onToggle={() => handleAccordionToggle('whatsapp')}>
                            <div><label htmlFor="whatsappBusiness" className={labelBaseClasses}>Teléfono WhatsApp</label><input type="tel" id="whatsappBusiness" name="whatsappBusiness" value={formData.whatsappBusiness || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="phoneNumberId" className={labelBaseClasses}>Phone Number ID (API)</label><input type="text" id="phoneNumberId" name="phoneNumberId" value={formData.phoneNumberId || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="token" className={labelBaseClasses}>Token (API)</label><input type="password" id="token" name="token" value={formData.token || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="••••••••" /></div>
                        </AccordionItem>

                        <AccordionItem title="Human in the Loop (HITL)" icon={Mail} isOpen={openAccordion === 'hitl'} onToggle={() => handleAccordionToggle('hitl')}>
                            <div><label htmlFor="nombreHITL" className={labelBaseClasses}>Nombre Contacto</label><input type="text" id="nombreHITL" name="nombreHITL" value={formData.nombreHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="whatsappHITL" className={labelBaseClasses}>WhatsApp Contacto</label><input type="tel" id="whatsappHITL" name="whatsappHITL" value={formData.whatsappHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="emailHITL" className={labelBaseClasses}>Email Contacto</label><input type="email" id="emailHITL" name="emailHITL" value={formData.emailHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                        </AccordionItem>

                        <AccordionItem title="Calendario" icon={CalendarDays} isOpen={openAccordion === 'calendario'} onToggle={() => handleAccordionToggle('calendario')}>
                            <div><label htmlFor="emailCalendario" className={labelBaseClasses}>Email para Agendar Citas</label><input type="email" id="emailCalendario" name="emailCalendario" value={formData.emailCalendario || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                        </AccordionItem>
                    </div>

                    <div className="md:col-span-5 pt-5 space-y-3 border-t border-zinc-700 mt-4">
                        {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                        {successMessage && <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                        <div className="flex flex-col items-center gap-3">
                            <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading || loadingNegocios}>
                                {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={16} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                            </button>
                            <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`} disabled={isSubmitting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-xs p-1 disabled:opacity-50' disabled={isSubmitting}><span className='flex items-center gap-1'><Trash2 size={12} /> Eliminar Asistente</span></button>
                        </div>
                    </div>

                </div>

                {/* Botones (abarcan todo el ancho en md) */}

            </form>
        </div>
    );
}
