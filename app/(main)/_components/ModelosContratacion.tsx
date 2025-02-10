import React from "react";

const modelos = [
    {
        titulo: "Pago Mensual Fijo",
        target: "Negocios que necesitan servicios continuos sin variaciones en la inversión.",
        ventajas: "Planeación clara, costos predecibles y ejecución constante.",
        consideraciones: "No está ligado a resultados de venta, sino a la prestación del servicio."
    },
    {
        titulo: "Pago Mensual Fijo + Comisión de Venta",
        target: "Empresas que buscan estabilidad en servicios, pero también quieren incentivar el crecimiento en ventas.",
        ventajas: "Inversión controlada y motivación extra para alcanzar metas de negocio.",
        consideraciones: "Se requiere un sistema de medición claro para definir los resultados."
    },
    {
        titulo: "Comisión de Venta por Resultados",
        target: "Empresas con un modelo de negocio escalable y margen suficiente para compartir ganancias.",
        ventajas: "Sin costos fijos, incentivo total en la conversión y aumento de ingresos.",
        consideraciones: "Puede implicar una comisión mayor si las ventas son altas, pero siempre en proporción a los resultados obtenidos."
    }
];

const Page = () => {
    return (
        <div className="md:mt-0 mt-10 mb-10 bg-zinc-900 p-5 rounded-md">

            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text font-FunnelSans-SemiBold">
                Modelos de contratación flexibles
            </h1>

            <p className="text-zinc-300 mb-5 font-FunnelSans-Light">
                Cada negocio es único, por eso ofrecemos distintos modelos de contratación. Ya sea que prefieras costos fijos, resultados medibles o una combinación de ambos, podemos encontrar juntos la mejor opción para un esquema de trabajo ganar-ganar.
            </p>

            <div className="space-y-4">
                {modelos.map((modelo, index) => (

                    <div key={index} className="border border-dashed border-zinc-700 rounded-md p-5">

                        <h2 className="font-FunnelSans-SemiBold text-zinc-400 mb-1 uppercase flex items-center">
                            <span className="inline-block w-2 h-2 mr-2 bg-blue-500 rounded-full animate-pulse"></span>
                            {modelo.titulo}
                        </h2>

                        <div className="text-zinc-500 font-FunnelSans-Light space-y-1">
                            <p><strong className="text-zinc-500 underline">¿Para quién es?</strong> {modelo.target}</p>
                            <p><strong className="text-zinc-500 underline">Ventajas:</strong> {modelo.ventajas}</p>
                            <p><strong className="text-zinc-500 underline">Consideraciones:</strong> {modelo.consideraciones}</p>
                        </div>
                    </div>

                ))}
            </div>

            <div>

                <p className="text-zinc-400 font-FunnelSans-Light text-2xl py-5">
                    Estamos abiertos a negociar el modelo que mejor se adapte a tu empresa. ¡Hablemos y trabajemos juntos!
                </p>

                <button className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-300">
                    Contacta ahora con un asesor
                </button>
            </div>
        </div>
    );
};

export default Page;
