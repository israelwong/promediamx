// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/components/NegocioEditForm.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// --- Actions and Types ---
import {
    obtenerDetallesNegocioParaEditar,
    actualizarDetallesNegocio,
} from '@/app/admin/_lib/actions/negocio/negocio.actions'; // Nueva ruta de actions
import { NegocioFormData } from '@/app/admin/_lib/actions/negocio/negocio.schemas'; // Tipo Zod inferido
import type { Negocio as PrismaNegocioType } from '@prisma/client'; // Para el tipo de retorno de obtenerDetalles

import NegocioImagenLogo from './NegocioImagenLogo';
import NegocioRedes from './NegocioRedes';

import {
    Loader2, Save, /*Sparkles, Wand2, CheckCheck, Undo2,*/ Info, AlertCircle, // Iconos IA comentados
    Phone, MessageSquareWarning, FileText, Scale,
    Building, ChevronDown, ShieldCheck, MessageCircleQuestion, /*Target, UserCheck, Share2*/ // Iconos de campos omitidos o secciones IA comentadas
} from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId?: string; // clienteId es opcional aquí, pero usado en el contexto padre
}

// --- Componente Simple de Acordeón (SIN CAMBIOS) ---
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


export default function NegocioEditarForm({ negocioId }: Props) { // clienteId no se usa directamente aquí, se pasa a subcomponentes si es necesario
    const router = useRouter();
    const [formData, setFormData] = useState<NegocioFormData>({
        nombre: '', // Inicializar campos obligatorios del schema para evitar undefined
        status: 'inactivo', // Default según schema
        // El resto pueden ser undefined o null y el schema Zod los manejará
    });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-lg border border-zinc-700/50";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 border-b border-zinc-600 pb-2 mb-4 flex items-center gap-2";
    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full";


    const loadNegocio = useCallback(async () => {
        if (!negocioId) { setError("ID de negocio no válido."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        // setSugerenciaActiva(null); setEstadoIA({}); // IA omitida
        try {
            const negocioData: PrismaNegocioType | null = await obtenerDetallesNegocioParaEditar(negocioId);
            if (!negocioData) throw new Error("Negocio no encontrado.");

            // Adaptar a NegocioFormData (Zod Schema), omitiendo campos no deseados
            const formDataInicial: NegocioFormData = {
                nombre: negocioData.nombre || '',
                slogan: negocioData.slogan || null,
                descripcion: negocioData.descripcion || null,
                telefonoLlamadas: negocioData.telefonoLlamadas || null,
                telefonoWhatsapp: negocioData.telefonoWhatsapp || null,
                email: negocioData.email || null,
                direccion: negocioData.direccion || null,
                googleMaps: negocioData.googleMaps || null,
                paginaWeb: negocioData.paginaWeb || null,
                horarioAtencion: negocioData.horarioAtencion || null,
                garantias: negocioData.garantias || null,
                politicas: negocioData.politicas || null,
                avisoPrivacidad: negocioData.avisoPrivacidad || null,
                preguntasFrecuentes: negocioData.preguntasFrecuentes !== null ? negocioData.preguntasFrecuentes : undefined,
                objeciones: negocioData.objeciones !== null ? negocioData.objeciones : undefined,
                status: ['activo', 'inactivo'].includes(negocioData.status || '') ? (negocioData.status as 'activo' | 'inactivo') : 'inactivo',
                logo: negocioData.logo || null,
            };
            setFormData(formDataInicial);
        } catch (err) { console.error("Error al cargar negocio:", err); setError(err instanceof Error ? err.message : "Error al cargar datos."); setFormData({ nombre: '', status: 'inactivo' }); }
        finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { loadNegocio(); }, [loadNegocio]);

    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null);
        // if (sugerenciaActiva && sugerenciaActiva.campo === name) setSugerenciaActiva(null); // IA omitida
    };
    const handleStatusToggle = () => { const newStatus = formData.status === 'activo' ? 'inactivo' : 'activo'; setFormData(prevState => ({ ...prevState, status: newStatus })); setError(null); setSuccessMessage(null); };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!formData.nombre?.trim()) { setError("El nombre del negocio es obligatorio."); return; }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        // setSugerenciaActiva(null); setEstadoIA({}); // IA omitida
        try {
            // formData ya debe tener la forma de NegocioFormData (Zod)
            // La acción `actualizarDetallesNegocio` ahora espera `unknown` y valida con Zod internamente.
            const result = await actualizarDetallesNegocio(negocioId, formData);
            if (result.success) { setSuccessMessage("Información del negocio actualizada."); router.refresh(); }
            // else { throw new Error(result.error || "No se pudo actualizar."); } // Con errorDetails
            else {
                const errorMessage = result.error || "No se pudo actualizar.";
                // if (result.errorDetails) { // Descomentar si se implementan errorDetails en la action
                //     const fieldErrors = Object.values(result.errorDetails).flat().join(', ');
                //     errorMessage += ` Detalles: ${fieldErrors}`;
                // }
                throw new Error(errorMessage);
            }
        } catch (err) { console.error("Error actualizando negocio:", err); setError(err instanceof Error ? err.message : "Ocurrió un error."); }
        finally { setIsSubmitting(false); }
    };

    const handleAccordionToggle = (seccionKey: string) => { setOpenAccordion(prev => prev === seccionKey ? null : seccionKey); };

    if (loading) return <div className="p-6 text-center text-zinc-300 bg-zinc-900 rounded-lg"><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Información...</div>;
    if (error && !Object.keys(formData).length) return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>;
    if (!loading && !formData.nombre && !Object.keys(formData).length) return <div className="p-6 text-center text-zinc-400">Negocio no encontrado o error al cargar.</div>;


    const isActivo = formData.status === 'activo';
    const disableAllActions = isSubmitting;

    return (
        <div className={formContainerClasses}>
            <div className={`${headerPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4  bg-zinc-800 z-10`}>
                <div className='flex items-center gap-3'>
                    <button type="button" onClick={handleStatusToggle} className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`} aria-pressed={isActivo} disabled={disableAllActions} title={isActivo ? 'Negocio Activo' : 'Negocio Inactivo'}> <span className="sr-only">Estado</span> <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} /> </button>
                    <div> <h1 className='text-lg font-semibold text-white'>Editar Información del Negocio</h1> </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleSubmit()} className={primaryButtonClasses} disabled={disableAllActions || loading}> {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} <span className="ml-1.5">Guardar Cambios</span> </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 ${formBodyPaddingClasses}`}>
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Building size={16} /> Identidad del Negocio</h3>
                        <div className="flex flex-col items-center gap-4">
                            {/* El logo ahora se obtiene de formData.logo si se decide incluir en el schema, o se maneja totalmente en NegocioImagenLogo */}
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
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}>Redes Sociales</h3> {/* Actualizado para usar el icono de Share2 si se prefiere */}
                        {negocioId && <NegocioRedes negocioId={negocioId} />}
                    </div>
                </div>

                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Info size={16} /> Descripción General</h3>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción Principal / Resumen Ejecutivo</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[300px]`} disabled={disableAllActions} rows={12} placeholder="Describe tu negocio, misión, visión, valores, historia..." />
                        {/* Botones IA Omitidos por ahora 
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                            <button type="button" onClick={handleMejorarDescripcion} className={improveAiButtonClasses} disabled={disableAllActions || !formData.descripcion?.trim()} title={!formData.descripcion?.trim() ? "Escribe algo primero" : "Mejorar descripción"}> {estadoIA.descripcion === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} <span>Mejorar</span> </button>
                            {sugerenciaActiva?.campo === 'descripcion' && (<div className="flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        </div>
                        {estadoIA.descripcion === 'error' && <p className="text-xs text-red-400 mt-1">Error al mejorar.</p>}
                        */}
                    </div>
                </div>

                <div className="md:col-span-1 flex flex-col gap-4">
                    <AccordionItem title="Políticas (Devolución, etc.)" icon={FileText} isOpen={openAccordion === 'politicas'} onToggle={() => handleAccordionToggle('politicas')}>
                        <textarea id="politicas" name="politicas" value={formData.politicas || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Detalla tus políticas..." />
                        {/* Botones IA Omitidos por ahora
                        <button type="button" onClick={() => handleGenerarPoliticas('terminos')} className={`mt-2 ${generateAiButtonClasses}`} disabled={disableAllActions} title="Generar/Mejorar políticas"> {estadoIA.politicas === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} <span>{formData.politicas?.trim() ? 'Mejorar' : 'Generar'}</span> </button>
                        {sugerenciaActiva?.campo === 'politicas' && (<div className="mt-1 flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        {estadoIA.politicas === 'error' && <p className="text-xs text-red-400 mt-1">Error IA.</p>}
                        */}
                    </AccordionItem>
                    <AccordionItem title="Aviso de Privacidad" icon={ShieldCheck} isOpen={openAccordion === 'avisoPrivacidad'} onToggle={() => handleAccordionToggle('avisoPrivacidad')}>
                        <textarea id="avisoPrivacidad" name="avisoPrivacidad" value={formData.avisoPrivacidad || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Incluye tu aviso de privacidad..." />
                        {/* Botones IA Omitidos por ahora
                        <button type="button" onClick={() => handleGenerarPoliticas('privacidad')} className={`mt-2 ${generateAiButtonClasses}`} disabled={disableAllActions} title="Generar/Mejorar aviso"> {estadoIA.avisoPrivacidad === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} <span>{formData.avisoPrivacidad?.trim() ? 'Mejorar' : 'Generar'}</span> </button>
                        {sugerenciaActiva?.campo === 'avisoPrivacidad' && (<div className="mt-1 flex items-center gap-1.5"> <button onClick={aceptarSugerencia} className={`${suggestionActionClasses} bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/40`}><CheckCheck size={12} /> Aceptar</button> <button onClick={revertirSugerencia} className={`${suggestionActionClasses} bg-yellow-600/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/40`}><Undo2 size={12} /> Revertir</button> </div>)}
                        {estadoIA.avisoPrivacidad === 'error' && <p className="text-xs text-red-400 mt-1">Error IA.</p>}
                        */}
                    </AccordionItem>
                    <AccordionItem title="Garantías" icon={Scale} isOpen={openAccordion === 'garantias'} onToggle={() => handleAccordionToggle('garantias')}>
                        <textarea id="garantias" name="garantias" value={formData.garantias || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={4} placeholder="Describe las garantías ofrecidas..." />
                    </AccordionItem>
                    {/* CAMPOS OMITIDOS: clienteIdeal, terminologia, competencia */}
                    <AccordionItem title="Preguntas Frecuentes (FAQ)" icon={MessageCircleQuestion} isOpen={openAccordion === 'faq'} onToggle={() => handleAccordionToggle('faq')}>
                        <textarea id="preguntasFrecuentes" name="preguntasFrecuentes" value={formData.preguntasFrecuentes || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="P: Pregunta 1\nR: Respuesta 1..." />
                    </AccordionItem>
                    <AccordionItem title="Manejo de Objeciones" icon={MessageSquareWarning} isOpen={openAccordion === 'objeciones'} onToggle={() => handleAccordionToggle('objeciones')}>
                        <textarea id="objeciones" name="objeciones" value={formData.objeciones || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={5} placeholder="Objeción: Es muy caro.\nRespuesta: Entendemos..." />
                    </AccordionItem>
                </div>

                <div className="md:col-span-3 pt-5 space-y-3 border-t border-zinc-600 mt-2">
                    {error && (<p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error} </p>)}
                    {successMessage && (<p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm"> {successMessage} </p>)}
                </div>
            </div>
        </div>
    );
}