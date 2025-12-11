// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/nuevo/components/CatalogoNuevoForm.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { crearCatalogoNegocio } from '@/app/admin/_lib/actions/catalogo/catalogo.actions'; // Ruta actualizada
import { type CrearCatalogoData } from '@/app/admin/_lib/actions/catalogo/catalogo.schemas'; // Tipo Zod
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    clienteId: string;
}

// Usar el tipo Zod para el estado del formulario, asegurando que los campos coincidan.
// 'status' no es parte del formulario visible, se establece en la acción.
type CatalogoFormState = Omit<CrearCatalogoData, 'status'>;

export default function CatalogoNuevoForm({ clienteId, negocioId }: Props) {
    const router = useRouter();

    const getInitialState = (): CatalogoFormState => ({
        nombre: '',
        descripcion: '', // Permitir string vacío, Zod lo manejará como nullish si es necesario
    });

    const [formData, setFormData] = useState<CatalogoFormState>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind (consistentes con la guía UI/UX)
    const mainContainerClasses = "max-w-xl mx-auto bg-zinc-800 p-6 md:p-8 rounded-xl shadow-2xl border border-zinc-700";
    const labelBaseClasses = "block text-sm font-medium text-zinc-300 mb-1.5";
    const inputBaseClasses = "block w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[120px]`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-2";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500`;
    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-4 flex items-center gap-2";
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;
    const successBoxClasses = `${messageBoxBaseClasses} bg-green-500/10 border border-green-500/30 text-green-300`;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.nombre.trim()) { // Validación básica en cliente
            setError("El nombre del catálogo es obligatorio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Los datos ya deberían coincidir con CrearCatalogoData (sin status)
            // La acción `crearCatalogoNegocio` aplicará el status por defecto.
            const dataToSend: CrearCatalogoData = {
                nombre: formData.nombre.trim(),
                // Si descripción es string vacío, Zod lo convertirá a null si es `nullish()`
                // o lo dejará como string vacío si solo es `optional()`.
                // El schema actual tiene `nullish()`, por lo que string vacío se vuelve null.
                descripcion: formData.descripcion?.trim() || null,
                // status se añade por defecto en la action
            };

            const result = await crearCatalogoNegocio(negocioId, clienteId, dataToSend);

            if (result.success && result.data) {
                setSuccessMessage("Catálogo creado exitosamente. Redirigiendo...");
                setFormData(getInitialState()); // Resetear formulario
                setTimeout(() => {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${result.data!.id}`);
                }, 1500);
            } else {
                let errorMsg = result.error || "No se pudo crear el catálogo.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error creando catálogo:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        // Navegar a la lista de catálogos
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo`);
    };

    return (
        <div className={mainContainerClasses}>
            <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
            >
                <ArrowLeft size={16} />
                Volver a Catálogos
            </button>

            <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Crear Nuevo Catálogo</h1>
            <p className="text-sm text-zinc-400 mb-6 border-b border-zinc-700 pb-4">
                Estás creando un catálogo para el negocio: <span className='font-medium text-zinc-300'>{negocioId}</span>
            </p>

            {error && <div className={errorBoxClasses}><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className={successBoxClasses}><CheckCircle size={18} /><span>{successMessage}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre del Catálogo <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        disabled={isSubmitting}
                        placeholder="Ej: Productos de Verano, Servicios Premium"
                        required
                    />
                    <p className="text-xs text-zinc-500 mt-1.5">Un nombre claro y descriptivo para tu catálogo.</p>
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>
                        Descripción (Opcional)
                    </label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses}
                        disabled={isSubmitting}
                        rows={4}
                        placeholder="Describe brevemente qué tipo de productos o servicios encontrarán los clientes en este catálogo..."
                    />
                </div>

                <div className="pt-5 space-y-3 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={primaryButtonClasses + " w-full"}
                        disabled={isSubmitting || !!successMessage} // Deshabilitar si hay mensaje de éxito para evitar doble envío
                    >
                        {isSubmitting ? (
                            <> <Loader2 className='animate-spin' size={18} /> Creando Catálogo... </>
                        ) : (
                            'Guardar y Crear Catálogo'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={secondaryButtonClasses + " w-full"}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
