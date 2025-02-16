import React, { useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FichaBeneficiosContenidoRRSS() {

    const beneficios = [
        {
            title: 'Genera confianza',
            description: 'Una imagen profesional fortalece tu marca y aumenta las conversiones.',
            image: '/images/rrss-confianza.jpg',
        },
        {
            title: 'Fideliza a tu audiencia',
            description: 'Mantén a tus seguidores vigentes, ya que aportas contenido de valor y relevante.',
            image: '/images/rrss-fideliza.jpg',
        },
        {
            title: 'Te destaca de tu competencia',
            description: 'Comunicarte con calidad y estrategia te posiciona como líder en tu sector.',
            image: '/images/rrss-destaca.jpg',
        }
    ];


    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center', slidesToScroll: 1, containScroll: 'trimSnaps', dragFree: false }, [Autoplay()])

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext()
    }, [emblaApi])

    return (
        <div className='col-span-1 border border-zinc-700 rounded-lg p-5 bg-zinc-900'>
            <h2 className='font-FunnelSans-Bold mb-1.5 text-orange-600 text-2xl'>
                Beneficios del contenido en redes sociales
            </h2>

            <div className="embla w-full relative">
                <div className="embla__viewport" ref={emblaRef}>
                    <div className="embla__container font-FunnelSans-Regular">
                        {beneficios.map((beneficio, index) => (
                            <div className="embla__slide px-2" key={index}>
                                <h4 className='text-zinc-400 text-xl mb-2 font-FunnelSans-Light'>
                                    {index + 1}. {beneficio.title}
                                </h4>

                                <Image src={beneficio.image} width={400} height={400} alt={beneficio.title} className='object-cover rounded-lg mb-2' />

                                <p className='text-zinc-400 font-FunnelSans-Light'>
                                    {beneficio.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="embla__prev absolute left-0 top-1/2 transform -translate-y-1/2 bg-orange-800 text-white p-2 rounded-md ml-4 opacity-80" onClick={scrollPrev}>
                    <ChevronLeft />
                </button>
                <button className="embla__next absolute right-0 top-1/2 transform -translate-y-1/2 bg-orange-800 text-white p-2 rounded-md mr-4 opacity-80" onClick={scrollNext}>
                    <ChevronRight />
                </button>
            </div>

            <style jsx>{`
                .embla {
                    overflow: hidden;
                }
                .embla__container {
                    display: flex;
                }
                .embla__slide {
                    flex: 0 0 100%;
                }
            `}</style>
        </div>
    )
}
