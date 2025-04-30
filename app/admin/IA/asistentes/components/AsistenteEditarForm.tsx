'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react'; // Añadido useRef
import { useRouter } from 'next/navigation';
// Ajusta rutas si es necesario
import {
    obtenerAsistenteVirtualPorId,
    actualizarAsistenteVirtual,
    eliminarAsistenteVirtual
} from '@/app/admin/_lib/asistenteVirtual.actions';
import { obtenerNegocios } from '@/app/admin/_lib/negocio.actions'; // Corregida ruta
import { AsistenteVirtual, Negocio } from '@/app/admin/_lib/types';
import { Loader2, Trash2, UserCircle, Camera } from 'lucide-react'; // Iconos (añadido UserCircle, Camera)
// import Link from 'next/link'; // Mantenido por si se usa en imagen

interface Props {
    asistenteId: string;
}

// Tipo para el estado del formulario (excluyendo campos eliminados y no editables)
type AsistenteEditFormData = Partial<Omit<AsistenteVirtual, 'id' | 'createdAt' | 'updatedAt' | 'origen' | 'contratoId' | 'negocioId'>> & {
    negocioId?: string | null;
};

export default function AsistenteEditarForm({ asistenteId }: Props) {
    const router = useRouter();

    const [asistenteOriginal, setAsistenteOriginal] = useState<AsistenteVirtual | null>(null);
    const [formData, setFormData] = useState<AsistenteEditFormData>({});
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingNegocios, setLoadingNegocios] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Estado para controlar la edición de la URL de la imagen
    const [editingImagen, setEditingImagen] = useState(false);
    const inputImagenRef = useRef<HTMLInputElement>(null); // Ref para el input de imagen

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"; // Quitado font-mono text-xs por defecto
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const containerClasses = "p-4 mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px] text-sm";
    const sectionTitleClasses = "text-base font-semibold text-zinc-200 border-b border-zinc-600 pb-1 mb-3";

    // --- Efecto para cargar datos del Asistente ---
    useEffect(() => {
        if (!asistenteId) {
            setError("No se proporcionó un ID de asistente."); setLoading(false); return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);
        const fetchAsistente = async () => {
            try {
                const data = await obtenerAsistenteVirtualPorId(asistenteId);
                if (data) {
                    setAsistenteOriginal(data);
                    // Poblar formData con campos editables (excluyendo los eliminados)
                    const { ...editableData } = data;
                    setFormData({
                        ...editableData
                    });
                } else {
                    setError(`No se encontró el asistente con ID: ${asistenteId}`);
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
        setLoadingNegocios(true);
        obtenerNegocios()
            .then(data => setNegocios(data))
            .catch(err => console.error("Error fetching negocios:", err))
            .finally(() => setLoadingNegocios(false));
    }, []);

    // --- Efecto para enfocar input de imagen ---
    useEffect(() => {
        if (editingImagen && inputImagenRef.current) {
            inputImagenRef.current.focus();
            inputImagenRef.current.select(); // Seleccionar texto existente
        }
    }, [editingImagen]);

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

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre?.trim()) { setError("El nombre es obligatorio."); return; }
        if (typeof formData.version === 'number' && formData.version <= 0) { setError("La versión debe ser positiva."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir dataToSend excluyendo origen y contratoId
            const dataToSend: Partial<AsistenteVirtual> = { // Enviar solo los campos modificables + id
                id: asistenteId, // ID es necesario para la acción de actualizar
                nombre: formData.nombre?.trim(),
                descripcion: formData.descripcion?.trim() || null,
                negocioId: formData.negocioId || null,
                urlImagen: formData.urlImagen || null,
                whatsappBusiness: formData.whatsappBusiness || null,
                phoneNumberId: formData.phoneNumberId || null,
                token: formData.token || null,
                nombreHITL: formData.nombreHITL || null,
                whatsappHITL: formData.whatsappHITL || null,
                emailHITL: formData.emailHITL || null,
                emailCalendario: formData.emailCalendario || null,
                version: formData.version ? Number(formData.version) : undefined,
                status: formData.status || 'inactivo',
                // origen y contratoId se omiten
            };

            // La acción actualizarAsistenteVirtual debe poder manejar un objeto parcial
            // o debes construir el objeto completo como antes, pero omitiendo los campos eliminados.
            // Ajustando para enviar solo lo necesario (requiere que la acción maneje Partial<...> o que se construya completo)
            const asistenteActualizado = await actualizarAsistenteVirtual(dataToSend as AsistenteVirtual); // Castear si la acción espera el tipo completo
            setSuccessMessage("Asistente actualizado correctamente.");
            // Actualizar estado original local con la respuesta del backend
            setAsistenteOriginal(asistenteActualizado);
            // Actualizar formData también para reflejar la posible limpieza de datos del backend
            const { ...editableData } = asistenteActualizado;
            setFormData(editableData);


        } catch (err) {
            console.error("Error updating asistente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => { router.back(); };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que deseas eliminar este asistente? Esta acción no se puede deshacer.")) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            await eliminarAsistenteVirtual(asistenteId);
            setSuccessMessage("Asistente eliminado correctamente.");
            router.push('/admin/IA/asistentes'); // Redirigir a la lista de asistentes
        } catch (err) {
            console.error("Error deleting asistente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al eliminar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    // --- Renderizado ---
    if (loading) { /* ... loading ... */ }
    if (error && !asistenteOriginal) { /* ... error ... */ }
    if (!asistenteOriginal) { /* ... not found ... */ }

    return (
        <div className={`${containerClasses} max-w-4xl`}>
            {/* Cabecera */}
            <div className='border-b border-zinc-700 pb-3 mb-6 flex flex-col sm:flex-row items-start justify-between gap-4'>
                {/* ... (contenido cabecera sin cambios) ... */}
                <div>
                    <h2 className="text-xl font-semibold text-white leading-tight">Editar Asistente Virtual</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {asistenteId}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                    <span className={`${labelBaseClasses} mb-0`}>Status:</span>
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ml-3 text-sm font-medium text-zinc-300">{formData.status === 'activo' ? 'Activo' : 'Inactivo'}</span>
                    </label>
                </div>
            </div>

            {/* Mensajes Globales */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario con Grid de 2 columnas */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" noValidate>

                {/* Columna 1 */}
                <div className="space-y-4">
                    {/* Campo Imagen Avatar (Modificado) */}
                    <div>
                        <label htmlFor="urlImagen" className={labelBaseClasses}>Imagen Avatar</label>
                        <div className="flex items-center gap-4">
                            {/* Círculo clickeable */}
                            <button
                                type="button"
                                onClick={() => setEditingImagen(true)}
                                className="w-16 h-16 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                                title="Clic para editar URL de imagen"
                            >
                                {formData.urlImagen ? (
                                    <img src={formData.urlImagen} alt="Avatar" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} /> // Ocultar si la imagen no carga
                                ) : (
                                    <UserCircle className="text-zinc-500 w-10 h-10" />
                                )}
                                {/* Icono de cámara al hacer hover */}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="text-white w-6 h-6" />
                                </div>
                            </button>
                            {/* Input que aparece al editar */}
                            {editingImagen ? (
                                <div className="flex-1">
                                    <input
                                        ref={inputImagenRef} // Ref para autoFocus
                                        type="url"
                                        id="urlImagen"
                                        name="urlImagen"
                                        value={formData.urlImagen || ''}
                                        onChange={handleChange}
                                        className={inputBaseClasses}
                                        disabled={isSubmitting}
                                        placeholder="https://..."
                                        autoFocus
                                        onBlur={() => setTimeout(() => setEditingImagen(false), 150)} // Timeout para permitir click en hipotético botón "Guardar URL"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingImagen(false); } }} // Ocultar con Enter
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Pega la URL de la imagen aquí.</p>
                                </div>
                            ) : (
                                // Mostrar URL actual si no se está editando (opcional)
                                formData.urlImagen && (
                                    <p className="text-xs text-zinc-400 truncate flex-1 self-center" title={formData.urlImagen}>
                                        {formData.urlImagen}
                                    </p>
                                )
                            )}
                        </div>
                    </div>

                    {/* Nombre y Versión (Layout preservado) */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                            <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                        </div>
                        <div>
                            <label htmlFor="version" className={labelBaseClasses}>Versión</label>
                            <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.1" min="0.1" />
                        </div>
                    </div>

                    {/* Negocio y Descripción */}
                    <div>
                        <label htmlFor="negocioId" className={labelBaseClasses}>Negocio Asociado</label>
                        <select id="negocioId" name="negocioId" value={formData.negocioId || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting || loadingNegocios}>
                            <option value="">{loadingNegocios ? 'Cargando...' : '-- Ninguno --'}</option>
                            {negocios.map(n => <option key={n.id ?? ''} value={n.id ?? ''}>
                                {n.nombre}
                                {n.cliente?.nombre && ` (${n.cliente.nombre})`}
                            </option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} />
                    </div>

                    {/* Campos OMITIDOS: origen, contratoId */}

                    {/* Fechas solo lectura */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className={labelBaseClasses}>Fecha Creación</label>
                            <div className={valueDisplayClasses}>{asistenteOriginal?.createdAt ? new Date(asistenteOriginal.createdAt).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <div>
                            <label className={labelBaseClasses}>Última Actualización</label>
                            <div className={valueDisplayClasses}>{asistenteOriginal?.updatedAt ? new Date(asistenteOriginal.updatedAt).toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {/* Columna 2 (sin cambios estructurales) */}
                <div className="space-y-4">
                    {/* Sección WhatsApp */}
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700">
                        {/* ... (contenido WhatsApp sin cambios) ... */}
                        <h3 className={sectionTitleClasses}>Configuración WhatsApp</h3>
                        <div>
                            <label htmlFor="whatsappBusiness" className={labelBaseClasses}>Teléfono WhatsApp Business</label>
                            <input type="tel" id="whatsappBusiness" name="whatsappBusiness" value={formData.whatsappBusiness || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="" />
                        </div>
                        <div>
                            <label htmlFor="phoneNumberId" className={labelBaseClasses}>Phone Number ID (WhatsApp API)</label>
                            <input type="text" id="phoneNumberId" name="phoneNumberId" value={formData.phoneNumberId || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                        </div>
                        <div>
                            <label htmlFor="token" className={labelBaseClasses}>Token (WhatsApp API)</label>
                            <input type="password" id="token" name="token" value={formData.token || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="" />
                        </div>
                    </div>
                    {/* Sección HITL */}
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700">
                        {/* ... (contenido HITL sin cambios) ... */}
                        <h3 className={sectionTitleClasses}>Configuración HITL</h3>
                        <div>
                            <label htmlFor="nombreHITL" className={labelBaseClasses}>Nombre Contacto HITL</label>
                            <input type="text" id="nombreHITL" name="nombreHITL" value={formData.nombreHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                        </div>
                        <div>
                            <label htmlFor="whatsappHITL" className={labelBaseClasses}>WhatsApp Contacto HITL</label>
                            <input type="tel" id="whatsappHITL" name="whatsappHITL" value={formData.whatsappHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="" />
                        </div>
                        <div>
                            <label htmlFor="emailHITL" className={labelBaseClasses}>Email Contacto HITL</label>
                            <input type="email" id="emailHITL" name="emailHITL" value={formData.emailHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                        </div>
                    </div>
                    {/* Sección Calendario */}
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700">
                        {/* ... (contenido Calendario sin cambios) ... */}
                        <h3 className={sectionTitleClasses}>Configuración Calendario</h3>
                        <div>
                            <label htmlFor="emailCalendario" className={labelBaseClasses}>Email para Agendar Citas</label>
                            <input type="email" id="emailCalendario" name="emailCalendario" value={formData.emailCalendario || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                        </div>
                    </div>
                </div>

                {/* Botones (abarcan ambas columnas) */}
                <div className="md:col-span-2 pt-5 space-y-2 border-t border-zinc-700 mt-4">
                    {/* ... (botones sin cambios) ... */}
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting && !error ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : 'Guardar Cambios'}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <div className="flex justify-center pt-2">
                        <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Asistente</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
