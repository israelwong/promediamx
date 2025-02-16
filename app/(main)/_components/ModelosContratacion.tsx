import React, { useState } from "react";
import Link from "next/link";

const modelos = [
    {
        titulo: "Pago mensual fijo",
        target: "Negocios que necesitan servicios continuos sin variaciones en la inversión.",
        ventajas: "Planeación clara, costos predecibles y ejecución constante.",
        consideraciones: "No está ligado a resultados de venta, sino a la prestación del servicio."
    },
    {
        titulo: "Pago mensual fijo + Comisión",
        target: "Empresas que buscan estabilidad en servicios, pero también quieren incentivar el crecimiento en ventas.",
        ventajas: "Inversión controlada y motivación extra para alcanzar metas de negocio.",
        consideraciones: "Se requiere un sistema de medición claro para definir los resultados."
    },
    {
        titulo: "Comisión de venta por resultados",
        target: "Empresas con un modelo de negocio escalable y margen suficiente para compartir ganancias.",
        ventajas: "Sin costos fijos, incentivo total en la conversión y aumento de ingresos.",
        consideraciones: "Puede implicar una comisión mayor si las ventas son altas, pero siempre en proporción a los resultados obtenidos."
    }
];

const Page = () => {


    const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

    const toggleDescripcion = (index: number) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    return (
        <div>
            <div className="md:mt-0 mb-10 bg-zinc-900 p-5 rounded-md">

                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-FunnelSans-SemiBold">
                    Ofrecemos modelos de contratación flexibles
                </h1>

                <p className="text-zinc-300 mb-5 font-FunnelSans-Light">
                    Cada negocio es único, por eso ofrecemos modelos flexibles: costo fijo, resultados medibles o ambos. Encontramos juntos la mejor opción.
                </p>

                <div className="space-y-5">
                    {modelos.map((modelo, index) => (

                        <div key={index} className="border border-blue-600 rounded-md p-4"
                            onClick={() => toggleDescripcion(index)} style={{ cursor: 'pointer' }}>

                            <div className="flex items-center justify-between text-blue-400">

                                <h2 className="font-FunnelSans-Light md:font-FunnelSans-SemiBold ">
                                    {modelo.titulo}
                                </h2>
                                <div className='text-sm'>
                                    {visibleIndex === index ? '▲' : '▼'}
                                </div>
                            </div>

                            <div
                                className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? 'max-h-80' : 'max-h-0'}`}
                            >
                                <div
                                    className="space-y-4 pt-4">

                                    <div className="">
                                        <p className="text-zinc-300 font-semibold text-sm">
                                            ¿Para quién es?
                                        </p>
                                        <p className="text-zinc-500 font-FunnelSans-Light">
                                            {modelo.target}
                                        </p>
                                    </div>

                                    <div className="">
                                        <p className="text-zinc-300 font-semibold text-sm">
                                            Ventajas:
                                        </p>
                                        <p className="text-zinc-500 font-FunnelSans-Light">
                                            {modelo.ventajas}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-zinc-300 font-semibold text-sm">
                                            Consideraciones:
                                        </p>
                                        <p className="text-zinc-500 font-FunnelSans-Light">
                                            {modelo.consideraciones}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    ))}
                </div>
                <div className="text-left mt-5">
                    <p className="text-zinc-100 font-FunnelSans-Light text-lg mb-5">
                        Encontremos la mejor solución para tu negocio. ¡Trabajemos juntos!
                    </p>

                    <Link className="text-sm bg-blue-700 border border-blue-600 text-white py-3 px-6 rounded-full inline-block"
                        href={'https://calendly.com/promediamx/30min'}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Contactar ahora
                    </Link>
                </div>
            </div>



        </div>
    );
};

export default Page;
