"use client";
import Header from "./Header";
import Descripcion from './Descripcion';

import SocialLinks from "./SocialLinks";
import Slider from "./Slider";
import MapaGoogle from "./MapaGoogle";
import FAQ from "./FAQ";
import Footer from "./Footer";


interface Props {
    nombreCliente: string;
}


export default function FichaCliente({ nombreCliente }: Props) {

    const description = `
    Prosocial es tu agencia de fotografía y video profesional, especializada en eventos sociales.
    Ofrecemos cobertura completa para bodas, quinceañeras, eventos corporativos y más.
    Capturamos cada momento con pasión y calidad, creando recuerdos inolvidables a través de fotos y videos cinematográficos.
    Somos profesionales con experiencia, calidad garantizada y atención personalizada.
    Contáctanos y captura tus recuerdos!
  `;

    const images = [
        {
            src: '/images/rrss-confianza.jpg',
            alt: 'Image 1',
            width: 800,
            height: 400,
        },
        {
            src: '/images/rrss-destaca.jpg',
            alt: 'Image 2',
            width: 800,
            height: 400,
        },
        {
            src: '/images/rrss-fideliza.jpg',
            alt: 'Image 3',
            width: 800,
            height: 400,
        },
    ];

    const descripcion = 'Agencia de fotografía y video profesional para la cobertura de eventos sociales.';

    const telefono = '722 123 4567';
    const email = 'contacto@prosocial.mx';



    return (
        <div className="">
            {/* //! HEADER */}
            <div className="border-b border-zinc-800 py-4">
                <Header
                    nombre={nombreCliente}
                    slogan="Momentos para toda la vida"
                    url_image="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia//favicon_fullcolor.svg"
                    web="https://www.prosocial.mx"
                />
            </div>

            {/* //!DESCRIPCIÓN */}
            <div className="container mx-auto py-4">

                <div className="p-5">
                    <Descripcion
                        nombreCliente={nombreCliente}
                        description={description} maxLines={3} />
                </div>

                <div className="p-4">
                    <Slider
                        titulo="Galería de imágenes"
                        descripcion="Te compartumos algunoas muestras de nuestro trabajo para que nos conozcas mejor."
                        images={images} />
                </div>



                {/* //!REDES SOCIALES */}
                <div className="p-5">
                    <SocialLinks />
                </div>

                {/* //!UBICACIÓN */}
                <div className="p-5">
                    <MapaGoogle />
                </div>

                {/* //!FAQ */}
                <div className="p-5">
                    <FAQ />
                </div>

            </div>

            <Footer />

        </div>
    );
}