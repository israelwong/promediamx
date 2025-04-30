'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react'; // Removed useEffect as it's no longer needed
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearAsistenteVirtual } from '@/app/admin/_lib/asistenteVirtual.actions';
// Ya no necesitamos obtenerNegocios ni el tipo Negocio aquí
import { AsistenteVirtual } from '@/app/admin/_lib/types';
import { Loader2, Save } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string; // negocioId ahora es una prop requerida
    clienteId: string; // clienteId opcional, pero no se usa en este formulario
}

// Tipo para los datos de ESTE formulario simplificado
// Se elimina 'origen'
type AsistenteNuevaFormData = Pick<AsistenteVirtual, 'nombre' | 'descripcion'>;

export default function AsistenteNuevoForm({ negocioId, clienteId }: Props) {
    const router = useRouter();

    // Estado inicial solo con los campos editables
    // Se elimina 'origen'
    const getInitialState = (): AsistenteNuevaFormData => ({
        nombre: '',
        descripcion: '',
    });

    const [formData, setFormData] = useState<AsistenteNuevaFormData>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Manejador de cambios genérico (sin cambios)
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombre?.trim()) {
            setError("El nombre del asistente es obligatorio.");
            return;
        }
        if (!negocioId) {
            setError("Error: Falta la referencia al negocio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar
            const dataToSend = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                origen: 'cliente', // **Origen fijado como 'cliente'**
                negocioId: negocioId,
                status: 'activo', // Default status
                version: 1, // Default version
                precioBase: 499, // Default price
            };

            // Llamar a la acción
            await crearAsistenteVirtual(dataToSend as AsistenteVirtual).then((nuevoAsistente) => {
                // Aquí puedes manejar la respuesta del servidor
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${nuevoAsistente.id}`); // Ir al nuevo asistente
            });

        } catch (err) {
            console.error("Error creating asistente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el asistente: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => { router.back(); };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-zinc-700 pb-2">
                Crear Nuevo Asistente Virtual
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
                Asociado al Negocio ID: <span className="font-mono text-zinc-300">{negocioId}</span>
            </p>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Asistente <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} placeholder="Ej: Asistente de Ventas B2B" maxLength={100} />
                    <p className="text-xs text-zinc-500 mt-1">Nombre identificativo para este asistente.</p>
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} placeholder="Describe brevemente el propósito principal..." />
                    <p className="text-xs text-zinc-500 mt-1">Un resumen corto de su función.</p>
                </div>

                {/* SE ELIMINÓ EL SELECT DE ORIGEN */}

                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span> : <><Save size={16} /> Crear Asistente</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
