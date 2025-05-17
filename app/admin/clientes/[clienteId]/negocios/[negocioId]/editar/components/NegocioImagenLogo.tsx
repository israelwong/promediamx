// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/components/NegocioImagenLogo.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone, FileWithPath } from 'react-dropzone'; // Importar FileWithPath
import imageCompression from 'browser-image-compression';
import { Loader2, Trash2, Building2, AlertCircle, UploadCloud } from 'lucide-react';
import {
    actualizarImagenLogoNegocio,
    eliminarImagenLogoNegocio
} from '@/app/admin/_lib/actions/negocio/negocioImagenLogo.actions';

interface Props {
    negocioId: string;
    initialLogoUrl?: string | null;
}

export default function NegocioImagenLogo({ negocioId, initialLogoUrl }: Props) {
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
    const [isProcessing, setIsProcessing] = useState(false); // Un solo estado para subida/compresión/eliminación
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);


    useEffect(() => {
        setLogoUrl(initialLogoUrl || null);
    }, [initialLogoUrl]);

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

        const maxSize = 5 * 1024 * 1024; // 5MB (antes de compresión)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

        if (file.size > maxSize) {
            setError(`Original excede ${maxSize / 1024 / 1024}MB.`);
            return;
        }
        if (!allowedTypes.includes(file.type)) {
            setError('Tipo no permitido (JPG, PNG, WEBP, SVG).');
            return;
        }

        setIsProcessing(true);
        setProgressMessage('Comprimiendo imagen...');
        let fileToUpload = file;

        // No comprimir SVG
        if (file.type !== 'image/svg+xml') {
            try {
                const options = {
                    maxSizeMB: 0.5, // Comprimir a un tamaño más pequeño, ej. 0.5MB
                    maxWidthOrHeight: 1024, // Redimensionar si es muy grande
                    useWebWorker: true,
                    alwaysKeepResolution: false, // Permite cambiar resolución si es necesario para el tamaño
                };
                const compressedFile = await imageCompression(file, options);
                fileToUpload = compressedFile;
                setProgressMessage('Imagen comprimida. Subiendo...');
            } catch (compressionError) {
                console.error("Error comprimiendo logo:", compressionError);
                setError('Error al comprimir imagen. Intentando subir original.');
                // Continuar con el archivo original si la compresión falla
                setProgressMessage('Subiendo original...');
            }
        } else {
            setProgressMessage('Subiendo SVG...');
        }


        const formDataPayload = new FormData();
        formDataPayload.append('file', fileToUpload, file.name); // Usar nombre original para la action

        try {
            const result = await actualizarImagenLogoNegocio(negocioId, formDataPayload);
            if (result && result.success && result.data?.imageUrl) {
                setLogoUrl(result.data.imageUrl);
                setSuccessMessage('Logo actualizado.');
            } else {
                throw new Error(result?.error || 'Error al actualizar logo.');
            }
        } catch (err) {
            console.error("Error subiendo logo:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
        } finally {
            setIsProcessing(false);
            setProgressMessage(null);
        }
    }, [negocioId, isProcessing]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg'] }, // svg sin +xml para el picker
        multiple: false,
        disabled: isProcessing,
    });

    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // Evitar que se active el onDrop
        if (isProcessing || !logoUrl) return;
        if (confirm('¿Eliminar el logo del negocio?')) {
            setIsProcessing(true);
            setProgressMessage('Eliminando logo...');
            setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarImagenLogoNegocio(negocioId);
                if (result && result.success) {
                    setLogoUrl(null);
                    setSuccessMessage('Logo eliminado.');
                } else {
                    throw new Error(result?.error || 'Error al eliminar logo.');
                }
            } catch (err) {
                console.error("Error eliminando logo:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally {
                setIsProcessing(false);
                setProgressMessage(null);
            }
        }
    };

    const labelBaseUiClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const containerBaseClasses = "relative group w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed flex items-center justify-center text-zinc-500 transition-colors bg-zinc-800/50 overflow-hidden";
    const dropzoneActiveClasses = isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 hover:border-blue-500 hover:text-blue-400';
    const imageClasses = "object-cover w-full h-full rounded-full";
    const placeholderIconClasses = "h-8 w-8 md:h-10 md:w-10"; // Color se define en el div
    const placeholderTextClasses = "text-[10px] md:text-xs font-semibold mt-1";
    const processingOverlayClasses = "absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center z-10 p-2 text-center";
    const deleteButtonClasses = "absolute top-0 right-0 z-20 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:opacity-50";
    const messageContainerClasses = "h-4 mt-2 w-full max-w-[180px]"; // Un poco más de ancho
    const messageClasses = "text-xs text-center flex items-center justify-center gap-1";


    return (
        <div className="flex flex-col items-center">
            <label className={`${labelBaseUiClasses} mb-2`}>Logo del Negocio</label>
            <div {...getRootProps()} className={`${containerBaseClasses} ${isProcessing ? 'cursor-default' : 'cursor-pointer ' + dropzoneActiveClasses}`}>
                <input {...getInputProps()} />

                {isProcessing && (
                    <div className={processingOverlayClasses}>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                        {progressMessage && <p className="text-xs text-white mt-1">{progressMessage}</p>}
                    </div>
                )}

                {!isProcessing && logoUrl ? (
                    <Image
                        key={logoUrl}
                        src={logoUrl}
                        alt="Logo del negocio"
                        fill
                        sizes="(max-width: 768px) 96px, 112px"
                        className={imageClasses}
                        onError={() => { console.warn("Error cargando logo:", logoUrl); setLogoUrl(null); setError("Error al cargar imagen."); }}
                    />
                ) : !isProcessing && (
                    isDragActive ? (
                        <div className="flex flex-col items-center justify-center text-blue-400">
                            <UploadCloud className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Soltar aquí</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:text-blue-400">
                            <Building2 className={placeholderIconClasses} />
                            <p className={placeholderTextClasses}>Subir Logo</p>
                        </div>
                    )
                )}

                {!isProcessing && logoUrl && (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className={deleteButtonClasses}
                        disabled={isProcessing}
                        title="Eliminar logo"
                    >
                        <Trash2 size={10} />
                    </button>
                )}
            </div>

            <div className={messageContainerClasses}>
                {error && !isProcessing && <p className={`${messageClasses} text-red-400`}><AlertCircle size={14} />{error}</p>}
                {successMessage && !isProcessing && <p className={`${messageClasses} text-green-400`}>{successMessage}</p>}
            </div>
        </div>
    );
}