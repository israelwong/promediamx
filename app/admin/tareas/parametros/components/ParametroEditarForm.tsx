'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Importar acciones y tipos para Parámetros
import {
    obtenerParametro,
    actualizarParametro,
    eliminarParametro
} from '@/app/admin/_lib/parametros.actions'; // Asumiendo acciones en este path
import { ParametroRequerido } from '@/app/admin/_lib/types';
import { Loader2, Trash2 } from 'lucide-react'; // Iconos

import InstruccionParametros from './InstruccionParametros';

interface Props {
    parametroId: string;
}

// Tipo para los datos editables en ESTE formulario
// Omitimos campos no editables/relevantes aquí (id, tareaId, habilidadId, orden, status, createdAt, updatedAt)
type ParametroEditFormData = Pick<ParametroRequerido,
    'nombre' | 'tipoDato' | 'descripcion' | 'esRequerido'
>;

export default function ParametroEditarForm({ parametroId }: Props) {
    const router = useRouter();

    const [parametroOriginal, setParametroOriginal] = useState<ParametroRequerido | null>(null);
    // Estado para los datos del formulario
    const [formData, setFormData] = useState<Partial<ParametroEditFormData>>({}); // Empezar vacío
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [tareaIdContext, setTareaIdContext] = useState<string | null>(null); // Para mostrar ID de tarea asociada

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300";
    const containerClasses = "p-4 max-w-4xl mx-auto"; // Ancho para 2 columnas
    const formContainerClasses = "p-6 bg-zinc-800 rounded-lg shadow-md";
    const instructionsContainerClasses = "p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md text-zinc-300 text-sm";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // --- Efecto para cargar datos ---
    useEffect(() => {
        if (!parametroId) {
            setError("No se proporcionó un ID de parámetro.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const fetchDatos = async () => {
            try {
                const data = await obtenerParametro(parametroId);
                if (data) {
                    setParametroOriginal(data);
                    setTareaIdContext(data.tareaId); // Guardar tareaId para mostrarlo
                    // Poblar formData solo con los campos editables
                    setFormData({
                        nombre: data.nombre,
                        tipoDato: data.tipoDato,
                        descripcion: data.descripcion,
                        esRequerido: data.esRequerido,
                    });
                } else {
                    setError(`No se encontró el parámetro con ID: ${parametroId}`);
                    setParametroOriginal(null); setFormData({}); setTareaIdContext(null);
                }
            } catch (err) {
                console.error("Error al obtener el parámetro:", err);
                setError("No se pudo cargar el parámetro.");
                setParametroOriginal(null); setFormData({}); setTareaIdContext(null);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();

        // Cleanup
        return () => {
            setParametroOriginal(null); setFormData({}); setLoading(true); setError(null); setTareaIdContext(null);
        };
    }, [parametroId]);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const finalValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;

        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación
        if (!formData.nombre?.trim() || !formData.tipoDato) {
            setError("Nombre y Tipo de Dato son obligatorios."); return;
        }
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto solo con los datos editables
            const dataToSend: ParametroEditFormData = {
                nombre: formData.nombre.trim(),
                tipoDato: formData.tipoDato,
                descripcion: formData.descripcion?.trim() || null,
                esRequerido: formData.esRequerido ?? false, // Asegurar que sea boolean
            };
            // Llamar a la acción de actualizar
            // Pasar el tipo completo puede ser necesario si la acción lo espera,
            // pero solo actualizará los campos definidos en la acción.
            await actualizarParametro(parametroId, dataToSend as ParametroRequerido).then(() => {
                router.push(`/admin/IA/tareas/${parametroOriginal?.tareaId}`); // Redirigir a la vista de detalle del parámetro
            });

            // Actualizar el estado original local si es necesario
            setParametroOriginal(prev => prev ? { ...prev, ...dataToSend } : null);
        } catch (err) {
            console.error("Error updating parametro:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar el parámetro: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        // Volver a la página anterior (probablemente TareaEditarForm)
        router.back();
    };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar este Parámetro?")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await eliminarParametro(parametroId).then(() => {
                    router.push(`/admin/IA/tareas/${parametroOriginal?.tareaId}`); // Redirigir a la vista de detalle del parámetro
                });
            } catch (err) {
                console.error("Error deleting parametro:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al eliminar el parámetro: ${errorMessage}`);
                setIsSubmitting(false); // Reactivar botones si hay error
            }
        }
    };

    // --- Renderizado ---
    if (loading) {
        return <div className={`${formContainerClasses} max-w-lg mx-auto`}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando parámetro...</p></div>;
    }
    if (error && !parametroOriginal) {
        return (
            <div className={`${formContainerClasses} max-w-lg mx-auto border border-red-500`}>
                <p className="text-center text-red-400">{error}</p>
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 mt-4`}>Volver</button>
            </div>
        );
    }
    if (!parametroOriginal) {
        // Si no hubo error pero no hay datos (ej: ID inválido)
        return (
            <div className={`${formContainerClasses} max-w-lg mx-auto`}>
                <p className="text-center text-zinc-400">No se encontró el parámetro.</p>
                <button onClick={() => router.back()} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 mt-4`}>Volver</button>
            </div>
        );
    }

    return (
        // Contenedor principal con Grid para 2 columnas
        <div className={`${containerClasses} grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8`}>

            {/* Columna 1: Formulario */}
            <div className={formContainerClasses}>
                <h2 className="text-xl font-semibold text-white mb-1">Editar Parámetro</h2>
                <div className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2 space-y-0.5">
                    <p>Parámetro ID: <span className='font-mono text-zinc-300'>{parametroId}</span></p>
                    {tareaIdContext && <p>Asociado a Tarea ID: <span className='font-mono text-zinc-300'>{tareaIdContext}</span></p>}
                </div>


                {/* Mensajes de estado */}
                {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Campos Editables */}
                    <div>
                        <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Parámetro <span className="text-red-500">*</span></label>
                        <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} placeholder="Ej: id_cliente, fecha_consulta" />
                        <p className="text-xs text-zinc-500 mt-1">Identificador único para este parámetro.</p>
                    </div>

                    <div>
                        <label htmlFor="tipoDato" className={labelBaseClasses}>Tipo de Dato <span className="text-red-500">*</span></label>
                        <select id="tipoDato" name="tipoDato" value={formData.tipoDato || 'texto'} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting}>
                            <option value="texto">Texto (String)</option>
                            <option value="numero">Número (Number)</option>
                            <option value="fecha">Fecha (Date)</option>
                            <option value="booleano">Booleano (Boolean)</option>
                            {/* <option value="json">JSON (Object/Array)</option> */}
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">Importante para validación en sistema.</p>
                    </div>

                    <div>
                        <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                        <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} placeholder="Explica qué representa este parámetro..." />
                        <p className="text-xs text-zinc-500 mt-1">Se usará para describir el parámetro a la IA.</p>
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                        <input type="checkbox" id="esRequerido" name="esRequerido" checked={formData.esRequerido || false} onChange={handleChange} className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50" disabled={isSubmitting} />
                        <label htmlFor="esRequerido" className={checkboxLabelClasses}>¿Es Requerido?</label>
                        <p className="text-xs text-zinc-500">(Marcar si este parámetro es obligatorio)</p>
                    </div>

                    {/* Campos Omitidos: orden, status, fechas */}

                    {/* Botones de Acción */}
                    <div className="pt-5 space-y-2 border-t border-zinc-700">
                        <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting}>
                            {isSubmitting && !error ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : 'Guardar Cambios'}
                        </button>
                        <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                            Cancelar
                        </button>
                        {/* Botón Eliminar */}
                        <div className="flex justify-center pt-2">
                            <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                                <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Parámetro</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Columna 2: Instrucciones (Reutilizada de ParametroNuevoForm) */}
            <div className={instructionsContainerClasses}>
                <InstruccionParametros />
            </div>

        </div>
    );
}
