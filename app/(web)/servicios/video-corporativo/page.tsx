import type { Metadata } from "next";
import BtnWaServicios from "../../_components/BtnWaServicios";
import BtnCerrarVentana from "../../_components/BtnCerrarVentana";
import VideoPlayer from "../../_components/VideoPlayer";
import { Shield, MessageCircle, Check, Star, LibraryBig } from 'lucide-react';

export const metadata: Metadata = {
    title: "Producción de video corporativo",
    description:
        "Producción de video corporativo, comercial y para redes sociales",
    metadataBase: new URL("https://promedia.mx/servicios/video-corporativo"),
};

function page() {
    const color = "#0e7490";
    return (
        <div>
            <div className="mb-6 text-center pt-10 pb-5">
                <h1 className="text-6xl text-cyan-900 font-Bebas-Neue tracking-wid pb-4">
                    Video corporativo
                </h1>
                <p className="md:text-3xl text-2xl text-gray-500 md:max-w-screen-sm mx-auto md:px-0 px-10">
                    &quot;Conoce algunos de los muchos beneficios de tener un video corporativo&quot;
                </p>
            </div>

            <section className="mx-auto md:max-w-screen-xl md:flex md:gap-5 mb-5">
                <div className="md:text-right text-center md:pr-10">
                    {/* <!-- VIDEO --> */}
                    <VideoPlayer src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/bits/corporativo_720.webm" />

                    <p
                        className="
                mx-auto 
                md:text-4xl text-2xl
                md:text-gray-500 text-yellow-800
                md:max-w-xl 
                md:p-0 
                pb-5 
                p-5
                md:bg-transparent bg-yellow-900/20
                md:mt-5
                mb-12
                "
                    >
                        &quot;Consolida la identidad de tu marca e impresiona a tus clientes y
                        socios comerciales.&quot;
                    </p>

                    <BtnWaServicios
                        id={"btn_video_corporativo"}
                        title={"Cotiza tu video corporativo"}
                        message={"Hola, me interesa cotizar un video corporativo"}
                    />
                </div>

                <div className="grid md:grid-cols-2 md:gap-2 gap-5 md:p-0 p-5 mt-8 md:mt-0 ">
                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Shield size={48} color={color} className="mb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wider">
                                Identidad
                            </h3>
                            <p className="text-gray-400">
                                Ayuda a fortalecer la identidad de tu marca
                            </p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                        <MessageCircle size={48} color={color} className="pb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wider">
                                Comunicación
                            </h3>
                            <p className="text-gray-400">
                                Úsala como herramienta de comunicación interna
                            </p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Check size={48} color={color} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wider">
                                Confianza
                            </h3>
                            <p className="text-gray-400">
                                Genera más confianza en clientes actuales y potenciales
                            </p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <Star size={48} color={color} className="pb-3" />
                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wider">
                                Experiencia
                            </h3>
                            <p className="text-gray-400">
                                Comunica tu experiencia, calidad y compromiso con la excelencia
                                en tu negocio.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                        <LibraryBig size={48} color={color} className="pb-3" />

                        <div>
                            <h3 className="text-3xl font-Bebas-Neue tracking-wider">
                                Cultura
                            </h3>
                            <p>
                                Expresa de manera creativa la cultura empresarial en tu
                                organización.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mx-auto text-center pt-10 md:hidden">
                    <BtnWaServicios
                        id={"btn_video_corporativo"}
                        title={"Cotiza tu video corporativo"}
                        message={"Hola, me interesa cotizar un video corporativo"}
                    />
                </div>
            </section>

            <BtnCerrarVentana url={"/servicios"} />
        </div>
    );
}

export default page;
