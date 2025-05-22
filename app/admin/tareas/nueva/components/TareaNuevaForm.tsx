'use client';

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// --- ACCIONES ---
import {
    crearTareaBasica,
    obtenerCategoriasParaFiltro
} from '@/app/admin/_lib/actions/tarea/tarea.actions';

// --- TIPOS Y ESQUEMAS ---
import {
    CrearTareaBasicaInputSchema, // <-- AÑADIDA LA IMPORTACIÓN DEL OBJETO ESQUEMA ZOD
    type CrearTareaBasicaInput,  // El tipo inferido
    type CategoriaTareaSimple
} from '@/app/admin/_lib/actions/tarea/tarea.schemas';
// import type { CanalConversacionalSimple } from '@/app/admin/_lib/types'; // Ajusta si es necesario

//! mover
export type CanalConversacionalSimple = {
    id: string;
    nombre: string;
    // icono?: string | null; // Opcional si lo necesitaras mostrar
};

// --- COMPONENTES UI Y ICONOS ---
import { Loader2, Save, XIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

type TareaNuevaFormState = CrearTareaBasicaInput;

export default function TareaNuevaForm() {
    const router = useRouter();

    const [formData, setFormData] = useState<TareaNuevaFormState>({
        nombre: '',
        categoriaTareaId: ''
    });

    const [categorias, setCategorias] = useState<CategoriaTareaSimple[]>([]);
    // const [canales, setCanales] = useState<CanalConversacionalSimple[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof TareaNuevaFormState, string[]>>>({}); // Ajustado para mejor tipado
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases Tailwind
    const containerClasses = "p-6 mx-auto bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md max-w-lg";
    const labelBaseClasses = "text-zinc-100 block mb-1 text-sm font-medium";
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500";
    const selectTriggerClasses = `${inputBaseClasses} flex justify-between items-center h-10`;

    const fetchDropdownData = useCallback(async () => {
        setLoadingData(true);
        setError(null);
        try {
            const [catResult] = await Promise.all([
                obtenerCategoriasParaFiltro(),
                // obtenerCanalesActivos()
            ]);

            // Manejo de categorías
            if (catResult.success && catResult.data) {
                setCategorias(catResult.data);
            } else {
                // Lanzar error si las categorías son esenciales para el formulario
                throw new Error(catResult.error || "Error crítico: No se pudieron cargar las categorías.");
            }
        } catch (err: unknown) {
            console.error("Error fetching dropdown data:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos necesarios para el formulario.");
            setCategorias([]);
            // setCanales([]);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null); setValidationErrors({});
    };

    const handleSelectChange = (name: keyof TareaNuevaFormState, value: string) => {
        setFormData(prevState => ({ ...prevState, [name]: value }));
        setError(null); setSuccessMessage(null); setValidationErrors({});
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null); setSuccessMessage(null); setValidationErrors({});

        // Validar con Zod antes de enviar
        const clientValidation = CrearTareaBasicaInputSchema.safeParse(formData); // Correcto: usar el objeto schema importado
        if (!clientValidation.success) {
            // Mapear errores a un formato más simple si es necesario o usar flatten directamente
            const flatErrors = clientValidation.error.flatten().fieldErrors;
            setValidationErrors(flatErrors as Partial<Record<keyof TareaNuevaFormState, string[]>>);
            setError("Por favor, corrige los errores indicados en el formulario.");
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true); // Mover aquí, solo si la validación del cliente pasa

        try {
            // Enviar datos ya validados por el cliente (clientValidation.data)
            const result = await crearTareaBasica(clientValidation.data);

            if (result.success && result.data) {
                setSuccessMessage(`¡Tarea "${result.data.nombre}" creada! Redirigiendo a edición...`);
                setTimeout(() => {
                    router.push(`/admin/tareas/${result.data?.id}`);
                }, 1500);
            } else {
                setError(result.error || "Error desconocido al crear la tarea.");
                if (result.validationErrors) {
                    // Asegurar que validationErrors sea del tipo correcto
                    setValidationErrors(result.validationErrors as Partial<Record<keyof TareaNuevaFormState, string[]>>);
                }
            }
        } catch (err: unknown) {
            console.error("Error creating tarea:", err);
            setError(`Error al crear la tarea: ${err instanceof Error ? err.message : "Ocurrió un error desconocido"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push('/admin/tareas');
    };

    if (loadingData) {
        // ... (mismo código de loading que antes) ...
        return (
            <div className={containerClasses}>
                <p className="text-center text-zinc-300 flex items-center justify-center gap-2">
                    <Loader2 className='animate-spin' size={18} /> Cargando datos del formulario...
                </p>
            </div>
        );
    }

    // Error crítico durante la carga inicial de datos
    if (error && !isSubmitting && (categorias.length === 0)) {
        return (
            <div className={`${containerClasses} border border-red-500`}>
                <h3 className="text-lg font-semibold text-red-400 mb-3">Error de Carga</h3>
                <p className="text-sm text-red-300 mb-4">{error}</p>
                <Button onClick={handleCancel} variant="outline" className="w-full">
                    Volver a la lista de Tareas
                </Button>
            </div>
        );
    }

    return (
        // ... (resto del JSX del formulario igual que antes, solo me aseguro que los nombres de los campos 
        // en validationErrors (ej. validationErrors.nombre) coincidan con los `id` y `name` de los inputs/selects) ...
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-zinc-700 pb-3">
                Crear Nueva Tarea (Paso 1 de 2)
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre Tarea <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text" id="nombre" name="nombre"
                        value={formData.nombre} onChange={handleChange}
                        className={`${inputBaseClasses} ${validationErrors.nombre ? 'border-red-500' : ''}`}
                        required disabled={isSubmitting}
                        placeholder="Ej: Agendar Demostración Producto X"
                        aria-describedby="nombre-help nombre-error"
                    />
                    {validationErrors.nombre && <p id="nombre-error" className="text-xs text-red-400 mt-1">{validationErrors.nombre.join(', ')}</p>}
                    <p id="nombre-help" className="text-xs text-zinc-400 mt-1">Nombre descriptivo y único para la tarea.</p>
                </div>

                <div>
                    <label htmlFor="categoriaTareaId" className={labelBaseClasses}> {/* Cambiado htmlFor a id del SelectTrigger */}
                        Categoría <span className="text-red-500">*</span>
                    </label>
                    <Select
                        value={formData.categoriaTareaId || undefined}
                        onValueChange={(value) => handleSelectChange('categoriaTareaId', value)}
                        disabled={isSubmitting || loadingData || categorias.length === 0}
                    >
                        <SelectTrigger
                            id="categoriaTareaId" // ID para el label
                            className={`${selectTriggerClasses} ${validationErrors.categoriaTareaId ? 'border-red-500' : ''}`}
                            aria-label="Seleccionar categoría"
                            aria-describedby="categoria-error"
                        >
                            <SelectValue placeholder="-- Selecciona una Categoría --" />
                        </SelectTrigger>
                        <SelectContent>
                            {categorias.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {validationErrors.categoriaTareaId && <p id="categoria-error" className="text-xs text-red-400 mt-1">{validationErrors.categoriaTareaId.join(', ')}</p>}
                    {categorias.length === 0 && !loadingData && <p className="text-xs text-amber-400 mt-1">No hay categorías. Crea una primero.</p>}
                </div>

                {/* <div>
                    <label htmlFor="canalConversacionalId" className={labelBaseClasses}>
                        Canal Conversacional Principal <span className="text-red-500">*</span>
                    </label>
                    {canales.length === 1 ? (
                        <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-700 rounded-md p-2 h-10 flex items-center">
                            {canales[0].nombre}
                        </div>
                    ) : (
                        <Select
                            value={formData.canalConversacionalId || undefined}
                            onValueChange={(value) => handleSelectChange('canalConversacionalId', value)}
                            disabled={isSubmitting || loadingData || canales.length === 0}
                        >
                            <SelectTrigger
                                id="canalConversacionalId"
                                className={`${selectTriggerClasses} ${validationErrors.canalConversacionalId ? 'border-red-500' : ''}`}
                                aria-label="Seleccionar canal principal"
                                aria-describedby="canal-error"
                            >
                                <SelectValue placeholder="-- Selecciona un Canal --" />
                            </SelectTrigger>
                            <SelectContent>
                                {canales.map(canal => (
                                    <SelectItem key={canal.id} value={canal.id}>{canal.nombre}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {validationErrors.canalConversacionalId && <p id="canal-error" className="text-xs text-red-400 mt-1">{validationErrors.canalConversacionalId.join(', ')}</p>}
                    <p className="text-xs text-zinc-400 mt-1">Canal por defecto donde operará esta tarea.</p>
                    {canales.length === 0 && !loadingData && <p className="text-xs text-amber-400 mt-1">No hay canales activos. Activa uno primero.</p>}
                </div> */}

                <div className="pt-5 space-y-3 border-t border-zinc-700 mt-6">
                    {error && !successMessage && ( // Mostrar error general solo si no hay mensaje de éxito
                        <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>
                    )}
                    {successMessage && (
                        <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            type="button" onClick={handleCancel} variant="outline"
                            className="bg-transparent hover:bg-zinc-700 border-zinc-600 text-zinc-300 order-2 sm:order-1 w-full sm:w-auto flex items-center justify-center gap-2"
                            disabled={isSubmitting}
                        >
                            <XIcon size={18} /> Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 order-1 sm:order-2 w-full flex items-center justify-center gap-2"
                            disabled={isSubmitting || loadingData} // La validación Zod manejará campos vacíos
                        >
                            {isSubmitting ? <Loader2 className='animate-spin' size={18} /> : <Save size={18} />}
                            {isSubmitting ? 'Creando...' : 'Crear Tarea y Continuar'}
                        </Button>
                    </div>
                    <p className="text-xs text-center text-zinc-400 mt-2">
                        Podrás configurar los detalles adicionales en el siguiente paso.
                    </p>
                </div>
            </form>
        </div>
    );
}