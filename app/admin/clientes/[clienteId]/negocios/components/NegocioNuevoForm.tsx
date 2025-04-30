'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearNegocio } from '@/app/admin/_lib/negocio.actions';
import { Negocio } from '@/app/admin/_lib/types'; // Importar tipo Negocio si se usa
import { Loader2, Save } from 'lucide-react'; // Iconos

interface Props {
    clienteId: string; // ID del cliente al que pertenece el nuevo negocio
}

// Tipo para los datos de este formulario
type NegocioNuevaFormData = Pick<Negocio, 'nombre'> & {
    descripcion?: string | null;
};

export default function NegocioNuevoForm({ clienteId }: Props) {
    const router = useRouter();

    const initialState: NegocioNuevaFormData = {
        nombre: '',
        descripcion: '',
    };

    const [formData, setFormData] = useState<NegocioNuevaFormData>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const containerClasses = "p-4 md:p-6 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md border border-zinc-700";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-100 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 font-mono"; // font-mono para inputs
    const textareaBaseClasses = `${inputBaseClasses.replace('font-mono', '')} min-h-[100px] font-sans`; // font-sans para textarea
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Manejador de cambios
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        setError(null); // Limpiar error al escribir
        setSuccessMessage(null); // Limpiar mensaje de éxito
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre?.trim()) {
            setError("El nombre del negocio es obligatorio.");
            return;
        }
        if (!clienteId) {
            setError("Error: Falta el ID del cliente asociado.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await crearNegocio({
                clienteId: clienteId,
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
            });

            if (result.success && result.data?.id) {
                setSuccessMessage(`Negocio "${result.data.nombre}" creado con éxito. Redirigiendo...`);
                // Resetear formulario
                setFormData(initialState);
                // Redirigir a la página de detalles del nuevo negocio
                // Ajusta la ruta según tu estructura anidada final
                router.push(`/admin/clientes/${clienteId}/negocios/${result.data.id}`);
            } else {
                throw new Error(result.error || "No se pudo crear el negocio.");
            }

        } catch (err) {
            console.error("Error creating negocio:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back(); // Simplemente volver a la página anterior
    };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-zinc-700 pb-2">
                Crear Nuevo Negocio
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
                Este negocio se asociará al Cliente ID: <span className="font-mono text-zinc-300">{clienteId}</span>
            </p>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Negocio <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Barbería El Bigote Feliz"
                        maxLength={100}
                    />
                    <p className="text-xs text-zinc-500 mt-1">El nombre principal de tu negocio o sucursal.</p>
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción (Opcional)</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses}
                        disabled={isSubmitting}
                        rows={3}
                        placeholder="Una breve descripción de qué hace este negocio..."
                        maxLength={500}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Un resumen corto para identificarlo.</p>
                </div>

                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span>
                        ) : (
                            <><Save size={16} /> Crear Negocio y Continuar</>
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