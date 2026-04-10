"use client";
import Image from "next/image";
import VideoPlayer from "./VideoPlayer";

const REEL_URL =
  "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/video/reel2024_1min_SD.mp4";

function LogosClientesSlider() {
  const logos = [
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg",
      "Logo de Universidad Insurgentes",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg",
      "Logo de Grupo Concentra",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg",
      "Logo de Telefónica Movistar",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Vinte.svg",
      "Logo de Inmobiliarias Vinte",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Goberno-de-mexico.svg",
      "Logo del Gobierno de Mexico",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg",
      "Logo de Universidad Insurgentes",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg",
      "Logo de Grupo Concentra",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg",
      "Logo de Telefónica Movistar",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Vinte.svg",
      "Logo de Inmobiliarias Vinte",
    ],
    [
      "https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Goberno-de-mexico.svg",
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
            <div className="mt-8 flex w-full justify-center px-1">
              <div className="w-full max-w-2xl overflow-hidden rounded-lg">
                <VideoPlayer
                  src={REEL_URL}
                  autoPlay
                  muted
                  loop
                  controls={false}
                />
              </div>
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
