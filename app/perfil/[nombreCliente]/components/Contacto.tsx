"use client";
import { MapPin, Clock } from "lucide-react";
import React from 'react'

interface Props {
  telefono: string;
  mensajeWhatsapp: string;
  direccion: string;
  iframeMapa: string;
  googleMapsUrl: string;
  horarios: string[];
}


export default function Contacto({ telefono, mensajeWhatsapp, direccion, iframeMapa, googleMapsUrl, horarios }: Props) {

  return (
    <div className="px-5 pt-5 pb-10">

      <div className="mb-5">
        <h3 className="text-xl font-FunnelSans-Light  mb-2 flex items-center space-x-2">
          <Clock size={16} />
          <span>Horarios de atención</span>
        </h3>
        <ul className="list-disc text-zinc-400 font-FunnelSans-Light ml-4">
          {horarios.map((horario, index) => (
            <li key={index}>{horario}</li>
          ))}
        </ul>
      </div>

      <div className="text-center mb-5 space-y-3">

        <a href={`https://wa.me/${telefono}?text=${encodeURIComponent(mensajeWhatsapp)}`}
          className="text-center inline-block w-full border border-green-400 bg-green-600 text-white font-FunnelSans-Light px-3 py-2 rounded-md">
          <span>Enviar whatsapp</span>
        </a>


        <a href="tel:+525532221234"
          className="text-center inline-block w-full border border-blue-400 bg-blue-600 text-white font-FunnelSans-Light px-3 py-2 rounded-md">
          <span>Llamar ahora</span>
        </a>

      </div>


      <div>

        <h3 className="text-xl font-FunnelSans-Light flex items-center space-x-2 mb-2">
          <MapPin size={16} />
          <span>Ubicación</span>
        </h3>

        <p className="text-zinc-400 font-FunnelSans-Light mb-5">
          {direccion}
        </p>

        <div className="relative w-full pb-[75%] mb-3">
          <iframe
            src={iframeMapa}
            className="absolute top-0 left-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>


        <div className="flex justify-left ">
          <a className="text-blue-600 font-FunnelSans-Light underline"
            href={googleMapsUrl}
            target="_blank" rel="noopener noreferrer"
            title="Abrir en Google Maps">
            Abrir en Google Maps
          </a>
        </div>
      </div>

    </div>
  );
}
