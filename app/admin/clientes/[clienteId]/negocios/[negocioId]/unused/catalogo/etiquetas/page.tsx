// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/etiquetas/page.tsx
import React from 'react';
import { Metadata } from 'next';
import CatalogoEtiquetas from './components/CatalogoEtiquetas';
import EtiquetaTips from './components/EtiquetaTips';

export const metadata: Metadata = {
    title: 'Etiquetas del Catálogo', // Título más específico
    description: 'Gestiona las etiquetas de los productos y servicios de tu catálogo.',
};

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function EtiquetasPage({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params;
    return (
        // Contenedor principal de la página de etiquetas.
        // Se usa flex-col en móviles y flex-row en pantallas más grandes.
        // El gap-6 se aplica en ambas direcciones.
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Columna principal para la gestión de etiquetas */}
            {/* En lg y más grandes, ocupa 2/3 del espacio. En móviles, ocupa todo el ancho. */}
            <div className="lg:w-2/3 w-full h-full flex flex-col">
                <CatalogoEtiquetas negocioId={negocioId} clienteId={clienteId} />
            </div>

            {/* Columna para los tips */}
            {/* En lg y más grandes, ocupa 1/3 del espacio. En móviles, ocupa todo el ancho. */}
            {/* Se añade un sticky top-0 para que los tips se mantengan visibles al hacer scroll en la lista de etiquetas,
                si la lista es más larga que los tips. Ajustar 'top' según la altura de tu cabecera global si es necesario. */}
            <div className="lg:w-1/3 w-full lg:sticky lg:top-6 h-fit"> {/* h-fit para que no ocupe toda la altura si el contenido es corto */}
                <EtiquetaTips />
            </div>
        </div>
    );
}
