// Ruta del archivo: /Users/israelwong/Documents/Desarrollo/promedia-app/app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Importar notFound
import OfertaEditarForm from './components/OfertaEditarForm'; // Asume que existe
// import OfertaGaleria from './components/OfertaGaleria';     // Asume que existe
// import OfertaVideos from './components/OfertaVideos';
import Multimedia from './components/Multimedia';

// Metadata básica
export const metadata: Metadata = {
    title: 'Editar Oferta'
};

// Definir la estructura esperada de los parámetros de la ruta
interface Props {
    clienteId: string; // ClienteId puede ser opcional
    negocioId: string;
    ofertaId: string;
}

// Mantener la estructura solicitada para recibir params
export default async function EditarOfertaPage({ params }: { params: Promise<Props> }) {
    // Extraer IDs de los parámetros usando await
    const { clienteId, negocioId, ofertaId } = await params;

    // Validación básica de IDs esenciales
    if (!negocioId || !ofertaId) {
        console.error("Error: Faltan IDs requeridos (negocioId, ofertaId) en la ruta.", params);
        notFound(); // Mostrar 404 si falta negocioId o ofertaId
    }

    return (
        // Contenedor principal con espaciado
        <div className="space-y-6 lg:space-y-8">
            {/* Grid principal para layout de columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

                {/* Columna Izquierda: Formulario de Edición (ocupa más espacio en lg) */}
                <div className="lg:col-span-3 xl:col-span-3"> {/* Ajustado a 3/5 para dar más espacio al form */}
                    <OfertaEditarForm
                        clienteId={clienteId}
                        negocioId={negocioId}
                        ofertaId={ofertaId}
                    />
                </div>

                {/* Columna Derecha: Galerías y Videos (ocupa menos espacio en lg) */}
                <div className="lg:col-span-2 xl:col-span-2 space-y-6 lg:space-y-8"> {/* Contenedor para apilar galería y video */}
                    <Multimedia
                        ofertaId={ofertaId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                    {/* <OfertaGaleria
                        ofertaId={ofertaId}
                    // negocioId={negocioId} // Pasar para la ruta de storage/actions
                    // clienteId={clienteId} // Pasar para revalidación
                    />
                    <OfertaVideos
                        ofertaId={ofertaId}
                    // negocioId={negocioId} // Pasar para la ruta de storage/actions
                    // clienteId={clienteId} // Pasar para revalidación
                    /> */}
                </div>
            </div>
        </div>
    );
}
