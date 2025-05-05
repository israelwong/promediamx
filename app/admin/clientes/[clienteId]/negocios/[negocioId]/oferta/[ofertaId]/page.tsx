import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Importar notFound
import OfertaEditarForm from '../components/OfertaEditarForm'; // Asume que existe
import OfertaGaleria from '../components/OfertaGaleria';     // Asume que existe

// Metadata básica
export const metadata: Metadata = {
    title: 'Editar Oferta'
};

// Definir la estructura esperada de los parámetros de la ruta
interface Props {
    clienteId?: string; // ClienteId puede ser opcional
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
        // Contenedor principal con padding
        <div className="p-4 md:p-6 space-y-6">
            {/* --- Grid principal con 5 columnas en pantallas medianas y grandes --- */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">

                {/* Columna 1: Formulario de Edición (Ocupa 2 columnas) */}
                <div className="md:col-span-2">
                    <OfertaEditarForm
                        clienteId={clienteId} // Pasa clienteId si existe
                        negocioId={negocioId}
                        ofertaId={ofertaId}
                    />
                </div>

                {/* Columna 2: Galería de Imágenes (Ocupa 3 columnas) */}
                <div className="md:col-span-3">
                    <OfertaGaleria
                        ofertaId={ofertaId}
                    // Podrías pasar negocioId si es necesario para alguna acción dentro de Galeria
                    />
                </div>

            </div>
        </div>
    );
}
