'use client';

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
// --- Acción y Tipos ---
import { crearGaleriaNegocio } from '@/app/admin/_lib/unused/galeriaNegocio.actions'; // Ajusta la ruta
import type { ActionResult } from '@/app/admin/_lib/unused/galeriaNegocio.actions'; // Importar tipo ActionResult si está definido ahí
import { GaleriaNegocio } from '@prisma/client'; // O tu tipo GaleriaNegocio
// --- Icons ---
import { Loader2, Save, ArrowLeft, AlertCircle } from 'lucide-react';

interface Props {
    clienteId?: string; // Opcional para construir la ruta de vuelta/redirección
    negocioId: string; // Requerido para crear la galería
}

export default function GaleriaNuevaForm({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Clases de Tailwind ---
    const containerClasses = "p-4 md:p-6 bg-zinc-800 rounded-lg shadow-md border border-zinc-700 max-w-lg mx-auto"; // Ancho ajustado
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[90px]`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;

    // --- Handlers ---
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!nombre.trim()) {
            setError("El nombre de la galería es obligatorio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Llamar a la acción para crear la galería
            const result: ActionResult<GaleriaNegocio> = await crearGaleriaNegocio(
                negocioId,
                nombre.trim().charAt(0).toUpperCase() + nombre.trim().slice(1),
                descripcion.trim()
                    ? descripcion.trim().charAt(0).toUpperCase() + descripcion.trim().slice(1)
                    : null // Enviar null si está vacío
            );

            if (result.success && result.data?.id) {
                // --- Redirección Exitosa ---
                const nuevaGaleriaId = result.data.id;
                const basePath = clienteId
                    ? `/admin/clientes/${clienteId}/negocios/${negocioId}`
                    : `/admin/clientes/${clienteId}/negocios/${negocioId}`
                router.push(`${basePath}/galeria/${nuevaGaleriaId}/editar`); // O /editar al final si así es tu ruta
                // Opcional: Mostrar mensaje de éxito breve antes de redirigir
            } else {
                throw new Error(result.error || "No se pudo crear la galería.");
            }
        } catch (err) {
            console.error("Error al crear galería:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            setIsSubmitting(false); // Re-habilitar botón en caso de error
        }
        // No poner finally aquí si hay redirección exitosa
    };

    const handleCancel = () => {
        router.back(); // Volver a la página anterior (probablemente la edición del negocio)
    };

    return (
        <div className={containerClasses}>
            <h1 className='text-xl font-semibold text-white mb-1'>Nueva Galería de Negocio</h1>
            <p className='text-sm text-zinc-400 mb-5'>Dale un nombre a tu nueva galería de imágenes.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre Galería <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={nombre}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setNombre(e.target.value);
                            setError(null); // Limpiar error al escribir
                        }}
                        required
                        className={inputBaseClasses}
                        disabled={isSubmitting}
                        maxLength={100}
                        placeholder="Ej: Fotos del Local, Eventos 2024"
                    />
                </div>

                {/* Campo Descripción */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>
                        Descripción (Opcional)
                    </label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={descripcion}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescripcion(e.target.value)}
                        className={textareaBaseClasses}
                        disabled={isSubmitting}
                        rows={3}
                        maxLength={250}
                        placeholder="Describe brevemente el contenido de esta galería..."
                    />
                </div>

                {/* Mensaje de Error */}
                {error && (
                    <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </p>
                )}

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={secondaryButtonClasses}
                        disabled={isSubmitting}
                    >
                        <ArrowLeft size={16} className="mr-1.5" />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={primaryButtonClasses}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 size={16} className="animate-spin mr-1.5" />
                        ) : (
                            <Save size={16} className="mr-1.5" />
                        )}
                        {isSubmitting ? 'Creando...' : 'Crear y Editar Galería'}
                    </button>
                </div>
            </form>
        </div>
    );
}

