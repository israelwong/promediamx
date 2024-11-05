"use client";
import Image from "next/image";

function LogosClientesSlider() {
  const logos = [
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/IPN.svg",
      "Instituto Politécnico Nacional",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/UIN.svg",
      "Universidad Insurgentes",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/TecMilenio.svg",
      "Tec Milenio",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/EdoMex.svg",
      "Gobierno del Estado de Mexico",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/Grupo-Concentra.svg",
      "Grupo Concentra",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/Movistar.svg",
      "Telefónica Movistar",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/Vinte.svg",
      "Inmobiliarias Vinte",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/DaVivir.svg",
      "Inmobiliaria DaVivir",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/el-universal.svg",
      "Periódico El Universal",
    ],
    [
      "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_clientes/Goberno-de-mexico.svg",
      "Gobierno de Mexico",
    ],
  ];

  return (
    <div className="relative font-inter antialiased">
      <main className="relative flex flex-col justify-center overflow-hidden">
        <div className="w-full mx-auto px-4 md:px-6 py-10">
          <div className="text-center">
            <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
              <ul
                aria-hidden
                className="flex items-center justify-center md:justify-start md:[&_li]:mx-10 [&_li]:mx-4 [&_img]:max-w-none animate-infinite-scroll"
              >
                {logos.map((logo, index) => (
                  <li key={index} className="md:mx-10 mx-4">
                    <Image
                    width={200}
                    height={200}
                    src={logo[0]} alt={logo[1]} className="h-6 md:h-10" />
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
  );
}

export default LogosClientesSlider;
