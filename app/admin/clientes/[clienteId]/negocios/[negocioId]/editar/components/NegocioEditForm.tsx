'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// --- Actions and Types ---
import {
    obtenerDetallesNegocioParaEditar,
    actualizarDetallesNegocio,
    mejorarDescripcionNegocioIA,
    generarPoliticasNegocioIA,
    // Importar otras acciones IA que definas
} from '@/app/admin/_lib/negocio.actions'; // Ajusta la ruta
import { Negocio } from '@prisma/client';
import { ActualizarNegocioInput } from '@/app/admin/_lib/negocio.actions'; // Importar tipos
// --- Components ---
import NegocioImagenLogo from './NegocioImagenLogo';
import NegocioRedes from './NegocioRedes';
// --- Icons ---
import {
    Loader2, Save, Sparkles, Info, AlertCircle,
    Phone, BookOpen, MessageSquareWarning, FileText, Scale, Wand2, CheckCheck, Undo2,
    Building, ChevronDown, ShieldCheck, Target, MessageCircleQuestion, UserCheck, Share2
} from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId?: string;
}

type NegocioFormData = Partial<Omit<Negocio, 'id' | 'clienteId' | 'createdAt' | 'updatedAt' | 'cliente' | 'ofertas' | 'Catalogo' | 'categorias' | 'etiquetas' | 'AsistenteVirtual' | 'CRM' | 'itemsCatalogo' | 'Notificacion' | '_count' | 'redesSociales'>>;

type SugerenciaIA = {
    campo: keyof NegocioFormData;
    original: string | null; // Aseguramos que original siempre sea string o null
    sugerencia: string;
};

// --- Componente Simple de Acordeón (SIN ANIMACIONES) ---
interface AccordionItemProps {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon: Icon, children, isOpen, onToggle }) => {
    const headerClasses = "flex items-center justify-between w-full p-3 cursor-pointer bg-zinc-700/30 hover:bg-zinc-700/50 rounded-t-md text-sm font-medium text-zinc-200";
    const contentClasses = `bg-zinc-800/50 border border-t-0 border-zinc-600 rounded-b-md overflow-hidden`;

