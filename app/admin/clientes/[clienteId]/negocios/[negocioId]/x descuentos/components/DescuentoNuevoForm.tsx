'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta si es necesario
import { crearDescuento } from '@/app/admin/_lib/descuentos.actions'; // Asegúrate que la acción y ruta sean correctas
import { Descuento } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2 } from 'lucide-react'; // Icono

interface Props {
    negocioId: string; // ID del negocio al que pertenece el descuento
}

// Tipo para los datos de este formulario
type DescuentoNuevaFormData = Pick<Descuento,
    'nombre' | 'descripcion' | 'porcentaje' | 'monto' | 'fechaInicio' | 'fechaFin' | 'status'
>;



export default function DescuentoNuevoForm({ negocioId }: Props) {
    const router = useRouter();

    // Helper para obtener la fecha actual en formato yyyy-MM-DD
    const getTodayDateString = () => new Date().toISOString().split('T')[0];

    // Estado inicial del formulario
    const getInitialState = (): DescuentoNuevaFormData => ({
        nombre: '',
        descripcion: '',
        porcentaje: null, // Iniciar como null o 0
        monto: null,      // Iniciar como null o 0
        fechaInicio: new Date(getTodayDateString()),
        fechaFin: new Date(getTodayDateString()),
        status: 'activo', // Default status
    });

    const [formData, setFormData] = useState<DescuentoNuevaFormData>(getInitialState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Manejador de cambios
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | null;

        if (type === 'number') {
            // Permitir vaciar el campo (se convierte a null) o parsear a float
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) { // Si la conversión falla (ej: texto inválido)
                finalValue = null; // O mantener el valor anterior o 0? Por ahora null.
            }
        } else {
            finalValue = value;
        }

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validación básica
        if (!formData.nombre?.trim() || !formData.fechaInicio || !formData.fechaFin || !formData.status) {
            setError("Nombre, Fechas y Status son obligatorios."); return;
        }
        // Validar que al menos uno (porcentaje o monto) tenga valor y sea positivo
        const hasPorcentaje = typeof formData.porcentaje === 'number' && formData.porcentaje > 0;
        const hasMonto = typeof formData.monto === 'number' && formData.monto > 0;
        if (!hasPorcentaje && !hasMonto) {
            setError("Debe especificar un Porcentaje o un Monto de descuento válido (mayor a 0)."); return;
        }
        // Opcional: Validar que solo uno de los dos esté definido si no pueden coexistir
        // if (hasPorcentaje && hasMonto) {
        //     setError("Especifique solo Porcentaje o Monto, no ambos."); return;
        // }
        if (new Date(formData.fechaFin) < new Date(formData.fechaInicio)) {
            setError("La fecha de fin no puede ser anterior a la fecha de inicio."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        try {
            // Preparar datos para enviar
            const dataToSend = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                porcentaje: hasPorcentaje ? formData.porcentaje : null, // Enviar null si no es válido o 0
                monto: hasMonto ? formData.monto : null,             // Enviar null si no es válido o 0
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(formData.fechaFin),
                status: formData.status,
                negocioId: negocioId, // Asociar con el negocio actual
            };

            // Llamar a la acción
            await crearDescuento(negocioId, dataToSend as Descuento);

            setSuccessMessage("Descuento creado correctamente. Redirigiendo...");
            setFormData(getInitialState()); // Limpiar formulario

            // Redirigir a la lista de negocios (o a la lista de descuentos de este negocio)
            setTimeout(() => router.push(`/admin/negocios/${negocioId}`), 1500); // Ruta especificada

        } catch (err) {
            console.error("Error creating descuento:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el descuento: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => { router.back(); };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Crear Nuevo Descuento</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                Para Negocio ID: <span className='font-mono text-zinc-300'>{negocioId}</span>
            </p>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Descuento <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} placeholder="Ej: Descuento Buen Fin, Cupón 10%" />
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={3} placeholder="Detalles del descuento, condiciones..." />
                </div>

                {/* Porcentaje y Monto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="porcentaje" className={labelBaseClasses}>Porcentaje (%)</label>
                        <input type="number" id="porcentaje" name="porcentaje" value={formData.porcentaje ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.01" min="0" max="100" placeholder="Ej: 15" />
                        <p className="text-xs text-zinc-500 mt-1">Dejar vacío si es monto fijo.</p>
                    </div>
                    <div>
                        <label htmlFor="monto" className={labelBaseClasses}>Monto Fijo ($)</label>
                        <input type="number" id="monto" name="monto" value={formData.monto ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} step="0.01" min="0" placeholder="Ej: 50.00" />
                        <p className="text-xs text-zinc-500 mt-1">Dejar vacío si es porcentaje.</p>
                    </div>
                </div>

                {/* Fechas Inicio y Fin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fechaInicio" className={labelBaseClasses}>Fecha Inicio <span className="text-red-500">*</span></label>
                        <input type="date" id="fechaInicio" name="fechaInicio" value={formData.fechaInicio?.toString() ?? ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="fechaFin" className={labelBaseClasses}>Fecha Fin <span className="text-red-500">*</span></label>
                        <input type="date" id="fechaFin" name="fechaFin" value={formData.fechaFin?.toString() ?? ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} min={formData.fechaInicio?.toString()} />
                    </div>
                </div>

                <div>
                    <label htmlFor="status" className={labelBaseClasses}>Status <span className="text-red-500">*</span></label>
                    <select id="status" name="status" value={formData.status || 'activo'} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmitting}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span> : 'Crear Descuento'}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
