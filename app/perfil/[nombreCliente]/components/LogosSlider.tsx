"use client";
import Image from "next/image";

interface LogosSliderProps {
    lista: {
        titulo: string;
        url: string;
    }[];
}


export default function LogosSlider({ lista }: LogosSliderProps) {

    return (
        <div id="wrap-logos" className="">


            <div className="px-0 py-5">
                <div className="relative font-inter antialiased">
                    <main className="relative flex flex-col justify-center overflow-hidden">
                        <div className="w-full mx-auto px-4 md:px-6">
                            <div className="text-center">
                                <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
                                    <ul
                                        aria-hidden
                                        className="flex items-center justify-center md:justify-start md:[&_li]:mx-10 [&_li]:mx-4 [&_img]:max-w-none animate-infinite-scroll"
                                    >
                                        {lista.map((logo, index) => (
                                            <li key={index} className="md:mx-10 mx-4">
                                                <Image
                                                    width={100}
                                                    height={100}
                                                    src={logo.url}
                                                    alt={logo.titulo}
                                                    className="h-6 md:h-10" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </main>

                    <style jsx>{`
                @keyframes infinite-scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
                .animate-infinite-scroll {
                    display: flex;
                    animation: infinite-scroll 70s linear infinite;
                }
    `}</style>
                </div>
            </div>
        </div>
    );
}
