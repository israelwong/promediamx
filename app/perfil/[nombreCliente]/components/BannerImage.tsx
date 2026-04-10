import Link from 'next/link';

interface BannerImageProps {
    params: {
        nombre_negocio: string;
        title: string;
        description: string;
        image_url: string;
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

function BannerImage({ params }: BannerImageProps) {
    return (
        <div className="p-5">
            <div
                className={`items-end justify-start rounded-md wrap-banner-image bg-cover  flex relative`}
                style={{
                    backgroundImage: `url('${params.image_url}')`,
                    backgroundColor: `rgba(0, 0, 0)`,
                    height: params.height,
                }}
            >
                {params.mask && (
                    <div style={{ opacity: `${params.mask_opacity || '0.5'}`, }} className="absolute inset-0 bg-black"></div>
                )}
                <div className="relative inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent rounded-b-md md:w-full">
                    <div id="bloque-texto" className={`text-white z-50 p-5 text-${params.title_align || 'left'}`} > {/* // Aplicar alineación del título */}
                        <h1 className="font-bold text-2xl">{params.title}</h1>
                        <p>{params.description}</p>
                        {params.button_url && params.button_title && (
                            <div className={`py-5 text-${params.button_align || 'left'}`}>
                                <Link href={params.button_url} className="p-3 text-white bg-blue-500 rounded-md">
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

export default BannerImage;