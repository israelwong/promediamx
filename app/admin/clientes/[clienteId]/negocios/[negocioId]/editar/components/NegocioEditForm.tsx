// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/components/NegocioEditForm.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import slugify from 'slugify';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce'; // Asumiendo que tienes este hook
import Link from 'next/link';

// --- Actions and Types ---
import {
    obtenerDetallesNegocioParaEditar,
    actualizarDetallesNegocio,
    verificarSlugUnicoAction, // NUEVA ACCIÓN
    // generarSlugUnico, // Esta es una helper en el backend, no se llama desde el cliente directamente para generar el final
} from '@/app/admin/_lib/actions/negocio/negocio.actions';
import {
    NegocioFormDataSchema, // Para validación en cliente (opcional)
    type NegocioFormData,
    ActualizarNegocioInput
} from '@/app/admin/_lib/actions/negocio/negocio.schemas';
// import type { Negocio as PrismaNegocioType } from '@prisma/client';

import NegocioImagenLogo from './NegocioImagenLogo';
import NegocioRedes from './NegocioRedes';

import {
    Loader2, Save, Info, AlertCircle, CheckCircle, Edit3, XCircle,
    Phone, FileText, Scale, LinkIcon,
    Building, ChevronDown, ShieldCheck,
    ClipboardCopy, // Para el botón de copiar
    ExternalLink,  // Para el botón de visitar URL
} from 'lucide-react';

import { Button } from '@/app/components/ui/button';

interface Props {
    negocioId: string;
    clienteId?: string;
}

interface AccordionItemProps {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ title, icon: Icon, children, isOpen, onToggle }) => {
    const headerClasses = "flex items-center justify-between w-full p-3 cursor-pointer bg-zinc-700/30 hover:bg-zinc-700/50 rounded-t-md text-sm font-medium text-zinc-200";
    const contentClasses = `bg-zinc-800/50 border border-t-0 border-zinc-600 rounded-b-md overflow-hidden transition-all duration-300 ease-in-out`; // Añadida transition

    return (
        <div className={`border border-zinc-600 rounded-md ${isOpen ? 'border-b-transparent' : ''}`}>
            <button type="button" onClick={onToggle} className={`${headerClasses} ${isOpen ? 'rounded-b-none' : ''}`} aria-expanded={isOpen}>
                <span className="flex items-center gap-2"> {Icon && <Icon size={15} />} {title} </span>
                <ChevronDown size={18} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div
                className={contentClasses}
                style={{
                    maxHeight: isOpen ? '1000px' : '0', // Suficientemente grande para el contenido
                    paddingTop: isOpen ? '1rem' : '0',
                    paddingBottom: isOpen ? '1rem' : '0',
                    paddingLeft: isOpen ? '1rem' : '0',
                    paddingRight: '1rem',
                    borderTopStyle: isOpen ? undefined : 'none', // Ocultar borde superior cuando está cerrado
                }}
            >
                {isOpen && <div className="pt-0">{children}</div>} {/* Removido padding extra */}
            </div>
        </div>
    );
};

