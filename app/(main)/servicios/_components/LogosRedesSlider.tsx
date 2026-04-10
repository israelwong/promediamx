"use client";

function LogosRedesSlider() {
  const logos = [
    ["fab fa-whatsapp text-green-600 text-2xl", "WhatsApp"],
    ["fab fa-tiktok text-2xl", "TikTok"],
    ["fab fa-youtube text-red-700 text-3xl", "YouTube"],
    ["fab fa-facebook-f text-blue-700 text-2xl", "Facebook"],
    ["fab fa-instagram text-pink-800 text-3xl", "Instagram"],
    ["fab fa-linkedin-in text-blue-400 text-2xl", "LinkedIn"],
    ["fab fa-google text-red-600 text-2xl", "Google"],
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
                {logos.concat(logos).map(([className, label], index) => (
                  <li key={index}>
                    <i
                      className={`${className} text-3xl mr-2`}
                      aria-label={label}
                    ></i>
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

export default LogosRedesSlider;
