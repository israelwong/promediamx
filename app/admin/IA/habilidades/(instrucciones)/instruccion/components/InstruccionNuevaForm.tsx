'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { crearInstruccion } from '@/app/admin/_lib/instruccion.actions';
import { Instruccion } from '@/app/admin/_lib/types'; // Asegúrate de que la ruta sea correcta
// Asumiendo que la interfaz Instruccion está definida correctamente en types
// Si no, necesitarías definirla aquí o importarla correctamente.
// Ejemplo de definición basada en tu modelo Prisma:


// Tipo para los datos del formulario (omitimos 'id' ya que se genera en el backend)
type InstruccionFormData = Omit<Instruccion, 'id'>;

export default function InstruccionNuevaForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Obtener habilidadId de la URL, asegurando que siempre sea string
    const habilidadId = searchParams?.get('habilidadId') ?? '';

    // Estado inicial del formulario, incluyendo el habilidadId obtenido
    const getInitialState = (): Partial<InstruccionFormData> => ({
        habilidadId: habilidadId,
        orden: undefined, // Empezar como undefined o null para opcional
        nombre: '',
        descripcion: '',
        instruccion: '',
        automatizacion: '',
        version: 1.0, // Default version (Float -> number)
        status: 'activo', // Default status
    });

    const [formData, setFormData] = useState<Partial<InstruccionFormData>>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Efecto para actualizar el habilidadId en el estado si cambia en la URL
    // (útil si la navegación dentro de la misma página puede cambiar el query param)
    useEffect(() => {
        if (habilidadId && habilidadId !== formData.habilidadId) {
            setFormData(prev => ({ ...prev, habilidadId: habilidadId }));
        }
        // Si habilidadId se vuelve vacío, podríamos querer resetear o mostrar un error
        if (!habilidadId) {
            setError("Falta el ID de la habilidad asociada.");
            // Opcionalmente, deshabilitar el formulario
        }
    }, [habilidadId, formData.habilidadId]);


    // Clases de Tailwind reutilizables (ajusta si son diferentes)
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const containerClasses = "p-4 max-w-2xl mx-auto bg-zinc-800 rounded-lg shadow-md"; // Ajustar max-w si es necesario
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";


    // Manejador de cambios
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        let finalValue: string | number | null;

        if (type === 'number') {
            // Para 'orden' (Int?) y 'version' (Float)
            if (value === '') {
                finalValue = name === 'orden' ? null : 0; // Orden puede ser null, version no debería (default a 0 temporalmente si se borra)
            } else {
                // Usar parseFloat para permitir decimales en 'version'
                finalValue = name === 'version' ? parseFloat(value) : parseInt(value, 10);
                // Manejar NaN si la conversión falla
                if (isNaN(finalValue)) {
                    finalValue = name === 'orden' ? null : 0;
                }
            }
        } else {
            finalValue = value;
        }


        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null); // Limpiar errores al editar
        setSuccessMessage(null);
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validar que habilidadId exista
        if (!formData.habilidadId) {
            setError("No se puede crear la instrucción sin una habilidad asociada.");
            return;
        }
        // Validación de campos obligatorios
        if (!formData.nombre || !formData.descripcion) {
            setError("Por favor, completa todos los campos obligatorios (*).");
            return;
        }


        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Construir el objeto final asegurando tipos correctos
            const dataToSend: InstruccionFormData = {
                habilidadId: formData.habilidadId,
                orden: formData.orden ? Number(0) : null, // Asegurar número o null
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                version: Number(1), // Asegurar número
                status: 'inactivo', // Default status
            };

            await crearInstruccion(dataToSend).then(() => {
                router.push(`/admin/IA/habilidades/${habilidadId}`);
            })
            setFormData(getInitialState());

        } catch (err) {
            console.error("Error creating instruccion:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear la instrucción: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back();
    };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-2">Crear Nueva Instrucción</h2>

            {/* Mensajes de estado */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600">{successMessage}</p>}

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
                        disabled={isSubmitting || !habilidadId} // Deshabilitar si no hay habilidadId
                    />
                </div>

                {/* Campo Descripción (Opcional, Textarea) */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción <span className="text-red-500">*</span></label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={`${inputBaseClasses} min-h-[80px]`}
                        disabled={isSubmitting || !habilidadId}
                    />
                </div>

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting || !habilidadId} // Deshabilitar si no hay ID o está enviando
                    >
                        {isSubmitting ? 'Creando...' : 'Crear Instrucción'}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}
                        disabled={isSubmitting} // Deshabilitar también al enviar
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
