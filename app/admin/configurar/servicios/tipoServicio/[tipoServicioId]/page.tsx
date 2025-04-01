import { Metadata } from 'next'
import TipoServicioEditar from './components/TipoServicioEditar'

export const metadata: Metadata = {
    title: 'Editar tipo de servicio',
    description: 'Configuración de la aplicación',
}

export default async function Page({ params }: { params: Promise<{ tipoServicioId: string }> }) {
    const { tipoServicioId } = await params;
    return <TipoServicioEditar tipoServicioId={tipoServicioId} />
}

