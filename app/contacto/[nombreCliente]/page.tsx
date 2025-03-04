import { Metadata } from 'next'
import { generateClientMetadata } from './metadataHelper'

interface PageProps {
    params: { nombreCliente: string }
}

// Esta función es asíncrona y usa 'params' correctamente
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    // Esperamos a que el parámetro 'nombreCliente' esté disponible
    const nombreCliente = params?.nombreCliente ? decodeURIComponent(params.nombreCliente) : 'Cliente Desconocido';

    // Generamos el metadata
    return generateClientMetadata(nombreCliente)
}

export default function Page({ params }: PageProps) {
    const nombreCliente = params.nombreCliente || 'Cliente Desconocido';  // Valor por defecto

    return (
        <div>
            <h1>Ficha de {nombreCliente}</h1>
            {/* Aquí puedes poner el contenido de la ficha del cliente */}
        </div>
    );
}
