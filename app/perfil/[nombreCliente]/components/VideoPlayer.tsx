"use client";
import { useEffect, useState, useRef } from "react";
import { Youtube } from "lucide-react";

interface Props {
  titulo?: string;
  descripcion?: string;
  video: {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
    width?: string;
    height?: string;
  };
}

function VideoPlayer({
  titulo,
  descripcion,
  video: {
    src,
    poster,
    autoPlay = false,
    muted = true,
    loop = true,
    controls = true,
    width = "100%",
  },
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPoster, setShowPoster] = useState(!!poster && !autoPlay);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const video = videoRef.current;
      if (video && video.paused && !video.hasAttribute("data-autoplay")) {
        video.load();
      }
    }
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setShowPoster(false);
    }
  };

  return (

    <div className="p-5">



      <div className="mb-5">
        <h3 className="text-xl font-FunnelSans-Light mb-3 flex items-center space-x-2">
          <Youtube size={16} />
          <span>{titulo}</span>
        </h3>
        <p className="text-zinc-400">
          {descripcion}
        </p>
      </div>

      <div style={{ width, height: "auto", position: "relative", paddingTop: `${(9 / 16) * 100}%` }}>
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
          className="absolute top-0 left-0 w-full h-full object-cover"
          preload="auto"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          poster={!showPoster ? poster : undefined}
          data-autoplay={autoPlay}
          onPlay={() => setShowPoster(false)}
        >
          <source src={src} type="video/webm" />
          Tu navegador no soporta el elemento de video.
        </video>

      </div>
    </div>
  );
}

export default VideoPlayer;
