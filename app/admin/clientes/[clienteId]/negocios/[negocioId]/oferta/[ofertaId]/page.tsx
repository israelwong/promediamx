// Ruta del archivo: @app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Importar notFound
import OfertaEditarManager from './components/OfertaEditarManager';
import OfertaDetalleManager from './components/OfertaDetalleManager';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* O por ejemplo md:grid-cols-5 para más control */}

            {/* Columna 1 (Más ancha, ej: md:col-span-2 de 3, o md:col-span-3 de 5) */}
            <div className="md:col-span-1"> {/* Ejemplo de proporción */}
                <OfertaEditarManager
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

            {/* Columna 2 (Más angosta, ej: md:col-span-1 de 3, o md:col-span-2 de 5) */}
            <div className="md:col-span-2"> {/* Ejemplo de proporción */}
                <OfertaDetalleManager
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

        </div>

    );
}
