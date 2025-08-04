'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Info, ListChecks } from 'lucide-react';

// Rutas y Tipos/Schemas (como los definimos en la respuesta anterior)
import { crearAsistenteVirtualAction } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.actions';
import type { CrearAsistenteFormInput } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.schemas';

import { obtenerTareasBaseAction } from '@/app/admin/_lib/actions/tarea/tarea.actions';
import type { TareaBaseInfoData } from '@/app/admin/_lib/actions/tarea/tarea.schemas';

interface Props {
    negocioId: string;
    clienteId: string;
}

const initialFormData: CrearAsistenteFormInput = {
    nombre: '',
    descripcion: null,
    negocioId: '',
    clienteId: '',
};

export default function AsistenteNuevoForm({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<CrearAsistenteFormInput>({
        ...initialFormData,
        negocioId,
        clienteId,
    });
    const [tareasBase, setTareasBase] = useState<TareaBaseInfoData[]>([]);
    const [loadingTareas, setLoadingTareas] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchTareas = async () => {
            setLoadingTareas(true);
            const result = await obtenerTareasBaseAction();
            if (result.success && result.data) {
                setTareasBase(result.data);
            } else {
                console.error("Error fetching base tasks:", result.error);
                setError(result.error || "No se pudieron cargar las tareas incluidas por defecto.");
            }
            setLoadingTareas(false);
        };
        fetchTareas();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre?.trim()) {
            setError("El nombre del asistente es obligatorio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const dataToSend: CrearAsistenteFormInput = {
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion,
            negocioId: negocioId,
            clienteId: clienteId,
        };

        const result = await crearAsistenteVirtualAction(dataToSend);

        if (result.success && result.data) {
            setSuccessMessage("¡Asistente creado con éxito! Redirigiendo a edición...");
            // Usamos un timeout corto para que el usuario alcance a ver el mensaje de éxito
            // antes de la redirección, especialmente si la red es rápida.
            setTimeout(() => {
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${result.data!.id}`);
            }, 1500); // 1.5 segundos
        } else {
            console.error("Error creating asistente:", result.error, result.errorDetails);
            const errorMsg = result.errorDetails
                ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                : result.error || "Ocurrió un error desconocido.";
            setError(`Error al crear el asistente: ${errorMsg}`);
            setIsSubmitting(false); // Re-habilitar el botón si hay error
        }
        // No poner setIsSubmitting(false) en un finally aquí si la redirección ocurre antes
        // y desmonta el componente, aunque con el setTimeout ya no sería un problema inmediato.
    };

    // --- Clases de Tailwind para estilos ---
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-6 sm:p-8";
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-70";
    const buttonClasses = "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50"; // Ajustado ring-offset
    const taskListContainerClasses = "mt-6 border-t border-zinc-700 pt-5";
    // MODIFICADO: Eliminado max-h-40, overflow-y-auto y pr-2
    const taskListClasses = "mt-3 space-y-1.5";
    const taskItemClasses = "text-xs text-zinc-400 pl-4 relative before:content-['▪'] before:absolute before:left-0 before:text-blue-400";

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-0">
            <h2 className="text-2xl font-semibold text-center text-white mb-6">Crear Nuevo Asistente Virtual</h2>
            <div className={cardClasses}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nombre" className={labelClasses}>
                            Nombre del Asistente <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            id="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className={inputClasses}
                            required
                            disabled={isSubmitting}
                            placeholder="Ej: Asistente de Ventas"
                        />
                    </div>
                    <div>
                        <label htmlFor="descripcion" className={labelClasses}>
                            Descripción (Opcional)
                        </label>
                        <textarea
                            name="descripcion"
                            id="descripcion"
                            rows={3}
                            value={formData.descripcion || ''}
                            onChange={handleChange}
                            className={inputClasses}
                            disabled={isSubmitting}
                            placeholder="Describe brevemente el propósito de este asistente..."
                        />
                    </div>

                    <div className={taskListContainerClasses}>
                        <div className="mb-3"> {/* Contenedor para el título y el contador */}
                            <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                <ListChecks size={16} className="text-green-400" />
                                Tareas Base Incluidas:
                            </h3>
                            {/* NUEVO: Mostrar cantidad de tareas base */}
                            {!loadingTareas && tareasBase.length > 0 && (
                                <p className="text-xs text-zinc-400 mt-1">
                                    Se suscribirán automáticamente <span className="font-semibold text-blue-400">{tareasBase.length}</span> Tarea(s) Base a tu nuevo asistente.
                                </p>
                            )}
                        </div>

                        {loadingTareas ? (
                            <p className="text-xs text-zinc-500 italic flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Cargando tareas...</p>
                        ) : tareasBase.length > 0 ? (
                            <ul className={taskListClasses}>
                                {tareasBase.map(tarea => (
                                    <li key={tarea.id} className={taskItemClasses} title={tarea.descripcion || ''}>
                                        {tarea.nombre}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-zinc-500 italic">No hay tareas base definidas o activas para suscribir automáticamente.</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-3"> {/* Aumentado margen superior */}
                            <Info size={13} className="inline-block mr-1 -mt-0.5 text-blue-400 flex-shrink-0" />
                            Podrás gestionar estas y otras tareas en la página de edición del asistente después de crearlo.
                        </p>
                    </div>

                    {error && <p className="text-sm text-red-400 text-center border border-red-600 bg-red-900/30 p-2 rounded">{error}</p>}
                    {successMessage && <p className="text-sm text-green-400 text-center border border-green-600 bg-green-900/30 p-2 rounded">{successMessage}</p>}

                    <div>
                        <button
                            type="submit"
                            className={buttonClasses}
                            disabled={isSubmitting || !formData.nombre.trim() || !!successMessage /* Deshabilitar si hay mensaje de éxito para evitar doble submit */}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />Creando Asistente...</>
                            ) : ('Crear Asistente y Continuar a Edición')}
                        </button>
                        <button
                            type="button"
                            className={`${buttonClasses} mt-3 bg-zinc-600 hover:bg-zinc-700`}
                            onClick={() => router.back()}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}