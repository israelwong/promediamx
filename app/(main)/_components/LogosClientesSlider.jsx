"use client";
import Image from "next/image";

function LogosClientesSlider() {
  const logos = [
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg",
      "Logo de Universidad Insurgentes",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg",
      "Logo de Grupo Concentra",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg",
      "Logo de Telefónica Movistar",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Vinte.svg",
      "Logo de Inmobiliarias Vinte",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Goberno-de-mexico.svg",
      "Logo del Gobierno de Mexico",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg",
      "Logo de Universidad Insurgentes",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg",
      "Logo de Grupo Concentra",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg",
      "Logo de Telefónica Movistar",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Vinte.svg",
      "Logo de Inmobiliarias Vinte",
    ],
    [
      "https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Goberno-de-mexico.svg",
      "Logo del Gobierno de Mexico",
    ],
  ];

  return (
    <div className="relative font-inter antialiased">
      <main className="relative">
        <div className="md:max-w-screen-md w-full mx-auto px-2 md:px-6">
          <div className="text-center">
            <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
              <ul
                aria-hidden
                className="flex items-center justify-center md:justify-start md:[&_li]:mx-5 [&_li]:mx-2 [&_img]:max-w-none animate-infinite-scroll"
              >
                {logos.map(([src, alt], index) => (
                  <li key={index}>
                    <Image
                      width={120}
                      height={120}
                      src={src}
                      alt={alt}
                      className="w-16 h-12 md:w-20 md:h-18 grayscale md:mr-0 mr-3"
                    />
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
          animation: infinite-scroll 50s linear infinite;
        }
        @media (max-width: 768px) {
          .animate-infinite-scroll {
            animation: infinite-scroll 40s linear infinite;
          }
        }
        @media (max-width: 640px) {
          .animate-infinite-scroll {
            animation: infinite-scroll 30s linear infinite;
          }
        }
      `}</style>
    </div>
  );
}

export default LogosClientesSlider;
