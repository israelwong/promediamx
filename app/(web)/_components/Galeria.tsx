'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';
import { getImagesUrls } from '@/app/_lib/GalleryImages';

interface GaleriaProps {
    folder: string;
    galleryID: string;
}

function Galeria({ folder, galleryID }: GaleriaProps) {
    const [galeria, setGaleria] = useState<{ url: string, width: number, height: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchImages() {
            const response = await getImagesUrls(folder);
            response.galeria.sort(() => Math.random() - 0.5);
            if (response.success) {
                setGaleria(response.galeria);
            } else {
                console.error(response.message);
            }
            setLoading(false);
        }
        fetchImages();

        const lightbox = new PhotoSwipeLightbox({
            gallery: `#${galleryID}`,
            children: 'a',
            pswpModule: () => import('photoswipe'),
        });
        lightbox.init();

        return () => {
            lightbox.destroy();
        };
    }, [folder, galleryID]);

    if (loading) {
        return <div className='text-center h-1/4 justify-center items-center flex py-10'>
            <div>
                Cargando galería...
            </div>
        </div>;
    }

    return (
        <div id={galleryID} className="pswp-gallery columns-2 md:gap-3 gap-0 md:columns-4 p-5">
            {galeria.map((image, index) => (
                <a
                    href={image.url}
                    data-pswp-width={image.width}
                    data-pswp-height={image.height}
                    key={`${galleryID}-${index}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-inside-avoid"
                >
                    <Image
                        className='w-full h-auto aspect-auto py-1.5'
                        src={image.url}
                        alt=""
                        width={image.width / 3}
                        height={image.height / 3}
                    />
                </a>
            ))}
        </div>
    );
}

export default Galeria;