'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { obtenerHabilidad, actualizarHabilidad } from '@/app/admin/_lib/habilidades.actions'; // Importar acción de actualizar
import { Habilidad } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';

interface Props {
    habilidadId: string;
}

// Estado inicial vacío para el formulario antes de cargar datos
const initialFormData: Partial<Habilidad> = {};

export default function HabilidadEditarForm({ habilidadId }: Props) {
    const router = useRouter();
    const [habilidadOriginal, setHabilidadOriginal] = useState<Habilidad | null>(null); // Guardar original por si acaso
    const [formData, setFormData] = useState<Partial<Habilidad>>(initialFormData); // Estado para los datos del formulario
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Estado para el envío
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"; // Estilo base input/select/textarea
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px]"; // Estilo para valores no editables
    const containerClasses = "p-4 mx-auto bg-zinc-800 rounded-lg shadow-md"; // Aumentado max-w para 3 columnas
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    useEffect(() => {
        if (!habilidadId) {
            setError("No se proporcionó un ID de habilidad.");
            setLoading(false);
            return;
        }

        const fetchHabilidad = async () => {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const data = await obtenerHabilidad(habilidadId);
                if (data) {
                    setHabilidadOriginal(data); // Guardar los datos originales
                    setFormData(data);         // Poblar el formulario con los datos cargados
                } else {
                    setError(`No se encontró la habilidad con ID: ${habilidadId}`);
                    setHabilidadOriginal(null);
                    setFormData(initialFormData);
                }
            } catch (err) {
                console.error("Error fetching habilidad:", err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`Error al cargar la habilidad: ${errorMessage}`);
                setHabilidadOriginal(null);
                setFormData(initialFormData);
            } finally {
                setLoading(false);
            }
        };

        fetchHabilidad();
    }, [habilidadId]);

    // Manejador de cambios en los inputs del formulario
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        const finalValue = (type === 'number')
            ? (value === '' ? null : parseFloat(value))
            : value;

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador para el envío del formulario (actualización)
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData || !habilidadId) {
            setError("No hay datos para actualizar o falta el ID.");
            return;
        }

        if (!formData.nombre || formData.nombre.trim() === '') {
            setError("El nombre no puede estar vacío.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const dataToUpdate: Habilidad = {
                ...habilidadOriginal,
                ...formData,
                id: habilidadId,
                nombre: formData.nombre || '',
                precio: typeof formData.precio === 'string' ? parseFloat(formData.precio) || 0 : formData.precio ?? 0,
                version: typeof formData.version === 'string' ? parseInt(formData.version, 10) || 1 : formData.version ?? 1,
                status: formData.status || 'activo',
            };

            await actualizarHabilidad(habilidadId, dataToUpdate);
            setSuccessMessage("Habilidad actualizada correctamente.");
            setHabilidadOriginal(dataToUpdate);
            // router.refresh(); // Opcional: Refrescar datos

        } catch (err) {
            console.error("Error updating habilidad:", err);
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(`Error al actualizar la habilidad: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para el botón Cancelar
    const handleCancel = () => {
        router.back();
    };

    // --- Renderizado ---

    if (loading) {
        return <div className={containerClasses}><p className="text-center text-zinc-300">Cargando formulario de edición...</p></div>;
    }

    if (!habilidadOriginal && error) {
        return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">Error: {error}</p></div>;
    }

    if (!habilidadOriginal) {
        return <div className={containerClasses}><p className="text-center text-zinc-400">No se encontraron datos para la habilidad con ID: {habilidadId}.</p></div>;
    }


    return (
        <div className={containerClasses}>
            {/* Cabecera con Título y Status */}
            <div className='border-b border-zinc-700 pb-2 grid grid-cols-2 gap-4 items-center justify-center mb-5'>
                <h2 className="text-xl font-semibold text-white self-center">
                    Configuración de la Habilidad
                </h2>
                <div className="flex items-center justify-end h-full self-center">
                    <label htmlFor="status" className={`${labelBaseClasses} mr-2`}>Status</label>
                    <div className="flex items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="status"
                                name="status"
                                checked={formData.status === 'activo'}
                                onChange={(e) => handleChange({
                                    target: {
                                        name: 'status',
                                        value: e.target.checked ? 'activo' : 'inactivo',
                                        type: 'checkbox',
                                    },
                                } as ChangeEvent<HTMLInputElement>)}
                                className="sr-only peer"
                                disabled={isSubmitting}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:ring-4 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Contenedor Principal del Grid de 3 Columnas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5"> {/* Aplicar grid aquí */}

                    {/* Columna 1: Datos Generales */}
                    <div className="space-y-4 md:col-span-1">
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

                        <div>
                            <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                            <textarea
                                id="descripcion"
                                name="descripcion"
                                value={formData.descripcion || ''}
                                onChange={handleChange}
                                className={`${inputBaseClasses} min-h-[80px]`}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="palabraClave" className={labelBaseClasses}>Palabra Clave</label>
                            <input
                                type="text"
                                id="palabraClave"
                                name="palabraClave"
                                value={formData.palabraClave || ''}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Origen y Versión en la misma columna */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="origen" className={labelBaseClasses}>Origen</label>
                                <select
                                    id="origen"
                                    name="origen"
                                    value={formData.origen || ''}
                                    onChange={handleChange}
                                    className={inputBaseClasses}
                                    disabled={isSubmitting}
                                >
                                    <option value="">Selecciona un origen</option>
                                    <option value="sistema">Sistema</option>
                                    <option value="cliente">Cliente</option>
                                </select>
                            </div>

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
                                    min="1"
                                    step="1"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        {/* Fechas */}

                        <div>
                            <label className={labelBaseClasses}>Fecha de Creación</label>
                            <div className={valueDisplayClasses}>{formData.createdAt ? new Date(formData.createdAt).toLocaleString() : 'N/A'}</div>
                        </div>
                        <div>
                            <label className={labelBaseClasses}>Última Actualización</label>
                            <div className={valueDisplayClasses}>{formData.updatedAt ? new Date(formData.updatedAt).toLocaleString() : 'N/A'}</div>
                        </div>


                        {/* Campo Precio */}
                        <div>
                            <label htmlFor="precio" className={labelBaseClasses}>Precio</label>
                            <input
                                type="number"
                                id="precio"
                                name="precio"
                                value={formData.precio ?? ''}
                                onChange={handleChange}
                                className={inputBaseClasses}
                                step="0.01"
                                min="0"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div> {/* Fin Columna 1 */}


                    {/* Columna 2: Rol */}
                    <div className="md:col-span-1 flex flex-col h-full">
                        <div>
                            <label htmlFor="rol" className={labelBaseClasses}>Define el rol del asistente</label>
                        </div>
                        <textarea
                            id="rol"
                            name="rol"
                            value={formData.rol || ''}
                            onChange={handleChange}
                            className={`${inputBaseClasses} flex-grow`}
                            disabled={isSubmitting}
                        />
                    </div>


                    {/* Columna 3: Personalidad */}
                    <div className="md:col-span-1 flex flex-col h-full">
                        <div>
                            <label htmlFor="personalidad" className={labelBaseClasses}>Personalidad</label>
                        </div>
                        <textarea
                            id="personalidad"
                            name="personalidad"
                            value={formData.personalidad || ''}
                            onChange={handleChange}
                            className={`${inputBaseClasses} flex-grow`}
                            disabled={isSubmitting}
                        />
                    </div>{/* Fin Columna 3 */}

                </div> {/* Fin del Grid Principal */}


                {/* Botones de Acción (Fuera del grid principal) */}
                <div className="pt-5 space-y-2 border-t border-zinc-700 mb-5">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting}
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

                {/* Mensajes de estado (Error o Éxito) */}
                {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600">{error}</p>}
                {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600">{successMessage}</p>}

            </form>
        </div>
    );
}
