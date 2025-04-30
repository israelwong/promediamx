'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import { crearCatalogoNegocio } from '@/app/admin/_lib/catalogo.actions';
// import { obtenerCatalogoNiveles } from '@/app/admin/_lib/catalogoNivel.actions'; // Asumiendo acción aquí
import { Catalogo } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2 } from 'lucide-react'; // Icono

interface Props {
    negocioId: string; // ID del negocio al que pertenece el catálogo
}

// Tipo para los datos de este formulario
// Quitado 'nombre', 'status' se maneja internamente
type CatalogoNuevaFormData = Pick<Catalogo, 'nombre' | 'descripcion'>;

export default function CatalogoNuevoForm({ negocioId }: Props) {
    const router = useRouter();

    // Estado inicial del formulario (sin nombre, sin status)
    const getInitialState = (): CatalogoNuevaFormData => ({
        nombre: '', // Se puede quitar si no se necesita
        descripcion: '',
        // catalogoNivelId: '', // Default a sin nivel seleccionado
    });

    const [formData, setFormData] = useState<CatalogoNuevaFormData>(getInitialState());
    // const [catalogoNiveles, setCatalogoNiveles] = useState<CatalogoNivel[]>([]);
    // const [loadingNiveles, setLoadingNiveles] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Estado para saber si hay un único nivel y cuál es
    // const [unicoNivelId, setUnicoNivelId] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    // const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 min-h-[40px] text-sm"; // Para mostrar nivel único

    // Manejador de cambios genérico
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

        // Validación básica (Ahora descripción es el campo principal editable)
        // Ajusta si descripción puede ser opcional
        if (!formData.nombre?.trim()) {
            setError("El nombre es obligatorio.");
            return;
        }

        // Validar que se haya seleccionado un nivel si hay múltiples opciones
        // if (catalogoNiveles.length > 1 && !formData.catalogoNivelId) {
        //     setError("Debes seleccionar un nivel de catálogo.");
        //     return;
        // }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar (sin nombre, status fijo)
            const dataToSend = {
                nombre: formData.nombre?.trim() || null, // Ya no se envía nombre
                descripcion: formData.descripcion?.trim() || null,
                status: 'activo', // Status fijo
                // catalogoNivelId: formData.catalogoNivelId || null,
            };

            // Llamar a la acción
            await crearCatalogoNegocio(negocioId, dataToSend as Catalogo).then((res) => {
                setSuccessMessage("Catálogo creado exitosamente.");
                setIsSubmitting(false);
                setTimeout(() => router.push(`/admin/negocios/${negocioId}/catalogo/${res.id}`), 1500);
            });

        } catch (err) {
            console.error("Error creating catalogo:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el catálogo: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => { router.back(); };

    // Encontrar el nombre del nivel único si existe
    // const nombreNivelUnico = unicoNivelId
    //     ? catalogoNiveles.find(n => n.id === unicoNivelId)?.nombre
    //     : null;

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Crear Nuevo Catálogo</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                Para Negocio ID: <span className='font-mono text-zinc-300'>{negocioId}</span>
            </p>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Campo Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Catálogo</label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre || ''}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        disabled={isSubmitting}
                        placeholder="Nombre del catálogo..."
                    />
                    <p className="text-xs text-zinc-500 mt-1">Este nombre se mostrará para identificar si tienes multiples catálogos.</p>
                </div>

                {/* Campo Descripción (Obligatorio según tu validación) */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses}
                        required // Añadido required si es obligatorio
                        disabled={isSubmitting}
                        rows={3}
                        placeholder="Describe brevemente el contenido de este catálogo..."
                    />
                </div>

                {/* Campo Nivel de Catálogo (Renderizado Condicional) */}

                {/* Campo Status OMITIDO (se envía 'activo' por defecto) */}


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
                            'Crear Catálogo'
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