    return (
        <div className={`border border-zinc-600 rounded-md ${isOpen ? 'border-b-transparent' : ''}`}>
            <button type="button" onClick={onToggle} className={`${headerClasses} ${isOpen ? 'rounded-b-none' : ''}`} aria-expanded={isOpen}>
                <span className="flex items-center gap-2"> {Icon && <Icon size={15} />} {title} </span>
                <ChevronDown size={18} className={`transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={contentClasses} style={{ maxHeight: isOpen ? '1000px' : '0', paddingTop: isOpen ? '1rem' : '0', paddingBottom: isOpen ? '1rem' : '0', paddingLeft: '1rem', paddingRight: '1rem', borderTop: isOpen ? undefined : 'none' }} >
                {isOpen && children}
            </div>
        </div>
    );
};
// --- Fin Componente Acordeón ---


export default function NegocioEditarForm({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<NegocioFormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [estadoIA, setEstadoIA] = useState<{ [key in keyof NegocioFormData]?: 'loading' | 'error' }>({});
    const [sugerenciaActiva, setSugerenciaActiva] = useState<SugerenciaIA | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    // --- Clases Tailwind (sin cambios) ---
    const formContainerClasses = "bg-zinc-800 rounded-lg shadow-md border border-zinc-700";
    const headerPaddingClasses = "p-3 md:p-4";
    const formBodyPaddingClasses = "p-4 md:p-6";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[150px] md:min-h-[200px] whitespace-pre-wrap`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-lg border border-zinc-700/50";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2 mb-4 flex items-center gap-2";
    const aiButtonClasses = "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-800 disabled:opacity-50";
    const improveAiButtonClasses = `${aiButtonClasses} text-purple-300 bg-purple-900/40 hover:bg-purple-800/50 border-purple-700/50 focus:ring-purple-500`;
    const generateAiButtonClasses = `${aiButtonClasses} text-teal-300 bg-teal-900/40 hover:bg-teal-800/50 border-teal-700/50 focus:ring-teal-500`;
    const suggestionActionClasses = "px-2 py-0.5 text-[10px] font-medium rounded-md border flex items-center gap-1";
    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full";

    // --- Carga de Datos (sin cambios) ---
    const loadNegocio = useCallback(async () => {
        if (!negocioId) { setError("ID de negocio no válido."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null); setSugerenciaActiva(null); setEstadoIA({});
        try {
            const negocioData = await obtenerDetallesNegocioParaEditar(negocioId);
            if (!negocioData) throw new Error("Negocio no encontrado.");
            const { ...editableData } = negocioData;
            const statusValido = ['activo', 'inactivo'].includes(editableData.status || '') ? editableData.status || undefined : 'inactivo';
            const formDataInicial: NegocioFormData = {
                nombre: editableData.nombre || '', logo: editableData.logo || null, slogan: editableData.slogan || null,
                descripcion: editableData.descripcion || null, telefonoLlamadas: editableData.telefonoLlamadas || null,
                telefonoWhatsapp: editableData.telefonoWhatsapp || null, email: editableData.email || null, direccion: editableData.direccion || null,
                googleMaps: editableData.googleMaps || null, paginaWeb: editableData.paginaWeb || null, horarioAtencion: editableData.horarioAtencion || null,
                garantias: editableData.garantias || null, politicas: editableData.politicas || null, avisoPrivacidad: editableData.avisoPrivacidad || null,
                competencia: editableData.competencia || null, clienteIdeal: editableData.clienteIdeal || null, terminologia: editableData.terminologia || null,
                preguntasFrecuentes: editableData.preguntasFrecuentes !== null ? editableData.preguntasFrecuentes : undefined, objeciones: editableData.objeciones !== null ? editableData.objeciones : undefined, status: statusValido,
            };
            setFormData(formDataInicial);
        } catch (err) { console.error("Error al cargar negocio:", err); setError(err instanceof Error ? err.message : "Error al cargar datos."); setFormData({}); }
        finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { loadNegocio(); }, [loadNegocio]);

    // --- Limpiar mensaje de éxito (sin cambios) ---
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    // --- Handlers (handleChange, handleStatusToggle sin cambios) ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null);
        if (sugerenciaActiva && sugerenciaActiva.campo === name) setSugerenciaActiva(null);
    };
    const handleStatusToggle = () => { const newStatus = formData.status === 'activo' ? 'inactivo' : 'activo'; setFormData(prevState => ({ ...prevState, status: newStatus })); setError(null); setSuccessMessage(null); };

    // --- Handler para Guardar Cambios (handleSubmit sin cambios) ---
    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!formData.nombre?.trim()) { setError("El nombre del negocio es obligatorio."); return; }
        setIsSubmitting(true); setError(null); setSuccessMessage(null); setSugerenciaActiva(null); setEstadoIA({});
        try {
            const dataToSave: ActualizarNegocioInput = {
                nombre: formData.nombre?.trim(), logo: formData.logo ?? null, slogan: formData.slogan?.trim() ?? null,
                descripcion: formData.descripcion?.trim() ?? null, telefonoLlamadas: formData.telefonoLlamadas?.trim() ?? null,
                telefonoWhatsapp: formData.telefonoWhatsapp?.trim() ?? null, email: formData.email?.trim() ?? null, direccion: formData.direccion?.trim() ?? null,
                googleMaps: formData.googleMaps?.trim() ?? null, paginaWeb: formData.paginaWeb?.trim() ?? null, horarioAtencion: formData.horarioAtencion?.trim() ?? null,
                garantias: formData.garantias?.trim() ?? null, politicas: formData.politicas?.trim() ?? null, avisoPrivacidad: formData.avisoPrivacidad?.trim() ?? null,
                competencia: formData.competencia?.trim() ?? null, clienteIdeal: formData.clienteIdeal?.trim() ?? null, terminologia: formData.terminologia?.trim() ?? null,
                preguntasFrecuentes: formData.preguntasFrecuentes?.trim() ?? null, objeciones: formData.objeciones?.trim() ?? null,
                status: formData.status === 'activo' ? 'activo' : 'inactivo',
            };
            const result = await actualizarDetallesNegocio(negocioId, dataToSave);
            if (result.success) { setSuccessMessage("Información del negocio actualizada."); router.refresh(); }
            else { throw new Error(result.error || "No se pudo actualizar."); }
        } catch (err) { console.error("Error actualizando negocio:", err); setError(err instanceof Error ? err.message : "Ocurrió un error."); }
        finally { setIsSubmitting(false); }
    };

    // --- Handler para Cancelar (sin cambios) ---
    const handleCancel = () => { router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`); };

    // --- Handlers IA (REFACTORIZADOS) ---

    // Handler genérico para iniciar estado de carga y limpiar errores/sugerencias
    const iniciarAccionIA = (campo: keyof NegocioFormData) => {
        setEstadoIA(prev => ({ ...prev, [campo]: 'loading' }));
        setError(null);
        setSuccessMessage(null);
        setSugerenciaActiva(null);
    };

    // Handler genérico para finalizar estado de carga
    const finalizarAccionIA = (campo: keyof NegocioFormData) => {
        setEstadoIA(prev => ({ ...prev, [campo]: undefined }));
    };

    // Handler específico para MEJORAR descripción
    const handleMejorarDescripcion = async () => {
        const campo = 'descripcion'; // Campo específico
        const valorActual = formData[campo] ?? null;
        if (!valorActual?.trim()) {
            setError("Escribe una descripción primero para poder mejorarla.");
            return;
        }
        iniciarAccionIA(campo);
        try {
            // Llamar a la acción específica con sus parámetros
            const result = await mejorarDescripcionNegocioIA(negocioId, valorActual); // No necesita creatividad/longitud aquí si usamos defaults
            if (result.success && result.data?.sugerencia) {
                setSugerenciaActiva({ campo, original: valorActual, sugerencia: result.data.sugerencia });
                setFormData(prev => ({ ...prev, [campo]: result.data?.sugerencia }));
            } else {
                throw new Error(result.error || `No se pudo mejorar ${String(campo)}.`);
            }
        } catch (err) {
            console.error(`Error en IA para ${String(campo)}:`, err);
            setError(err instanceof Error ? err.message : `Error de IA para ${String(campo)}.`);
        } finally {
            finalizarAccionIA(campo);
        }
    };

    // Handler específico para GENERAR/MEJORAR políticas
    const handleGenerarPoliticas = async (tipoPolitica: 'privacidad' | 'terminos') => {
        // Determinar el campo correcto basado en tipoPolitica
        const campo = tipoPolitica === 'privacidad' ? 'avisoPrivacidad' : 'politicas';
        const valorActual = formData[campo] ?? null;
        iniciarAccionIA(campo);
        try {
            // Llamar a la acción específica con sus parámetros
            const result = await generarPoliticasNegocioIA(negocioId, tipoPolitica, valorActual);
            if (result.success && result.data?.sugerencia) {
                setSugerenciaActiva({ campo, original: valorActual, sugerencia: result.data.sugerencia });
                setFormData(prev => ({ ...prev, [campo]: result.data?.sugerencia }));
            } else {
                throw new Error(result.error || `No se pudo potenciar ${String(campo)}.`);
            }
        } catch (err) {
            console.error(`Error en IA para ${String(campo)}:`, err);
            setError(err instanceof Error ? err.message : `Error de IA para ${String(campo)}.`);
        } finally {
            finalizarAccionIA(campo);
        }
    };

    // Handlers para aceptar/revertir (sin cambios)
    const aceptarSugerencia = () => { if (!sugerenciaActiva) return; setSuccessMessage(`Sugerencia para "${sugerenciaActiva.campo}" aceptada.`); setSugerenciaActiva(null); };
    const revertirSugerencia = () => { if (!sugerenciaActiva) return; setFormData(prev => ({ ...prev, [sugerenciaActiva.campo]: sugerenciaActiva.original })); setSugerenciaActiva(null); setError(null); };

    // --- Handler para el Acordeón ---
    const handleAccordionToggle = (seccionKey: string) => { setOpenAccordion(prev => prev === seccionKey ? null : seccionKey); };

    // --- Renderizado ---
    if (loading) return <div className="p-6 text-center text-zinc-300 bg-zinc-900 rounded-lg"><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Información...</div>;
    if (error && !formData.nombre) return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>;
    if (!loading && !formData.nombre) return <div className="p-6 text-center text-zinc-400">Negocio no encontrado o error al cargar.</div>;

    const isActivo = formData.status === 'activo';
    const disableAllActions = isSubmitting || Object.values(estadoIA).some(s => s === 'loading');

    return (
        <div className={formContainerClasses}>
            {/* Cabecera Fija con Switch, Título y Botones */}
            <div className={`${headerPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4 sticky top-0 bg-zinc-800 z-10`}>
                <div className='flex items-center gap-3'>
                    <button type="button" onClick={handleStatusToggle} className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`} aria-pressed={isActivo} disabled={disableAllActions} title={isActivo ? 'Negocio Activo' : 'Negocio Inactivo'}> <span className="sr-only">Estado</span> <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} /> </button>
                    <div> <h1 className='text-lg font-semibold text-white'>Editar Información del Negocio</h1> </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleCancel} className={secondaryButtonClasses} disabled={disableAllActions}> Cerrar ventana </button>
                    <button type="button" onClick={() => handleSubmit()} className={primaryButtonClasses} disabled={disableAllActions || loading}> {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} <span className="ml-1.5">Guardar Cambios</span> </button>
                </div>
            </div>

