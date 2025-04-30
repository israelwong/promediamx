'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerCategorias,
    obtenerTodosCanalesConversacionales,
    crearTarea // Acción ultra-simplificada
} from '@/app/admin/_lib/tareas.actions'; // Ajusta la ruta
// Importar tipos base necesarios
import {
    CategoriaTarea,
    CanalConversacional,
    CrearTareaBasicaInput // Tipo de entrada simplificado
} from '@/app/admin/_lib/types'; // Ajusta la ruta
import { Loader2, Save, XIcon } from 'lucide-react'; // Iconos necesarios

// Tipo para el estado del formulario, solo los campos necesarios
type TareaNuevaFormState = {
    nombre: string;
    categoriaTareaId: string;
    canalConversacionalId: string;
};

export default function TareaNuevaForm() {
    const router = useRouter();

    // Estado del formulario con solo los campos requeridos
    const [formData, setFormData] = useState<TareaNuevaFormState>({
        nombre: '',
        categoriaTareaId: '',
        canalConversacionalId: '',
    });

    // Estados para datos de dropdowns
    const [categorias, setCategorias] = useState<CategoriaTarea[]>([]);
    const [canales, setCanales] = useState<CanalConversacional[]>([]);

    // Estados de UI
    const [loadingData, setLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind
    const labelBaseClasses = "text-zinc-100 block mb-1 text-sm font-medium";
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500";
    const selectBaseClasses = `${inputBaseClasses} appearance-none`;
    const containerClasses = "p-6 mx-auto bg-zinc-800 rounded-lg shadow-md max-w-lg"; // Más pequeño
    const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // --- Carga inicial de datos (solo Categorías y Canales) ---
    const fetchDropdownData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {

            // Obtener solo categorías y canales
            const [catData, canData] = await Promise.all([
                obtenerCategorias(),
                obtenerTodosCanalesConversacionales(),
            ]);

            setCategorias(catData || []);
            setCanales(canData || []);

            // Si solo hay un canal, establecerlo automáticamente
            if (canData?.length === 1) {
                setFormData(prevState => ({
                    ...prevState,
                    canalConversacionalId: canData[0].id,
                }));
            }

        } catch (err) {
            console.error("Error fetching dropdown data:", err);
            setError("Error al cargar datos necesarios para el formulario.");
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    // --- Manejador de Cambios Simplificado ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        setError(null); setSuccessMessage(null);
    };

    // --- Manejador de Submit Simplificado ---
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validaciones básicas
        if (!formData.nombre?.trim()) { setError("El nombre de la tarea es obligatorio."); return; }
        if (!formData.categoriaTareaId) { setError("Debes seleccionar una categoría."); return; }
        if (!formData.canalConversacionalId) { setError("Debes seleccionar un canal principal."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        try {
            // Crear el objeto de datos con los campos requeridos
            const dataToSend: CrearTareaBasicaInput = {
                nombre: formData.nombre.trim(),
                categoriaTareaId: formData.categoriaTareaId,
                canalConversacionalId: formData.canalConversacionalId,
            };

            const result = await crearTarea(dataToSend); // Llamar a la acción simplificada

            if (result.success && result.data) {
                setSuccessMessage(`¡Tarea "${result.data.nombre}" creada! Redirigiendo...`);
                // Redirigir a la edición de la nueva tarea para completar detalles
                setTimeout(() => router.push(`/admin/tareas/${result.data?.id}`), 1500);
            } else {
                throw new Error(result.error || "Error desconocido al crear la tarea.");
            }

        } catch (err) {
            console.error("Error creating tarea:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear la tarea: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/admin/tareas'); // Volver a la lista
    };

    // --- Renderizado ---
    if (loadingData) {
        return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando datos...</p></div>;
    }

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-700 pb-3">Crear Nueva Tarea (Básico)</h2>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Tarea <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Generar Cliente Potencial Web"
                    />
                </div>

                {/* Categoría */}
                <div>
                    <label htmlFor="categoriaTareaId" className={labelBaseClasses}>Categoría <span className="text-red-500">*</span></label>
                    <select
                        id="categoriaTareaId"
                        name="categoriaTareaId"
                        value={formData.categoriaTareaId}
                        onChange={handleChange}
                        className={selectBaseClasses}
                        required
                        disabled={isSubmitting}
                    >
                        <option value="">-- Selecciona una Categoría --</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Canal Principal */}
                <div>
                    <label htmlFor="canalConversacionalId" className={labelBaseClasses}>Canal conversacional <span className="text-red-500">*</span></label>
                    {canales.length === 1 ? (
                        <div className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-md p-2">
                            {canales[0].nombre}
                        </div>
                    ) : (
                        <select
                            id="canalConversacionalId"
                            name="canalConversacionalId"
                            value={formData.canalConversacionalId}
                            onChange={handleChange}
                            className={selectBaseClasses}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">-- Selecciona un Canal --</option>
                            {canales.map(canal => (
                                <option key={canal.id} value={canal.id}>{canal.nombre}</option>
                            ))}
                        </select>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">Canal por defecto para esta tarea.</p>
                </div>


                {/* --- Botones y Mensajes --- */}
                <div className="pt-5 space-y-3 border-t border-zinc-700 mt-6">
                    {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                    {successMessage && <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className={`${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500 order-2 sm:order-1`}
                            disabled={isSubmitting}
                        >
                            <XIcon size={18} /> Cancelar
                        </button>
                        <button
                            type="submit"
                            className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 order-1 sm:order-2 w-full`}
                            disabled={isSubmitting || loadingData}
                        >
                            {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                            Crear Tarea y Continuar
                        </button>
                    </div>
                    <p className="text-xs text-center text-zinc-400 mt-2">Podrás configurar los detalles adicionales después de crear la tarea.</p>
                </div>
            </form>
        </div>
    );
}
