// app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/nueva/components/OfertaNuevaForm.tsx
'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { crearOferta } from '@/app/admin/_lib/actions/oferta/oferta.actions'; // Ruta actualizada
import { type CrearOfertaBasicaData } from '@/app/admin/_lib/actions/oferta/oferta.schemas'; // Tipo Zod
import { ActionResult } from '@/app/admin/_lib/types';
import { Loader2, Save, ArrowLeft, AlertCircle, CheckCircle, TicketPlus } from 'lucide-react';

interface Props {
    clienteId: string;
    negocioId: string;
}

// Usar el tipo Zod para el estado del formulario.
type OfertaFormState = CrearOfertaBasicaData;

export default function OfertaNuevaForm({ clienteId, negocioId }: Props) {
    const router = useRouter();

    const getInitialState = (): OfertaFormState => ({
        nombre: '',
        descripcion: '', // Zod lo manejará como nullish si está vacío
    });

    const [formData, setFormData] = useState<OfertaFormState>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind
    const mainContainerClasses = "max-w-xl mx-auto bg-zinc-800 p-6 md:p-8 rounded-xl shadow-2xl border border-zinc-700";
    const labelBaseClasses = "block text-sm font-medium text-zinc-300 mb-1.5";
    const inputBaseClasses = "block w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
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
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        // Los datos del formulario ya coinciden con CrearOfertaBasicaData
        const dataToSend: CrearOfertaBasicaData = {
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion?.trim() || null,
        };

        try {
            const result: ActionResult<{ id: string }> = await crearOferta(negocioId, clienteId, dataToSend);

            if (result.success && result.data?.id) {
                setSuccessMessage("Oferta creada. Redirigiendo para editar detalles...");
                setFormData(getInitialState()); // Resetear formulario
                setTimeout(() => {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${result.data!.id}`);
                }, 1500);
            } else {
                let errorMsg = result.error || "No se pudo crear la oferta.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error al crear oferta:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            // No re-habilitar botón inmediatamente si hay éxito y redirección
            if (!successMessage) {
                setIsSubmitting(false);
            }
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
    };

    return (
        <div className={mainContainerClasses}>
            <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
                disabled={isSubmitting}
            >
                <ArrowLeft size={16} />
                Volver a Ofertas
            </button>

            <h1 className="text-2xl font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <TicketPlus size={24} className="text-amber-400" />
                Crear Nueva Oferta
            </h1>
            <p className="text-sm text-zinc-400 mb-6 border-b border-zinc-700 pb-4">
                Define un nombre y una descripción inicial para tu oferta. Podrás configurar todos los demás detalles (tipo, valor, fechas, etc.) en el siguiente paso.
            </p>

            {error && <div className={errorBoxClasses}><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className={successBoxClasses}><CheckCircle size={18} /><span>{successMessage}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre de la Oferta <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text" id="nombre" name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        required className={inputBaseClasses} disabled={isSubmitting}
                        maxLength={150} placeholder="Ej: Descuento de Verano, 2x1 en Servicios"
                        autoFocus
                    />
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>
                        Descripción Breve (Opcional)
                    </label>
                    <textarea
                        id="descripcion" name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses} disabled={isSubmitting}
                        rows={3} maxLength={500}
                        placeholder="Un resumen rápido de qué trata la oferta..."
                    />
                </div>

                <div className="pt-5 space-y-3 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={primaryButtonClasses + " w-full"}
                        disabled={isSubmitting || !formData.nombre.trim() || !!successMessage}
                    >
                        {isSubmitting ? (
                            <> <Loader2 className='animate-spin' size={18} /> Creando Oferta... </>
                        ) : (
                            <> <Save size={16} /> Crear y Continuar a Detalles </>
                        )}
                    </button>
                    <button
                        type="button" onClick={handleCancel}
                        className={secondaryButtonClasses + " w-full"} disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
