'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, User, RefreshCw } from 'lucide-react';
// Ajusta rutas
import {
    actualizarAvatarAsistente,
    eliminarAvatarAsistente
} from '@/app/admin/_lib/asistenteImagenAvatar.actions';

interface Props {
    asistenteId: string;
    urlImagenInicial?: string | null;
}

export default function AsistenteImagenAvatar({ asistenteId, urlImagenInicial }: Props) {
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
            timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [successMessage]);

    // --- Clases de Tailwind ---
    const containerClasses = "flex flex-col items-center gap-2";
    // Mantenemos sin overflow-hidden
    const imageWrapperClasses = "w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-zinc-600 bg-zinc-700 flex items-center justify-center text-zinc-500 relative group cursor-pointer shadow-lg";
    const imageClasses = "object-cover w-full h-full rounded-full";
    const placeholderIconClasses = "w-16 h-16 text-zinc-400";
    // --- NUEVA CLASE para el botón sobre la imagen ---
    const deleteButtonOverlayClasses = "absolute top-1 right-1 z-20 p-1.5 bg-red-700/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed";
    const overlayClasses = "absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300";

    // --- Handlers (sin cambios lógicos) ---
    const handleTriggerFileInput = () => {
        if (!isUploading && !isDeleting) {
            setError(null);
            setSuccessMessage(null);
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading || isDeleting) return;
        event.target.value = '';
        setIsUploading(true); setError(null); setSuccessMessage(null);
        try {
            const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!validTypes.includes(file.type)) throw new Error("Tipo no válido (PNG, JPG, WEBP).");
            const maxSize = 2 * 1024 * 1024; // 2MB
            if (file.size > maxSize) throw new Error(`Archivo grande (Máx: 2MB).`);
            const result = await actualizarAvatarAsistente(asistenteId, file, currentUrl);
            if (!result.success || !result.urlImagen) throw new Error(result.error || "Error al actualizar.");
            setCurrentUrl(result.urlImagen);
            setSuccessMessage("Avatar actualizado.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error inesperado.");
            console.error("Error al subir/actualizar:", err);
        } finally { setIsUploading(false); }
    };

    const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
        // --- AÑADIR stopPropagation de nuevo ---
        event.stopPropagation(); // Evitar que el click active la subida de archivo
        if (!currentUrl || isUploading || isDeleting) return;
        if (confirm("¿Eliminar el avatar de este asistente?")) {
            setIsDeleting(true); setError(null); setSuccessMessage(null);
            const urlToDelete = currentUrl;
            try {
                const result = await eliminarAvatarAsistente(asistenteId, urlToDelete);
                if (!result.success) throw new Error(result.error || "Error al eliminar.");
                setCurrentUrl(null);
                setSuccessMessage("Avatar eliminado.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error inesperado.");
                console.error("Error al eliminar:", err);
            } finally { setIsDeleting(false); }
        }
    };

    return (
        <div className={containerClasses}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                disabled={isUploading || isDeleting}
            />

            {/* Visor de Imagen / Placeholder */}
            <div
                className={imageWrapperClasses}
                onClick={handleTriggerFileInput}
                title={currentUrl ? "Clic para reemplazar avatar" : "Clic para subir avatar"}
            >
                {currentUrl ? (
                    <>
                        <Image
                            key={currentUrl}
                            src={currentUrl}
                            alt={`Avatar del asistente ${asistenteId}`}
                            fill
                            className={imageClasses}
                            priority={true}
                            sizes="(max-width: 640px) 112px, 128px"
                            onError={(e) => {
                                console.warn("Error cargando avatar:", currentUrl);
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        {/* Overlay */}
                        <div className={overlayClasses}>
                            <span className="text-white text-xs font-semibold flex items-center gap-1">
                                <RefreshCw size={14} /> Reemplazar
                            </span>
                        </div>
                        {/* --- Botón Eliminar AHORA DENTRO y con nuevas clases --- */}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={deleteButtonOverlayClasses} // Usar las clases nuevas
                            disabled={isUploading || isDeleting}
                            title="Eliminar avatar actual"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    </>
                ) : (
                    <User className={placeholderIconClasses} />
                )}
                {/* Indicador de carga (uploading) */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-blue-400" />
                    </div>
                )}
            </div>

            {/* Botón Eliminar ya no está aquí abajo */}

            {/* Mensajes de Estado */}
            <div className="h-4 text-center mt-1">
                {error && <p className="text-xs text-red-400">{error}</p>}
                {successMessage && <p className="text-xs text-green-400">{successMessage}</p>}
            </div>
        </div>
    );
}
