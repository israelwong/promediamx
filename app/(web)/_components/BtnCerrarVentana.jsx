import React from "react";
import Link from "next/link";

function BtnCerrarVentana({ url }) {
  return (
    <div>
      <Link href={url}>
        <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>
            <button className="relative bg-red-600 text-white py-2 px-4 rounded-full">
              Cerrar ventana
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default BtnCerrarVentana;