export default function NegocioEditarForm({ negocioId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<Partial<NegocioFormData>>({ // Usar Partial para el estado inicial
        nombre: '',
        status: 'inactivo',
        slug: '', // Nuevo campo
    });
    // const [initialNombre, setInitialNombre] = useState(''); // Para detectar si el nombre ha sido cambiado por el usuario
    const [slugManualmenteEditado, setSlugManualmenteEditado] = useState(false);
    const [slugStatus, setSlugStatus] = useState<{
        isLoading: boolean;
        esUnico: boolean | null;
        mensaje: string | null;
        sugerencia?: string;
    }>({ isLoading: false, esUnico: null, mensaje: null });

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const debouncedSlug = useDebounce(formData.slug || '', 700);
    const isInitialSlugLoad = useRef(true); // Para evitar la verificación en la carga inicial si el slug ya existe

    // --- Clases Tailwind ---
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

    const generarSlugSugerido = (texto: string): string => {
        if (!texto) return '';
        let slug = slugify(texto, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g, locale: 'es' });
        if (!slug) slug = `negocio-${Date.now().toString().slice(-5)}`;
        return slug.substring(0, 150);
    };

    const loadNegocio = useCallback(async () => {
        if (!negocioId) { setError("ID de negocio no válido."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const negocioData = await obtenerDetallesNegocioParaEditar(negocioId);
            if (!negocioData) throw new Error("Negocio no encontrado.");

            const slugInicial = negocioData.slug || generarSlugSugerido(negocioData.nombre || '');

            setFormData({
                nombre: negocioData.nombre || '',
                slug: slugInicial,
                slogan: negocioData.slogan || null,
                descripcion: negocioData.descripcion || null,
                telefonoLlamadas: negocioData.telefonoLlamadas || null,
                telefonoWhatsapp: negocioData.telefonoWhatsapp || null,
                email: negocioData.email || null,
                direccion: negocioData.direccion || null,
                googleMaps: negocioData.googleMaps || null,
                paginaWeb: negocioData.paginaWeb || null,
                garantias: negocioData.garantias || null,
                politicas: negocioData.politicas || null,
                avisoPrivacidad: negocioData.avisoPrivacidad || null,
                status: ['activo', 'inactivo'].includes(negocioData.status || '') ? (negocioData.status as 'activo' | 'inactivo') : 'inactivo',
                logo: negocioData.logo || null,
            });
            // setInitialNombre(negocioData.nombre || '');
            if (negocioData.slug) { // Si ya tiene un slug, se considera editado manualmente al inicio
                setSlugManualmenteEditado(true);
                isInitialSlugLoad.current = false; // Ya no es carga inicial para verificación si el slug existe
            } else {
                isInitialSlugLoad.current = true; // Es carga inicial y se autogeneró, verificar al primer blur/cambio
            }
        } catch (err) {
            console.error("Error al cargar negocio:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos.");
            setFormData({ nombre: '', status: 'inactivo', slug: '' });
        }
        finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { loadNegocio(); }, [loadNegocio]);
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    const handleNombreChange = (e: ChangeEvent<HTMLInputElement>) => {
        const nuevoNombre = e.target.value;
        setFormData(prevState => {
            const newState = { ...prevState, nombre: nuevoNombre };
            if (!slugManualmenteEditado) {
                newState.slug = generarSlugSugerido(nuevoNombre);
                setSlugStatus({ isLoading: false, esUnico: null, mensaje: null }); // Resetear estado del slug
                isInitialSlugLoad.current = false; // El slug cambió, necesita verificación
            }
            return newState;
        });
        setError(null); setSuccessMessage(null);
    };

    const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
        const nuevoSlugManual = e.target.value;
        // Permitir solo caracteres válidos para slug (letras minúsculas, números, guiones)
        const slugValido = slugify(nuevoSlugManual, { lower: true, strict: false, remove: /[^a-z0-9-]/g });

        setFormData(prevState => ({ ...prevState, slug: slugValido }));
        setSlugManualmenteEditado(true);
        setSlugStatus({ isLoading: false, esUnico: null, mensaje: null }); // Resetear al cambiar manualmente
        isInitialSlugLoad.current = false;
        setError(null); setSuccessMessage(null);
    };

    const verificarSlug = useCallback(async (slugParaVerificar: string) => {
        if (!slugParaVerificar || slugParaVerificar.length < 3) {
            setSlugStatus({ isLoading: false, esUnico: false, mensaje: "El slug debe tener al menos 3 caracteres válidos.", sugerencia: formData.slug ?? undefined });
            return false;
        }
        // Validar formato con regex
        const slugFormatRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugFormatRegex.test(slugParaVerificar)) {
            setSlugStatus({ isLoading: false, esUnico: false, mensaje: "Formato inválido. Solo minúsculas, números y guiones.", sugerencia: formData.slug ?? undefined });
            return false;
        }

        setSlugStatus(prev => ({ ...prev, isLoading: true, mensaje: null }));
        const result = await verificarSlugUnicoAction({ slug: slugParaVerificar, negocioIdActual: negocioId });
        if (result.success && result.data) {
            setSlugStatus({
                isLoading: false,
                esUnico: result.data.esUnico,
                mensaje: result.data.esUnico ? "Slug disponible!" : (result.data.sugerencia ? `Slug no disponible. Sugerencia: ${result.data.sugerencia}` : "Slug no disponible."),
                sugerencia: result.data.sugerencia
            });
            return result.data.esUnico;
        } else {
            setSlugStatus({ isLoading: false, esUnico: false, mensaje: result.error || "Error al verificar slug." });
            return false;
        }
    }, [negocioId, formData.slug]);

    useEffect(() => {
        if (isInitialSlugLoad.current && formData.slug) { // Si es carga inicial y hay un slug (autogenerado o de DB)
            // No hacer nada, se verificará al primer blur o cambio manual, o al guardar.
            // O podrías verificarlo aquí si lo prefieres, pero puede ser "ruidoso" al cargar.
            // isInitialSlugLoad.current = false; // Marcar que ya pasó la carga inicial
            return;
        }
        if (debouncedSlug && !isInitialSlugLoad.current) { // Solo verificar si no es la carga inicial del slug
            verificarSlug(debouncedSlug);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSlug, negocioId]); // No incluir verificarSlug para evitar bucles si cambia formData.slug

    const handleSlugBlur = () => {
        if (formData.slug && formData.slug.trim() !== '') {
            isInitialSlugLoad.current = false; // Ya no es carga inicial si el usuario interactuó
            verificarSlug(formData.slug.trim());
        }
    };


    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "nombre") {
            handleNombreChange(e as ChangeEvent<HTMLInputElement>);
        } else if (name === "slug") {
            handleSlugChange(e as ChangeEvent<HTMLInputElement>);
        }
        else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
        setError(null); setSuccessMessage(null);
    };

    const handleStatusToggle = () => { const newStatus = formData.status === 'activo' ? 'inactivo' : 'activo'; setFormData(prevState => ({ ...prevState, status: newStatus })); setError(null); setSuccessMessage(null); };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        setError(null); setSuccessMessage(null);

        if (!formData.nombre?.trim()) { setError("El nombre del negocio es obligatorio."); return; }
        if (!formData.slug || formData.slug.trim().length < 3) { setError("El slug es inválido o demasiado corto."); return; }

        // Re-verificar slug antes de guardar, por si acaso
        setSlugStatus(prev => ({ ...prev, isLoading: true }));
        const esSlugValidoAlGuardar = await verificarSlug(formData.slug.trim());
        if (!esSlugValidoAlGuardar) {
            // El mensaje de error ya se estableció en slugStatus por verificarSlug
            setIsSubmitting(false);
            setSlugStatus(prev => ({ ...prev, isLoading: false }));
            setError(slugStatus.mensaje || "El slug no está disponible o es inválido.");
            return;
        }
        setSlugStatus(prev => ({ ...prev, isLoading: false }));


        setIsSubmitting(true);
        try {
            // Asegurarse que el schema Zod en el cliente sea compatible con lo que espera la acción
            // Para la actualización, usamos el schema parcial, pero slug y nombre son importantes.
            const dataParaEnviar: ActualizarNegocioInput = {
                ...formData,
                nombre: formData.nombre, // Asegurar que el nombre se envíe
                slug: formData.slug,     // Enviar el slug validado y actual
            };

            const validation = NegocioFormDataSchema.partial().safeParse(dataParaEnviar); // Validar con el schema parcial
            if (!validation.success) {
                // Mapear errores de Zod a un formato más amigable o al estado de error
                const fieldErrors = validation.error.flatten().fieldErrors;
                const firstError = Object.values(fieldErrors)[0]?.[0];
                setError(`Error de validación: ${firstError || 'Revisa los campos.'}`);
                setIsSubmitting(false);
                return;
            }

            const result = await actualizarDetallesNegocio(negocioId, validation.data); // Enviar datos validados
            if (result.success && result.data) {
                setSuccessMessage("Información del negocio actualizada.");
                // Actualizar formData con los datos devueltos, especialmente el slug si fue modificado por el backend
                setFormData(prev => ({
                    ...prev,
                    ...(result.data ? result.data : {}), // result.data es NegocioDetallesParaEditar que incluye el slug final
                    slug: result.data && result.data.slug ? result.data.slug : prev.slug // Mantener slug del form si el backend no lo devuelve por alguna razón
                }));
                setSlugManualmenteEditado(true); // Considerar el slug guardado como "manual"
                isInitialSlugLoad.current = false;
                router.refresh();
            } else {
                throw new Error(result.error || "No se pudo actualizar.");
            }
        } catch (err) {
            console.error("Error actualizando negocio:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error.");
        }
        finally { setIsSubmitting(false); }
    };

    const handleAccordionToggle = (seccionKey: string) => { setOpenAccordion(prev => prev === seccionKey ? null : seccionKey); };

    if (loading) return <div className="p-6 text-center text-zinc-300 bg-zinc-900 rounded-lg"><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Información...</div>;
    // Ajuste para el mensaje de error inicial
    if (error && !formData.nombre && Object.keys(formData).length <= 2) { // Si solo tiene nombre y status (o slug) y hay error
        return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>;
    }


    const isActivo = formData.status === 'activo';
    const disableAllActions = isSubmitting || loading; // Añadir loading aquí

    return (
        <form onSubmit={handleSubmit} className={formContainerClasses}>
            <div className={`${headerPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4 bg-zinc-800 z-10 sticky top-0`}>
                <div className='flex items-center gap-3'>
                    <button type="button" onClick={handleStatusToggle} className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`} aria-pressed={isActivo} disabled={disableAllActions} title={isActivo ? 'Negocio Activo' : 'Negocio Inactivo'}> <span className="sr-only">Estado</span> <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} /> </button>
                    <div> <h1 className='text-lg font-semibold text-white'>Editar Información del Negocio</h1> </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="submit" className={primaryButtonClasses} disabled={disableAllActions || slugStatus.isLoading || slugStatus.esUnico === false}>
                        {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                        <span className="ml-1.5">Guardar Cambios</span>
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 ${formBodyPaddingClasses}`}>
                <div className="md:col-span-1 flex flex-col gap-6">
                    {/* Sección Identidad del Negocio */}
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Building size={16} /> Identidad del Negocio</h3>
                        <div className="flex flex-col items-center gap-4">
                            <NegocioImagenLogo negocioId={negocioId} initialLogoUrl={formData.logo} />
                            <div className="w-full space-y-3">
                                <div>
                                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableAllActions} maxLength={100} />
                                </div>
                                {/* NUEVO CAMPO SLUG */}
                                <div>
                                    <label htmlFor="slug" className={`${labelBaseClasses} flex items-center justify-between`}>
                                        <span>URL Amigable (Slug) <span className="text-red-500">*</span></span>
                                        {slugStatus.isLoading && <Loader2 className="animate-spin text-zinc-400" size={14} />}
                                        {slugStatus.esUnico === true && <CheckCircle className="text-green-500" size={14} />}
                                        {slugStatus.esUnico === false && slugStatus.mensaje && !slugStatus.sugerencia && <XCircle className="text-red-500" size={14} />}
                                        {slugStatus.esUnico === false && slugStatus.sugerencia && <Edit3 className="text-amber-500" size={14} />}
                                    </label>
                                    <input
                                        type="text"
                                        id="slug"
                                        name="slug"
                                        value={formData.slug || ''}
                                        onChange={handleChange}
                                        onBlur={handleSlugBlur} // Verificar al perder foco
                                        required
                                        className={`${inputBaseClasses} ${slugStatus.esUnico === false ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : (slugStatus.esUnico === true ? 'border-green-500 focus:border-green-500 focus:ring-green-500' : '')}`}
                                        disabled={disableAllActions}
                                        maxLength={150}
                                        placeholder="ejemplo-nombre-negocio"
                                    />
                                    {slugStatus.mensaje && (
                                        <p className={`mt-1 text-xs ${slugStatus.esUnico === false ? 'text-red-400' : (slugStatus.esUnico === true ? 'text-green-400' : 'text-zinc-400')}`}>
                                            {slugStatus.mensaje}
                                            {slugStatus.esUnico === false && slugStatus.sugerencia && formData.slug !== slugStatus.sugerencia && (
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 ml-1 h-auto text-xs text-blue-400 hover:text-blue-300"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, slug: slugStatus.sugerencia }));
                                                        setSlugManualmenteEditado(true); // Considerar como edición manual
                                                        verificarSlug(slugStatus.sugerencia!); // Re-verificar la sugerencia
                                                    }}
                                                >
                                                    Usar sugerencia: {slugStatus.sugerencia}
                                                </Button>
                                            )}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-zinc-500">
                                        Se usa en la URL de tu vitrina: promedia.mx/vd/<b>{formData.slug || 'tu-slug'}</b>
                                    </p>

                                    {formData.slug && slugStatus.esUnico !== false && ( // Mostrar solo si hay un slug y no está marcado como inválido/no único
                                        <div className="mt-2 flex items-center gap-2">
                                            <Link
                                                href={`/vd/${formData.slug}`} // Asumiendo que /vd/ es la ruta base de tu vitrina
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${buttonBaseClasses} bg-teal-600 hover:bg-teal-700 text-white text-xs px-2 py-1`}
                                                title={`Visitar promedia.mx/vd/${formData.slug}`}
                                            >
                                                <ExternalLink size={14} className="mr-1.5" />
                                                Visitar Vitrina
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const urlCompleta = `${window.location.origin}/vd/${formData.slug}`;
                                                    navigator.clipboard.writeText(urlCompleta)
                                                        .then(() => {
                                                            setSuccessMessage(`URL copiada: ${urlCompleta}`);
                                                            // Opcional: un estado específico para "URL copiada"
                                                        })
                                                        .catch(err => {
                                                            console.error('Error al copiar URL: ', err);
                                                            setError('No se pudo copiar la URL.');
                                                        });
                                                }}
                                                className={`${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-200 text-xs px-2 py-1`}
                                                title={`Copiar URL: promedia.mx/vd/${formData.slug}`}
                                            >
                                                <ClipboardCopy size={14} className="mr-1.5" />
                                                Copiar URL
                                            </button>
                                        </div>
                                    )}

                                </div>
                                <div>
                                    <label htmlFor="slogan" className={labelBaseClasses}>Slogan</label>
                                    <input type="text" id="slogan" name="slogan" value={formData.slogan || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} maxLength={150} placeholder="La frase clave de tu negocio..." />
                                </div>
                                <div>
                                    <label htmlFor="paginaWeb" className={labelBaseClasses}>Página Web</label>
                                    <input type="url" id="paginaWeb" name="paginaWeb" value={formData.paginaWeb || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ... (resto de las secciones: Información de Contacto, Redes Sociales sin cambios en su estructura interna) ... */}
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Phone size={16} /> Información de Contacto</h3>
                        <div className="space-y-3">
                            <div><label htmlFor="telefonoLlamadas" className={labelBaseClasses}>Teléfono (Llamadas)</label><input type="tel" id="telefonoLlamadas" name="telefonoLlamadas" value={formData.telefonoLlamadas || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="telefonoWhatsapp" className={labelBaseClasses}>Teléfono (WhatsApp)</label><input type="tel" id="telefonoWhatsapp" name="telefonoWhatsapp" value={formData.telefonoWhatsapp || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="email" className={labelBaseClasses}>Email Principal</label><input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} /></div>
                            <div><label htmlFor="direccion" className={labelBaseClasses}>Dirección Física</label><textarea id="direccion" name="direccion" value={formData.direccion || ''} onChange={handleChange} className={`${inputBaseClasses} min-h-[60px]`} disabled={disableAllActions} rows={2} /></div>
                            <div><label htmlFor="googleMaps" className={labelBaseClasses}>Enlace Google Maps</label><input type="url" id="googleMaps" name="googleMaps" value={formData.googleMaps || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="https://..." /></div>
                        </div>
                    </div>
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><LinkIcon size={16} /> Redes Sociales</h3>
                        {negocioId && <NegocioRedes negocioId={negocioId} />}
                    </div>
                </div>

                <div className="md:col-span-1 flex flex-col gap-6">
                    <div className={sectionContainerClasses}>
                        <h3 className={sectionTitleClasses}><Info size={16} /> Descripción General</h3>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción Principal / Resumen Ejecutivo</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[calc(100vh-380px)]`} disabled={disableAllActions} rows={12} placeholder="Describe tu negocio, misión, visión, valores, historia..." /> {/* Ajustado min-h */}
                    </div>
                </div>

                <div className="md:col-span-1 flex flex-col gap-4">
                    <AccordionItem title="Políticas (Devolución, etc.)" icon={FileText} isOpen={openAccordion === 'politicas'} onToggle={() => handleAccordionToggle('politicas')}>
                        <textarea id="politicas" name="politicas" value={formData.politicas || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Detalla tus políticas..." />
                    </AccordionItem>
                    <AccordionItem title="Aviso de Privacidad" icon={ShieldCheck} isOpen={openAccordion === 'avisoPrivacidad'} onToggle={() => handleAccordionToggle('avisoPrivacidad')}>
                        <textarea id="avisoPrivacidad" name="avisoPrivacidad" value={formData.avisoPrivacidad || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={6} placeholder="Incluye tu aviso de privacidad..." />
                    </AccordionItem>
                    <AccordionItem title="Garantías" icon={Scale} isOpen={openAccordion === 'garantias'} onToggle={() => handleAccordionToggle('garantias')}>
                        <textarea id="garantias" name="garantias" value={formData.garantias || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableAllActions} rows={4} placeholder="Describe las garantías ofrecidas..." />
                    </AccordionItem>
                </div>

                <div className="md:col-span-3 pt-5 space-y-3 border-t border-zinc-600 mt-2">
                    {error && (<p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center justify-center gap-2"> <AlertCircle size={16} /> {error} </p>)}
                    {successMessage && (<p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm"> {successMessage} </p>)}
                </div>
            </div>
        </form>
    );
}

