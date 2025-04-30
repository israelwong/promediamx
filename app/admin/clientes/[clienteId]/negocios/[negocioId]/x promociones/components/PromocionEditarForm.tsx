'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import {
    obtenerPromocionPorId,
    actualizarPromocion,
    eliminarPromocion
} from '@/app/admin/_lib/promocion.actions'; // Asegúrate que la acción y ruta sean correctas
import { Promocion } from '@/app/admin/_lib/types'; // Importar tipo Promocion
import { Loader2, Trash2, Save } from 'lucide-react'; // Iconos

interface Props {
    promocionId: string;
}

// Tipo para los datos editables en este formulario
type PromocionEditFormData = Partial<Pick<Promocion, 'nombre' | 'descripcion' | 'status'>> & {
    fechaInicio?: string;
    fechaFin?: string;
};

// Helper para formatear Date a YYYY-MM-DD
const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        // Si ya es string en formato correcto, devolverlo
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        // Convertir Date a YYYY-MM-DD
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        // Manejar posible fecha inválida
        if (isNaN(year) || isNaN(parseInt(month)) || isNaN(parseInt(day))) return '';
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return '';
    }
};

export default function PromocionEditarForm({ promocionId }: Props) {
    const router = useRouter();

    const [promocionOriginal, setPromocionOriginal] = useState<Promocion | null>(null);
    const [formData, setFormData] = useState<PromocionEditFormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Para guardar o eliminar
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [negocioIdContext, setNegocioIdContext] = useState<string | null>(null); // Para volver a la lista del negocio

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // --- Efecto para cargar datos ---
    useEffect(() => {
        if (!promocionId) {
            setError("No se proporcionó un ID de promoción."); setLoading(false); return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);

        const fetchDatos = async () => {
            try {
                const data = await obtenerPromocionPorId(promocionId);
                if (data) {
                    setPromocionOriginal(data);
                    console.log("Promoción original:", data);
                    setNegocioIdContext(data.negocioId); // Guardar el ID del negocio para navegación
                    // Poblar formData con campos editables
                    setFormData({
                        nombre: data.nombre || '',
                        descripcion: data.descripcion || '',
                        fechaInicio: formatDateForInput(data.fechaInicio) || '',
                        fechaFin: formatDateForInput(data.fechaFin) || '',
                        status: data.status ?? 'inactivo',
                    });
                } else {
                    setError(`No se encontró la promoción con ID: ${promocionId}`);
                    setPromocionOriginal(null); setFormData({}); setNegocioIdContext(null);
                }
            } catch (err) {
                console.error("Error al obtener la promoción:", err);
                setError("No se pudo cargar la promoción.");
                setPromocionOriginal(null); setFormData({}); setNegocioIdContext(null);
            } finally { setLoading(false); }
        };
        fetchDatos();
    }, [promocionId]);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación
        if (!formData.nombre?.trim() || !formData.fechaInicio || !formData.fechaFin || !formData.status) {
            setError("Nombre, Fechas y Status son obligatorios."); return;
        }
        if (new Date(formData.fechaFin) < new Date(formData.fechaInicio)) {
            setError("La fecha de fin no puede ser anterior a la fecha de inicio."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto solo con los datos editables
            const dataToSend: Partial<Promocion> = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(formData.fechaFin),
                status: formData.status,
            };
            await actualizarPromocion(promocionId, dataToSend);
            setSuccessMessage("Promoción actualizada correctamente.");
            // Actualizar estado original local (opcional)
            setPromocionOriginal(prev => prev ? { ...prev, ...dataToSend } : null);
        } catch (err) {
            console.error("Error updating promocion:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => { router.back(); };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro? Eliminar esta promoción no se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await eliminarPromocion(promocionId);
                setSuccessMessage("Promoción eliminada.");

                setTimeout(() => {
                    if (negocioIdContext) {
                        router.back(); // O simplemente volver atrás
                    } else {
                        router.back(); // Fallback
                    }
                }, 1500);

            } catch (err) {
                console.error("Error deleting promocion:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al eliminar: ${errorMessage}`);
                setIsSubmitting(false); // Reactivar botones si hay error
            }
        }
    };

    // --- Renderizado ---
    if (loading) { return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando promoción...</p></div>; }
    if (error && !promocionOriginal) { return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>; }
    if (!promocionOriginal) { return <div className={containerClasses}><p className="text-center text-zinc-400">Promoción no encontrada.</p></div>; }

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Editar Promoción</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                ID: <span className='font-mono text-zinc-300'>{promocionId}</span>
                {negocioIdContext && <> | Negocio ID: <span className='font-mono text-zinc-300'>{negocioIdContext}</span></>}
            </p>


            {/* Mensajes de estado */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Campos Editables */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Promoción <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fechaInicio" className={labelBaseClasses}>Fecha Inicio <span className="text-red-500">*</span></label>
                        <input type="date" id="fechaInicio" name="fechaInicio" value={formData.fechaInicio?.toString() ?? ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="fechaFin" className={labelBaseClasses}>Fecha Fin <span className="text-red-500">*</span></label>
                        <input type="date" id="fechaFin" name="fechaFin" value={formData.fechaFin?.toString() ?? ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} min={formData.fechaInicio?.toString()} />
                    </div>
                </div>

                <div>
                    <label htmlFor="status" className={labelBaseClasses}>Status <span className="text-red-500">*</span></label>
                    <select id="status" name="status" value={formData.status || 'activo'} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmitting}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting && !error ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar / Volver
                    </button>
                    <div className="flex justify-center pt-2">
                        <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Promoción</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
