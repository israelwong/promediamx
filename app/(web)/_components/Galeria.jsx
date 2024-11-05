"use client";

import { useState, useEffect } from "react";
import PhotoAlbum from "react-photo-album";
import "react-photo-album/rows.css";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

function Galeria({ ruta, num_fotos, rowHeight }) {
  const [galeria, setGaleria] = useState([]);
  const [index, setIndex] = useState(-1);

  // Crea un array con las rutas de las fotos
  const urls = [];
  for (let i = 1; i <= num_fotos; i++) {
    urls.push(`${ruta}${i}.jpg`);
  }

  async function getImageDimensions(url) {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("This function can only be run in the browser"));
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function fetchGaleria() {
    try {
      const dimensionsArray = await Promise.all(
        urls.map((url) => getImageDimensions(url))
      );
      const galeriaConDimensiones = urls.map((url, index) => ({
        src: url,
        ...dimensionsArray[index],
      }));
      setGaleria(galeriaConDimensiones);
    } catch (error) {
      console.error("Error loading images:", error);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchGaleria();
    }
  });

  // Añade una clave única a cada foto
  const galeriaConClaves = galeria.map((foto, idx) => ({
    ...foto,
    key: `${foto.src}-${idx}`,
  }));

  return (
    <div>
      <PhotoAlbum
        photos={galeriaConClaves}
        layout="rows"
        targetRowHeight={rowHeight}
        onClick={({ index }) => setIndex(index)}
        loading="lazy"
      />

      <Lightbox
        slides={galeriaConClaves}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
      />
    </div>
  );
}

export default Galeria;
