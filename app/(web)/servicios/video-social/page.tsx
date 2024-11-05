import type { Metadata } from "next";
import BtnWaServicios from "../../_components/BtnWaServicios";
import VideoPlayer from "../../_components/VideoPlayer";
import BtnCerrarVentana from "../../_components/BtnCerrarVentana";
import { Rocket, TableColumnsSplit, Zap, Filter, Smartphone, Heart } from 'lucide-react';

export const metadata: Metadata = {
    title: "Producción de video para redes sociales",
    description:
        "Producción profesioal de videos para redes sociales",
    metadataBase: new URL("https://promedia.mx/servicios/video-social"),
};


function page() {

    const color = "#312e81"

    return (
        <div>

            {/* <!-- TÍTULO --> */}
            <div className="mb-6 text-center pt-10 pb-5 w-full">
                <h1 className={`text-6xl text-[${color}]} font-Bebas-Neue tracking-wid pb-4`}>
                    Video social
                </h1>
                <p className="md:text-3xl text-2xl text-gray-500 md:max-w-screen-sm mx-auto md:px-0 px-10">
                    &quot;Producimos videos de calidad para redes sociales que van de los 30 a 60 seg&quot;
                </p>
            </div>

            {/* <!-- CUERPO --> */}
            <section className="mx-auto md:max-w-screen-xl grid md:grid-cols-3 md:gap-5 mb-10">

                <div className="">
                    <p className="
                mx-auto 
                md:text-5xl text-2xl
                md:text-gray-500 text-yellow-800
                mb-12
                md:p-0 
                p-5
                pb-5 
                md:bg-transparent bg-yellow-900/20
                md:text-right text-center
                ">
                        &quot;Genera interés a través de un reel atractivo que capte la atención de tu audiencia&quot;
                    </p>

                    <div className="md:text-right text-center md:pb-10 pb-0">
                        <BtnWaServicios
                            id={'btn_video_social'}
                            title={"Cotizar video para redes"}
                            message={"Hola, me interesa cotizar videos para redes sociales"}
                        />
                    </div>
                </div>


                {/* <!-- VIDEO --> */}
                <div className="md:text-right text-center mx-auto md:-order-none order-first">
                    <VideoPlayer
                        src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/Sneaker_Fever.webm?t=2024-09-27T21%3A35%3A43.654Z"
                        muted={false}
                    />
                </div>


                <div className="grid md:grid-cols-2 md:gap-2 gap-5 md:p-0 p-5 mt-8 md:mt-0 ">

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Zap color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Atención</h3>
                            <p className="text-gray-400">Capta rápidamente la atención de tu público</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <TableColumnsSplit color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Segmentado</h3>
                            <p className="text-gray-400">Crea contenido segmentado y dirigido a una audiencia específica</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Rocket color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Reconocimiento</h3>
                            <p className="text-gray-400">Incrementa el reconocimiento de tu marca</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Heart color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Emociona</h3>
                            <p className="text-gray-400">Genera emociones, reacciones y comentarios positivos</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Filter color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Tráfico</h3>
                            <p>Aumenta el tráfico y visibilidad a tus otras plataformas, sitio web o tienda en línea</p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Smartphone color={color} size={48} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wid">Omniusable</h3>
                            <p>Úsalo en todas tus redes sociales.</p>
                        </div>
                    </div>
                </div>

                <div className="mx-auto text-center pt-10 md:hidden">
                    <BtnWaServicios
                        id={'btn_video_social'}
                        title={"Cotizar video para redes"}
                        message={"Hola, me interesa cotizar videos para redes sociales"} />
                </div>

            </section>

            <BtnCerrarVentana url={'/servicios'} />

        </div>
    )
}

export default page
