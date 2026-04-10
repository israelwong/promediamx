// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import CatalogoEditarForm from './components/CatalogoEditarForm';
import CatalogoItems from './components/CatalogoItems';
// import CatalogoPortada from './components/CatalogoPortada'; // CatalogoPortada se integra dentro de CatalogoEditarForm

export const metadata: Metadata = {
    title: "Editar Catálogo",
    description: "Modifica los detalles y gestiona los ítems de tu catálogo.",
};

interface PageProps { // Renombrado de Props para claridad
    clienteId: string;
    negocioId: string;
    catalogoId: string;
}

// Corregido: params es un objeto, no una Promise
export default async function EditarCatalogoPage({ params }: { params: Promise<PageProps> }) {
    const { catalogoId, negocioId, clienteId } = await params; // Extraer directamente

    return (
        // Layout de dos columnas: Formulario a la izquierda, Items a la derecha
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-6 h-full">
            {/* Columna para el formulario de edición del catálogo y su portada */}
            <div className="lg:w-1/3 xl:w-1/4 w-full flex-shrink-0">
                <CatalogoEditarForm
                    catalogoId={catalogoId}
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            </div>

            {/* Columna para la lista y gestión de ítems del catálogo */}
            <div className="lg:w-2/3 xl:w-3/4 w-full flex-grow flex flex-col">
                <CatalogoItems
                    catalogoId={catalogoId}
                    clienteId={clienteId} // Pasar clienteId si es necesario para acciones de items
                    negocioId={negocioId} // Pasar negocioId si es necesario para acciones de items
                />
            </div>
        </div>
    );
}
