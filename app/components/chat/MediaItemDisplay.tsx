// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/MediaItemDisplay.tsx
'use client';

import React, { memo } from 'react';
import Image from 'next/image'; // Importar Next/Image
import { FileText, Paperclip } from 'lucide-react';
import type { MediaItem } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas'; // Ajusta la ruta a tu schema

export interface MediaItemDisplayProps {
    mediaItem: MediaItem;
    itemIndex: number;
    messageId: string;
    allMediaForLightbox: MediaItem[]; // Todos los media items del mensaje actual (para el lightbox)
    openLightboxWithSlides: (
        slides: { src: string; alt?: string; type?: "image" }[],
        index: number
    ) => void; // Función para abrir el lightbox
}

const MediaItemDisplay: React.FC<MediaItemDisplayProps> = ({
    mediaItem,
    itemIndex,
    messageId,
    allMediaForLightbox,
    openLightboxWithSlides,
}) => {
    if (!mediaItem || !mediaItem.url) {
        console.warn(`[MediaItemDisplay] Media item inválido o sin URL en msg ${messageId}, index ${itemIndex}:`, mediaItem);
        return (
            <div className="my-1 p-2 border border-dashed border-red-500 rounded-md bg-red-900/30 text-xs text-red-300">
                Adjunto no disponible (URL faltante).
            </div>
        );
    }

    const handleImageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const imageSlides = allMediaForLightbox
            .filter((item) => item.tipo === 'image' && item.url)
            .map((item) => ({
                src: item.url!, // url no debería ser null aquí por el filtro anterior
                alt: item.caption || item.filename || `Imagen ${item.tipo}`,
                type: 'image' as const,
            }));

        const currentImageInSlidesIndex = imageSlides.findIndex(slide => slide.src === mediaItem.url);

        if (imageSlides.length > 0) {
            console.log(`[MediaItemDisplay] Abriendo lightbox. Item URL: ${mediaItem.url}, Índice calculado: ${currentImageInSlidesIndex}, Total en slides: ${imageSlides.length}`);
            openLightboxWithSlides(
                imageSlides,
                currentImageInSlidesIndex >= 0 ? currentImageInSlidesIndex : 0
            );
        } else {
            // Si no hay slides (improbable si se hizo clic en una imagen válida), abrir en nueva pestaña como fallback.
            console.warn(`[MediaItemDisplay] No se generaron slides para el lightbox, abriendo URL directamente. Item:`, mediaItem);
            window.open(mediaItem.url, '_blank');
        }
    };

    const commonMediaClasses = "my-1 p-2 border border-zinc-600 rounded-md bg-zinc-700/30 hover:bg-zinc-700/60 transition-colors";

    switch (mediaItem.tipo) {
        case 'image':
            return (
                <div
                    key={`<span class="math-inline">\{messageId\}\-media\-</span>{itemIndex}`}
                    className={`${commonMediaClasses} w-fit max-w-[280px] sm:max-w-[320px] group`}
                    title={mediaItem.caption || 'Ver imagen'}
                    style={{ cursor: 'pointer' }}
                    onClick={handleImageClick} // Tu handleImageClick para el lightbox
                >
                    {/* Contenedor con dimensiones definidas */}
                    <div className="relative w-full aspect-[4/3] sm:aspect-video max-h-60 bg-zinc-800 rounded"> {/* Añadí un bg por si la imagen no carga */}
                        <Image
                            width={400} // Ancho base para Next/Image
                            height={300} // Alto base para Next/Image
                            src={mediaItem.url}
                            alt={mediaItem.caption || `Imagen adjunta ${itemIndex + 1}`}
                            className="object-contain rounded" // Estilos para que se vea bien
                            style={{ // Estilos para que llene el contenedor div
                                display: 'block', // Asegurar que sea block
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain', // Similar a className="object-contain"
                            }}
                            onError={(e) => {
                                console.warn(`Error cargando <img> estándar: ${mediaItem.url}`);
                                const target = e.currentTarget as HTMLImageElement;
                                target.alt = "Error al cargar imagen";
                                // Podrías añadir un placeholder o mensaje de error aquí directamente
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.img-error-text')) {
                                    const errorP = document.createElement('p');
                                    errorP.textContent = 'Error al cargar';
                                    errorP.className = 'text-red-400 text-xs img-error-text';
                                    parent.appendChild(errorP);
                                }
                            }}
                        />
                    </div>
                    {mediaItem.caption && (
                        <p className="text-xs text-zinc-400 mt-1 truncate" title={mediaItem.caption}>
                            {mediaItem.caption}
                        </p>
                    )}
                </div>
            );
        case 'video':
            if (!mediaItem.url) {
                return <p className={`${commonMediaClasses} text-xs text-red-400`}>URL de video no disponible.</p>;
            }
            return (
                <div key={`${messageId}-media-${itemIndex}`} className={`${commonMediaClasses} max-w-xs w-full`}>
                    {mediaItem.caption && <p className="text-xs text-zinc-400 mb-1">{mediaItem.caption}</p>}
                    <video controls src={mediaItem.url} className="w-full h-auto max-h-60 rounded border border-zinc-500" onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; console.warn(`Error cargando video: ${mediaItem.url}`) }}>
                        Tu navegador no soporta el tag de video. <a href={mediaItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Ver video</a>
                    </video>
                </div>
            );
        case 'document':
            return (
                <div key={`${messageId}-media-${itemIndex}`} className={`${commonMediaClasses} w-fit`}>
                    <a
                        href={mediaItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm p-1"
                        download={mediaItem.filename || true}
                        title={`Descargar ${mediaItem.filename || mediaItem.caption || "documento"}`}
                    >
                        <FileText size={20} className="flex-shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[250px]">{mediaItem.filename || mediaItem.caption || "Documento Adjunto"}</span>
                    </a>
                </div>
            );
        case 'audio':
            if (!mediaItem.url) {
                return <p className={`${commonMediaClasses} text-xs text-red-400`}>URL de audio no disponible.</p>;
            }
            return (
                <div key={`${messageId}-media-${itemIndex}`} className={`${commonMediaClasses} w-full max-w-xs`}>
                    {mediaItem.caption && <p className="text-xs text-zinc-400 mb-1">{mediaItem.caption}</p>}
                    <audio controls src={mediaItem.url} className="w-full h-10" onError={(e) => { (e.currentTarget as HTMLAudioElement).style.display = 'none'; console.warn(`Error cargando audio: ${mediaItem.url}`) }}>
                        Tu navegador no soporta el tag de audio. <a href={mediaItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Escuchar audio</a>
                    </audio>
                </div>
            );
        default:
            // Intentar determinar si es un tipo no oficial pero común
            const probableType = mediaItem.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 'imagen (tipo no oficial)' :
                mediaItem.url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video (tipo no oficial)' :
                    mediaItem.url.match(/\.(mp3|wav|aac|oga)$/i) ? 'audio (tipo no oficial)' :
                        mediaItem.url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i) ? 'documento (tipo no oficial)' :
                            'desconocido';

            console.warn(`[MediaItemDisplay] Tipo de media no soportado oficialmente '${mediaItem.tipo}', URL: ${mediaItem.url}. Probable tipo inferido: ${probableType}`);
            return (
                <div key={`${messageId}-media-${itemIndex}`} className={`${commonMediaClasses} w-fit`}>
                    <a href={mediaItem.url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm p-1 flex items-center gap-2">
                        <Paperclip size={16} /> Ver adjunto (tipo: {mediaItem.tipo || probableType})
                    </a>
                </div>
            );
    }
};

export default memo(MediaItemDisplay);