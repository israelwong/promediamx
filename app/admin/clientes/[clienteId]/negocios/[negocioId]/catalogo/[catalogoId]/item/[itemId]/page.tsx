// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import ItemEditarForm from './components/ItemEditarForm';
// import ItemGaleria from './components/ItemGaleria'; // Componente para la galería de imágenes del ítem
// import ItemVideo from './components/ItemVideo';
import { notFound } from 'next/navigation';
import Multimedia from './components/Multimedia';

export const metadata: Metadata = {
    title: 'Editar Ítem del Catálogo',
    description: "Modifica los detalles, imágenes y videos de tu producto o servicio.",
};

interface PageProps {
    itemId: string;
    catalogoId: string;
    negocioId: string;
    clienteId: string; // clienteId debería estar disponible desde la estructura de la ruta
}

export default async function ItemEditarPage({ params }: { params: Promise<PageProps> }) { // params es un objeto directo
    const { itemId, catalogoId, negocioId, clienteId } = await params; // Extraer directamente

    if (!itemId || !catalogoId || !negocioId || !clienteId) { // Validar todos los IDs necesarios
        console.error("Error: Faltan IDs requeridos en la ruta para editar ítem.", params);
        notFound();
    }

    return (
        // Contenedor principal con un layout flexible para diferentes tamaños de pantalla
        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8 h-full">
            {/* Columna Principal: Formulario de Edición (ocupa más espacio) */}
            {/* En pantallas xl y mayores, ocupa 3/5, en más pequeñas, 2/3 o todo el ancho si se apilan */}
            <div className="xl:w-3/5 lg:w-2/3 w-full flex-shrink-0">
                <ItemEditarForm
                    itemId={itemId}
                    catalogoId={catalogoId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

            {/* Columna Secundaria: Galería de Imágenes/Videos (ocupa menos espacio) */}
            {/* En pantallas xl y mayores, ocupa 2/5, en más pequeñas, 1/3 o todo el ancho */}
            <div className="xl:w-2/5 lg:w-1/3 w-full flex-grow flex flex-col">
                <Multimedia
                    itemId={itemId}
                    catalogoId={catalogoId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>
        </div>
    );
}
