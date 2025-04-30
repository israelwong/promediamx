'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import {
    obtenerCatalogoPorId,
    actualizarCatalogo,
    eliminarCatalogo
} from '@/app/admin/_lib/catalogo.actions'; // Asegúrate que la acción y ruta sean correctas
// Ya no necesitamos obtenerCatalogoNiveles ni CatalogoNivel
import { Catalogo } from '@/app/admin/_lib/types'; // Importar tipo Catalogo
import { Loader2, Trash2, Save } from 'lucide-react'; // Iconos

interface Props {
    catalogoId: string;
}

// Tipo para los datos editables (sin catalogoNivelId)
type CatalogoEditFormData = Partial<Pick<Catalogo,
    'nombre' | 'descripcion' | 'status'
>>;

export default function CatalogoEditarForm({ catalogoId }: Props) {
    const router = useRouter();

    const [catalogoOriginal, setCatalogoOriginal] = useState<Catalogo | null>(null);
    // Estado para los datos del formulario
    const [formData, setFormData] = useState<CatalogoEditFormData>({});
    // Ya no necesitamos estado para niveles ni su carga
    // const [catalogoNiveles, setCatalogoNiveles] = useState<CatalogoNivel[]>([]);
    const [loading, setLoading] = useState(true); // Carga principal del catálogo
    // const [loadingNiveles, setLoadingNiveles] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Para guardar o eliminar
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [negocioIdContext, setNegocioIdContext] = useState<string | null>(null); // Para volver a la lista del negocio

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`; // Quitado font-mono si prefieres sans-serif para textarea
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md w-full";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    const toggleSwitchClasses = "w-11 h-6 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all";
    const toggleKnobClasses = "absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform";


    // --- Efecto para cargar datos del Catálogo ---
    useEffect(() => {
        if (!catalogoId) {
            setError("No se proporcionó un ID de catálogo."); setLoading(false); return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);

        const fetchDatos = async () => {
            try {
                // La acción obtenerCatalogoPorId ya no necesita incluir catalogoNivel
                const data = await obtenerCatalogoPorId(catalogoId);
                if (data) {
                    setCatalogoOriginal({
                        ...data,
                        negocio: {
                            ...data.negocio,
                            clienteId: data.negocio.clienteId ?? '' // Provide a default value if null
                        },
                        ItemCatalogo: data.ItemCatalogo.map(item => ({
                            ...item,
                            catalogoId: catalogoId, // Ensure catalogoId is included
                            precio: item.precio || 0 // Provide a default value for missing properties
                        }))
                    });
                    setNegocioIdContext(data.negocioId);
                    // Poblar formData con campos editables (sin nivel)
                    setFormData({
                        nombre: data.nombre,
                        descripcion: data.descripcion,
                        status: data.status ?? 'inactivo',
                        // Ya no se incluye catalogoNivelId
                    });
                } else {
                    setError(`No se encontró el catálogo con ID: ${catalogoId}`);
                    setCatalogoOriginal(null); setFormData({}); setNegocioIdContext(null);
                }
            } catch (err) {
                console.error("Error al obtener el catálogo:", err);
                setError("No se pudo cargar el catálogo.");
                setCatalogoOriginal(null); setFormData({}); setNegocioIdContext(null);
            } finally { setLoading(false); }
        };
        fetchDatos();
    }, [catalogoId]);

    // --- Ya no necesitamos cargar Niveles de Catálogo ---
    // useEffect(() => { ... }, []);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Manejar el checkbox de status
        if (type === 'checkbox' && name === 'status') {
            setFormData(prevState => ({
                ...prevState,
                status: (e.target as HTMLInputElement).checked ? 'activo' : 'inactivo'
            }));
        } else {
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación (solo nombre y status)
        if (!formData.nombre?.trim() || !formData.status) {
            setError("Nombre y Status son obligatorios."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto solo con los datos editables (sin nivel)
            const dataToSend: Partial<Catalogo> = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                status: formData.status,
                // Ya no se envía catalogoNivelId
            };
            await actualizarCatalogo(catalogoId, dataToSend);
            setSuccessMessage("Catálogo actualizado correctamente.");
            setCatalogoOriginal(prev => prev ? { ...prev, ...dataToSend } : null);

        } catch (err) {
            console.error("Error updating catalogo:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => {
        if (negocioIdContext) {
            router.push(`/admin/negocios/${negocioIdContext}`); // Volver al panel del negocio
        } else {
            router.back(); // Fallback
        }
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro? Eliminar este catálogo también eliminará todos sus ítems asociados. Esta acción NO se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await eliminarCatalogo(catalogoId);
                setSuccessMessage("Catálogo eliminado.");
                setTimeout(() => {
                    if (negocioIdContext) {
                        router.push(`/admin/negocios/${negocioIdContext}`);
                    } else {
                        router.back();
                    }
                }, 1500);
            } catch (err) {
                console.error("Error deleting catalogo:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al eliminar: ${errorMessage}`);
                setIsSubmitting(false);
            }
        }
    };

    // --- Renderizado ---
    if (loading) { return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando catálogo...</p></div>; }
    if (error && !catalogoOriginal) { return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>; }
    if (!catalogoOriginal) { return <div className={containerClasses}><p className="text-center text-zinc-400">Catálogo no encontrado.</p></div>; }

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className='flex justify-between items-start mb-4 border-b border-zinc-700 pb-3'>
                <div>
                    <h2 className="text-xl font-semibold text-white">Editar Catálogo</h2>
                    <p className="text-sm text-zinc-400 mt-0.5">
                        ID: <span className='font-mono text-zinc-300'>{catalogoId}</span>
                    </p>
                </div>
                {/* Toggle Switch para Status */}
                <div className="flex items-center gap-2 pt-1">
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input
                            type="checkbox"
                            id="status"
                            name="status"
                            checked={formData.status === 'activo'}
                            onChange={handleChange} // Usar handleChange directamente
                            className="sr-only peer"
                            disabled={isSubmitting}
                        />
                        <div className={toggleSwitchClasses}></div>
                        <div className={toggleKnobClasses}></div>
                    </label>

                </div>
            </div>

            {/* Mensajes */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Campos Editables */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Catálogo <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} />
                </div>

                {/* SE ELIMINÓ EL SELECT DE NIVEL DE CATÁLOGO */}

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar / Volver
                    </button>
                    <div className="flex justify-center pt-2">
                        <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Catálogo</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
