"use client";
import { useEffect, useState, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  width?: string; // Permitir ancho personalizado
  height?: string; // Permitir altura personalizado
}

function VideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = true,
  loop = true,
  controls = false,
  width = "100%", // Ancho predeterminado al 100%
  height = "auto", // Altura predeterminada automática
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPoster, setShowPoster] = useState(!!poster && !autoPlay);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => {
        if (video.paused && !video.hasAttribute("data-autoplay")) {
          video.load(); // Cargar el video para que esté listo
        }
      });
    }
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setShowPoster(false);
    }
  };

  return (
    <div style={{ width, height, position: "relative" }}>
      {showPoster && poster && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `url(${poster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: "pointer",
          }}
          onClick={handlePlay}
        ></div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover" // Asegura que el video cubra el contenedor
        preload="auto"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        poster={!showPoster ? poster : undefined} // Solo asigna el poster si no se muestra el div de portada
        data-autoplay={autoPlay} // Marcador para la carga inicial
      >
        <source src={src} type="video/webm" />
        Tu navegador no soporta el elemento de video.
      </video>
    </div>
  );
}

export default VideoPlayer;