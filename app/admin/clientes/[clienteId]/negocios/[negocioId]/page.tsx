import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Negocio',
    description: 'Editar negocio',
};

interface PageProps {
    negocioId: string;
    clienteId: string;
}

export default async function Page({ params }: { params: Promise<PageProps> }) {
    const { negocioId, clienteId } = await params;
    // Redirect to the Kanban page
    redirect(`/admin/clientes/${clienteId}/negocios/${negocioId}/kanban`);
    return null;
}
