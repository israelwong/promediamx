// Ruta del archivo: @app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Importar notFound
import OfertaEditarForm from './components/OfertaEditarForm'; // El que ya creamos

export const metadata: Metadata = {
    title: 'Editar Oferta'
};

interface Props {
    clienteId: string; // ClienteId puede ser opcional
    negocioId: string;
    ofertaId: string;
}

// Mantener la estructura solicitada para recibir params
export default async function EditarOfertaPage({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId, ofertaId } = await params;

    if (!negocioId || !ofertaId) {
        console.error("Error: Faltan IDs requeridos (negocioId, ofertaId) en la ruta.", params);
        notFound();
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <OfertaEditarForm
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>
        </div>

    );
}
