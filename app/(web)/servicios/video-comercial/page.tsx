
import type { Metadata } from "next";
import BtnWaServicios from "../../_components/BtnWaServicios";
import VideoPlayer from "../../_components/VideoPlayer";
import BtnCerrarVentana from "../../_components/BtnCerrarVentana";
import { Flame, Heart, ThumbsUp, HandHeart, Smartphone } from 'lucide-react';

export const metadata: Metadata = {
    title: "Video comercial",
    description:
        "Producción de comercial",
    metadataBase: new URL("https://promedia.mx/servicios/video-comercial"),
};

function page() {
    const color = "#f59e0b"
    return (
        <div>

            {/* <!-- TÍTULO --> */}
            <div className="mb-6 text-center pt-10 pb-5">
                <h1 className="text-6xl text-yellow-700 font-Bebas-Neue tracking-wid pb-4">
                    Video promocional
                </h1>
                <p className="md:text-3xl text-2xl text-gray-500 md:max-w-screen-sm mx-auto md:px-0 px-10">
                    &quot;Hazte presente en todas las plataformas y canales digitales&quot;
                </p>
            </div>

            {/* <!-- CUERPO --> */}

            <section className="mx-auto md:max-w-screen-xl md:flex md:gap-5 mb-10">

                <div className="md:text-right text-center md:pr-10">

                    {/* <!-- VIDEO --> */}
                    <VideoPlayer
                        src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/bits/restaurante_720.webm"
                    />

                    <p className="
                mx-auto 
                md:text-4xl text-2xl
                md:text-gray-500 text-yellow-800
                md:max-w-xl 
                mb-12
                md:p-0 
                pb-5 
                p-5
                md:bg-transparent bg-yellow-900/20
                md:mt-10
                ">
                        &quot;Genera interés instantáneo a través de un reel de alto impacto de hasta
                        60 segundos que muestre por que eres su mejor opción&quot;
                    </p>

                    <BtnWaServicios
                        id={'btn_video_promocional'}
                        title={"Cotiza tu video promocional"}
                        message={"Hola, me interesa cotizar un video promocional"}
                    />

                </div>


                <div className="grid md:grid-cols-2 md:gap-2 gap-5 md:p-0 p-5 mt-8 md:mt-0 ">

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                        <Flame size={48} color={color} className="mb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Engancha</h3>
                            <p className="text-gray-400">Genera interés, capta la atención de tus prospectos e impulsa tus ventas</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Heart size={48} color={color} className="mb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Enamora</h3>
                            <p className="text-gray-400">Muestra a tus prospectos cuales son tus ventajas competitivas</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <ThumbsUp size={48} color={color} className="mb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Da confianza</h3>
                            <p className="text-gray-400">Genera mas confianza en clientes actuales y potenciales</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <HandHeart size={48} color={color} className="mb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Muestra Beneficios</h3>
                            <p className="text-gray-400">Muestra la utilidad y beneficios de lo que ofreces y como funciona.</p>
                        </div>
                    </div>



                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                        <Smartphone size={48} color={color} className="mb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Omniusable</h3>
                            <p>Úsalo en todas tus redes sociales.</p>
                        </div>
                    </div>
                </div>

                <div className="mx-auto text-center pt-10 md:hidden">
                    <BtnWaServicios
                        id={'btn_video_promocional'}
                        title={"Cotiza tu video promocional"}
                        message={"Hola, me interesa cotizar un video promocional"}
                    />
                </div>
            </section>

            <BtnCerrarVentana url={'/servicios'} />

        </div>
    )
}

export default page
