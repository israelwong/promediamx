'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Info, ListChecks } from 'lucide-react';
import { crearAsistenteVirtual } from '@/app/admin/_lib/asistenteVirtual.actions'; // Ajusta ruta
// Asegúrate que la acción obtenerTareasBase esté exportada desde el archivo correcto
import { obtenerTareasBase } from '@/app/admin/_lib/tareas.actions'; // Importa la nueva acción
import { Tarea } from '@/app/admin/_lib/types'; // Ajusta ruta y tipos

interface Props {
    negocioId: string;
    clienteId: string; // Necesitamos el clienteId también
}

// Tipo para las tareas base que vamos a mostrar
type TareaBaseInfo = Pick<Tarea, 'id' | 'nombre' | 'descripcion'>;

export default function AsistenteNuevoForm({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
    const [tareasBase, setTareasBase] = useState<TareaBaseInfo[]>([]);
    const [loadingTareas, setLoadingTareas] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Define el precio base como una constante para fácil referencia
    const PRECIO_BASE_FIJO = 499;

    // Cargar tareas base al montar el componente
    useEffect(() => {
        const fetchTareas = async () => {
            setLoadingTareas(true);
            try {
                // Llama a la acción del servidor para obtener tareas base
                const data = await obtenerTareasBase();
                setTareasBase(data);
            } catch (err) {
                console.error("Error fetching base tasks:", err);
                // Opcional: Podrías mostrar un error al usuario si falla la carga
                setError("No se pudieron cargar las tareas incluidas.");
            } finally {
                setLoadingTareas(false);
            }
        };
        fetchTareas();
    }, []); // El array vacío asegura que se ejecute solo una vez al montar

    // Manejador de cambios simple para los inputs del formulario
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null); // Limpiar error al escribir
    };

    // Manejador de envío del formulario
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validaciones básicas
        if (!formData.nombre?.trim()) {
            setError("El nombre del asistente es obligatorio.");
            return;
        }
        if (!negocioId || !clienteId) {
            setError("Error interno: Falta la referencia al negocio o al cliente.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Prepara solo los datos mínimos necesarios para la acción
            // La acción `crearAsistenteVirtual` se encargará de los valores por defecto (precio, versión, status, origen) y de suscribir las tareas base.
            const dataToSend = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                negocioId: negocioId,
                clienteId: clienteId,
            };

            // Llama a la acción del servidor actualizada
            const nuevoAsistente = await crearAsistenteVirtual(dataToSend);

            setSuccessMessage("¡Asistente creado con éxito! Redirigiendo...");
            // Redirige a la página de edición del asistente recién creado
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${nuevoAsistente.id}`);

        } catch (err) {
            console.error("Error creating asistente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el asistente: ${errorMessage}`);
            setIsSubmitting(false); // Re-habilita el botón si hay error
        }
        // No poner finally aquí si la redirección ocurre antes y desmonta el componente
    };

    // --- Clases de Tailwind para estilos ---
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-6 sm:p-8";
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-70";
    const buttonClasses = "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-500 disabled:opacity-50";
    const infoBoxClasses = "mt-6 p-4 bg-gradient-to-r from-zinc-700/40 to-zinc-800/20 border border-zinc-700 rounded-lg text-sm text-zinc-300 shadow-inner";
    const taskListContainerClasses = "mt-6 border-t border-zinc-700 pt-5";
    const taskListClasses = "mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-2"; // Limitar altura y añadir scroll
    const taskItemClasses = "text-xs text-zinc-400 pl-4 relative before:content-['▪'] before:absolute before:left-0 before:text-blue-400"; // Usar un cuadrado pequeño

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-0"> {/* Centrar y añadir padding horizontal en móvil */}
            <h2 className="text-2xl font-semibold text-center text-white mb-6">Crear Nuevo Asistente Virtual</h2>
            <div className={cardClasses}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nombre del Asistente */}
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
                            placeholder="Ej: Asistente de Ventas Ropa"
                        />
                    </div>

                    {/* Descripción (Opcional) */}
                    <div>
                        <label htmlFor="descripcion" className={labelClasses}>
                            Descripción (Opcional)
                        </label>
                        <textarea
                            name="descripcion"
                            id="descripcion"
                            rows={3}
                            value={formData.descripcion}
                            onChange={handleChange}
                            className={inputClasses}
                            disabled={isSubmitting}
                            placeholder="Describe brevemente el propósito de este asistente..."
                        />
                    </div>

                    {/* --- NUEVO: Información de Precio y Facturación --- */}
                    <div className={infoBoxClasses}>
                        <p className="font-medium text-zinc-100 mb-2">
                            Precio Base Mensual: ${PRECIO_BASE_FIJO.toFixed(2)} MXN
                        </p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            <Info size={14} className="inline-block mr-1.5 -mt-0.5 text-blue-400 flex-shrink-0" />
                            <span>La facturación es el día 1 de cada mes. Al crear hoy, se cobrará la parte proporcional por los días restantes hasta el próximo día 1, además de la primera mensualidad completa.</span>
                        </p>
                    </div>

                    {/* --- NUEVO: Tareas Base Incluidas --- */}
                    <div className={taskListContainerClasses}>
                        <h3 className="text-sm font-medium text-zinc-200 mb-2 flex items-center gap-2">
                            <ListChecks size={16} className="text-green-400" /> Tareas Base Incluidas:
                        </h3>
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
                            <p className="text-xs text-zinc-500 italic">No hay tareas base definidas o activas en este momento.</p>
                        )}
                    </div>


                    {/* Mensajes de Error/Éxito */}
                    {error && <p className="text-sm text-red-400 text-center border border-red-600 bg-red-900/30 p-2 rounded">{error}</p>}
                    {successMessage && <p className="text-sm text-green-400 text-center border border-green-600 bg-green-900/30 p-2 rounded">{successMessage}</p>}

                    {/* Botón de Envío */}
                    <div>
                        <button
                            type="submit"
                            className={buttonClasses}
                            disabled={isSubmitting || !formData.nombre.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                    Creando Asistente...
                                </>
                            ) : (
                                'Crear Asistente y Continuar'
                            )}
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
