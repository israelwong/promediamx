"use client";
import Header from "./Header";
import Descripcion from './Descripcion';
import SocialLinks from "./SocialLinks";
import Slider from "./Slider";
import Galeria from './Galeria';
import MapaGoogle from "./MapaGoogle";
import FAQ from "./FAQ";
import Footer from "./Footer";
import MenuFlotanteVertical from "./MenuFlotanteVertical";
import LeadForm from "./Leadform";
import BannerImage from "./BannerImage";
import BannerVideo from "./BannerVideo";
import Card from "./Card";
import VideoPlayer from "./VideoPlayer";

interface Props {
    nombreCliente: string;
}


export default function FichaCliente({ nombreCliente }: Props) {

    const description = `
    Prosocial es tu agencia de fotografía y video profesional, especializada en eventos sociales.
    Ofrecemos cobertura completa para bodas, quinceañeras, eventos corporativos y más.
    Capturamos cada momento con pasión y calidad, creando recuerdos inolvidables a través de fotos y videos cinematográficos.
    Somos profesionales con experiencia, calidad garantizada y atención personalizada.
    Contáctanos y captura tus recuerdos!`;

    const images = [
        {
            src: '/images/rrss-confianza.jpg',
            alt: 'Image 1',
            title: 'Confianza',
            description: 'Prosocial es tu agencia de fotografía y video profesional, especializada en eventos sociales.',
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
            description: 'Prosocial es tu agencia de fotografía y video profesional, especializada en eventos sociales.',
            alt: 'Image 3',
            width: 800,
            height: 400,
        },
        {
            src: '/images/rrss-destaca.jpg',
            title: 'Confianza',
            alt: 'Image 2',
            width: 800,
            height: 400,
        },
        {
            src: '/images/rrss-fideliza.jpg',
            title: 'Confianza',
            alt: 'Image 3',
            width: 800,
            height: 400,
        },
    ];

    const telefono = '5555555555';
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

                <div className="p-5 mb-5">
                    <Descripcion
                        nombreCliente={nombreCliente}
                        description={description} maxLines={3} />
                </div>

                <div className="mb-5">
                    <VideoPlayer
                        src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/reel2024_1min_SD.webm?t=2024-09-27T18%3A17%3A22.773Z"
                        muted={false}
                        controls={true}
                    />
                </div>

                <div className="p-5">
                    <Slider
                        titulo="Slide de imágenes"
                        descripcion="Te compartimos algunoas muestras de nuestro trabajo para que nos conozcas mejor."
                        images={images}
                    />
                </div>

                <div className="p-5 mb-5">
                    <BannerImage
                        params={{
                            nombre_negocio: nombreCliente,
                            title: "Banner con imagen",
                            description: "Te compartumos algunoas muestras de nuestro trabajo para que nos conozcas mejor.",
                            image_url: "/images/rrss-confianza.jpg",
                            image_opacity: "0.8",
                            mask: true,
                            mask_opacity: "0.5",
                            height: "400px",
                            title_align: "center",
                            button_align: "center",
                            button_url: "https://www.prosocial.mx/contacto",
                            button_title: "Contáctanos"
                        }}
                    />
                </div>

                <div className="mb-5">
                    <Galeria
                        titulo="Galería de imágenes"
                        descripcion="Te compartimos algunoas muestras de nuestro trabajo para que nos conozcas mejor."
                        images={images} />
                </div>

                <div className="p-5">
                    <BannerVideo
                        params={{
                            nombre_negocio: nombreCliente,
                            title: "Banner con video",
                            description: "Te compartumos algunoas muestras de nuestro trabajo para que nos conozcas mejor.",
                            video_url: "https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/video/cuadro-acrilico.mp4",
                            height: "400px",
                            title_align: "center",
                            button_align: "center",
                            button_url: "https://www.prosocial.mx/contacto",
                            button_title: "Contáctanos"
                        }}
                    />
                </div>

                <div className="p-5">

                    <div className=" border border-zinc-600 rounded-md">
                        <Card
                            params={{
                                id: "card-1",
                                hook: "Contactanos",
                                hook_align: "left",
                                cta: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                                cta_align: "left",
                                button_title: "Ver más",
                                button_url: "https://www.prosocial.mx/contacto",
                                button_align: "left"
                            }}
                        />
                    </div>
                </div>

                {/* //!LEAD FORM */}
                <div className="p-5 mb-5">
                    <LeadForm
                        titulo="Contáctanos"
                        descripcion="Envíanos un mensaje y nos pondremos en contacto contigo a la brevedad."
                        telefono={telefono}
                        email={email}
                    />
                </div>

                {/* //!UBICACIÓN */}
                <div className="p-5">
                    <MapaGoogle />
                </div>

                {/* //!FAQ */}
                <div className="p-5">
                    <FAQ />
                </div>



                {/* //!REDES SOCIALES */}
                <div className="p-5 mb-5">
                    <SocialLinks />
                </div>

            </div>

            {/* //!FOOTER */}
            <div className="p-5">
                <p className="text-zinc-400 font-FunnelSans-Light text-sm mb-5">
                    Palabras clave
                </p>
                <div className="flex flex-wrap gap-2">
                    {['fotografía', 'video', 'eventos', 'bodas', 'quinceañeras', 'corporativos'].map((keyword) => (
                        <span key={keyword} className="bg-zinc-900 text-zinc-500 px-3 py-1 rounded-full text-sm border border-zinc-800">
                            {keyword}
                        </span>
                    ))}
                </div>
            </div>

            {/* //!MENU FLOTANTE */}
            <MenuFlotanteVertical />

            {/* //!FOOTER */}

            <Footer />

        </div>
    );
}