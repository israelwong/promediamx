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

    useEffect(() => {
        async function fetchImages() {
            const response = await getImagesUrls(folder);
            response.galeria.sort(() => Math.random() - 0.5);
            if (response.success) {
                setGaleria(response.galeria);
            } else {
                console.error(response.message);
            }
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


    return (

        <div id={galleryID} className="
        pswp-gallery
        md:columns-4 
        md:gap-3 
        md:p-5 
        columns-2 
        gap-3 
        p-0 
        w-full
        ">
            {galeria.length > 0 ? (
                galeria.map((image, index) => (
                    <a
                        href={image.url}
                        data-pswp-width={image.width}
                        data-pswp-height={image.height}
                        key={`${galleryID}-${index}`}
                        target="_blank"
                        rel="noreferrer"
                        className=""
                    >
                        <Image
                            className='w-full h-auto aspect-auto md:py-2 py-1.5'
                            src={image.url}
                            alt=""
                            width={image.width / 3}
                            height={image.height / 3}
                        />
                    </a>
                ))
            ) : (


                <div className="text-center flex flex-col items-center justify-center py-10">
                    <div className='flex items-center'>
                        <span className='flex'>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-cyan-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </span>
                        <p>Cargando imagenes ...</p>
                    </div>
                </div>

            )}
        </div>


    );

}

export default Galeria;