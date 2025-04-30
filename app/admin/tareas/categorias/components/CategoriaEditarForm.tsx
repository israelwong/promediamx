'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Correcto para App Router
// Ajusta la ruta si es necesario
import {
    obtenerCategoriaPorId, // !! Asumiendo que esta acción existe !!
    actualizarCategoria,
    eliminarCategoria
} from '@/app/admin/_lib/categoriaTarea.actions';
import { CategoriaTarea } from '@/app/admin/_lib/types';
import { Loader2, Trash2 } from 'lucide-react'; // Iconos

interface Props {
    categoriaId: string;
}

// Tipo para los datos editables en ESTE formulario
type CategoriaEditFormData = Pick<CategoriaTarea, 'nombre' | 'descripcion'>;

export default function CategoriaEditarForm({ categoriaId }: Props) {
    const router = useRouter();

    const [categoriaOriginal, setCategoriaOriginal] = useState<CategoriaTarea | null>(null);
    // Estado para los datos del formulario (solo nombre y descripción)
    const [formData, setFormData] = useState<Partial<CategoriaEditFormData>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // --- Efecto para cargar datos ---
    useEffect(() => {
        if (!categoriaId) {
            setError("No se proporcionó un ID de categoría.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const fetchDatos = async () => {
            try {
                // !! Asumiendo que existe esta acción !!
                const data = await obtenerCategoriaPorId(categoriaId);
                if (Array.isArray(data) && data.length > 0) {
                    const categoria = data[0]; // Assuming you want the first item in the array
                    setCategoriaOriginal(categoria);
                    setFormData({
                        nombre: categoria.nombre,
                        descripcion: categoria.descripcion,
                    });
                } else {
                    setError(`No se encontró la categoría con ID: ${categoriaId}`);
                    setCategoriaOriginal(null);
                    setFormData({});
                }
            } catch (err) {
                console.error("Error al obtener la categoría:", err);
                setError("No se pudo cargar la categoría.");
                setCategoriaOriginal(null); setFormData({});
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();

        // Cleanup
        return () => {
            setCategoriaOriginal(null); setFormData({}); setLoading(true); setError(null);
        };
    }, [categoriaId]);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación
        if (!formData.nombre?.trim()) {
            setError("El nombre de la categoría es obligatorio."); return;
        }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto solo con los datos editables
            const dataToSend: Partial<CategoriaTarea> = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
            };
            // Llamar a la acción de actualizar
            await actualizarCategoria(categoriaId, dataToSend);
            setSuccessMessage("Categoría actualizada correctamente.");
            // Actualizar estado original local si es necesario
            setCategoriaOriginal(prev => prev ? { ...prev, ...dataToSend } : null);
        } catch (err) {
            console.error("Error updating categoria:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar la categoría: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => { router.back(); };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar esta Categoría? Esta acción no se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await eliminarCategoria(categoriaId);
                setSuccessMessage("Categoría eliminada correctamente.");
                setTimeout(() => router.push('/admin/IA/tareas/categorias/'), 1500); // Ajusta la ruta si es necesario
            } catch (err) {
                console.error("Error deleting categoria:", err);
                setError(`Error al eliminar la categoría: Existen tareas asociadas a esta categoría.`);
                setIsSubmitting(false); // Reactivar botones si hay error
            }
        }
    };

    // --- Renderizado ---
    if (loading) {
        return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando categoría...</p></div>;
    }
    if (error && !categoriaOriginal) {
        return (
            <div className={`${containerClasses} border border-red-500`}>
                <p className="text-center text-red-400">{error}</p>
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 mt-4`}>Volver</button>
            </div>
        );
    }
    if (!categoriaOriginal) {
        return (
            <div className={containerClasses}>
                <p className="text-center text-zinc-400">No se encontró la categoría.</p>
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 mt-4`}>Volver</button>
            </div>
        );
    }

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Editar Categoría</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                ID: <span className='font-mono text-zinc-300'>{categoriaId}</span>
            </p>

            {/* Mensajes de estado */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Nombre (Obligatorio) */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre || ''}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        maxLength={80}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Nombre descriptivo para la categoría.</p>
                </div>

                {/* Campo Descripción (Opcional, Textarea) */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses}
                        disabled={isSubmitting}
                        rows={4}
                        placeholder="Explica brevemente el propósito de esta categoría..."
                    />
                    <p className="text-xs text-zinc-500 mt-1">Describe para qué se usarán las tareas de esta categoría.</p>
                </div>

                {/* Campos Omitidos: orden, status, fechas */}

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && !error ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : 'Guardar Cambios'}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    {/* Botón Eliminar */}
                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50'
                            disabled={isSubmitting}
                        >
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Categoría</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
