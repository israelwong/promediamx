'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// NUEVAS IMPORTS
import {
    obtenerAsistenteVirtualPorIdAction,
    actualizarAsistenteVirtualAction,
    eliminarAsistenteVirtualAction,
    obtenerNegociosParaDropdownAction,
} from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.actions';
import type {
    AsistenteDetalleData,
    ActualizarAsistenteFormInput,
    NegocioParaDropdownData,
} from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.schemas';
// ActionResult ya es global

import { Loader2, Trash2, Save, ChevronDown, ChevronUp, Settings, Phone, Mail } from 'lucide-react';
import AsistenteImagenAvatar from './AsistenteImagenAvatar';

interface Props {
    asistenteId: string;
    // negocioId y clienteId se obtienen del asistente cargado o de params,
    // pero pasarlos como props es más directo para la navegación de cancelación/éxito.
    negocioIdOriginal?: string; // Para la navegación de vuelta
    clienteIdOriginal?: string; // Para la navegación de vuelta
}

// Tipo para el estado del formulario, derivado del schema Zod
type FormState = ActualizarAsistenteFormInput;

const initialFormState: FormState = {
    nombre: '',
    descripcion: null,
    version: 1.0,
    negocioId: null,
    status: 'activo', // Default o el que corresponda
    whatsappBusiness: null,
    phoneNumberId: null,
    token: null,
    nombreHITL: null,
    whatsappHITL: null,
    emailHITL: null,
    emailCalendario: null,
};

// Componente Acordeón Simple (sin cambios, se mantiene como está en tu archivo)
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

