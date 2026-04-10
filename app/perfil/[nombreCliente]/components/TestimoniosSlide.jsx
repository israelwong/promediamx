"use client";

import { useEffect } from "react";
import Glide from "@glidejs/glide";
import Image from "next/image";

function SlideTestimonios( { testimonios }) {

  useEffect(() => {
    const glideTestimonios = new Glide(".glide-testimonios", {
      type: "carousel",
      focusAt: "center",
      perView: 3,
      autoplay: 3200,
      animationDuration: 700,
      gap: 15,
      classes: {
        activeNav: "[&>*]:bg-slate-200",
      },
      breakpoints: {
        1024: {
          perView: 2,
        },
        640: {
          perView: 1.2,
        },
      },
    });

    glideTestimonios.mount();

    return () => {
      glideTestimonios.destroy();
    };
  }, []);

  return (
    <>
      {/*<!-- Component: Testimonial carousel --> */}
      <div className="glide-testimonios relative w-full overflow-hidden py-5">
        <div data-glide-el="track">
          <ul className="whitespace-no-wrap flex-no-wrap [backface-visibility: hidden] [transform-style: preserve-3d] [touch-action: pan-Y] [will-change: transform] relative flex w-full overflow-hidden p-0">
            {testimonios.map((testimonio, index) => (
              <li key={index}>
                <div className="h-full w-full">

                  <div className="h-full overflow-hidden text-gray-800 border border-slate-500 rounded-md">
                    <div className="relative p-6">
                      <figcaption className="flex items-center gap-4 p-3 text-sm text-slate-500">
                        <Image
                          alt="Testimonios de clientes ProSocial"
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-full border-4 border-shite max-w-full shrink-0  bg-cover object-cover object-cente"
                          src={testimonio.foto}
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-bold uppercase text-2xl pr-12">
                            {testimonio.nombre}
                          </span>
                        </div>
                      </figcaption>

                      <blockquote className="p-6 text-sm leading-relaxed text-gray-800">
                        <p>{testimonio.testimonio}</p>
                      </blockquote>
                      <i className="text-6xl opacity-10 absolute left-6 top-32 z-0 h-16 fas fa-quote-left"></i>
                    </div>
                  </div>

                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export default SlideTestimonios;
