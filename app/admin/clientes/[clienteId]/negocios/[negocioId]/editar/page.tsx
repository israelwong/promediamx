import { Metadata } from 'next'
import NegocioEditarForm from './components/NegocioEditForm';

export const metadata: Metadata = {
    title: 'Editar Negocio'
}

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params
    return <NegocioEditarForm clienteId={clienteId} negocioId={negocioId} />
}