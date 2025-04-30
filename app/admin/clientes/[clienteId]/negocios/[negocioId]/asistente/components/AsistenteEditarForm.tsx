'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta rutas si es necesario
import {
    obtenerAsistenteVirtualPorId,
    actualizarAsistenteVirtual,
    eliminarAsistenteVirtual,
    obtenerNegociosParaDropdown
} from '@/app/admin/_lib/asistenteVirtual.actions';
// Usar la nueva acción simplificada para el dropdown
// Importar tipos (asumiendo que están en @/app/admin/_lib/types)
import { AsistenteVirtual, Negocio, Cliente } from '@/app/admin/_lib/types';
import { Loader2, Trash2, UserCircle, Camera, Save } from 'lucide-react';

import Image from 'next/image';

interface Props {
    asistenteId: string;
    negocioId?: string; // Opcional, si se necesita para otras acciones
    clienteId?: string; // Opcional, si se necesita para otras acciones
}

// Tipo para el estado del formulario (igual que antes)
type AsistenteEditFormData = Partial<Omit<AsistenteVirtual, 'id' | 'createdAt' | 'updatedAt' | 'origen' | 'contratoId' | 'negocioId' | 'negocio' | 'AsistenteTareaSuscripcion' | 'TareaEjecutada' | 'Conversacion' | 'FacturaItem'>> & {
    negocioId?: string | null; // negocioId se maneja por separado
};

// Tipo simplificado para la lista de negocios del dropdown
type NegocioParaDropdown = Pick<Negocio, 'id' | 'nombre'> & {
    cliente?: Pick<Cliente, 'id' | 'nombre'> | null; // Incluir cliente opcionalmente
};


