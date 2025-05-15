import React from 'react'
import { Metadata } from 'next'

import PaqueteEditarForm from './components/PaqueteEditarForm'
import PaqueteGaleria from './components/PaqueteGaleria'
import PaqueteVideo from './components/PaqueteVideo'
import PaqueteItemsManager from './components/PaqueteItemsManager'

export const metadata: Metadata = {
    title: 'Editar Paquete',
    description: 'Editar paquete',
}

interface Props {
    negocioId: string
    clienteId: string
    paqueteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId, paqueteId } = await params
    return (
        // Contenedor principal de la página.
        // En pantallas grandes (lg): grid de 3 columnas. El formulario y los items ocupan 2, las galerías 1.
        // En pantallas medianas y pequeñas: se apila verticalmente con espaciado.
        <div className="p-4 md:p-6 lg:grid lg:grid-cols-4 lg:gap-x-8 space-y-8 lg:space-y-0">

            {/* Columna principal para el formulario de edición y la gestión de ítems del paquete */}
            <div className="lg:col-span-1 space-y-8">
                {/* Componente para editar la información principal del paquete */}
                <PaqueteEditarForm
                    negocioId={negocioId}
                    clienteId={clienteId}
                    paqueteId={paqueteId}
                />
            </div>

            {/* Columna para gestionar los ítems del paquete */}
            <div className="lg:col-span-2 space-y-8">
                <PaqueteItemsManager
                    negocioId={negocioId}
                    clienteId={clienteId} // clienteId podría no ser necesario para PaqueteItemsManager
                    paqueteId={paqueteId}
                />
            </div>

            {/* Columna lateral para las galerías */}
            <div className="lg:col-span-1 space-y-8">
                {/* Componente para gestionar la galería de imágenes del paquete */}
                <section aria-labelledby="galeria-paquete-heading">
                    <h2 id="galeria-paquete-heading" className="text-lg md:text-xl font-semibold text-zinc-100 mb-4">
                        Galería de Imágenes
                    </h2>
                    <PaqueteGaleria
                        negocioId={negocioId}
                        clienteId={clienteId} // clienteId podría no ser necesario aquí tampoco
                        paqueteId={paqueteId}
                    />
                </section>

                {/* Componente para gestionar los videos del paquete */}
                <section aria-labelledby="videos-paquete-heading">
                    <h2 id="videos-paquete-heading" className="text-lg md:text-xl font-semibold text-zinc-100 mb-4">
                        Videos del Paquete
                    </h2>
                    <PaqueteVideo
                        negocioId={negocioId}
                        clienteId={clienteId} // clienteId podría no ser necesario aquí
                        paqueteId={paqueteId}
                    />
                </section>
            </div>
        </div>
    );
}
