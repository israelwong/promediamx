import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Image from 'next/image';
import { LayoutGrid } from 'lucide-react';

interface GaleriaLightboxProps {
    titulo: string;
    descripcion: string;
    images: { src: string; alt: string }[];
}

const GaleriaLightbox: React.FC<GaleriaLightboxProps> = ({ images, titulo, descripcion }) => {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);

    const handleOpen = (index: number) => {
        setIndex(index);
        setOpen(true);
    };

    return (
        <div className='px-5 py-10 border-t border-b border-zinc-600 mb-5'>
            <div className="mb-5">
                <h3 className="text-xl font-FunnelSans-Light mb-3 flex items-center space-x-2">
                    <LayoutGrid size={16} />
                    <span>{titulo}</span>
                </h3>
                <p className="text-zinc-400">{descripcion}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                    <div key={i} className="cursor-pointer aspect-square overflow-hidden relative" onClick={() => handleOpen(i)}>
                        <Image
                            src={img.src}
                            alt={img.alt}
                            className="object-cover"
                            layout="fill"
                        />
                    </div>
                ))}
            </div>
            <Lightbox
                open={open}
                close={() => setOpen(false)}
                slides={images.map((img) => ({ src: img.src, alt: img.alt }))}
                index={index}
            />
        </div>
    );
};

export default GaleriaLightbox;