export default function AsistenteEditarForm({ asistenteId, negocioId, clienteId }: Props) {
    const router = useRouter();

    // Usar AsistenteVirtual completo para el original, permite mostrar datos no editables
    const [asistenteOriginal, setAsistenteOriginal] = useState<AsistenteVirtual | null>(null);
    const [formData, setFormData] = useState<AsistenteEditFormData>({});
    // Usar el tipo simplificado para el estado del dropdown
    const [negocios, setNegocios] = useState<NegocioParaDropdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingNegocios, setLoadingNegocios] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [editingImagen, setEditingImagen] = useState(false);
    const inputImagenRef = useRef<HTMLInputElement>(null);

    // Clases de Tailwind reutilizables (igual que antes)
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClasses = "w-full text-white font-bold px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px] text-sm";
    const sectionTitleClasses = "text-base font-semibold text-zinc-200 border-b border-zinc-600 pb-1 mb-3";
    const avatarContainerSize = "w-48 h-48 sm:w-56 sm:h-56";
    const avatarIconSize = "w-32 h-32 sm:w-40 sm:w-40";
    const cameraIconSize = "w-10 h-10 sm:w-12 sm:h-12";

    // --- Efecto para cargar datos del Asistente ---
    useEffect(() => {
        if (!asistenteId) { setError("No se proporcionó un ID de asistente."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        const fetchAsistente = async () => {
            try {
                // Usar la acción que trae los datos necesarios
                const data = await obtenerAsistenteVirtualPorId(asistenteId);
                if (data) {
                    setAsistenteOriginal(data); // Guardar el objeto completo original

                    // Poblar formData solo con los campos editables
                    // Excluir relaciones complejas y campos no editables
                    const {
                        ...editableData // Resto de los campos escalares
                    } = data;

                    setFormData({
                        ...editableData, // Campos escalares editables
                        negocioId: data.negocioId // Establecer negocioId por separado
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

    // --- Efecto para cargar Negocios (Simplificado) ---
    useEffect(() => {
        setLoadingNegocios(true);
        // Usar la nueva acción simplificada
        obtenerNegociosParaDropdown()
            .then(data => {
                // El tipo devuelto por la acción ya debería ser correcto
                setNegocios(data || []);
            })
            .catch(err => {
                console.error("Error fetching negocios:", err);
                setError(prev => prev ? `${prev} | Error cargando negocios.` : "Error al cargar lista de negocios.");
            })
            .finally(() => {
                setLoadingNegocios(false);
            });
    }, []); // Ejecutar solo al montar

    // --- Efecto para enfocar input de imagen (sin cambios) ---
    useEffect(() => {
        if (editingImagen && inputImagenRef.current) {
            inputImagenRef.current.focus();
            inputImagenRef.current.select();
        }
    }, [editingImagen]);

    // --- Manejadores (handleChange, handleCancel, handleDelete sin cambios funcionales) ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`); // O a la lista del negocio
    };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro? Eliminar asistente no se puede deshacer.")) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            await eliminarAsistenteVirtual(asistenteId);
            setSuccessMessage("Asistente eliminado.");
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`); // O a la lista del negocio
        } catch (err) {
            console.error("Error deleting asistente:", err);
            setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setIsSubmitting(false); }
    };

    // --- Manejador de envío (Ajustado) ---
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre?.trim()) { setError("El nombre es obligatorio."); return; }
        if (formData.version !== null && formData.version !== undefined && formData.version <= 0) {
            setError("La versión debe ser un número positivo."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            if (!asistenteOriginal?.id) {
                throw new Error("El ID del asistente es obligatorio.");
            }

            await actualizarAsistenteVirtual(asistenteId, {
                ...asistenteOriginal,
                ...formData,
                id: asistenteOriginal.id, // Aseguramos que `id` sea un string válido
                version: formData.version ?? asistenteOriginal.version ?? 0,
                status: formData.status ?? asistenteOriginal.status ?? 'inactivo',
                negocioId: formData.negocioId ?? null,
            });

            setSuccessMessage("Asistente actualizado exitosamente.");
            router.refresh();

        } catch (err) {
            console.error("Error updating asistente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };


    // --- Renderizado ---
    if (loading) { return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando...</p></div>; }
    if (error && !asistenteOriginal) { return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>; }
    if (!asistenteOriginal) { return <div className={containerClasses}><p className="text-center text-zinc-400">Asistente no encontrado.</p></div>; }

    return (
        <div className={`${containerClasses}`}>
            {/* Cabecera */}
            <div className='border-b border-zinc-700 pb-3 mb-6 flex flex-col sm:flex-row items-start justify-between gap-4'>
                <div>
                    <h2 className="text-xl font-semibold text-white leading-tight">Editar Asistente Virtual</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {asistenteId}</p>
                    {/* Mostrar negocio actual si existe */}
                    {asistenteOriginal.negocio && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Negocio: <span className='font-medium text-zinc-300'>{asistenteOriginal.negocio.nombre}</span>
                            {asistenteOriginal.negocio.cliente && ` (${asistenteOriginal.negocio.cliente.nombre})`}
                        </p>
                    )}
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

            {/* Formulario con Grid */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" noValidate>

                {/* Columna 1 */}
                <div className="space-y-4">
                    {/* Campo Imagen Avatar */}
                    <div className="flex flex-col items-center gap-4">
                        <label htmlFor="urlImagen" className={`${labelBaseClasses} text-center`}>Imagen Avatar</label>
                        <div className="relative">
                            <button type="button" onClick={() => setEditingImagen(true)} className={`${avatarContainerSize} rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer relative group border-2 border-zinc-600 hover:border-blue-500 transition-all`} title="Clic para editar URL de imagen">
                                {formData.urlImagen ? (
                                    <Image src={formData.urlImagen} alt="Avatar" className="w-full h-full object-cover" width={224} height={224} onError={() => { const placeholder = inputImagenRef.current?.nextElementSibling; if (placeholder) (placeholder as HTMLElement).style.display = 'flex'; }} />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${formData.urlImagen ? 'hidden' : 'flex'}`} style={{ display: formData.urlImagen ? 'none' : 'flex' }}> <UserCircle className={`text-zinc-500 ${avatarIconSize}`} /> </div>
                                {!editingImagen && (<div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"><Camera className={`text-white ${cameraIconSize}`} /></div>)}
                            </button>
                            {editingImagen && (
                                <div className="mt-3 w-full max-w-sm mx-auto">
                                    <label htmlFor="urlImagenInput" className={`${labelBaseClasses} mb-1 text-center`}>URL de la Imagen</label>
                                    <input ref={inputImagenRef} type="url" id="urlImagenInput" name="urlImagen" value={formData.urlImagen || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." autoFocus onBlur={() => setTimeout(() => setEditingImagen(false), 150)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditingImagen(false); } }} />
                                    <p className="text-xs text-zinc-500 mt-1 text-center">Pega la URL y presiona Enter o clic fuera.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nombre y Versión */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                            <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                        </div>
                        <div>
                            <label htmlFor="version" className={labelBaseClasses}>Versión</label>
                            {/* Asegurar que el value sea string para el input, o '' si es null */}
                            <input type="number" id="version" name="version" value={formData.version ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.1" min="0.1" />
                        </div>
                    </div>

                    {/* Negocio y Descripción */}
                    <div>
                        <label htmlFor="negocioId" className={labelBaseClasses}>Negocio Asociado</label>
                        <select id="negocioId" name="negocioId" value={formData.negocioId || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting || loadingNegocios}>
                            <option value="">{loadingNegocios ? 'Cargando...' : '-- Ninguno --'}</option>
                            {/* Mapear sobre el estado simplificado 'negocios' */}
                            {negocios.map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.nombre}
                                    {/* Acceder a cliente.nombre directamente */}
                                    {n.cliente?.nombre && ` (${n.cliente.nombre})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} />
                    </div>

                    {/* Fechas solo lectura */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div><label className={labelBaseClasses}>Fecha Creación</label><div className={valueDisplayClasses}>{asistenteOriginal?.createdAt ? new Date(asistenteOriginal.createdAt).toLocaleDateString() : 'N/A'}</div></div>
                        <div><label className={labelBaseClasses}>Última Actualización</label><div className={valueDisplayClasses}>{asistenteOriginal?.updatedAt ? new Date(asistenteOriginal.updatedAt).toLocaleString() : 'N/A'}</div></div>
                    </div>
                </div>

                {/* Columna 2 (sin cambios estructurales) */}
                <div className="space-y-4">
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700"><h3 className={sectionTitleClasses}>Configuración WhatsApp</h3><div><label htmlFor="whatsappBusiness" className={labelBaseClasses}>Teléfono WhatsApp Business</label><input type="tel" id="whatsappBusiness" name="whatsappBusiness" value={formData.whatsappBusiness || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="" /></div><div><label htmlFor="phoneNumberId" className={labelBaseClasses}>Phone Number ID (WhatsApp API)</label><input type="text" id="phoneNumberId" name="phoneNumberId" value={formData.phoneNumberId || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div><div><label htmlFor="token" className={labelBaseClasses}>Token (WhatsApp API)</label><input type="password" id="token" name="token" value={formData.token || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="••••••••" /></div></div>
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700"><h3 className={sectionTitleClasses}>Configuración HITL</h3><div><label htmlFor="nombreHITL" className={labelBaseClasses}>Nombre Contacto HITL</label><input type="text" id="nombreHITL" name="nombreHITL" value={formData.nombreHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div><div><label htmlFor="whatsappHITL" className={labelBaseClasses}>WhatsApp Contacto HITL</label><input type="tel" id="whatsappHITL" name="whatsappHITL" value={formData.whatsappHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="" /></div><div><label htmlFor="emailHITL" className={labelBaseClasses}>Email Contacto HITL</label><input type="email" id="emailHITL" name="emailHITL" value={formData.emailHITL || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div></div>
                    <div className="space-y-3 p-3 bg-zinc-900/30 rounded-md border border-zinc-700"><h3 className={sectionTitleClasses}>Configuración Calendario</h3><div><label htmlFor="emailCalendario" className={labelBaseClasses}>Email para Agendar Citas</label><input type="email" id="emailCalendario" name="emailCalendario" value={formData.emailCalendario || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div></div>
                </div>

                {/* Botones */}
                <div className="md:col-span-2 pt-5 space-y-2 border-t border-zinc-700 mt-4">

                    {/* Mensajes Globales */}
                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                    {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading || loadingNegocios}> {/* Deshabilitar si carga negocios */}
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>Cancelar</button>
                    <div className="flex justify-center pt-2"><button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}><span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Asistente</span></button></div>
                </div>
            </form>
        </div>
    );
}
