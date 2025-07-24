import React from 'react'
import { Metadata } from 'next'
import GaleriaEditarForm from '../../components/GaleriaEditarForm';
import GaleriaImagenesPanel from '../../components/GaleriaImagenesPanel';


export const metadata: Metadata = {
    title: 'Editar Galería',
}

interface Props {
    clienteId: string;
    negocioId: string;
    galeriaId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId, galeriaId } = await params
    return (
        // Contenedor principal con padding
        <div className="p-4 md:p-6 space-y-6">
            {/* Grid principal con 3 columnas en pantallas medianas y grandes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">

                {/* Columna 1: Formulario de Edición de Detalles (Ocupa 1 columna) */}
                <div className="md:col-span-1">
                    <GaleriaEditarForm
                        galeriaId={galeriaId}
                        negocioId={negocioId} // Pasar negocioId para navegación/revalidación
                        clienteId={clienteId} // Pasar clienteId para navegación
                    />
                </div>

                {/* Columna 2: Panel de Gestión de Imágenes (Ocupa 2 columnas) */}
                <div className="md:col-span-2">
                    <GaleriaImagenesPanel
                        galeriaId={galeriaId}
                    // Podrías pasar negocioId/clienteId si la galería necesita revalidar
                    // la página del negocio al añadir/eliminar imágenes, aunque
                    // las acciones de imagen ya lo hacen buscando la galería.
                    />
                </div>

            </div>
        </div>
    );
}
