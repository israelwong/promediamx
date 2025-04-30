'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearPromocion } from '@/app/admin/_lib/promocion.actions'; // Asegúrate que la acción y ruta sean correctas
import { Promocion } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2 } from 'lucide-react'; // Icono

interface Props {
    negocioId: string; // ID del negocio al que pertenece la promoción
}

// Tipo para los datos de este formulario
// Omitimos campos autogenerados y relaciones complejas
type PromocionNuevaFormData = Pick<Promocion,
    'nombre' | 'descripcion' | 'fechaInicio' | 'fechaFin' | 'status'
>;

export default function PromocionNuevaForm({ negocioId }: Props) {
    const router = useRouter();

    // Helper para obtener la fecha actual en formato YYYY-MM-DD
    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    // Estado inicial del formulario
    const getInitialState = (): PromocionNuevaFormData => ({
        nombre: '',
        descripcion: '',
        fechaInicio: new Date(getTodayDateString()), // Default a hoy en formato Date
        fechaFin: new Date(getTodayDateString()),     // Default a hoy en formato Date
        status: 'activo', // Default status
    });

    const [formData, setFormData] = useState<PromocionNuevaFormData>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Manejador de cambios
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

        // Validación básica
        if (!formData.nombre?.trim() || !formData.fechaInicio || !formData.fechaFin || !formData.status) {
            setError("Nombre, Fechas y Status son obligatorios.");
            return;
        }
        // Validación de fechas
        if (new Date(formData.fechaFin) < new Date(formData.fechaInicio)) {
            setError("La fecha de fin no puede ser anterior a la fecha de inicio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar
            const dataToSend = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(formData.fechaFin),
                status: formData.status,
                negocioId: negocioId, // Asociar con el negocio actual
            };

            // Llamar a la acción (asegúrate que acepte este objeto)
            await crearPromocion(dataToSend as Promocion).then(() => {
                router.push(`/admin/negocios/${negocioId}`); // Redirigir a la nueva promoción
            });


            // Opcional: Redirigir (ej: volver a la lista de promociones del negocio)
            // setTimeout(() => router.push(`/admin/negocios/${negocioId}/promociones`), 1500);
            setTimeout(() => router.back(), 1500); // O simplemente volver atrás


        } catch (err) {
            console.error("Error creating promocion:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear la promoción: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back(); // Volver a la página anterior
    };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Crear Nueva Promoción</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                Para Negocio ID: <span className='font-mono text-zinc-300'>{negocioId}</span>
            </p>

            {/* Mensajes de estado */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Campo Nombre (Obligatorio) */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Promoción <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre ?? ''}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Descuento Verano, 2x1 Martes"
                        maxLength={100}
                    />
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
                        rows={3}
                        placeholder="Detalles de la promoción, condiciones..."
                    />
                </div>

                {/* Fechas Inicio y Fin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fechaInicio" className={labelBaseClasses}>Fecha Inicio <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            id="fechaInicio"
                            name="fechaInicio"
                            value={formData.fechaInicio?.toString() ?? ''} // Convertir a string para input date
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                            disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label htmlFor="fechaFin" className={labelBaseClasses}>Fecha Fin <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            id="fechaFin"
                            name="fechaFin"
                            value={formData.fechaFin?.toString() ?? ''} // Convertir a string para input date
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                            disabled={isSubmitting}
                            min={formData.fechaInicio?.toString()} // Evitar fecha fin anterior a inicio
                        />
                    </div>
                </div>


                {/* Campo Status (Obligatorio, Select) */}
                <div>
                    <label htmlFor="status" className={labelBaseClasses}>Status <span className="text-red-500">*</span></label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status || 'activo'}
                        onChange={handleChange}
                        className={`${inputBaseClasses} appearance-none`}
                        required
                        disabled={isSubmitting}
                    >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
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
                            'Crear Promoción'
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
