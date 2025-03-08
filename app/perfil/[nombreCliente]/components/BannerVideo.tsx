import Link from 'next/link';
interface BannerImageProps {
    params: {
        nombre_negocio: string;
        title: string;
        description: string;
        video_url: string; // URL del video
        image_opacity?: string;
        mask?: boolean;
        mask_opacity?: string;
        height: string;
        title_align?: string; // Parámetro opcional para alinear el título
        button_align?: string; // Parámetro opcional para alinear el botón
        button_url?: string;
        button_title?: string;
    };
}

function BannerVideo({ params }: BannerImageProps) {
    return (
        <div className="p-5 mb-5">
            <div
                className={`
                items-end
                justify-start
                rounded-md
                wrap-banner-image 
                bg-cover 
                flex 
                relative
                overflow-hidden`} // Evitar desbordamiento
                style={{
                    height: params.height,
                }}
            >
                <video
                    className="absolute top-0 left-0 w-full h-full object-cover" // Ajustar el video al contenedor
                    autoPlay
                    loop
                    muted
                >
                    <source src={params.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                {params.mask && (
                    <div
                        style={{
                            opacity: `${params.mask_opacity || '0.5'}`,
                        }}
                        className="absolute inset-0 bg-black"
                    ></div>
                )}
                <div className="
                relative
                inset-0 
                bg-gradient-to-t
                from-black/70
                via-black/40
                to-transparent rounded-b-md
                flex flex-col justify-center items-center
                ">
                    <div
                        id="bloque-texto"
                        className={`text-white p-5 text-${params.title_align || 'left'}`} // Aplicar alineación del título
                    >
                        <h1 className="font-bold text-2xl">{params.title}</h1>
                        <p>{params.description}</p>
                        {params.button_url && params.button_title && (
                            <div className={`py-5 text-${params.button_align || 'left'}`}>
                                <Link
                                    href={params.button_url}
                                    className="p-3 text-white bg-blue-500 rounded-md"
                                >
                                    {params.button_title}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BannerVideo;