'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerInstruccion, actualizarInstruccion } from '@/app/admin/_lib/instruccion.actions';
import { Instruccion } from '@/app/admin/_lib/types'; // Asegúrate de que la ruta sea correcta

interface Props {
    instruccionId: string;
}

// Asumiendo que la interfaz Instruccion ahora incluye 'trigger'
// export interface Instruccion {
//   id: string;
//   habilidadId: string;
//   orden?: number | null;
//   nombre: string;
//   descripcion?: string | null;
//   instruccion: string; // ¿Sigue siendo obligatoria?
//   automatizacion?: string | null;
//   trigger?: string | null; // Nuevo campo
//   version: number;
//   status: string;
// }


// Usaremos Partial<Instruccion> para el estado del formulario para manejar el estado inicial vacío/cargando
// Incluimos Omit<Instruccion, 'id'> para ser más explícitos sobre qué esperamos
type InstruccionEditFormData = Partial<Omit<Instruccion, 'id'>>;

export default function InstruccionEditarForm({ instruccionId }: Props) {
    const router = useRouter();

    const [instruccionOriginal, setInstruccionOriginal] = useState<Instruccion | null>(null); // Para guardar datos originales
    const [formData, setFormData] = useState<InstruccionEditFormData>({}); // Empezar vacío hasta cargar datos
    const [loading, setLoading] = useState(true); // Estado de carga para fetch inicial
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    // const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px]"; // No se usa en esta versión
    const containerClasses = "p-4 max-w-6xl mx-auto bg-zinc-800 rounded-lg shadow-md"; // Aumentado max-w
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // Efecto para cargar los datos de la instrucción al montar o si cambia el ID
    useEffect(() => {
        if (!instruccionId) {
            setError("No se proporcionó un ID de instrucción.");
            setLoading(false);
            return;
        }

        const fetchInstruccion = async () => {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const data = await obtenerInstruccion(instruccionId);
                if (data) {
                    // Guardar original, asegurando que 'instruccion' sea string o ''
                    setInstruccionOriginal({ ...data, instruccion: data.instruccion || '' });
                    // Poblar el formulario. Omitimos 'id' del estado del formulario.
                    const { ...formDataFromApi } = data;
                    setFormData({
                        ...formDataFromApi,
                        // Convertir null a undefined si prefieres manejarlo así en el estado, o mantener null
                        instruccion: formDataFromApi.instruccion ?? '', // Usar '' en lugar de undefined para textarea
                    });
                } else {
                    setError(`No se encontró la instrucción con ID: ${instruccionId}`);
                    setInstruccionOriginal(null);
                    setFormData({});
                }
            } catch (err) {
                console.error("Error fetching instruccion:", err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`Error al cargar la instrucción: ${errorMessage}`);
                setInstruccionOriginal(null);
                setFormData({});
            } finally {
                setLoading(false);
            }
        };

        fetchInstruccion();
    }, [instruccionId]); // Dependencia: instruccionId

    // Manejador de cambios (igual que en el form de creación)
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | null;
        if (type === 'number') {
            if (value === '') {
                finalValue = name === 'orden' ? null : 0;
            } else {
                finalValue = name === 'version' ? parseFloat(value) : parseInt(value, 10);
                if (isNaN(finalValue)) {
                    finalValue = name === 'orden' ? null : 0;
                }
            }
        } else {
            finalValue = value;
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null);
        setSuccessMessage(null);
    };

    //! Manejador de envío para ACTUALIZAR
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validar campos obligatorios (Añadir 'instruccion' si es requerida)
        if (!formData.nombre || typeof formData.version !== 'number' || !formData.status || !formData.habilidadId /* || !formData.instruccion */) {
            setError("Por favor, completa todos los campos obligatorios (*).");
            return;
        }
        if (formData.version <= 0) {
            setError("La versión debe ser un número positivo.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Construir el objeto final para la actualización
            const dataToSend: Omit<Instruccion, 'id'> = {
                habilidadId: formData.habilidadId, // Debe estar presente
                orden: formData.orden ? Number(formData.orden) : null,
                nombre: formData.nombre,
                descripcion: formData.descripcion || null,
                instruccion: formData.instruccion || '', // Asegurar que es string
                automatizacion: formData.automatizacion || null,
                trigger: formData.trigger || null, // Incluir nuevo campo
                version: Number(formData.version),
                status: formData.status,
            };

            // Llamar a la acción de ACTUALIZAR
            // Asumiendo que la firma es actualizarInstruccion(id, datos)
            const response = await actualizarInstruccion(instruccionId, dataToSend);

            // Manejar respuesta (si la acción devuelve algo útil)
            if (response) { // Ajusta esta condición según lo que devuelva tu acción
                setSuccessMessage("Instrucción actualizada correctamente."); // Mostrar mensaje de éxito
                // Opcional: actualizar el estado original localmente
                setInstruccionOriginal(prev => prev ? { ...prev, id: instruccionId, ...dataToSend } : null);
                // Considera si realmente quieres volver atrás automáticamente o dejar que el usuario lo haga
                // router.back();
            } else {
                // Si la acción devuelve false o null en caso de error no capturado por throw
                setError("No se pudo actualizar la instrucción (respuesta inesperada).");
            }

        } catch (err) {
            console.error("Error updating instruccion:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar la instrucción: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back();
    };

    // --- Renderizado ---

    if (loading) {
        return <div className={containerClasses}><p className="text-center text-zinc-300">Cargando datos de la instrucción...</p></div>;
    }

    if (error && !instruccionOriginal) { // Mostrar error si la carga inicial falló
        return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">Error: {error}</p></div>;
    }

    if (!instruccionOriginal) { // Si no hubo error pero no hay datos (raro)
        return <div className={containerClasses}><p className="text-center text-zinc-400">No se encontraron datos para la instrucción con ID: {instruccionId}.</p></div>;
    }


    return (
        <div className={containerClasses}>

            <div className='mb-5 border-b border-zinc-700 pb-2'> {/* Añadido borde inferior al título */}
                <h2 className="text-xl font-semibold text-white">
                    Editar Instrucción
                </h2>
                {/* Podrías mostrar el ID aquí si quieres */}
                <p className="text-sm text-zinc-400 mt-1">ID: {instruccionId}</p>
            </div>

            {/* Mensajes de estado */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600">{successMessage}</p>}

            {/* Formulario */}
            {/* Usamos grid directamente en el form para el layout de 2 columnas */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>

                {/* Columna 1: Campos principales */}
                <div className="space-y-4"> {/* Agrupa campos de la columna 1 */}

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
                        />
                    </div>


                    {/* Campo Descripción (Opcional, Textarea) */}
                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción (Promesa)</label>
                        <textarea
                            id="descripcion"
                            name="descripcion"
                            value={formData.descripcion || ''}
                            onChange={handleChange}
                            className={`${inputBaseClasses} min-h-[80px]`}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Grupo Trigger / Automatización */}
                    <div className="space-y-4 p-3 bg-zinc-900/30 rounded-md border border-zinc-700">
                        <h3 className="text-sm font-medium text-zinc-400 border-b border-zinc-600 pb-1 mb-3">Configuración de Ejecución</h3>
                        <div>
                            <label htmlFor="trigger" className={labelBaseClasses}>Trigger (Activador del evento)</label>
                            <input
                                type="text"
                                id="trigger"
                                name="trigger"
                                value={formData.trigger || ''}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                disabled={isSubmitting}
                                placeholder="Ej: 'compra_realizada', 'mensaje_recibido'"
                            />
                        </div>

                        <div>
                            <label htmlFor="automatizacion" className={labelBaseClasses}>Automatización (Llamada a función)</label>
                            <input
                                type="text"
                                id="automatizacion"
                                name="automatizacion"
                                value={formData.automatizacion || ''}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                disabled={isSubmitting}
                                placeholder="Ej: 'procesarPedido', 'enviarRespuesta'"

                            />
                        </div>
                    </div>


                    {/* Grupo Versión / Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="version" className={labelBaseClasses}>Versión <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                id="version"
                                name="version"
                                value={formData.version ?? ''}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                required
                                step="0.1"
                                min="0.1"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="status" className={labelBaseClasses}>Status <span className="text-red-500">*</span></label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status || 'activo'}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                required
                                disabled={isSubmitting}
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                    </div>

                </div> {/* Fin Columna 1 */}


                {/* Columna 2: Instrucción Específica */}
                {/* Usamos flex para que el textarea crezca */}
                <div className="flex flex-col h-full">
                    <div>
                        <label htmlFor="instruccion" className={labelBaseClasses}>
                            Instrucción Específica {/* Añadir * si es obligatoria */}
                            {/* {formData.instruccion && <span className="text-red-500">*</span>} */}
                        </label>
                    </div>
                    <textarea
                        id="instruccion"
                        name="instruccion"
                        value={formData.instruccion || ''}
                        onChange={handleChange}
                        // Añadir min-h para asegurar tamaño mínimo, flex-grow para expandir
                        className={`${inputBaseClasses} flex-grow min-h-[250px]`}
                        // required // Añadir si es obligatorio
                        disabled={isSubmitting}
                        placeholder="Describe detalladamente las instrucciones paso a paso..."
                    />
                </div> {/* Fin Columna 2 */}


                {/* Botones de Acción (Fuera del grid principal de columnas, pero dentro del form) */}
                {/* Usamos col-span-full si el form es el grid, o lo ponemos fuera del div grid */}
                <div className="md:col-span-2 pt-5 space-y-2 border-t border-zinc-700"> {/* Ocupa todo el ancho en grid de 2 cols */}
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
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
