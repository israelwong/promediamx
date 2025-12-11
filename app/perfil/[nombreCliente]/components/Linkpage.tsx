"use client";

import React, { useState, useEffect } from "react";
import Header from "./Header";
import Navbar from "./Navbar";
import SocialLinks from "./SocialLinks";
import Slider from "./Slider";
import Galeria from './Galeria';
import Contacto from "./Contacto";
import FAQ from "./FAQ";
import Footer from "./Footer";
// import MenuFlotanteVertical from "./MenuFlotanteVertical";
import BannerImage from "./BannerImage";
import Tarjeta from "./Tarjeta";
import VideoPlayer from "./VideoPlayer";
import Acerca from "./Acerca";
import Etiquetas from "./Etiquetas";
import Catalogo from "./Catalogo";
import Promos from "./Promos";
// import ScrollButton from "./ScrollButton";

interface Props {
    nombreCliente: string;
}

export default function Linkpage({ nombreCliente }: Props) {

    const [leadFormUrl, setLeadFormUrl] = useState('');
    const [telefono, setTelefono] = useState('');
    const [mensajeWhastapp, setMensajeWhatsapp] = useState('');
    // const [promoId, setPromoId] = useState('');

    useEffect(() => {
        const nombreNegocio = nombreCliente
        const promoId = '56tghnmk987yhnm'
        const telefono = '5544546582';

        setTelefono(telefono);
        setMensajeWhatsapp(`Hola, me gustaría recibir más información sobre los servicios de ${nombreNegocio}.`);

        setLeadFormUrl(`/linkpage/${nombreNegocio}/leadform?promoId=${promoId}`);
    }, [nombreCliente]);

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

    const etiquetas = ['fotografía', 'video', 'eventos', 'bodas', 'quinceañeras', 'corporativos']
    const [activeTab, setActiveTab] = useState('promo');

    return (
        <div className="">

            {/* //! HEADER */}
            <div className="py-4">
                <Header
                    nombre={nombreCliente}
                    slogan="Más de 10 años de experiencia en fotografía y video profesional"
                    url_image="https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/promedia/favicon_color.svg"
                />
            </div>

            <div>
                {/* Menu tab */}
                <Navbar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <div className="container mx-auto">
                    {activeTab === 'promo' && (
                        <div>
                            {/* Home content */}

                            <Tarjeta
                                params={{
                                    id: "1",
                                    hook: "Contactanos hoy mismo",
                                    cta: "Obten una cotización personalizada para tu evento especial y recibe un 10% de descuento en tu primer servicio.",
                                    button_title: "Contactar ahora",
                                    button_url: leadFormUrl,
                                    align: "left",
                                }}
                            />

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

                            <VideoPlayer
                                titulo="Video de presentación"
                                descripcion="Te compartimos algunas muestras de nuestro trabajo para que nos conozcas mejor."
                                video={{
                                    src: "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/video/reel2024_1min_SD.mp4?t=2024-09-27T18%3A17%3A22.773Z",
                                    muted: false,
                                    controls: true,
                                    autoPlay: false,
                                    loop: false,
                                    width: "100%",
                                    height: "400px",
                                    poster: "/images/rrss-confianza.jpg",
                                }}
                            />

                            <Slider
                                titulo="Slide de imágenes"
                                descripcion="Te compartimos algunoas muestras de nuestro trabajo para que nos conozcas mejor."
                                images={images}
                            />

                            <Galeria
                                titulo="Galería de imágenes"
                                descripcion="Te compartimos algunoas muestras de nuestro trabajo para que nos conozcas mejor."
                                images={images} />

                        </div>

                    )}
                    {/* Acerca content */}
                    {activeTab === 'acerca' && (
                        <Acerca descripcion={description} />
                    )}

                    {/* Catalogo content */}
                    {activeTab === 'catalogo' && (
                        <Catalogo />
                    )}

                    {activeTab === 'contacto' && (
                        <Contacto
                            telefono={telefono}
                            mensajeWhatsapp={mensajeWhastapp}
                            direccion="Av. Siempre Viva Esq. Calle de la Amargura #123, Col. Centro, C.P. 50000, Toluca, Estado de México."
                            iframeMapa='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.541481135676!2d-99.56514782524414!3d19.28827438181635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d28a07f185c8f1%3A0x868c6356c9852f86!2sCalle%205%20de%20Mayo%20123%2C%20Centro%2C%2050000%20Toluca%20de%20Lerdo%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1716949392348!5m2!1ses-419!2smx'
                            googleMapsUrl='https://goo.gl/maps/7Z8Z9Z8Z9Z8Z9Z8Z9'
                            horarios={["Lunes a Viernes: 9:00 AM - 6:00 PM", "Sábado: 10:00 AM - 2:00 PM", "Domingo: Cerrado"]}

                        />
                    )}

                    {activeTab === 'promos' && (
                        <Promos />
                    )}

                </div>
            </div >

            {/* secciones fijas */}
            <div className="">
                <SocialLinks />
                <FAQ />
                <Etiquetas etiquetas={etiquetas} />
            </div>


            {/* //!FOOTER */}
            < Footer />

        </div >
    );
}