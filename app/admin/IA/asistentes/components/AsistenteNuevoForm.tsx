'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearAsistenteVirtual } from '@/app/admin/_lib/asistenteVirtual.actions';
import { obtenerNegocios } from '@/app/admin/_lib/negocio.actions'; // Importar acción para negocios
import { AsistenteVirtual, Negocio } from '@/app/admin/_lib/types'; // Importar tipo Negocio
import { Loader2 } from 'lucide-react'; // Icono

// Tipo para los datos de ESTE formulario simplificado
// Añadido negocioId opcional
type AsistenteNuevaFormData = Pick<AsistenteVirtual, 'nombre' | 'descripcion' | 'origen'> & {
    negocioId?: string | null;
};

export default function AsistenteNuevoForm() {
    const router = useRouter();

    // Estado inicial solo con los campos requeridos para este form
    const getInitialState = (): AsistenteNuevaFormData => ({
        nombre: '',
        descripcion: '',
        origen: '',
        negocioId: '', // Inicializar negocioId
    });

    const [formData, setFormData] = useState<AsistenteNuevaFormData>(getInitialState());
    const [negocios, setNegocios] = useState<Negocio[]>([]); // Estado para la lista de negocios
    const [loadingNegocios, setLoadingNegocios] = useState(true); // Estado de carga para negocios
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";

    // Efecto para cargar negocios al montar
    useEffect(() => {
        setLoadingNegocios(true);
        obtenerNegocios()
            .then(data => {
                setNegocios(data);
            })
            .catch(err => {
                console.error("Error fetching negocios:", err);
                // Podrías mostrar un error específico para negocios si falla
                // setError("Error al cargar los negocios.");
            })
            .finally(() => {
                setLoadingNegocios(false);
            });
    }, []); // Ejecutar solo al montar

    // Manejador de cambios genérico
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
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar, incluyendo negocioId (o null si está vacío)
            const dataToSend = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                origen: formData.origen || null,
                negocioId: formData.negocioId || null, // Incluir negocioId
            };

            // Llamar a la acción. Asegúrate que crearAsistenteVirtual maneje negocioId.
            await crearAsistenteVirtual(dataToSend as AsistenteVirtual).then((res) => {
                router.push(`/admin/IA/asistentes/${res.id}`);
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

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Asistente <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} placeholder="Ej: Asistente de Ventas B2B" maxLength={100} />
                    <p className="text-xs text-zinc-500 mt-1">Nombre identificativo para este asistente.</p>
                </div>

                {/* Campo Negocio (Opcional, Select) */}
                <div>
                    <label htmlFor="negocioId" className={labelBaseClasses}>Negocio Asociado (Opcional)</label>
                    <select
                        id="negocioId"
                        name="negocioId" // El 'name' debe coincidir con la clave en formData
                        value={formData.negocioId || ''} // Controlado por el estado
                        onChange={handleChange}
                        className={`${inputBaseClasses} appearance-none`}
                        disabled={isSubmitting || loadingNegocios} // Deshabilitar mientras carga negocios
                    >
                        <option value="">
                            {loadingNegocios ? 'Cargando negocios...' : '-- Ninguno --'}
                        </option>
                        {negocios.map(negocio => (
                            <option key={negocio.id ?? ''} value={negocio.id ?? ''}>
                                {negocio.nombre} {/* Asumiendo que Negocio tiene 'nombre' */}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Asocia este asistente a un negocio específico si aplica.</p>
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} placeholder="Describe brevemente el propósito principal..." />
                    <p className="text-xs text-zinc-500 mt-1">Un resumen corto de su función.</p>
                </div>

                <div>
                    <label htmlFor="origen" className={labelBaseClasses}>Origen</label>
                    <select id="origen" name="origen" value={formData.origen || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting}>
                        <option value="">-- Selecciona un origen (Opcional) --</option>
                        <option value="sistema">Sistema (Interno)</option>
                        <option value="cliente">Cliente (Externo)</option>
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Indica si el asistente es de uso interno o para clientes.</p>
                </div>

                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loadingNegocios}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span> : 'Crear Asistente'}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
