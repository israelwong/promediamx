import { Metadata } from 'next'
import TipoServicioEditar from './components/TipoServicioEditar'

export const metadata: Metadata = {
    title: 'Editar tipo de servicio',
    description: 'Configuración de la aplicación',
}

export default async function page({ params }: { params: { tipoServicioId: string } }) {
    const { tipoServicioId } = params
    return <TipoServicioEditar tipoServicioId={tipoServicioId} />
}
