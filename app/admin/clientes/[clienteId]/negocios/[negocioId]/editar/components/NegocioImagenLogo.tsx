'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, Building2, AlertCircle } from 'lucide-react'; // Building2 como placeholder
// Importar las acciones del servidor
import {
    actualizarImagenLogoNegocio,
    eliminarImagenLogoNegocio
} from '@/app/admin/_lib/negocioImagenLogo.actions'; // Ajusta la ruta según tu estructura

interface Props {
    negocioId: string;
    // URL inicial del logo, puede ser null o undefined
    initialLogoUrl?: string | null;
}

export default function NegocioImagenLogo({ negocioId, initialLogoUrl }: Props) {
    // Estado para la URL del logo actual
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
    // Estados para la carga y errores
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Referencia al input de archivo oculto
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar estado si la prop inicial cambia
    useEffect(() => {
        setLogoUrl(initialLogoUrl || null);
    }, [initialLogoUrl]);

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
            setError(null); // Limpiar errores al intentar de nuevo
            setSuccessMessage(null);
            fileInputRef.current?.click();
        }
    };

    // Maneja la selección de un nuevo archivo
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || isUploading || isDeleting) return;
        event.target.value = ''; // Resetear input

        // Validación del cliente
        const maxSize = 5 * 1024 * 1024; // 5MB (ajusta si necesitas)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']; // Permitir SVG
        if (file.size > maxSize) {
            setError(`Logo excede ${maxSize / 1024 / 1024}MB.`);
            setIsUploading(false); return;
        }
        if (!allowedTypes.includes(file.type)) {
            setError('Tipo no permitido (JPG, PNG, WEBP, SVG).');
            setIsUploading(false); return;
        }

        setIsUploading(true); setError(null); setSuccessMessage(null);

        try {
            const result = await actualizarImagenLogoNegocio(negocioId, file);
            if (result.success && result.data?.imageUrl) {
                setLogoUrl(result.data.imageUrl);
                setSuccessMessage('Logo actualizado.');
            } else { throw new Error(result.error || 'Error al actualizar logo.'); }
        } catch (err) {
            console.error("Error subiendo logo:", err);
            setError(err instanceof Error ? err.message : 'Error desconocido al subir.');
        } finally { setIsUploading(false); }
    };

    // Maneja la eliminación del logo
    const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isUploading || isDeleting || !logoUrl) return;
        if (confirm('¿Eliminar el logo del negocio?')) {
            setIsDeleting(true); setError(null); setSuccessMessage(null);
            try {
                const result = await eliminarImagenLogoNegocio(negocioId);
                if (result.success) {
                    setLogoUrl(null);
                    setSuccessMessage('Logo eliminado.');
                } else { throw new Error(result.error || 'Error al eliminar logo.'); }
            } catch (err) {
                console.error("Error eliminando logo:", err);
                setError(err instanceof Error ? err.message : 'Error desconocido al eliminar.');
            } finally { setIsDeleting(false); }
        }
    };

    // --- Clases de Tailwind ---
    // Hacerlo circular y más pequeño que la portada del catálogo
    const containerClasses = "relative group w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer bg-zinc-800/50 overflow-hidden";
    const imageClasses = "object-cover w-full h-full rounded-full"; // Asegurar redondez
    const placeholderIconClasses = "h-8 w-8 md:h-10 md:w-10 text-zinc-600"; // Icono placeholder
    const placeholderTextClasses = "text-[10px] md:text-xs font-semibold mt-1"; // Texto más pequeño
    const loadingOverlayClasses = "absolute inset-0 bg-black/70 rounded-full flex items-center justify-center z-10"; // Overlay redondeado
    const deleteButtonClasses = "absolute top-0 right-0 z-20 p-1 bg-red-600/80 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:opacity-50";
    const messageClasses = "text-xs mt-2 text-center";

    const isLoading = isUploading || isDeleting;

    return (
        <div className="flex flex-col items-center">
            <label className={`${labelBaseClasses} mb-2`}>Logo del Negocio</label>
            <div className={containerClasses} onClick={handleImageClick} title={logoUrl ? "Clic para cambiar logo" : "Clic para subir logo"}>
                {/* Input oculto */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml" // Añadir SVG
                    disabled={isLoading}
                />

                {/* Estado de Carga */}
                {isLoading && (
                    <div className={loadingOverlayClasses}>
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                )}

                {/* Logo Actual o Placeholder */}
                {!isLoading && logoUrl ? (
                    <Image
                        key={logoUrl}
                        src={logoUrl}
                        alt="Logo del negocio"
                        fill
                        sizes="112px" // Corresponde a w-28
                        className={imageClasses}
                        onError={() => { console.warn("Error cargando logo:", logoUrl); setLogoUrl(null); setError("Error al cargar logo."); }}
                    />
                ) : !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-1">
                        <Building2 className={placeholderIconClasses} />
                        <p className={placeholderTextClasses}>Subir Logo</p>
                    </div>
                )}

                {/* Botón Eliminar */}
                {!isLoading && logoUrl && (
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className={deleteButtonClasses}
                        disabled={isLoading}
                        title="Eliminar logo"
                    >
                        <Trash2 size={10} /> {/* Icono más pequeño */}
                    </button>
                )}
            </div>

            {/* Mensajes de Feedback */}
            <div className="h-4 mt-2 w-full max-w-[120px]"> {/* Contenedor fijo para mensajes */}
                {error && <p className={`${messageClasses} text-red-400`}><AlertCircle size={14} className="inline mr-1" />{error}</p>}
                {successMessage && <p className={`${messageClasses} text-green-400`}>{successMessage}</p>}
            </div>
            {/* <p className={`${messageClasses} text-zinc-500`}>Recomendado: Cuadrado</p> */}
        </div>
    );
}

// Clase labelBaseClasses (definida para claridad si se usa en otros sitios)
const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";

