"use client";
import { useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

function VideoPlayer({
  src,
  autoPlay = true,
  muted = true,
  loop = true,
  controls = false,
}: VideoPlayerProps) {
  useEffect(() => {
    if (typeof document !== "undefined") {
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => video.play());
    }
  }, []);

  return (
    <div>
      <video
        className="md:max-w-full"
        preload="auto"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
      >
        <source src={src} type="video/webm" />
        Tu navegador no soporta el elemento de video.
      </video>
    </div>
  );
}

export default VideoPlayer;