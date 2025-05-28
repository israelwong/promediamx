// app/components/chat/rich_elements/OfferDisplayComponent.tsx
'use client';

import React, { memo, useCallback, useMemo } from 'react';
import type {
    OfferDisplayPayloadData,
    UiPayloadImage,
    UiPayloadVideo,
} from '@/app/admin/_lib/ui-payloads.types'; // AJUSTA LA RUTA
import Image from 'next/image';

interface OfferDisplayComponentProps {
    data: OfferDisplayPayloadData;
    openLightboxWithSlides: (
        slides: { src: string; alt?: string; type?: "image" }[],
        index: number,
        caller?: string
    ) => void;
}

const OfferDisplayComponent: React.FC<OfferDisplayComponentProps> = ({ data, openLightboxWithSlides }) => {
    // Memoizar la lista completa de imágenes que pueden ir al lightbox
    const allLightboxableImages = useMemo(() => {
        const images: UiPayloadImage[] = [];
        if (data?.imagenPrincipal?.url) {
            images.push({ ...data.imagenPrincipal, isPrincipal: true }); // Marcarla si quieres diferenciarla
        }
        if (data?.galeriaImagenes) {
            images.push(...data.galeriaImagenes.filter(img => img.url));
        }
        console.log("[OfferDisplayComponent V3] allLightboxableImages memoizadas:", images);
        return images;
    }, [data?.imagenPrincipal, data?.galeriaImagenes]);

    const handleImageClick = useCallback((clickedImageUrl: string) => {
        const imageSlides = allLightboxableImages.map(img => ({
            src: img.url,
            alt: img.altText || img.caption || 'Imagen de la oferta',
            type: 'image' as const,
        }));

        const clickedIndex = imageSlides.findIndex(slide => slide.src === clickedImageUrl);

        console.log(`[OfferDisplayComponent V3] handleImageClick. URL Clickeada: ${clickedImageUrl}, Índice Calculado: ${clickedIndex}`);
        if (imageSlides.length > 0 && clickedIndex !== -1) {
            openLightboxWithSlides(imageSlides, clickedIndex, 'OfferDisplay_ImageClick');
        } else if (imageSlides.length > 0) { // Fallback al primer slide si no se encontró el clickeado
            console.warn(`[OfferDisplayComponent V3] Imagen clickeada (${clickedImageUrl}) no encontrada en slides, abriendo el primero.`);
            openLightboxWithSlides(imageSlides, 0, 'OfferDisplay_ImageClick_FallbackIndex');
        } else {
            console.warn("[OfferDisplayComponent V3] No hay imágenes válidas para el lightbox en este click.");
        }
    }, [allLightboxableImages, openLightboxWithSlides]);

    if (!data || !data.nombre) {
        console.error("[OfferDisplayComponent V3] Datos inválidos o faltantes.", data);
        return <div className="text-red-400 p-2 border border-red-500 rounded">Error: Datos de oferta incompletos.</div>;
    }

    console.log("[OfferDisplayComponent V3] Renderizando. Props 'data' (parcial):",
        { nombre: data.nombre, imagenPrincipal: !!data.imagenPrincipal, galeriaCount: data.galeriaImagenes?.length }
    );

    // Helper para renderizar videos (mantenido de tu versión)
    const renderVideo = (video: UiPayloadVideo, index: number) => {
        if (!video.videoUrl) return null;
        return (
            <div key={`video-${index}-${video.videoUrl}`} className="my-2">
                {video.titulo && <h5 className="text-sm font-semibold text-zinc-200 mb-1">{video.titulo}</h5>}
                {video.tipoVideo === 'YOUTUBE' || video.tipoVideo === 'VIMEO' ? (
                    <div className="aspect-video bg-black rounded overflow-hidden w-full max-w-md"> {/* max-w-md para ejemplo */}
                        <iframe
                            src={video.videoUrl.includes("youtube.com/watch?v=") ? video.videoUrl.replace("watch?v=", "embed/") : video.videoUrl} // Simplificación
                            title={video.titulo || "Video"}
                            frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                ) : (
                    <video controls src={video.videoUrl} className="w-full rounded max-h-60 max-w-md">
                        Tu navegador no soporta el tag de video.
                    </video>
                )}
            </div>
        );
    };

    return (
        <div className="offer-display-component p-3 bg-zinc-700/30 rounded-lg my-1 text-sm text-zinc-100 max-w-full overflow-hidden">
            {/* Nombre de la Oferta */}
            {data.nombre && <h3 className="text-base font-semibold text-white !my-1 !text-left">{data.nombre}</h3>}

            {/* Imagen Principal */}
            {data.imagenPrincipal?.url && (
                <div
                    className="my-2 relative group w-full max-w-sm mx-auto" // Contenedor para la imagen principal
                // QUITAR EL ONCLICK DE AQUÍ TEMPORALMENTE PARA VER SI ESTE ES EL QUE SE DISPARA SOLO
                // onClick={() => {
                //     console.log("[OfferDisplayComponent V3] onClick en DIV de Imagen Principal.");
                //     handleImageClick(data.imagenPrincipal!.url);
                // }}
                // role="button" tabIndex={0}
                >
                    <div className="aspect-video rounded-md overflow-hidden border border-zinc-600">
                        <Image
                            src={data.imagenPrincipal.url}
                            alt={data.imagenPrincipal.altText || data.nombre}
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 90vw, (max-width: 768px) 80vw, 400px"
                            unoptimized={true}
                            priority
                            onClick={() => { // MOVER EL ONCLICK AL <Image /> DIRECTAMENTE
                                console.log("[OfferDisplayComponent V3] onClick en <Image /> Principal.");
                                handleImageClick(data.imagenPrincipal!.url);
                            }}
                            style={{ cursor: 'pointer' }} // Añadir cursor pointer a la imagen
                            onError={(e) => console.error(`Error cargando imagen principal: ${data.imagenPrincipal?.url}`, e)}
                        />
                    </div>
                    {data.imagenPrincipal.caption && <p className="text-xs text-zinc-300 italic text-center mt-1">{data.imagenPrincipal.caption}</p>}
                </div>
            )}

            {data.descripcionGeneral && <p className="!my-2">{data.descripcionGeneral.replace(/\n/g, "<br />")}</p>}
            {data.precioFormateado && (<p className="font-bold !my-1 text-base"> {data.precioFormateado} {data.moneda && <span className="text-xs font-normal ml-1">{data.moneda}</span>} </p>)}
            {data.condiciones && <p className="text-xs !my-1"><em>Condiciones: {data.condiciones}</em></p>}
            {/* Link de Pago */}
            {data.linkPago && (
                <div className="my-3">
                    <a
                        href={data.linkPago}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors no-underline"
                    >
                        ¡Aprovechar Oferta! {/* O un texto más genérico */}
                    </a>
                </div>
            )}

            {/* Galería de Imágenes Adicionales */}
            {data.galeriaImagenes && data.galeriaImagenes.length > 0 && (
                <div className="my-3">
                    <h4 className="text-sm font-semibold text-zinc-100 !mb-1.5 !mt-3">Galería:</h4>
                    <div className="not-prose grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {data.galeriaImagenes.map((img, idx) => (
                            <div // El div wrapper es bueno para layout y padding si es necesario
                                key={`gallery-${idx}-${img.url}`}
                                className="aspect-square bg-zinc-800/50 rounded overflow-hidden relative group border border-zinc-700 hover:border-blue-500"
                            // QUITAR EL ONCLICK DE AQUÍ TEMPORALMENTE
                            // onClick={() => {
                            //     console.log(`[OfferDisplayComponent V3] onClick en DIV de Galería (índice ${idx}).`);
                            //     handleImageClick(img.url);
                            // }}
                            // role="button" tabIndex={0}
                            >
                                <Image
                                    src={img.url}
                                    alt={img.altText || `Imagen de galería ${idx + 1}`}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                                    sizes="(max-width: 100px) 30vw, 100px"
                                    unoptimized={true}
                                    loading="lazy"
                                    onClick={() => { // MOVER EL ONCLICK AL <Image /> DIRECTAMENTE
                                        console.log(`[OfferDisplayComponent V3] onClick en <Image /> de Galería (índice ${idx}).`);
                                        handleImageClick(img.url);
                                    }}
                                    style={{ cursor: 'pointer' }} // Añadir cursor pointer a la imagen
                                    onError={(e) => console.error(`Error cargando imagen de galería: ${img.url}`, e)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Videos */}
            {data.videos && data.videos.length > 0 && (
                <div className="my-3">
                    <h4 className="text-sm font-semibold text-zinc-200 !mb-1 !mt-2">Videos:</h4>
                    {data.videos.map(renderVideo)}
                </div>
            )}

            {/* Detalles Adicionales (FAQs, Beneficios) */}
            {data.listaDetalles && data.listaDetalles.length > 0 && (
                <div className="my-3">
                    {data.listaDetalles.map((detalle, idx) => (
                        <div key={`detail-${idx}`} className="py-1">
                            {detalle.tituloDetalle && <h5 className="font-semibold text-zinc-100 !text-sm !mt-1 !mb-0.5">{detalle.tituloDetalle}</h5>}
                            {detalle.contenido && <p className="text-zinc-300 !text-xs !my-0">{detalle.contenido}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default memo(OfferDisplayComponent);