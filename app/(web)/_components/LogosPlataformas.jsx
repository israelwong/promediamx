function LogosPlataformas() {
  const icons = [
    { className: "fab fa-spotify text-green-600" },
    { className: "fab fa-instagram text-pink-900" },
    { className: "fab fa-facebook text-blue-700" },
    { className: "fab fa-tiktok" },
    { className: "fab fa-youtube text-red-800" },
    { className: "fab fa-google" },
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
                {Array(4)
                  .fill(icons)
                  .flat()
                  .map((icon, index) => (
                    <li key={index}>
                      <i
                        aria-hidden
                        className={`${icon.className} text-5xl`}
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
          animation: infinite-scroll 70s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default LogosPlataformas;