            {/* Cuerpo del Formulario con Grid de 3 Columnas */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 ${formBodyPaddingClasses}`}>

                {/* --- Columna 1: Logo, Nombre, Slogan, Web y Contacto --- */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Building size={16} /> Identidad del Negocio</h3>
                        <div className="flex flex-col items-center gap-4">
                            <NegocioImagenLogo negocioId={negocioId} initialLogoUrl={formData.logo} />
                            <div className="w-full space-y-3">
                                <div> <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label> <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableAllActions} maxLength={100} /> </div>
                                <div> <label htmlFor="slogan" className={labelBaseClasses}>Slogan</label> <input type="text" id="slogan" name="slogan" value={formData.slogan || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} maxLength={150} placeholder="La frase clave de tu negocio..." /> </div>
                                <div> <label htmlFor="paginaWeb" className={labelBaseClasses}>Página Web</label> <input type="url" id="paginaWeb" name="paginaWeb" value={formData.paginaWeb || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="https://..." /> </div>
                            </div>
                        </div>
                    </div>
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Phone size={16} /> Información de Contacto</h3>
                        <div className="space-y-3">
                            <div><label htmlFor="telefonoLlamadas" className={labelBaseClasses}>Teléfono (Llamadas)</label><input type="tel" id="telefonoLlamadas" name="telefonoLlamadas" value={formData.telefonoLlamadas || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="telefonoWhatsapp" className={labelBaseClasses}>Teléfono (WhatsApp)</label><input type="tel" id="telefonoWhatsapp" name="telefonoWhatsapp" value={formData.telefonoWhatsapp || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="email" className={labelBaseClasses}>Email Principal</label><input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="direccion" className={labelBaseClasses}>Dirección Física</label><textarea id="direccion" name="direccion" value={formData.direccion || ''} onChange={handleChange} className={`${inputBaseClasses} min-h-[60px]`} disabled={disableAllActions} rows={2} /></div>
                            <div><label htmlFor="googleMaps" className={labelBaseClasses}>Enlace Google Maps</label><input type="url" id="googleMaps" name="googleMaps" value={formData.googleMaps || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="https://..." /></div>
                            <div><label htmlFor="horarioAtencion" className={labelBaseClasses}>Horario de Atención</label><textarea id="horarioAtencion" name="horarioAtencion" value={formData.horarioAtencion || ''} onChange={handleChange} className={`${inputBaseClasses} min-h-[80px]`} disabled={disableAllActions} rows={3} placeholder="Ej: Lunes a Viernes: 9am - 6pm..." /></div>
                        </div>
                    </div>
                    {/* --- Componente Redes Sociales --- */}
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Share2 size={16} /> Redes Sociales</h3>
                        {negocioId && <NegocioRedes negocioId={negocioId} />}
                    </div>
                </div>

                {/* --- Columna 2: Descripción Principal --- */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Info size={16} /> Descripción General</h3>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción Principal / Resumen Ejecutivo</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[300px]`} disabled={disableAllActions} rows={12} placeholder="Describe tu negocio, misión, visión, valores, historia..." />
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                            {/* --- LLAMADA AL HANDLER ESPECÍFICO --- */}
                            <button type="button" onClick={handleMejorarDescripcion} className={improveAiButtonClasses} disabled={disableAllActions || !formData.descripcion?.trim()} title={!formData.descripcion?.trim() ? "Escribe algo primero" : "Mejorar descripción"}> {estadoIA.descripcion === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} <span>Mejorar</span> </button>
                            {sugerenciaActiva?.campo === 'descripcion' && (<div className="flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        </div>
                        {estadoIA.descripcion === 'error' && <p className="text-xs text-red-400 mt-1">Error al mejorar.</p>}
                    </div>
                </div>

                {/* --- Columna 3: Acordeones Granulares --- */}
                <div className="md:col-span-1 flex flex-col gap-4">
                    <AccordionItem title="Políticas (Devolución, etc.)" icon={FileText} isOpen={openAccordion === 'politicas'} onToggle={() => handleAccordionToggle('politicas')}>
                        <textarea id="politicas" name="politicas" value={formData.politicas || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Detalla tus políticas..." />
                        {/* --- LLAMADA AL HANDLER ESPECÍFICO --- */}
                        <button type="button" onClick={() => handleGenerarPoliticas('terminos')} className={`mt-2 ${generateAiButtonClasses}`} disabled={disableAllActions} title="Generar/Mejorar políticas"> {estadoIA.politicas === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} <span>{formData.politicas?.trim() ? 'Mejorar' : 'Generar'}</span> </button>
                        {sugerenciaActiva?.campo === 'politicas' && (<div className="mt-1 flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        {estadoIA.politicas === 'error' && <p className="text-xs text-red-400 mt-1">Error IA.</p>}
                    </AccordionItem>
                    <AccordionItem title="Aviso de Privacidad" icon={ShieldCheck} isOpen={openAccordion === 'avisoPrivacidad'} onToggle={() => handleAccordionToggle('avisoPrivacidad')}>
                        <textarea id="avisoPrivacidad" name="avisoPrivacidad" value={formData.avisoPrivacidad || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Incluye tu aviso de privacidad..." />
                        {/* --- LLAMADA AL HANDLER ESPECÍFICO --- */}
                        <button type="button" onClick={() => handleGenerarPoliticas('privacidad')} className={`mt-2 ${generateAiButtonClasses}`} disabled={disableAllActions} title="Generar/Mejorar aviso"> {estadoIA.avisoPrivacidad === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} <span>{formData.avisoPrivacidad?.trim() ? 'Mejorar' : 'Generar'}</span> </button>
                        {sugerenciaActiva?.campo === 'avisoPrivacidad' && (<div className="mt-1 flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        {estadoIA.avisoPrivacidad === 'error' && <p className="text-xs text-red-400 mt-1">Error IA.</p>}
                    </AccordionItem>
                    <AccordionItem title="Garantías" icon={Scale} isOpen={openAccordion === 'garantias'} onToggle={() => handleAccordionToggle('garantias')}>
                        <textarea id="garantias" name="garantias" value={formData.garantias || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={4} placeholder="Describe las garantías ofrecidas..." />
                    </AccordionItem>
                    <AccordionItem title="Cliente Ideal / Público Objetivo" icon={UserCheck} isOpen={openAccordion === 'clienteIdeal'} onToggle={() => handleAccordionToggle('clienteIdeal')}>
                        <textarea id="clienteIdeal" name="clienteIdeal" value={formData.clienteIdeal || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Describe detalladamente a tu cliente ideal..." />
                    </AccordionItem>
                    <AccordionItem title="Terminología del Negocio" icon={BookOpen} isOpen={openAccordion === 'terminologia'} onToggle={() => handleAccordionToggle('terminologia')}>
                        <textarea id="terminologia" name="terminologia" value={formData.terminologia || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={4} placeholder="Palabras clave, acrónimos, términos específicos..." />
                    </AccordionItem>
                    <AccordionItem title="Competencia Principal" icon={Target} isOpen={openAccordion === 'competencia'} onToggle={() => handleAccordionToggle('competencia')}>
                        <textarea id="competencia" name="competencia" value={formData.competencia || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={3} placeholder="Menciona tus principales competidores..." />
                    </AccordionItem>
                    <AccordionItem title="Preguntas Frecuentes (FAQ)" icon={MessageCircleQuestion} isOpen={openAccordion === 'faq'} onToggle={() => handleAccordionToggle('faq')}>
                        <textarea id="preguntasFrecuentes" name="preguntasFrecuentes" value={formData.preguntasFrecuentes || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="P: Pregunta 1\nR: Respuesta 1..." />
                    </AccordionItem>
                    <AccordionItem title="Manejo de Objeciones" icon={MessageSquareWarning} isOpen={openAccordion === 'objeciones'} onToggle={() => handleAccordionToggle('objeciones')}>
                        <textarea id="objeciones" name="objeciones" value={formData.objeciones || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={5} placeholder="Objeción: Es muy caro.\nRespuesta: Entendemos..." />
                    </AccordionItem>
                </div>

                {/* Mensajes de Feedback Globales */}
                <div className="md:col-span-3 pt-5 space-y-3 border-t border-zinc-600 mt-2">
                    {error && (<p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error} </p>)}
                    {successMessage && (<p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm"> {successMessage} </p>)}
                </div>
            </div>
        </div>
    );
}
