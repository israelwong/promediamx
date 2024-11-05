"use client";

import React from "react";
import VideoPlayer from "./VideoPlayer";
import BtnWaServicios from "./BtnWaServicios";

function CardServicio({
  title,
  description,
  btn_id,
  btn_title,
  btn_message,
  url_video,
  autoPlay = true,
  position = "left",
}) {
  return (
    <div className="p-5">
      <div className="grid md:grid-cols-2 gap-5 border rounded-md border-zinc-800 p-5">
        {position === "left" ? (
          <>
            <div className="md:text-right text-center pt-6 flex flex-col justify-center h-full">
              <h2 className="font-Bebas-Neue md:text-6xl text-5xl mb-3 text-gray-700">
                {title}
              </h2>
              <p className="md:text-lg text-xl md:px-0 px-8 text-gray-400 mb-5">
                {description}
              </p>
              <div className="flex md:justify-end justify-center w-full">
                <BtnWaServicios
                  id={btn_id}
                  title={btn_title}
                  message={btn_message}
                />
              </div>
            </div>
            <VideoPlayer src={url_video} autoPlay={autoPlay} />
          </>
        ) : (
          <>
            <VideoPlayer src={url_video} autoPlay={autoPlay} />
            <div className="md:text-left text-center pt-6 flex flex-col justify-center h-full">
              <h2 className="font-Bebas-Neue md:text-6xl text-5xl mb-3 text-gray-700">
                {title}
              </h2>
              <p className="md:text-lg text-xl md:px-0 px-8 text-gray-400 mb-5">
                {description}
              </p>
              <div className="flex md:justify-start justify-center w-full">
                <BtnWaServicios
                  id={btn_id}
                  title={btn_title}
                  message={btn_message}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CardServicio;
