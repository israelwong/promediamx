'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import {
    subirImagenIcono,
    eliminarImagenIcono,
    actualizarIconoTarea
} from '@/app/admin/_lib/tareaIcono.actions'; // Ajusta la ruta según tu estructura

interface Props {
    tareaId: string;
    iconoUrl?: string | null; // Puede ser null o undefined inicialmente
}

export default function TareaIcono({ tareaId, iconoUrl: initialIconoUrl }: Props) {
    // Estado interno para manejar la URL actual y permitir actualizaciones optimistas
    const [currentIconoUrl, setCurrentIconoUrl] = useState<string | null | undefined>(initialIconoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar estado interno si la prop cambia desde el exterior
    useEffect(() => {
        setCurrentIconoUrl(initialIconoUrl);
    }, [initialIconoUrl]);

    // --- Clases de Tailwind ---
    const containerClasses = "flex flex-col items-center gap-3 p-5 bg-zinc-800/50 rounded-lg border border-zinc-700"; // Reducido gap
    const imageWrapperClasses = "w-24 h-24 rounded-full border-2 border-zinc-600 bg-zinc-700 flex items-center justify-center text-zinc-500 relative group cursor-pointer"; // Contenedor circular grande, AÑADIDO cursor-pointer, QUITADO overflow-hidden
    const imageClasses = "object-cover w-full h-full rounded-full"; // Añadido rounded-full a la imagen también para asegurar el recorte visual
    const placeholderIconClasses = "w-8 h-8 text-zinc-500";
    const deleteButtonClasses = "absolute top-1.5 right-1.5 z-20 p-1.5 bg-red-700/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed";
    const overlayClasses = "absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"; // Añadido rounded-full al overlay

    // --- Manejadores (sin cambios lógicos) ---
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
        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const uploadResult = await subirImagenIcono(tareaId, file);
            if (!uploadResult.success || !uploadResult.publicUrl) {
                throw new Error(uploadResult.error || "Error desconocido durante la subida.");
            }
            const newIconoUrl = uploadResult.publicUrl;
            const updateResult = await actualizarIconoTarea(tareaId, newIconoUrl);
            if (!updateResult.success) {
                console.warn("Fallo al actualizar DB, intentando revertir subida...");
                await eliminarImagenIcono(newIconoUrl);
                throw new Error(updateResult.error || "Error al actualizar la base de datos.");
            }
            setCurrentIconoUrl(newIconoUrl);
            setSuccessMessage("Icono actualizado.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            console.error("Error al subir/actualizar icono:", err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleEliminar = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!currentIconoUrl || isUploading || isDeleting) return;

        if (confirm("¿Estás seguro de que deseas eliminar el icono de esta tarea?")) {
            setIsDeleting(true);
            setError(null);
            setSuccessMessage(null);
            const urlToDelete = currentIconoUrl;

            try {
                const deleteStorageResult = await eliminarImagenIcono(urlToDelete);
                if (!deleteStorageResult.success && deleteStorageResult.error && !deleteStorageResult.error.includes("determinar la ruta")) {
                    throw new Error(deleteStorageResult.error);
                }
                const updateResult = await actualizarIconoTarea(tareaId, null);
                if (!updateResult.success) {
                    throw new Error(updateResult.error || "Error al actualizar la base de datos.");
                }
                setCurrentIconoUrl(null);
                setSuccessMessage("Icono eliminado.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
                console.error("Error al eliminar icono:", err);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Input oculto */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/gif, image/webp"
                disabled={isUploading || isDeleting}
            />

            {/* Visor de Imagen / Placeholder */}
            <div
                className={imageWrapperClasses}
                onClick={handleTriggerFileInput}
                title={currentIconoUrl ? "Clic para reemplazar icono" : "Clic para subir icono"}
            >
                {currentIconoUrl ? (
                    <>
                        <Image
                            key={currentIconoUrl}
                            src={currentIconoUrl}
                            alt={`Icono de la tarea ${tareaId}`}
                            fill
                            className={imageClasses} // Mantiene object-cover y rounded-full
                            priority={true}
                            onError={(e) => {
                                console.warn("Error cargando imagen del icono:", currentIconoUrl);
                                e.currentTarget.style.display = 'none';
                                // Opcional: setCurrentIconoUrl(null); para mostrar placeholder si falla
                            }}
                        />
                        {/* Overlay visual */}
                        <div className={overlayClasses}>
                            <span className="text-white text-xs font-semibold flex items-center gap-1">
                                <RefreshCw size={14} /> Reemplazar
                            </span>
                        </div>
                        {/* Botón Eliminar Minimalista */}
                        <button
                            type="button"
                            onClick={handleEliminar}
                            className={deleteButtonClasses}
                            disabled={isUploading || isDeleting}
                            title="Eliminar icono actual"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                ) : (
                    // Placeholder si no hay icono
                    <div className="flex flex-col items-center text-center">
                        <ImageIcon className={placeholderIconClasses} />
                        <span className="text-xs text-zinc-400 mt-1">Subir Icono</span>
                    </div>
                )}
                {/* Indicadores de carga */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-blue-400" />
                    </div>
                )}
                {isDeleting && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-red-400" />
                    </div>
                )}
            </div>

            {/* Mensajes de Estado */}
            {error && <p className="text-xs text-red-400 mt-1 text-center">{error}</p>}
            {successMessage && <p className="text-xs text-green-400 mt-1 text-center">{successMessage}</p>}

        </div>
    );
}
