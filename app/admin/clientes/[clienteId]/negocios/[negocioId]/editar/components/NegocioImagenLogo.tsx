// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/components/NegocioImagenLogo.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useDropzone, FileWithPath } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Loader2, Trash2, Building2, AlertCircle, UploadCloud, RefreshCw } from 'lucide-react'; // Añadido RefreshCw por si se quiere el overlay
import {
    actualizarImagenLogoNegocio, // Asumiendo que estas son las actions refactorizadas y en la ruta correcta
    eliminarImagenLogoNegocio
} from '@/app/admin/_lib/actions/negocio/negocioImagenLogo.actions'; // <-- CORREGIR RUTA A LA NUEVA UBICACIÓN CENTRALIZADA DE ACTIONS DE NEGOCIO

interface Props {
    negocioId: string;
    initialLogoUrl?: string | null;
}

export default function NegocioImagenLogo({ negocioId, initialLogoUrl }: Props) {
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);

    // Sincronizar con initialLogoUrl
    useEffect(() => {
        setLogoUrl(initialLogoUrl || null);
    }, [initialLogoUrl]);

    // Timer para mensajes
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

        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (file.size > maxSize) { setError(`Original excede ${maxSize / 1024 / 1024}MB.`); return; }
        if (!allowedTypes.includes(file.type)) { setError('Tipo no permitido (JPG, PNG, WEBP, SVG).'); return; }

        setIsProcessing(true);
        setProgressMessage('Comprimiendo imagen...');
        let fileToUpload = file;
        if (file.type !== 'image/svg+xml') {
            try {
                const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true, alwaysKeepResolution: false };
                fileToUpload = await imageCompression(file, options);
                setProgressMessage('Imagen comprimida. Subiendo...');
            } catch (compressionError) {
                console.error("Error comprimiendo logo:", compressionError);
                setError('Error al comprimir. Intentando subir original.');
                setProgressMessage('Subiendo original...');
            }
        } else { setProgressMessage('Subiendo SVG...'); }

        const formDataPayload = new FormData();
        formDataPayload.append('file', fileToUpload, file.name);

        try {
            // Asegúrate que la action 'actualizarImagenLogoNegocio' esté importada de la ruta correcta
            // y que maneje el argumento 'clienteId' si es necesario para revalidatePath
            const result = await actualizarImagenLogoNegocio(negocioId, formDataPayload); // Aquí podrías necesitar pasar clienteId
            if (result?.success && result.data?.imageUrl) {
                setLogoUrl(result.data.imageUrl);
                setSuccessMessage('Logo actualizado.');
            } else { throw new Error(result?.error || 'Error al actualizar logo.'); }
        } catch (err) {
            console.error("Error subiendo logo:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
        } finally { setIsProcessing(false); setProgressMessage(null); }
    }, [negocioId, isProcessing]); // Añadir clienteId a las dependencias si se usa en la action

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg'] },
        multiple: false,
        disabled: isProcessing,
    });

    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isProcessing || !logoUrl) return;
        if (confirm('¿Eliminar el logo del negocio?')) {
            setIsProcessing(true);
            setProgressMessage('Eliminando logo...');
            setError(null); setSuccessMessage(null);
            try {
                // Asegúrate que la action 'eliminarImagenLogoNegocio' esté importada de la ruta correcta
                // y que maneje el argumento 'clienteId' si es necesario para revalidatePath
                const result = await eliminarImagenLogoNegocio(negocioId); // Aquí podrías necesitar pasar clienteId
                if (result?.success) {
                    setLogoUrl(null);
                    setSuccessMessage('Logo eliminado.');
                } else { throw new Error(result?.error || 'Error al eliminar logo.'); }
            } catch (err) {
                console.error("Error eliminando logo:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally { setIsProcessing(false); setProgressMessage(null); }
        }
    };

    // Clases de UI
    const labelBaseUiClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    // El 'group' aquí es clave para el group-hover:opacity-100 del botón de eliminar
    const imageWrapperClasses = `w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-zinc-600 bg-zinc-700 flex items-center justify-center text-zinc-500 relative group cursor-pointer shadow-lg`;
    const imageClasses = "object-cover w-full h-full rounded-full";
    const placeholderIconClasses = "h-8 w-8 md:h-10 md:h-10";
    const placeholderTextClasses = "text-[10px] md:text-xs font-semibold mt-1";
    const processingOverlayClasses = "absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center z-30 p-2 text-center"; // Aumentado z-index por si acaso
    const deleteButtonStyledClasses = "absolute top-1 right-1 z-20 p-1.5 bg-red-700/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed";
    const replaceOverlayClasses = "absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300";
    const messageContainerClasses = "h-4 mt-2 w-full max-w-[220px]"; // Un poco más de ancho para mensajes largos
    const messageClasses = "text-xs text-center flex items-center justify-center gap-1";

    return (
        <div className="flex flex-col items-center">
            <label className={`${labelBaseUiClasses} mb-2`}>Logo del Negocio</label>
            <div {...getRootProps({ className: imageWrapperClasses })} > {/* Aplicar clases aquí */}
                <input {...getInputProps()} />

                {isProcessing && (
                    <div className={processingOverlayClasses}>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                        {progressMessage && <p className="text-xs text-white mt-1">{progressMessage}</p>}
                    </div>
                )}

                {!isProcessing && logoUrl ? (
                    <> {/* Usar un Fragmento para agrupar Image y los botones/overlays */}
                        <Image
                            key={logoUrl} // Forzar re-render si la URL cambia (útil si la URL incluye timestamp)
                            src={logoUrl}
                            alt="Logo del negocio"
                            fill
                            sizes="(max-width: 768px) 96px, 112px"
                            className={imageClasses} // z-index bajo para que los botones estén encima
                            onError={() => { console.warn("Error cargando logo:", logoUrl); setLogoUrl(null); setError("Error al cargar imagen."); }}
                        />
                        {/* Overlay de "Reemplazar" similar a AsistenteImagenAvatar */}
                        <div className={replaceOverlayClasses}>
                            <span className="text-white text-xs font-semibold flex items-center gap-1">
                                <RefreshCw size={14} /> Reemplazar
                            </span>
                        </div>
                        {/* Botón de eliminar */}
                        <button
                            type="button"
                            onClick={handleDeleteClick}
                            className={deleteButtonStyledClasses} // Usar las clases inspiradas en AsistenteImagenAvatar
                            disabled={isProcessing}
                            title="Eliminar logo"
                            aria-label="Eliminar logo"
                        >
                            <Trash2 size={12} /> {/* Ajustar tamaño de icono si es necesario */}
                        </button>
                    </>
                ) : !isProcessing && (
                    // Placeholder si no hay logoUrl
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
            </div>

            <div className={messageContainerClasses}>
                {error && !isProcessing && <p className={`${messageClasses} text-red-400`}><AlertCircle size={14} />{error}</p>}
                {successMessage && !isProcessing && <p className={`${messageClasses} text-green-400`}>{successMessage}</p>}
            </div>
        </div>
    );
}