'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearCategoria } from '@/app/admin/_lib/categoriaTarea.actions';
import { CategoriaTarea } from '@/app/admin/_lib/types';
import { Loader2 } from 'lucide-react'; // Icono

// Tipo para los datos de este formulario (solo campos necesarios para crear)
type CategoriaNuevaFormData = Pick<CategoriaTarea, 'nombre' | 'descripcion'>;

export default function CategoriaNuevaForm() {
    const router = useRouter();

    // Estado inicial del formulario
    const getInitialState = (): CategoriaNuevaFormData => ({
        nombre: '',
        descripcion: '', // Descripción es opcional '?' en la interfaz
    });

    const [formData, setFormData] = useState<CategoriaNuevaFormData>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`; // Altura para descripción
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md"; // Ancho adecuado
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // Manejador de cambios
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validación básica
        if (!formData.nombre?.trim()) {
            setError("El nombre de la categoría es obligatorio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar (solo nombre y descripción)
            // La acción 'crearCategoria' debe manejar los defaults de otros campos
            const dataToSend = {
                nombre: formData.nombre.trim(),
                // Enviar descripción solo si tiene valor, o null/undefined si está vacío
                descripcion: formData.descripcion?.trim() || null
            };

            // Llamar a la acción (asegúrate que acepte un objeto parcial o ajusta el tipo)
            await crearCategoria(dataToSend as CategoriaTarea).then(() => {
                router.push('/admin/IA/tareas/categorias/'); // Redirigir a la lista de categorías
            });



            // Opcional: Redirigir a la lista o a la nueva categoría
            // setTimeout(() => router.push('/admin/IA/categorias'), 1500); // Ir a la lista
            // O si la acción devuelve el ID:
            // setTimeout(() => router.push(`/admin/IA/categorias/${nuevaCategoria.id}`), 1500);


        } catch (err) {
            console.error("Error creating categoria:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear la categoría: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back(); // Volver a la página anterior (probablemente la lista)
    };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-zinc-700 pb-2">
                Crear Nueva Categoría
            </h2>

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
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Ventas, Soporte Técnico, Consultas Generales"
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

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span>
                        ) : (
                            'Crear Categoría'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
