'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// --- Actions and Types ---
import {
    obtenerGaleriaPorId, // <-- Nueva acción
    actualizarGaleriaNegocio,
    eliminarGaleriaNegocio,
    UpsertGaleriaNegocioInput // <-- Tipo para el formulario
} from '@/app/admin/_lib/galeriaNegocio.actions'; // Ajusta la ruta
// --- Icons ---
import { Loader2, Save, Trash2, AlertCircle } from 'lucide-react';

interface Props {
    galeriaId: string;
    negocioId: string; // Necesario para navegación/revalidación
    clienteId?: string; // Opcional para navegación
}

// Tipo para el estado del formulario local
type GaleriaEditFormData = UpsertGaleriaNegocioInput;

export default function GaleriaEditarForm({ galeriaId, negocioId, clienteId }: Props) {

    const router = useRouter();
    const [formData, setFormData] = useState<GaleriaEditFormData>();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Clases Tailwind ---
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md border border-zinc-700"; // Contenedor principal
    const headerPaddingClasses = "p-3 md:p-4";
    const formPaddingClasses = "p-4 md:p-6";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[90px]`;
    // const selectClasses = `${inputBaseClasses} appearance-none`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;
    const dangerButtonClasses = `${buttonBaseClasses} text-red-500 hover:bg-red-900/30 focus:ring-red-500 border border-transparent hover:border-red-600/50`;
    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full"; // Sin transición

    // --- Carga de Datos ---
    const loadGaleria = useCallback(async () => {
        if (!galeriaId) { setError("ID de galería no válido."); setLoading(false); return; }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const galeriaData = await obtenerGaleriaPorId(galeriaId);
            if (!galeriaData) throw new Error("Galería no encontrada.");
            // Poblar formData con los datos existentes
            setFormData({
                nombre: galeriaData.nombre || '',
                descripcion: galeriaData.descripcion || '',
                status: galeriaData.status || 'inactivo',
            });
        } catch (err) {
            console.error("Error al cargar galería:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos.");
            setFormData({ nombre: '', descripcion: '', status: 'inactivo' }); // Resetear formData
        } finally { setLoading(false); }
    }, [galeriaId]);

    useEffect(() => { loadGaleria(); }, [loadGaleria]);

    // --- Limpiar mensaje de éxito ---
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    // --- Handlers ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        } as GaleriaEditFormData));
        setError(null); setSuccessMessage(null);
    };

    const handleStatusToggle = () => {
        const newStatus = formData?.status === 'activo' ? 'inactivo' : 'activo';
        setFormData(prevState => ({
            ...prevState,
            status: newStatus,
            nombre: prevState?.nombre || '', // Ensure 'nombre' is always defined
        }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!formData?.nombre?.trim()) { setError("El nombre es obligatorio."); return; }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Preparar datos para la acción
            const dataToSave: UpsertGaleriaNegocioInput = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                status: formData.status === 'activo' ? 'activo' : 'inactivo',
            };
            const result = await actualizarGaleriaNegocio(galeriaId, dataToSave);
            if (result.success) {
                setSuccessMessage("Galería actualizada exitosamente.");
                // Opcional: actualizar formData con data retornada si es necesario
                // if(result.data) setFormData({...formData, ...result.data});
                router.refresh(); // Refrescar datos del servidor
            } else { throw new Error(result.error || "No se pudo actualizar la galería."); }
        } catch (err) { console.error("Error actualizando galería:", err); setError(err instanceof Error ? err.message : "Ocurrió un error."); }
        finally { setIsSubmitting(false); }
    };

    const handleCancel = () => {
        // Volver a la página de edición del negocio
        const backUrl = `/admin/clientes/${clienteId}/negocios/${negocioId}`
        router.push(backUrl); // O usar router.back() si viene siempre de ahí
    };

    const handleDelete = async () => {
        if (!formData || !confirm(`¿Eliminar permanentemente la galería "${formData.nombre || 'esta galería'}" y TODAS sus imágenes? Esta acción no se puede deshacer.`)) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            const result = await eliminarGaleriaNegocio(galeriaId);
            if (result.success) {
                setSuccessMessage("Galería eliminada.");
                // Redirigir a la página de edición del negocio
                setTimeout(() => {
                    const backUrl = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}/editar` : `/admin/negocios/${negocioId}/editar`;
                    router.push(backUrl);
                }, 1500);
            } else { throw new Error(result.error || "No se pudo eliminar la galería."); }
        } catch (err) { console.error("Error al eliminar galería:", err); setError(err instanceof Error ? err.message : "Ocurrió un error inesperado."); setIsSubmitting(false); }
    };

    // --- Renderizado ---
    if (loading) return <div className={`${containerClasses} ${formPaddingClasses} text-center bg-zinc-900`}><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Galería...</div>;
    if (error && (!formData || !formData.nombre)) return <div className={`${containerClasses} ${formPaddingClasses} border-red-500 bg-red-900/20 text-center text-red-400`}>{error}</div>;
    if (!loading && !formData?.nombre) return <div className={`${containerClasses} ${formPaddingClasses} text-center text-zinc-400`}>Galería no encontrada o error al cargar.</div>;

    const isActivo = formData?.status === 'activo';
    const disableActions = isSubmitting;

    return (
        <div className={containerClasses}>
            {/* Cabecera con Switch, Título y Botones */}
            <div className={`${headerPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4 sticky top-0 bg-zinc-800 z-10`}>
                <div className='flex items-center gap-3'>
                    <button type="button" onClick={handleStatusToggle} className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`} aria-pressed={isActivo} disabled={disableActions} title={isActivo ? 'Galería Activa' : 'Galería Inactiva'}>
                        <span className="sr-only">Estado</span>
                        <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <div> <h1 className='text-lg font-semibold text-white'>Editar Galería</h1> <p className='text-xs text-zinc-400 mt-0.5'>ID: {galeriaId}</p> </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={handleDelete} className={`${dangerButtonClasses} px-2`} disabled={disableActions} title="Eliminar Galería (y sus imágenes)"> <Trash2 size={14} /> </button>
                    <button type="button" onClick={handleCancel} className={secondaryButtonClasses} disabled={disableActions}> Cerrar ventana </button>
                    <button type="button" onClick={() => handleSubmit()} className={primaryButtonClasses} disabled={disableActions || loading}> {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} <span className="ml-1.5">Guardar Cambios</span> </button>
                </div>
            </div>

            {/* Cuerpo del Formulario */}
            <div className={`${formPaddingClasses} space-y-4`}>
                {/* Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}> Nombre Galería <span className="text-red-500">*</span> </label>
                    <input type="text" id="nombre" name="nombre" value={formData?.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableActions} maxLength={100} />
                </div>

                {/* Descripción */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}> Descripción (Opcional) </label>
                    <textarea id="descripcion" name="descripcion" value={formData?.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={disableActions} rows={4} maxLength={250} placeholder="Describe el contenido de esta galería..." />
                </div>

                {/* Mensajes de Feedback */}
                <div className="pt-2 space-y-2">
                    {error && (<p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center gap-2"> <AlertCircle size={16} /> {error} </p>)}
                    {successMessage && (<p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm"> {successMessage} </p>)}
                </div>
            </div>
        </div>
    );
}
