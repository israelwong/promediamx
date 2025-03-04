import React, { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import { GalleryHorizontalEnd } from 'lucide-react';

interface SliderProps {
    images: { src: string; alt: string; width: number; height: number }[];
    titulo: string;
    descripcion: string;
}

const Slider: React.FC<SliderProps> = ({ images, titulo, descripcion }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
    const [selectedIndex, setSelectedIndex] = useState(0);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    return (
        <div>

            <div className='mb-5'>

                <h3 className="text-xl font-FunnelSans-Light mb-3 flex items-center space-x-2">
                    <GalleryHorizontalEnd size={16} />
                    <span>{titulo}</span>
                </h3>
                <p className='text-zinc-400'>
                    {descripcion}
                </p>
            </div>


            <div className="embla relative">
                <div className="embla__viewport overflow-hidden w-full" ref={emblaRef}>
                    <div className="embla__container flex">
                        {images.map((img, index) => (
                            <div className="embla__slide relative min-w-full" key={index}>
                                <Image
                                    src={img.src}
                                    alt={img.alt}
                                    width={img.width}
                                    height={img.height}
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="embla__dots absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={`w-3 h-3 rounded-full ${selectedIndex === index ? 'bg-white' : 'bg-gray-500'}`}
                            onClick={() => emblaApi?.scrollTo(index)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Slider;