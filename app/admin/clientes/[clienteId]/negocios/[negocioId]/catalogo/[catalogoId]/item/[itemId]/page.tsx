import React from 'react';
import { Metadata } from 'next';
import ItemEditarForm from '../components/ItemEditarForm';
import ItemGaleria from '../components/ItemGaleria';
import { notFound } from 'next/navigation'; // Importar notFound

export const metadata: Metadata = {
    title: 'Editar Ítem', // Título genérico, podría ser dinámico si se carga el nombre
};

// Definir Props para la página usando params
interface Props {
    itemId: string;
    catalogoId: string;
    negocioId: string;
    clienteId?: string; // Asegurarse que coincida con la estructura de tu ruta
}

// --- CORRECCIÓN: Hacer la función async y usar await ---
export default async function ItemEditarPage({ params }: { params: Promise<Props> }) {
    const { itemId, catalogoId, negocioId, clienteId } = await params;


    if (!itemId || !catalogoId || !negocioId) {
        console.error("Error: Faltan IDs requeridos en la ruta.", params);
        notFound(); // Mostrar página 404 si faltan IDs esenciales
    }

    return (
        // Contenedor principal con padding
        <div className="p-4 md:p-6 space-y-6">
            {/* Grid principal con 5 columnas en pantallas medianas y grandes */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">

                {/* Columna 1: Formulario de Edición (Ocupa 2 columnas) */}
                <div className="md:col-span-3">
                    {/* El componente ItemEditarForm ya tiene su propio padding y fondo */}
                    <ItemEditarForm
                        itemId={itemId}
                        catalogoId={catalogoId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </div>


                {/* Columna 3: Galería de Imágenes (Ocupa 2 columnas) */}
                <div className="md:col-span-2">
                    {/* El componente ItemGaleriaPanel ya tiene su propio padding y fondo */}
                    <ItemGaleria
                        itemId={itemId}
                    />
                </div>

            </div>
        </div>
    );
}
