'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone, FileWithPath } from 'react-dropzone'; // Importar useDropzone
import imageCompression from 'browser-image-compression'; // Importar compresión
import { Loader2, Trash2, ImageIcon as ImageIconLucide, UploadCloud, RefreshCw, AlertCircle } from 'lucide-react'; // Iconos

// Importar las nuevas acciones unificadas
import {
    gestionarSubidaIconoTarea,
    gestionarEliminacionIconoTarea
} from '@/app/admin/_lib/actions/tarea/tareaIcono.actions'; // Ajusta la ruta si la mueves

interface Props {
    tareaId: string;
    iconoUrl?: string | null;
}

export default function TareaIcono({ tareaId, iconoUrl: initialIconoUrl }: Props) {
    const [currentIconoUrl, setCurrentIconoUrl] = useState<string | null>(initialIconoUrl || null);
    const [isProcessing, setIsProcessing] = useState(false); // Un solo estado para subida/eliminación
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null); // Para mensajes de compresión/subida

    useEffect(() => {
        setCurrentIconoUrl(initialIconoUrl || null);
    }, [initialIconoUrl]);

    useEffect(() => { // Timer para mensajes
        let timer: NodeJS.Timeout;
        if (successMessage || error) {
            timer = setTimeout(() => {
                setSuccessMessage(null);
                setError(null);
            }, 4000);
        }
        return () => clearTimeout(timer);
    }, [successMessage, error]);

    const onDrop = useCallback(async (acceptedFiles: FileWithPath[]) => {
        const file = acceptedFiles[0];
        if (!file || isProcessing || !tareaId) return;

        setError(null); setSuccessMessage(null);

        const maxSizeMB = 2;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (file.size > maxSizeMB * 1024 * 1024) { setError(`Icono excede ${maxSizeMB}MB.`); return; }
        if (!allowedTypes.includes(file.type)) { setError('Tipo no permitido (JPG, PNG, WEBP, SVG).'); return; }

        setIsProcessing(true);
        setProgressMessage('Comprimiendo...');
        let fileToUpload = file;

        if (file.type !== 'image/svg+xml') { // No comprimir SVG
            try {
                const options = { maxSizeMB: 0.2, maxWidthOrHeight: 512, useWebWorker: true }; // Opciones de compresión para iconos
                fileToUpload = await imageCompression(file, options);
                setProgressMessage('Comprimido. Subiendo...');
            } catch (compressionError) {
                console.error("Error comprimiendo icono:", compressionError);
                setError('Error al comprimir. Intentando subir original.');
                setProgressMessage('Subiendo original...');
            }
        } else {
            setProgressMessage('Subiendo SVG...');
        }

        const formDataPayload = new FormData();
        formDataPayload.append('file', fileToUpload, file.name); // Usar file.name para el nombre original

        try {
            const result = await gestionarSubidaIconoTarea(tareaId, formDataPayload);
            if (result.success && result.data?.iconoUrl) {
                setCurrentIconoUrl(result.data.iconoUrl);
                setSuccessMessage('Icono actualizado.');
            } else {
                throw new Error(result.error || 'Error al actualizar el icono.');
            }
        } catch (err: unknown) {
            console.error("Error subiendo icono:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
        } finally {
            setIsProcessing(false);
            setProgressMessage(null);
        }
    }, [tareaId, isProcessing]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg'] },
        multiple: false,
        disabled: isProcessing,
    });

    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Evitar que el clic active el dropzone
        if (isProcessing || !currentIconoUrl || !tareaId) return;

        if (confirm('¿Eliminar el icono de la tarea?')) {
            setIsProcessing(true);
            setProgressMessage('Eliminando icono...');
            setError(null); setSuccessMessage(null);
            try {
                const result = await gestionarEliminacionIconoTarea(tareaId);
                if (result.success) {
                    setCurrentIconoUrl(null); // Actualizar UI
                    setSuccessMessage('Icono eliminado.');
                } else {
                    throw new Error(result.error || 'Error al eliminar el icono.');
                }
            } catch (err: unknown) {
                console.error("Error eliminando icono:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally {
                setIsProcessing(false);
                setProgressMessage(null);
            }
        }
    };

    // --- Clases de UI (adaptadas de NegocioImagenLogo y TareaIcono original) ---
    // const labelClasses = "text-zinc-300 block mb-1.5 text-xs font-medium text-center"; // Etiqueta opcional
    const imageWrapperClasses = `w-36 h-36 rounded-lg border-2 border-dashed border-zinc-600 hover:border-blue-500 bg-zinc-800/50 flex items-center justify-center text-zinc-500 relative group cursor-pointer shadow-md transition-colors duration-200`;
    const imageWrapperDragActiveClasses = `border-blue-500 bg-blue-900/30`;
    const imageClasses = "object-contain w-full h-full rounded-md p-1"; // object-contain para iconos, p-1 para pequeño padding
    const placeholderIconClasses = "w-10 h-10 text-zinc-500 group-hover:text-blue-400 transition-colors";
    const placeholderTextClasses = "text-xs font-semibold mt-1 group-hover:text-blue-400 transition-colors";

    const processingOverlayClasses = "absolute inset-0 bg-black/70 rounded-lg flex flex-col items-center justify-center z-30 p-2 text-center";
    const deleteButtonStyledClasses = "absolute -top-2 -right-2 z-20 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50";
    const replaceOverlayClasses = "absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300";

    const messageContainerClasses = "h-4 mt-2 text-center w-full"; // Ajustado para centrar
    const messageClasses = "text-xs flex items-center justify-center gap-1";


    return (
        <div className="flex flex-col items-center gap-2"> {/* Contenedor general */}
            {/* <label className={labelClasses}>Icono de Tarea (Opcional)</label> */}
            <div
                {...getRootProps({
                    className: `${imageWrapperClasses} ${isDragActive ? imageWrapperDragActiveClasses : ''}`
                })}
                title={currentIconoUrl ? "Arrastra una imagen o haz clic para reemplazar el icono" : "Arrastra una imagen o haz clic para subir un icono"}
            >
                <input {...getInputProps()} />

                {isProcessing && (
                    <div className={processingOverlayClasses}>
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        {progressMessage && <p className="text-xs text-white mt-2">{progressMessage}</p>}
                    </div>
                )}

                {!isProcessing && currentIconoUrl ? (
                    <>
                        <Image
                            key={currentIconoUrl}
                            src={currentIconoUrl}
                            alt={`Icono de la tarea`}
                            fill
                            sizes="(max-width: 768px) 96px, 112px" // Ajustar según necesidad
                            className={imageClasses}
                            onError={() => {
                                console.warn("Error cargando icono:", currentIconoUrl);
                                setCurrentIconoUrl(null);
                                setError("Error al cargar imagen.");
                            }}
                        />
                        <div className={replaceOverlayClasses}>
                            <RefreshCw size={20} className="text-white mb-1" />
                            <span className="text-white text-xs font-semibold">Reemplazar</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className={deleteButtonStyledClasses}
                            disabled={isProcessing}
                            title="Eliminar icono"
                            aria-label="Eliminar icono"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                ) : !isProcessing && (
                    isDragActive ? (
                        <div className="flex flex-col items-center justify-center text-blue-400 p-2">
                            <UploadCloud className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Suelta el icono aquí</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-500 p-2">
                            <ImageIconLucide className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Subir Icono</p>
                            <p className="text-[10px] text-zinc-600 group-hover:text-blue-500 transition-colors">(Arrastra o haz clic)</p>
                        </div>
                    )
                )}
            </div>

            <div className={messageContainerClasses}>
                {error && !isProcessing && <p className={`${messageClasses} text-red-400`}><AlertCircle size={14} />{error}</p>}
                {successMessage && !isProcessing && <p className={`${messageClasses} text-green-400`}>{successMessage}</p>}
            </div>
        </div>
    );
}