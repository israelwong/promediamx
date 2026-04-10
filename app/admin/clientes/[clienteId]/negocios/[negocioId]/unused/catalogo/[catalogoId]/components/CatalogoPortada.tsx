// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/components/CatalogoPortada.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone, FileWithPath } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Loader2, Trash2, ImageUp, AlertCircle, UploadCloud } from 'lucide-react'; // ImageUp como nuevo placeholder
import {
    actualizarImagenPortadaCatalogo,
    eliminarImagenPortadaCatalogo
} from '@/app/admin/_lib/actions/catalogo/catalogoImagenPortada.actions'; // Ruta actualizada

interface Props {
    catalogoId: string;
    negocioId: string;
    clienteId: string;
    initialImageUrl?: string | null;
    onPortadaUpdate?: (newImageUrl: string | null) => void;
}

export default function CatalogoPortada({ clienteId, negocioId, catalogoId, initialImageUrl, onPortadaUpdate }: Props) {
    const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);

    useEffect(() => {
        setImageUrl(initialImageUrl || null);
    }, [initialImageUrl]);

    useEffect(() => {
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
        if (!file || isProcessing) return;

        setError(null); setSuccessMessage(null);

        const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (file.size > maxSizeBeforeCompression) {
            setError(`Original excede ${maxSizeBeforeCompression / 1024 / 1024}MB.`);
            return;
        }
        if (!allowedTypes.includes(file.type)) {
            setError('Tipo no permitido (JPG, PNG, WEBP).');
            return;
        }

        setIsProcessing(true);
        setProgressMessage('Comprimiendo imagen...');
        let fileToUpload = file;

        try {
            const options = {
                maxSizeMB: 1, // Comprimir a un tamaño máximo de 1MB
                maxWidthOrHeight: 1920, // Redimensionar si es muy grande
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            fileToUpload = compressedFile;
            setProgressMessage('Imagen comprimida. Subiendo...');
        } catch (compressionError) {
            console.error("Error comprimiendo imagen de portada:", compressionError);
            setError('Error al comprimir. Intentando subir original.');
            setProgressMessage('Subiendo original...');
            // fileToUpload sigue siendo el archivo original
        }

        const formDataPayload = new FormData();
        formDataPayload.append('file', fileToUpload, file.name); // Usar nombre original

        try {
            const result = await actualizarImagenPortadaCatalogo(catalogoId, negocioId, clienteId, formDataPayload);
            if (result && result.success && result.data?.imageUrl) {
                setImageUrl(result.data.imageUrl);
                setSuccessMessage('Imagen de portada actualizada.');
                if (onPortadaUpdate) {
                    onPortadaUpdate(result.data.imageUrl);
                }
            } else {
                throw new Error(result?.error || 'Error al actualizar la imagen de portada.');
            }
        } catch (err) {
            console.error("Error subiendo imagen de portada:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
        } finally {
            setIsProcessing(false);
            setProgressMessage(null);
        }
    }, [catalogoId, negocioId, clienteId, isProcessing, onPortadaUpdate]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
        multiple: false,
        disabled: isProcessing,
    });

    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isProcessing || !imageUrl) return;

        if (confirm('¿Eliminar la imagen de portada? Esta acción no se puede deshacer.')) {
            setIsProcessing(true);
            setProgressMessage('Eliminando imagen...');
            setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarImagenPortadaCatalogo(catalogoId, negocioId, clienteId);
                if (result && result.success) {
                    setImageUrl(null);
                    setSuccessMessage('Imagen de portada eliminada.');
                    if (onPortadaUpdate) {
                        onPortadaUpdate(null);
                    }
                } else {
                    throw new Error(result?.error || 'Error al eliminar la imagen de portada.');
                }
            } catch (err) {
                console.error("Error eliminando imagen de portada:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally {
                setIsProcessing(false);
                setProgressMessage(null);
            }
        }
    };

    const containerBaseClasses = "relative group w-full aspect-[16/9] rounded-lg border-2 border-dashed flex items-center justify-center text-zinc-500 transition-colors bg-zinc-800/30 overflow-hidden shadow-inner"; // aspect-video o 16/9
    const dropzoneActiveClasses = isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 hover:border-blue-500 hover:text-blue-400';
    const imageClasses = "object-cover w-full h-full";
    const placeholderIconClasses = "h-10 w-10 mb-2";
    const placeholderTextClasses = "text-sm font-medium";
    const processingOverlayClasses = "absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 p-2 text-center rounded-lg";
    const deleteButtonClasses = "absolute top-2 right-2 z-20 p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:opacity-50";
    const messageContainerClasses = "mt-2 w-full";
    const messageClasses = "text-xs text-center flex items-center justify-center gap-1 py-1";

    return (
        <div className="flex flex-col items-center w-full space-y-2">
            <label className="block text-sm font-medium text-zinc-300 self-start">
                Imagen de Portada del Catálogo
            </label>
            <div {...getRootProps()} className={`${containerBaseClasses} ${isProcessing ? 'cursor-default' : 'cursor-pointer ' + dropzoneActiveClasses}`}>
                <input {...getInputProps()} />

                {isProcessing && (
                    <div className={processingOverlayClasses}>
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        {progressMessage && <p className="text-xs text-white mt-1.5">{progressMessage}</p>}
                    </div>
                )}

                {!isProcessing && imageUrl ? (
                    <Image
                        key={imageUrl}
                        src={imageUrl}
                        alt="Imagen de portada del catálogo"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={imageClasses}
                        priority={true} // Considerar priority si es LCP
                        onError={() => {
                            console.warn("Error cargando imagen portada:", imageUrl);
                            setImageUrl(null);
                            setError("Error al cargar imagen de portada.");
                        }}
                    />
                ) : !isProcessing && (
                    isDragActive ? (
                        <div className="flex flex-col items-center justify-center text-blue-400">
                            <UploadCloud className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Suelta la imagen aquí</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:text-blue-400">
                            <ImageUp className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Arrastra o haz clic para subir</p>
                        </div>
                    )
                )}

                {!isProcessing && imageUrl && (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className={deleteButtonClasses}
                        disabled={isProcessing}
                        title="Eliminar imagen de portada"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <div className={messageContainerClasses}>
                {error && !isProcessing && <p className={`${messageClasses} text-red-400`}><AlertCircle size={14} />{error}</p>}
                {successMessage && !isProcessing && <p className={`${messageClasses} text-green-400`}>{successMessage}</p>}
            </div>
            <p className="text-xs text-zinc-500 w-full text-center">Recomendado: 1200x630px (16:9). Máx 1MB después de compresión.</p>
        </div>
    );
}
