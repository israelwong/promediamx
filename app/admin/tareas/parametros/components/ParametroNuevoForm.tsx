'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Asegúrate que la ruta a tus actions y types sea correcta
import { crearParametro } from '@/app/admin/_lib/parametros.actions'; // Cambiado a crearParametro
import { ParametroRequerido } from '@/app/admin/_lib/types';
import { Loader2 } from 'lucide-react'; // Icono

import InstruccionParametros from './InstruccionParametros';

// Tipo para los datos de ESTE formulario (campos que el usuario define)
// Omitimos status y otros campos no relevantes para este form.
type ParametroNuevoFormData = Pick<ParametroRequerido,
    'nombre' | 'tipoDato' | 'descripcion' | 'esRequerido'
>;

export default function ParametroNuevoForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tareaId = searchParams?.get('tareaId'); // Obtener tareaId de la URL

    // Estado inicial del formulario con valores por defecto (sin status)
    const getInitialState = (): ParametroNuevoFormData => ({
        nombre: '',
        tipoDato: 'texto',
        descripcion: '',
        esRequerido: false,
    });

    const [formData, setFormData] = useState<ParametroNuevoFormData>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300";
    // Contenedor principal ahora usa grid y es más ancho
    const containerClasses = "p-4 max-w-4xl mx-auto";
    const formContainerClasses = "p-6 bg-zinc-800 rounded-lg shadow-md"; // Contenedor específico para el form
    const instructionsContainerClasses = "p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md text-zinc-300 text-sm"; // Contenedor para instrucciones
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // Mostrar error si no hay tareaId
    if (!tareaId) {
        return (
            <div className={`${formContainerClasses} max-w-lg mx-auto border border-red-500`}> {/* Usar formContainer para error */}
                <p className="text-center text-red-400">Error: No se ha proporcionado un ID de Tarea en la URL.</p>
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 mt-4`}>Volver</button>
            </div>
        );
    }

    // Manejador de cambios genérico (incluye checkbox)
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const finalValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador de envío (sin status)
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validación de campos obligatorios (sin status)
        if (!formData.nombre?.trim() || !formData.tipoDato) {
            setError("Nombre y Tipo de Dato son obligatorios.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Construir el objeto para enviar a la acción (sin status)
            const dataToSend: Omit<ParametroRequerido, 'id' | 'habilidadId' | 'tareaId' | 'orden' | 'createdAt' | 'updatedAt' | 'status'> = {
                nombre: formData.nombre.trim(),
                tipoDato: formData.tipoDato,
                descripcion: formData.descripcion?.trim() || null,
                esRequerido: formData.esRequerido,
            };

            // Llamar a la acción crearParametro, pasando tareaId y los datos
            // !! Asegúrate que tu acción 'crearParametro' ahora solo necesite estos datos !!
            await crearParametro(tareaId, dataToSend as ParametroRequerido).then(() => {
                router.push(`/admin/IA/tareas/${tareaId}`);
            });

            // setSuccessMessage("Parámetro creado correctamente.");
            // setFormData(getInitialState()); // Limpiar formulario

        } catch (err) {
            console.error("Error creating parametro:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el parámetro: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back();
    };

    return (
        // Contenedor principal con Grid para 2 columnas
        <div className={`${containerClasses} grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8`}>

            {/* Columna 1: Formulario */}
            <div className={formContainerClasses}>
                <h2 className="text-xl font-semibold text-white mb-1">Crear Nuevo Parámetro</h2>
                <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                    Para Tarea ID: <span className='font-mono text-zinc-300'>{tareaId}</span>
                </p>

                {/* Mensajes de estado */}
                {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Parámetro <span className="text-red-500">*</span></label>
                        <input
                            type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange}
                            className={inputBaseClasses} required disabled={isSubmitting}
                            placeholder="Ej: id_cliente, fecha_consulta" />
                        <p className="text-xs text-zinc-500 mt-1">Identificador único para este parámetro.</p>
                    </div>

                    <div>
                        <label htmlFor="tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                        <select id="tipoDato" name="tipoDato" value={formData.tipoDato} onChange={handleChange}
                            className={inputBaseClasses} required disabled={isSubmitting}>
                            <option value="texto">Texto (String)</option>
                            <option value="numero">Número (Number)</option>
                            <option value="fecha">Fecha (Date)</option>
                            <option value="booleano">Booleano (Boolean)</option>
                            {/* <option value="json">JSON (Object/Array)</option> */} {/* Omitido JSON si no se usa */}
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">Importante para validación en sistema.</p>
                    </div>

                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange}
                            className={textareaBaseClasses} disabled={isSubmitting} rows={3}
                            placeholder="Explica qué representa este parámetro..." />
                        <p className="text-xs text-zinc-500 mt-1">Se usará para describir el parámetro a la IA.</p>
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                        <input type="checkbox" id="esRequerido" name="esRequerido" checked={formData.esRequerido} onChange={handleChange}
                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            disabled={isSubmitting} />
                        <label htmlFor="esRequerido" className={checkboxLabelClasses}>¿Es Requerido?</label>
                        <p className="text-xs text-zinc-500">(Marcar si este parámetro es obligatorio)</p>
                    </div>

                    {/* Campo Status OMITIDO */}

                    <div className="pt-5 space-y-2 border-t border-zinc-700">
                        <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting}>
                            {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span> : 'Crear Parámetro'}
                        </button>
                        <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>

            {/* Columna 2: Instrucciones */}
            <div className={instructionsContainerClasses}>
                <InstruccionParametros />
            </div>

        </div>
    );
}
