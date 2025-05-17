// app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/page.tsx
import React from 'react'
import { Metadata } from 'next'

import PaqueteEditarForm from './components/PaqueteEditarForm'
import PaqueteItemsManager from './components/PaqueteItemsManager'
import Multimedia from './components/Multimedia'

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
        <div className="lg:grid lg:grid-cols-7 lg:gap-x-6 space-y-8 lg:space-y-0">

            {/* Columna principal para el formulario de edición y la gestión de ítems del paquete */}
            <div className="lg:col-span-2 space-y-8">
                {/* Componente para editar la información principal del paquete */}
                <PaqueteEditarForm
                    negocioId={negocioId}
                    clienteId={clienteId}
                    paqueteId={paqueteId}
                />
            </div>

            {/* Columna para gestionar los ítems del paquete */}
            <div className="lg:col-span-3 space-y-8">
                <PaqueteItemsManager
                    negocioId={negocioId}
                    clienteId={clienteId}
                    paqueteId={paqueteId} />

            </div>

            {/* Columna para gestionar la multimedia del paquete */}
            <div className="lg:col-span-2 space-y-8">
                {/* Componente para gestionar la galería de imágenes y el video del paquete */}
                <Multimedia
                    paqueteId={paqueteId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

        </div>
    );
}
