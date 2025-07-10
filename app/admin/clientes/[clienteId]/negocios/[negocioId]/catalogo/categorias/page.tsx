// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/categorias/page.tsx
import React from 'react';
import { Metadata } from 'next';
import CatalogoCategorias from './components/CatalogoCategorias';
import CategoriaTips from './components/CategoriaTips';

export const metadata: Metadata = {
    title: 'Categorías del Catálogo', // Título más específico
    description: 'Gestiona las categorías de los productos y servicios de tu catálogo.',
};

// La interfaz Props ahora debe incluir clienteId si CatalogoCategorias lo va a necesitar
interface PageProps {
    negocioId: string;
    clienteId: string; // Asumiendo que clienteId está en la ruta y es necesario
}

export default async function CategoriasPage({ params }: { params: Promise<PageProps> }) { // params es un objeto, no una Promise
    const { negocioId, clienteId } = await params; // Extraer clienteId y negocioId directamente

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="lg:w-2/3 w-full h-full flex flex-col">
                {/* Pasar clienteId a CatalogoCategorias */}
                <CatalogoCategorias negocioId={negocioId} clienteId={clienteId} />
            </div>
            <div className="lg:w-1/3 w-full lg:sticky lg:top-6 h-fit">
                <CategoriaTips />
            </div>
        </div>
    );
}
