'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, User, RefreshCw } from 'lucide-react';
import imageCompression from 'browser-image-compression'; // Importar para compresión

// NUEVAS IMPORTS
import {
    actualizarAvatarAsistenteAction,
    eliminarAvatarAsistenteAction
} from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.actions'; // Ajustar ruta si es necesario
// ActionResult y otros tipos vendrán de sus ubicaciones globales o schemas

interface Props {
    asistenteId: string;
    negocioId: string; // Necesario para las actions (storage path, conteo de almacenamiento)
    clienteId: string; // Necesario para las actions (revalidatePath)
    urlImagenInicial?: string | null;
}

export default function AsistenteImagenAvatar({ asistenteId, negocioId, clienteId, urlImagenInicial }: Props) {
    const [currentUrl, setCurrentUrl] = useState<string | null | undefined>(urlImagenInicial);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentUrl(urlImagenInicial);
    }, [urlImagenInicial]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) {
            timer = setTimeout(() => setSuccessMessage(null), 3000);
        }
        return () => clearTimeout(timer);
    }, [successMessage]);

    const containerClasses = "flex flex-col items-center gap-2";
    const imageWrapperClasses = "w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-zinc-600 bg-zinc-700 flex items-center justify-center text-zinc-500 relative group cursor-pointer shadow-lg";
    const imageClasses = "object-cover w-full h-full rounded-full";
    const placeholderIconClasses = "w-12 h-12 sm:w-16 sm:h-16 text-zinc-400"; // Ajustado tamaño
    const deleteButtonOverlayClasses = "absolute top-1 right-1 z-20 p-1.5 bg-red-700/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed";
    const overlayClasses = "absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300";

    const handleTriggerFileInput = () => {
        if (!isUploading && !isDeleting) {
            setError(null); setSuccessMessage(null);
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading || isDeleting) return;

        // Limpiar el input para permitir seleccionar el mismo archivo de nuevo si falla
        if (fileInputRef.current) fileInputRef.current.value = '';

        setIsUploading(true); setError(null); setSuccessMessage(null);

        try {
            // Validaciones del cliente
            const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!validTypes.includes(file.type)) throw new Error("Tipo no válido (PNG, JPG, WEBP).");
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (file.size > maxSize) throw new Error(`Archivo grande (Máx: 2MB).`);

            // Compresión de imagen
            let processedFile = file;
            if (!file.type.startsWith('image/svg+xml')) { // No comprimir SVGs
                console.log('Comprimiendo imagen...');
                const options = {
                    maxSizeMB: 0.5, // Límite más pequeño para avatares
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                };
                processedFile = await imageCompression(file, options);
                console.log('Imagen comprimida:', processedFile.size / 1024, 'KB');
            }

            const formData = new FormData();
            formData.append('file', processedFile, file.name); // Usar nombre original para extensión

            // Llamar a la nueva action
            const result = await actualizarAvatarAsistenteAction(
                asistenteId,
                negocioId, // Pasar negocioId
                clienteId, // Pasar clienteId
                formData,
                currentUrl
            );

            if (!result.success || !result.data?.urlImagen) { // Verificar result.data.urlImagen
                throw new Error(result.error || "Error al actualizar el avatar.");
            }

            setCurrentUrl(result.data.urlImagen); // Actualizar con la nueva URL devuelta
            setSuccessMessage("Avatar actualizado.");

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error inesperado al subir imagen.");
            console.error("Error en handleFileChange:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!currentUrl || isUploading || isDeleting) return;
        if (confirm("¿Eliminar el avatar de este asistente?")) {
            setIsDeleting(true); setError(null); setSuccessMessage(null);

            const result = await eliminarAvatarAsistenteAction(
                asistenteId,
                negocioId, // Pasar negocioId
                clienteId, // Pasar clienteId
                currentUrl
            );

            if (!result.success) {
                setError(result.error || "Error al eliminar el avatar.");
            } else {
                setCurrentUrl(null);
                setSuccessMessage("Avatar eliminado.");
            }
            setIsDeleting(false);
        }
    };

    return (
        <div className={containerClasses}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp" // Tipos aceptados
                disabled={isUploading || isDeleting}
            />
            <div
                className={imageWrapperClasses}
                onClick={handleTriggerFileInput}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTriggerFileInput(); }} // Accesibilidad
                role="button" // Accesibilidad
                tabIndex={0} // Accesibilidad
                title={currentUrl ? "Clic o Enter para reemplazar avatar" : "Clic o Enter para subir avatar"}
            >
                {currentUrl ? (
                    <>
                        <Image
                            key={currentUrl} // Forzar re-render si la URL cambia (útil por el timestamp)
                            src={currentUrl}
                            alt={`Avatar del asistente`} // Alt text más genérico o pasar nombre del asistente
                            fill
                            className={imageClasses}
                            priority // Si es una imagen importante above-the-fold
                            sizes="(max-width: 640px) 112px, 128px" // Tamaños para optimización de Next/Image
                            onError={() => {
                                console.warn("Error cargando avatar:", currentUrl);
                                // Podrías setear currentUrl a null o mostrar un placeholder aquí
                                setCurrentUrl(null);
                                setError("Error al cargar imagen previa.");
                            }}
                        />
                        <div className={overlayClasses}>
                            <span className="text-white text-xs font-semibold flex items-center gap-1">
                                <RefreshCw size={14} /> Reemplazar
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={deleteButtonOverlayClasses}
                            disabled={isUploading || isDeleting}
                            title="Eliminar avatar actual"
                            aria-label="Eliminar avatar actual"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    </>
                ) : (
                    // Placeholder si no hay currentUrl
                    isUploading ? null : <User className={placeholderIconClasses} /> // No mostrar User icon si está subiendo
                )}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-blue-400" /> {/* Ajustado tamaño */}
                    </div>
                )}
            </div>

            <div className="h-4 text-center mt-1 text-xs"> {/* Contenedor de mensajes más pequeño */}
                {error && <p className="text-red-400">{error}</p>}
                {successMessage && <p className="text-green-400">{successMessage}</p>}
            </div>
        </div>
    );
}