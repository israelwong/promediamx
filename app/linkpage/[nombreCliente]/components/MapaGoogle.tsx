"use client";
import { memo } from "react";
import { MapPin } from "lucide-react";

const MapaGoogle = memo(() => {

  const direccion = 'Calle 5 de Mayo 123, Centro, 50000 Toluca de Lerdo, Méx.';

  return (
    <div>

      <h3 className="text-xl font-FunnelSans-Light mb-3 flex items-center space-x-2">
        <MapPin size={16} />
        <span>Ubicación</span>
      </h3>

      <div className="relative w-full pb-[75%]">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3763.541481135676!2d-99.56514782524414!3d19.28827438181635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d28a07f185c8f1%3A0x868c6356c9852f86!2sCalle%205%20de%20Mayo%20123%2C%20Centro%2C%2050000%20Toluca%20de%20Lerdo%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1716949392348!5m2!1ses-419!2smx"
          className="absolute top-0 left-0 w-full h-full border-0"
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      <p className="text-zinc-400 font-FunnelSans-Light py-3">
        {direccion}
      </p>

    </div>
  );
});
MapaGoogle.displayName = "MapaGoogle";

export default MapaGoogle;
