'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, Image as ImageIconPlaceholder, AlertCircle } from 'lucide-react';
// Importar las acciones del servidor
import {
    actualizarImagenPortadaCatalogo,
    eliminarImagenPortadaCatalogo
} from '@/app/admin/_lib/catalogoImagenPortada.actions'; // Asegúrate que la ruta sea correcta

interface Props {
    catalogoId: string;
    // URL inicial de la imagen, puede ser null o undefined si no hay
    initialImageUrl?: string | null;
}

export default function CatalogoImagenPortada({ catalogoId, initialImageUrl }: Props) {
    // Estado para la URL de la imagen actual
    const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
    // Estados para la carga y errores
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Referencia al input de archivo oculto
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar estado si la prop inicial cambia
    useEffect(() => {
        setImageUrl(initialImageUrl || null);
    }, [initialImageUrl]);

    // Limpiar mensajes después de un tiempo
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage || error) {
            timer = setTimeout(() => {
                setSuccessMessage(null);
                setError(null);
            }, 4000); // Ocultar después de 4 segundos
        }
        return () => clearTimeout(timer);
    }, [successMessage, error]);

    // --- Handlers ---

    // Abre el selector de archivos
    const handleImageClick = () => {
        if (!isUploading && !isDeleting) {
            // Limpiar errores previos al intentar subir de nuevo
            setError(null);
            setSuccessMessage(null);
            fileInputRef.current?.click();
        }
    };

    // Maneja la selección de un nuevo archivo
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading || isDeleting) {
            return;
        }
        event.target.value = ''; // Resetear input

        // --- Validación del cliente ---
        const maxSize = 10 * 1024 * 1024; // <-- AJUSTE: 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (file.size > maxSize) {
            // --- AJUSTE: Mostrar error al usuario y salir ---
            setError(`La imagen excede ${maxSize / 1024 / 1024}MB.`);
            setIsUploading(false); // Asegurar que no quede en estado de carga
            return;
        }
        if (!allowedTypes.includes(file.type)) {
            // --- AJUSTE: Mostrar error al usuario y salir ---
            setError('Tipo no permitido (JPG, PNG, WEBP).');
            setIsUploading(false); // Asegurar que no quede en estado de carga
            return;
        }
        // ------------------------------------

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await actualizarImagenPortadaCatalogo(catalogoId, file);
            if (result.success && result.data?.imageUrl) {
                setImageUrl(result.data.imageUrl);
                setSuccessMessage('Imagen actualizada.');
            } else {
                throw new Error(result.error || 'Error al actualizar la imagen.');
            }
        } catch (err) {
            console.error("Error subiendo imagen portada:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
            // Limpiar URL si la subida falla después de un intento previo exitoso? Opcional.
            // setImageUrl(initialImageUrl || null);
        } finally {
            setIsUploading(false);
        }
    };

    // Maneja la eliminación de la imagen
    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isUploading || isDeleting || !imageUrl) return;

        if (confirm('¿Eliminar la imagen de portada? Esta acción no se puede deshacer.')) {
            setIsDeleting(true);
            setError(null);
            setSuccessMessage(null);
            try {
                const result = await eliminarImagenPortadaCatalogo(catalogoId);
                if (result.success) {
                    setImageUrl(null);
                    setSuccessMessage('Imagen eliminada.');
                } else {
                    throw new Error(result.error || 'Error al eliminar la imagen.');
                }
            } catch (err) {
                console.error("Error eliminando imagen portada:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // --- Clases de Tailwind ---
    // --- AJUSTE: w-full para adaptarse al padre, max-w-xs para límite, h-auto y aspect-video ---
    const containerClasses = "relative group w-full aspect-video rounded-lg border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer bg-zinc-800/50 overflow-hidden";
    const imageClasses = "object-contain w-full h-full";
    // --- AJUSTE: Icono más pequeño ---
    const placeholderIconClasses = "h-8 w-8 mb-1 text-zinc-600"; // Icono más pequeño y color más tenue
    const placeholderTextClasses = "text-xs font-semibold";
    const loadingOverlayClasses = "absolute inset-0 bg-black/60 flex items-center justify-center z-10";
    const deleteButtonClasses = "absolute top-1 right-1 z-20 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:opacity-50";
    const messageClasses = "text-xs mt-2 text-center";

    // Estado combinado de carga
    const isLoading = isUploading || isDeleting;

    return (
        <div className="flex flex-col items-center w-full py-5"> {/* Permitir que el contenedor padre controle el ancho */}

            <div className={containerClasses} onClick={handleImageClick} title={imageUrl ? "Clic para cambiar imagen" : "Clic para subir imagen"}>
                {/* Input oculto */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    disabled={isLoading}
                />

                {/* Estado de Carga */}
                {isLoading && (
                    <div className={loadingOverlayClasses}>
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                )}

                {/* Imagen Actual o Placeholder */}
                {!isLoading && imageUrl ? (
                    <Image
                        key={imageUrl}
                        src={imageUrl}
                        alt="Imagen de portada del catálogo"
                        fill
                        // --- AJUSTE: sizes más genérico ---
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px" // Ajusta según tus breakpoints y max-w-xs
                        className={imageClasses}
                        onError={() => {
                            console.warn("Error cargando imagen portada:", imageUrl);
                            setImageUrl(null);
                            setError("Error al cargar imagen.");
                        }}
                    />
                ) : !isLoading && (
                    // --- AJUSTE: Placeholder centrado ---
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <ImageIconPlaceholder className={placeholderIconClasses} />
                        <p className={placeholderTextClasses}>Subir Portada</p>
                    </div>
                )}

                {/* Botón Eliminar */}
                {!isLoading && imageUrl && (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className={deleteButtonClasses}
                        disabled={isLoading}
                        title="Eliminar imagen"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            {/* Mensajes de Feedback */}
            {/* --- AJUSTE: Mostrar error aquí --- */}
            {error && <p className={`${messageClasses} text-red-400 w-full max-w-xs`}><AlertCircle size={14} className="inline mr-1" />{error}</p>}
            {successMessage && <p className={`${messageClasses} text-green-400 w-full max-w-xs`}>{successMessage}</p>}
            <p className={`${messageClasses} text-zinc-500 w-full max-w-xs`}>Recomendado: 1200x630px. Máx 10MB.</p> {/* Mensaje actualizado */}
        </div>
    );
}
