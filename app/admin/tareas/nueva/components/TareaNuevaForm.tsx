// app/admin/tareas/nueva/components/TareaNuevaForm.tsx
'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Importar acciones refactorizadas
import {
    crearTarea,
    obtenerCategoriasParaFiltro,
} from '@/app/admin/_lib/tareas.actions'; // Ajusta la ruta a tus acciones de tareas
import {
    obtenerCanalesActivos
} from '@/app/admin/_lib/canalConversacional.actions'; // Ajusta la ruta a tus acciones de canales

// Importar tipos CENTRALIZADOS (¡Ahora son los explícitos!)
import {
    CrearTareaBasicaInput,   // Tipo explícito para el estado del formulario
    CategoriaTareaSimple,    // Tipo explícito para estado de categorías
    CanalConversacionalSimple // Tipo explícito para estado de canales
    // Importa ActionResult si lo necesitas manejar directamente en el componente
    // import { ActionResult } from '@/app/admin/_lib/types';
} from '@/app/admin/_lib/types'; // <-- AJUSTA LA RUTA a tu types.ts central

// Importar componentes UI y Iconos
import { Loader2, Save, XIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button'; // Ajusta ruta
import { Input } from '@/app/components/ui/input'; // Ajusta ruta
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'; // Usar Select de shadcn/ui

// Tipo para el estado del formulario, coincide con CrearTareaBasicaInput
type TareaNuevaFormState = CrearTareaBasicaInput;

export default function TareaNuevaForm() {
    const router = useRouter();

    // Estado del formulario con tipo explícito
    const [formData, setFormData] = useState<TareaNuevaFormState>({
        nombre: '',
        categoriaTareaId: '',
        canalConversacionalId: '',
    });

    // Estados para datos de dropdowns (usan tipos explícitos)
    const [categorias, setCategorias] = useState<CategoriaTareaSimple[]>([]);
    const [canales, setCanales] = useState<CanalConversacionalSimple[]>([]);

    // Estados de UI
    const [loadingData, setLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios)
    const containerClasses = "p-6 mx-auto bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md max-w-lg";
    const labelBaseClasses = "text-zinc-100 block mb-1 text-sm font-medium";
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500";
    const selectTriggerClasses = `${inputBaseClasses} flex justify-between items-center`;
    const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // --- Carga inicial de datos (Usa las acciones refactorizadas) ---
    const fetchDropdownData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            // Obtener categorías y canales en paralelo
            const [catResult, canResult] = await Promise.all([
                obtenerCategoriasParaFiltro(), // Llama acción que devuelve ActionResult
                obtenerCanalesActivos()      // Llama acción que devuelve ActionResult
            ]);

            // Manejar resultado de categorías
            if (catResult.success) {
                setCategorias(catResult.data || []);
            } else {
                console.error("Error cargando categorías:", catResult.error);
                // Podrías lanzar un error aquí para detener la carga si las categorías son esenciales
                // throw new Error(catResult.error || "Error cargando categorías.");
            }

            // Manejar resultado de canales
            if (Array.isArray(canResult)) {
                const canalesData = canResult || [];
                setCanales(canalesData);
                // Si solo hay un canal, seleccionarlo automáticamente
                if (canalesData.length === 1) {
                    // Actualiza el estado del formulario de forma segura
                    setFormData(prevState => ({
                        ...prevState,
                        canalConversacionalId: canalesData[0].id,
                    }));
                }
            } else {
                console.error("Error cargando canales: No se pudo obtener la lista de canales.");
                // Podrías lanzar un error aquí también
                // throw new Error(canResult.error || "Error cargando canales.");
            }

            // Si alguna de las cargas falló (y no lanzaste error antes), muestra un error general
            if (!catResult.success) {
                // Manejar error de categorías
                throw new Error(catResult.error || "No se pudieron cargar las categorías necesarias para el formulario.");
            }

        } catch (err: unknown) { // Captura cualquier error lanzado
            console.error("Error fetching dropdown data:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos necesarios.");
            setCategorias([]); // Asegurar estado vacío en error
            setCanales([]);
        } finally {
            setLoadingData(false);
        }
    }, []); // Sin dependencias externas

    // Ejecuta la carga de datos al montar
    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]); // Incluye fetchData como dependencia

    // --- Manejador de Cambios (Input) ---
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        // Limpiar mensajes al cambiar cualquier campo
        setError(null);
        setSuccessMessage(null);
    };

    // --- Manejador para Select de shadcn/ui ---
    // Asegura que el nombre coincida con una clave de TareaNuevaFormState
    const handleSelectChange = (name: keyof TareaNuevaFormState, value: string) => {
        setFormData(prevState => ({
            ...prevState,
            // Asigna el valor; si es string vacío, se mantiene así
            [name]: value,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // --- Manejador de Submit (Usa la acción refactorizada) ---
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevenir recarga de página

        // Validaciones básicas del lado del cliente (mejor UX)
        if (!formData.nombre?.trim()) {
            setError("El nombre de la tarea es obligatorio.");
            return; // Detener si falta nombre
        }
        if (!formData.categoriaTareaId) {
            setError("Debes seleccionar una categoría.");
            return; // Detener si falta categoría
        }
        if (!formData.canalConversacionalId) {
            setError("Debes seleccionar un canal conversacional principal.");
            return; // Detener si falta canal
        }

        // Iniciar estado de envío
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // El estado formData ya coincide con CrearTareaBasicaInput
            const result = await crearTarea(formData); // Llamar a la acción

            // Manejar el resultado de la acción (ActionResult)
            if (result.success && result.data) {
                // Éxito: Mostrar mensaje y redirigir
                setSuccessMessage(`¡Tarea "${result.data.nombre}" creada! Redirigiendo a edición...`);
                // Redirigir a la página de edición de la nueva tarea después de un breve retraso
                setTimeout(() => {
                    router.push(`/admin/tareas/${result.data?.id}`); // Ajusta la ruta según tu estructura
                }, 1500); // 1.5 segundos de retraso
            } else {
                // Falla: Mostrar el error devuelto por la acción
                throw new Error(result.error || "Error desconocido al crear la tarea.");
            }

        } catch (err: unknown) { // Capturar errores (incluyendo los lanzados desde el bloque 'else')
            console.error("Error creating tarea:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            // Mostrar error en la UI
            setError(`Error al crear la tarea: ${errorMessage}`);
        } finally {
            // Finalizar estado de envío, independientemente del resultado
            setIsSubmitting(false);
        }
    };

    // --- Manejador para Cancelar ---
    const handleCancel = () => {
        router.push('/admin/tareas'); // Volver a la lista de tareas (ajusta ruta)
    };

    // --- Renderizado Condicional (Carga y Error Inicial) ---
    if (loadingData) {
        return (
            <div className={containerClasses}>
                <p className="text-center text-zinc-300 flex items-center justify-center gap-2">
                    <Loader2 className='animate-spin' size={18} /> Cargando datos del formulario...
                </p>
            </div>
        );
    }

    // Mostrar error si falló la carga inicial de datos (categorías/canales)
    // Nota: El error de envío se maneja dentro del formulario.
    if (error && !isSubmitting && categorias.length === 0 && canales.length === 0) {
        return (
            <div className={`${containerClasses} border border-red-500`}>
                <p className="text-center text-red-400 mb-4">{error}</p>
                <Button onClick={() => router.back()} variant="secondary">
                    Volver
                </Button>
            </div>
        );
    }

    // --- Renderizado del Formulario ---
    return (

        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-700 pb-3">
                Crear Nueva Tarea (Paso 1 de 2)
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Campo Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre Tarea <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        id="nombre"
                        name="nombre" // Importante para handleChange
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Agendar Demostración Producto X"
                        aria-describedby="nombre-help"
                    />
                    <p id="nombre-help" className="text-xs text-zinc-400 mt-1">Nombre descriptivo y único para la tarea.</p>
                </div>

                {/* Campo Categoría (Select) */}
                <div>
                    <label htmlFor="categoriaTareaId-select" className={labelBaseClasses}>
                        Categoría <span className="text-red-500">*</span>
                    </label>
                    <Select
                        // Usa el valor del estado o undefined si está vacío
                        value={formData.categoriaTareaId || undefined}
                        // Llama a handleSelectChange con el nombre del campo y el nuevo valor
                        onValueChange={(value) => handleSelectChange('categoriaTareaId', value)}
                        disabled={isSubmitting || categorias.length === 0} // Deshabilitar si envía o no hay opciones
                    >
                        <SelectTrigger id="categoriaTareaId-select" className={selectTriggerClasses} aria-label="Seleccionar categoría">
                            <SelectValue placeholder="-- Selecciona una Categoría --" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* Opción placeholder no seleccionable (si se desea) */}
                            {/* <SelectItem value="" disabled>-- Selecciona una Categoría --</SelectItem> */}
                            {categorias.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Mensaje si no hay categorías */}
                    {categorias.length === 0 && !loadingData && (
                        <p className="text-xs text-amber-400 mt-1">No hay categorías disponibles. Crea una primero.</p>
                    )}
                </div>

                {/* Campo Canal Principal (Select o Texto) */}
                <div>
                    <label htmlFor="canalConversacionalId-select" className={labelBaseClasses}>
                        Canal Conversacional Principal <span className="text-red-500">*</span>
                    </label>
                    {/* Si solo hay un canal, mostrarlo como texto y deshabilitar selección */}
                    {canales.length === 1 ? (
                        <div className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-700 rounded-md p-2 h-10 flex items-center">
                            {canales[0].nombre}
                            {/* Guardamos el ID internamente, no es necesario mostrarlo */}
                        </div>
                    ) : (
                        /* Si hay múltiples canales, mostrar Select */
                        <Select
                            value={formData.canalConversacionalId || undefined}
                            onValueChange={(value) => handleSelectChange('canalConversacionalId', value)}
                            disabled={isSubmitting || canales.length === 0}
                        >
                            <SelectTrigger id="canalConversacionalId-select" className={selectTriggerClasses} aria-label="Seleccionar canal principal">
                                <SelectValue placeholder="-- Selecciona un Canal --" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* <SelectItem value="" disabled>-- Selecciona un Canal --</SelectItem> */}
                                {canales.map(canal => (
                                    <SelectItem key={canal.id} value={canal.id}>
                                        {canal.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">Canal por defecto donde operará esta tarea.</p>
                    {/* Mensaje si no hay canales */}
                    {canales.length === 0 && !loadingData && (
                        <p className="text-xs text-amber-400 mt-1">No hay canales activos disponibles. Activa uno primero.</p>
                    )}
                </div>

                {/* --- Sección de Botones y Mensajes --- */}
                <div className="pt-5 space-y-3 border-t border-zinc-700 mt-6">
                    {/* Mensaje de error durante el envío */}
                    {error && !isSubmitting && (
                        <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">
                            {error}
                        </p>
                    )}
                    {/* Mensaje de éxito */}
                    {successMessage && (
                        <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">
                            {successMessage}
                        </p>
                    )}

                    {/* Contenedor de botones */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Botón Cancelar */}
                        <Button
                            type="button"
                            onClick={handleCancel}
                            variant="outline" // Estilo secundario
                            className={`${buttonBaseClasses} bg-transparent hover:bg-zinc-700 border-zinc-600 text-zinc-300 order-2 sm:order-1 w-full sm:w-auto`}
                            disabled={isSubmitting} // Deshabilitar durante envío
                        >
                            <XIcon size={18} /> Cancelar
                        </Button>
                        {/* Botón Guardar */}
                        <Button
                            type="submit"
                            className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 order-1 sm:order-2 w-full`}
                            // Deshabilitar si está enviando, cargando datos iniciales, o faltan campos requeridos
                            disabled={isSubmitting || loadingData || !formData.nombre || !formData.categoriaTareaId || !formData.canalConversacionalId}
                        >
                            {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                            {isSubmitting ? 'Creando...' : 'Crear Tarea y Continuar'}
                        </Button>
                    </div>
                    <p className="text-xs text-center text-zinc-400 mt-2">
                        Podrás configurar los detalles adicionales (descripción, instrucciones, etc.) en el siguiente paso.
                    </p>
                </div>
            </form>
        </div>
    );
}
