// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/components/CatalogoEditarForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CatalogoPortada from './CatalogoPortada'; // Se mantiene para la imagen
import {
    obtenerCatalogoPorId,
    actualizarCatalogo,
    eliminarCatalogo
} from '@/app/admin/_lib/actions/catalogo/catalogo.actions'; // Rutas actualizadas
import { type ActualizarCatalogoData } from '@/app/admin/_lib/actions/catalogo/catalogo.schemas'; // Tipo Zod
import type { Catalogo as PrismaCatalogo } from '@prisma/client'; // Tipo Prisma
import { Loader2, Trash2, Save, AlertCircle, CheckCircle, ArrowLeft, BookOpenText } from 'lucide-react';

interface Props {
    catalogoId: string;
    clienteId: string;
    negocioId: string;
}

// Usar el tipo Zod para el estado del formulario, asegurando que los campos coincidan.
type CatalogoFormState = ActualizarCatalogoData;

export default function CatalogoEditarForm({ clienteId, negocioId, catalogoId }: Props) {
    const router = useRouter();

    const [catalogoOriginal, setCatalogoOriginal] = useState<PrismaCatalogo | null>(null);
    const [formData, setFormData] = useState<CatalogoFormState>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind
    const mainContainerClasses = "bg-zinc-800 p-4 md:p-6 rounded-xl shadow-xl border border-zinc-700 h-full flex flex-col";
    const labelBaseClasses = "block text-sm font-medium text-zinc-300 mb-1.5";
    const inputBaseClasses = "block w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-2";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500`;
    const destructiveButtonClasses = `${buttonBaseClasses} text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`;
    const toggleSwitchClasses = "relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";
    const toggleKnobClasses = "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out";
    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-3 flex items-center gap-2";
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;
    const successBoxClasses = `${messageBoxBaseClasses} bg-green-500/10 border border-green-500/30 text-green-300`;


    const fetchDatosCatalogo = useCallback(async () => {
        if (!catalogoId || !negocioId) {
            setError("IDs de catálogo o negocio no válidos.");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const result = await obtenerCatalogoPorId(catalogoId, negocioId);
            if (result.success && result.data) {
                setCatalogoOriginal(result.data);
                setFormData({
                    nombre: result.data.nombre,
                    descripcion: result.data.descripcion,
                    status: result.data.status,
                });
            } else {
                setError(result.error || `No se encontró el catálogo.`);
                setCatalogoOriginal(null); setFormData({});
            }
        } catch (err) {
            console.error("Error al obtener el catálogo:", err);
            setError("No se pudo cargar la información del catálogo.");
        } finally {
            setLoading(false);
        }
    }, [catalogoId, negocioId]);

    useEffect(() => {
        fetchDatosCatalogo();
    }, [fetchDatosCatalogo]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) {
            timer = setTimeout(() => setSuccessMessage(null), 3000);
        }
        return () => clearTimeout(timer);
    }, [successMessage]);


    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
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
        if (!formData.nombre?.trim()) { // Validación básica en cliente
            setError("El nombre del catálogo es obligatorio.");
            return;
        }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // formData ya debería coincidir con ActualizarCatalogoData
            const result = await actualizarCatalogo(catalogoId, negocioId, clienteId, formData);
            if (result.success && result.data) {
                setSuccessMessage("Catálogo actualizado correctamente.");
                setCatalogoOriginal(result.data); // Actualizar el original con la respuesta
                // Opcionalmente, refrescar datos si la acción no devuelve el objeto completo actualizado
                // await fetchDatosCatalogo(); 
            } else {
                let errorMsg = result.error || "No se pudo actualizar el catálogo.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error actualizando catálogo:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo`);
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de eliminar este catálogo? Esta acción también eliminará todos sus ítems y no se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarCatalogo(catalogoId, negocioId, clienteId);
                if (result.success) {
                    setSuccessMessage("Catálogo eliminado. Redirigiendo...");
                    setTimeout(() => {
                        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo`);
                    }, 1500);
                } else {
                    setError(result.error || "No se pudo eliminar el catálogo.");
                    setIsSubmitting(false);
                }
            } catch (err) {
                console.error("Error eliminando catálogo:", err);
                setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
                setIsSubmitting(false);
            }
        }
    };

    // Callback para actualizar la URL de la portada desde CatalogoPortada
    const handlePortadaUpdate = useCallback((newImageUrl: string | null) => {
        setCatalogoOriginal(prev => prev ? { ...prev, imagenPortadaUrl: newImageUrl } : null);
        // Opcional: mostrar un mensaje de éxito específico para la portada
        setSuccessMessage("Imagen de portada actualizada.");
    }, []);


    if (loading) {
        return (
            <div className={`${mainContainerClasses} items-center justify-center`}>
                <Loader2 className='animate-spin h-8 w-8 text-blue-500' />
                <p className="mt-3 text-zinc-400">Cargando detalles del catálogo...</p>
            </div>
        );
    }
    if (error && !catalogoOriginal) { // Si hay error y no se cargó nada
        return (
            <div className={`${mainContainerClasses} items-center justify-center border-red-500/30 bg-red-500/5`}>
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-red-400 text-center mb-1 font-medium">Error al Cargar</p>
                <p className="text-zinc-400 text-sm text-center mb-4">{error}</p>
                <button onClick={handleCancel} className={secondaryButtonClasses}>
                    <ArrowLeft size={16} /> Volver a Catálogos
                </button>
            </div>
        );
    }
    if (!catalogoOriginal) {
        return (
            <div className={`${mainContainerClasses} items-center justify-center`}>
                <BookOpenText className="h-10 w-10 text-zinc-500 mb-3" />
                <p className="text-zinc-400 text-center">Catálogo no encontrado.</p>
                <button onClick={handleCancel} className={`${secondaryButtonClasses} mt-4`}>
                    <ArrowLeft size={16} /> Volver a Catálogos
                </button>
            </div>
        );
    }

    return (
        <div className={mainContainerClasses}>
            <div className='flex justify-between items-center mb-4 pb-4 border-b border-zinc-700'>
                <h2 className="text-xl font-semibold text-zinc-100">Editar Catálogo</h2>
                <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Volver a la lista de catálogos"
                >
                    <ArrowLeft size={14} />
                    Volver
                </button>
            </div>

            {/* Mostrar error general del formulario aquí */}
            {error && !successMessage && <div className={errorBoxClasses}><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className={successBoxClasses}><CheckCircle size={18} /><span>{successMessage}</span></div>}

            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6"> {/* Para scroll interno si el contenido es largo */}
                <CatalogoPortada
                    catalogoId={catalogoId}
                    negocioId={negocioId} // Pasar negocioId
                    clienteId={clienteId} // Pasar clienteId
                    initialImageUrl={catalogoOriginal.imagenPortadaUrl || null}
                    onPortadaUpdate={handlePortadaUpdate} // Pasar callback
                />

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="nombre" className={labelBaseClasses}>
                            Nombre del Catálogo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            value={formData.nombre || ''}
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>
                            Descripción (Opcional)
                        </label>
                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formData.descripcion || ''}
                            onChange={handleChange}
                            className={textareaBaseClasses}
                            disabled={isSubmitting}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label htmlFor="status" className={labelBaseClasses}>
                            Estado del Catálogo
                        </label>
                        <div className="flex items-center">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.status === 'activo'}
                                onClick={() => handleChange({ target: { name: 'status', type: 'checkbox', checked: formData.status !== 'activo' } } as unknown as ChangeEvent<HTMLInputElement>)}
                                className={`${toggleSwitchClasses} ${formData.status === 'activo' ? 'bg-blue-600' : 'bg-zinc-700'}`}
                                disabled={isSubmitting}
                            >
                                <span className="sr-only">Activar/Desactivar Catálogo</span>
                                <span className={`${toggleKnobClasses} ${formData.status === 'activo' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className={`ml-3 text-sm font-medium ${formData.status === 'activo' ? 'text-blue-300' : 'text-zinc-400'}`}>
                                {formData.status === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>

                    <div className="pt-6 space-y-3 border-t border-zinc-700">
                        <button
                            type="submit"
                            className={primaryButtonClasses + " w-full"}
                            disabled={isSubmitting || loading}
                        >
                            {isSubmitting ? <><Loader2 className='animate-spin' size={18} /> Guardando...</> : <><Save size={16} /> Guardar Cambios</>}
                        </button>

                        <button
                            type="button"
                            onClick={handleDelete}
                            className={destructiveButtonClasses + " w-full"}
                            disabled={isSubmitting || loading}
                        >
                            {isSubmitting ? <><Loader2 className='animate-spin' size={18} /> Eliminando...</> : <><Trash2 size={16} /> Eliminar Catálogo</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