export default function AsistenteEditarForm({ asistenteId, negocioIdOriginal, clienteIdOriginal }: Props) {
    const router = useRouter();
    const [asistenteOriginal, setAsistenteOriginal] = useState<AsistenteDetalleData | null>(null);
    const [formData, setFormData] = useState<FormState>(initialFormState);
    const [negocios, setNegocios] = useState<NegocioParaDropdownData[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingNegocios, setLoadingNegocios] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string | null>('whatsapp');

    // Clases UI (como las tenías, ajustadas)
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md p-4 md:p-6";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[70px]`;
    const buttonBaseClasses = "w-full text-white font-medium px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-1.5 min-h-[32px] text-xs";
    const fieldGroupClasses = "space-y-1"; // Reducido el space-y para campos agrupados


    useEffect(() => {
        if (!asistenteId) {
            setError("No se proporcionó un ID de asistente.");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);

        const fetchAsistente = async () => {
            const result = await obtenerAsistenteVirtualPorIdAction(asistenteId);
            if (result.success && result.data) {
                const data = result.data;
                setAsistenteOriginal(data);
                setFormData({ // Mapear AsistenteDetalleData a FormState
                    nombre: data.nombre,
                    descripcion: data.descripcion,
                    version: data.version,
                    negocioId: data.negocioId,
                    status: data.status,
                    whatsappBusiness: data.whatsappBusiness,
                    phoneNumberId: data.phoneNumberId,
                    token: data.token, // Considerar no mostrar/editar token directamente
                    nombreHITL: data.nombreHITL,
                    whatsappHITL: data.whatsappHITL,
                    emailHITL: data.emailHITL,
                    emailCalendario: data.emailCalendario,
                });
            } else {
                setError(result.error || `Asistente no encontrado (ID: ${asistenteId})`);
            }
            setLoading(false);
        };
        fetchAsistente();
    }, [asistenteId]);

    useEffect(() => {
        setLoadingNegocios(true);
        obtenerNegociosParaDropdownAction()
            .then(result => {
                if (result.success && result.data) setNegocios(result.data);
                else setError(prev => `${prev ? prev + ' | ' : ''}${result.error || "Error cargando negocios."}`);
            })
            .catch(() => setError(prev => `${prev ? prev + ' | ' : ''}Error crítico cargando negocios.`))
            .finally(() => setLoadingNegocios(false));
    }, []);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;

        if (type === 'checkbox' && name === 'status') { // Específico para el toggle de status
            finalValue = (e.target as HTMLInputElement).checked ? 'activo' : 'inactivo';
        } else if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value); // parseFloat para permitir decimales en version
            if (isNaN(finalValue as number)) finalValue = null;
        } else {
            finalValue = value === '' ? null : value; // Campos de texto vacíos se guardan como null si el schema lo permite
        }

        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleCancel = () => {
        // Usar IDs originales si están disponibles, sino intentar obtenerlos del asistente cargado o ir a dashboard
        const cId = clienteIdOriginal || asistenteOriginal?.clienteId;
        const nId = negocioIdOriginal || asistenteOriginal?.negocioId;
        if (cId && nId) {
            router.push(`/admin/clientes/${cId}/negocios/${nId}/asistente`);
        } else {
            router.push('/admin/dashboard'); // Fallback
        }
    };

    const handleDelete = async () => {
        if (!asistenteOriginal || !confirm(`¿Estás seguro de eliminar el asistente "${asistenteOriginal.nombre}"? Esta acción no se puede deshacer.`)) return;

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        const result = await eliminarAsistenteVirtualAction(asistenteId);
        if (result.success) {
            setSuccessMessage("Asistente eliminado exitosamente. Redirigiendo...");
            const cId = clienteIdOriginal || asistenteOriginal?.clienteId;
            const nId = negocioIdOriginal || asistenteOriginal?.negocioId;
            setTimeout(() => {
                if (cId && nId) {
                    router.push(`/admin/clientes/${cId}/negocios/${nId}`);
                } else {
                    router.push('/admin/dashboard'); // Fallback
                }
            }, 1500);
        } else {
            setError(result.error || "Error al eliminar el asistente.");
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        const dataToSubmit: ActualizarAsistenteFormInput = {
            ...formData,
            // Zod se encargará de las transformaciones y validaciones en la action
        };

        const result = await actualizarAsistenteVirtualAction(asistenteId, dataToSubmit);
        if (result.success && result.data) {
            setSuccessMessage("Asistente actualizado exitosamente.");
            setAsistenteOriginal(result.data); // Actualizar el estado original con los datos guardados
            // El router.refresh() no es estrictamente necesario aquí si actualizamos el estado,
            // pero puede ser útil si otras partes de la página dependen de estos datos.
            // La revalidación del path en la action se encarga del caché del servidor.
        } else {
            const errorMsg = result.errorDetails
                ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                : result.error || "Error al actualizar el asistente.";
            setError(errorMsg);
        }
        setIsSubmitting(false);
    };

    const handleAccordionToggle = (id: string) => {
        setOpenAccordion(prev => (prev === id ? null : id));
    };

    if (loading && !asistenteOriginal) { // Mostrar loader solo si no hay datos originales aún
        return (
            <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md min-h-[400px] flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-500 mr-2" /> <span className="text-zinc-300">Cargando datos del asistente...</span>
            </div>
        );
    }
    if (error && !asistenteOriginal) {
        return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>;
    }
    if (!asistenteOriginal) {
        // Si no hay error pero tampoco asistenteOriginal y loading es false, significa que no se encontró
        return <div className="p-6 text-center text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg">Asistente no encontrado.</div>;
    }

    return (
        <div className={containerClasses}>
            <div className='border-b border-zinc-700 pb-3 mb-6 flex items-center justify-between'>
                <div>
                    <h2 className="text-lg font-semibold text-white leading-tight">Editar Asistente Virtual</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {asistenteId}</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6" noValidate>

                <div className="md:col-span-2 space-y-5 bg-zinc-900/30 rounded-lg border border-zinc-700/50 p-5">

                    {asistenteOriginal.negocioId && asistenteOriginal.clienteId ? (
                        <AsistenteImagenAvatar
                            asistenteId={asistenteId}
                            negocioId={asistenteOriginal.negocioId}
                            clienteId={asistenteOriginal.clienteId}
                            urlImagenInicial={asistenteOriginal.urlImagen}
                        />
                    ) : (
                        <div className="text-zinc-400 text-xs">Faltan datos de negocio o cliente para mostrar el avatar.</div>
                    )}

                    <div className="flex-grow space-y-3 w-full">
                        <div className={fieldGroupClasses}>
                            <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                            <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                        </div>
                    </div>

                    <div className={fieldGroupClasses}>
                        <label htmlFor="negocioId" className={labelBaseClasses}>Negocio Asociado</label>
                        <select id="negocioId" name="negocioId" value={formData.negocioId || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting || loadingNegocios}>
                            <option value="">{loadingNegocios ? 'Cargando negocios...' : (negocios.length > 0 ? '-- Seleccionar Negocio --' : '-- No hay negocios --')}</option>
                            {negocios.map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.nombre} {n.cliente?.nombre && `(${n.cliente.nombre})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={fieldGroupClasses}>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={4} />
                    </div>
                    <div className="space-y-3 gap-4 pt-3 border-t border-zinc-700">
                        <div><label className={labelBaseClasses}>Creado</label><div className={valueDisplayClasses}>{new Date(asistenteOriginal.createdAt).toLocaleDateString('es-MX', { timeZone: 'UTC' })}</div></div>
                        <div><label className={labelBaseClasses}>Actualizado</label><div className={valueDisplayClasses}>{new Date(asistenteOriginal.updatedAt).toLocaleString('es-MX', { timeZone: 'UTC' })}</div></div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-base font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                        <Settings size={16} /> Configuraciones Avanzadas
                    </h3>
                    <div className="space-y-2">
                        <AccordionItem title="WhatsApp" icon={Phone} isOpen={openAccordion === 'whatsapp'} onToggle={() => handleAccordionToggle('whatsapp')}>
                            <div><label htmlFor="whatsappBusiness" className={labelBaseClasses}>Teléfono WhatsApp</label><input type="tel" id="whatsappBusiness" name="whatsappBusiness" value={formData.whatsappBusiness || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="phoneNumberId" className={labelBaseClasses}>Phone Number ID (API)</label><input type="text" id="phoneNumberId" name="phoneNumberId" value={formData.phoneNumberId || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="token" className={labelBaseClasses}>Token (API)</label><input type="password" id="token" name="token" value={formData.token || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="••••••••" autoComplete="new-password" /></div>
                        </AccordionItem>
                        <AccordionItem title="Human in the Loop (HITL)" icon={Mail} isOpen={openAccordion === 'hitl'} onToggle={() => handleAccordionToggle('hitl')}>
                            <div><label htmlFor="nombreHITL" className={labelBaseClasses}>Nombre Contacto</label><input type="text" id="nombreHITL" name="nombreHITL" value={formData.nombreHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="whatsappHITL" className={labelBaseClasses}>WhatsApp Contacto</label><input type="tel" id="whatsappHITL" name="whatsappHITL" value={formData.whatsappHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                            <div><label htmlFor="emailHITL" className={labelBaseClasses}>Email Contacto</label><input type="email" id="emailHITL" name="emailHITL" value={formData.emailHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                        </AccordionItem>
                        {/* <AccordionItem title="Calendario" icon={CalendarDays} isOpen={openAccordion === 'calendario'} onToggle={() => handleAccordionToggle('calendario')}>
                            <div><label htmlFor="emailCalendario" className={labelBaseClasses}>Email para Agendar Citas</label><input type="email" id="emailCalendario" name="emailCalendario" value={formData.emailCalendario || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div>
                        </AccordionItem> */}
                    </div>
                    <div className="pt-5 space-y-3 border-t border-zinc-700 mt-4"> {/* Botones agrupados al final de la columna derecha */}
                        {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                        {successMessage && <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}
                        <div className="flex flex-col items-center gap-3">
                            <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading || loadingNegocios}>
                                {isSubmitting ? <Loader2 className='animate-spin mr-2' size={16} /> : <Save size={16} />} Guardar Cambios
                            </button>
                            <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`} disabled={isSubmitting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-xs p-1 mt-2 disabled:opacity-50 flex items-center gap-1' disabled={isSubmitting}><Trash2 size={12} /> Eliminar Asistente</button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}