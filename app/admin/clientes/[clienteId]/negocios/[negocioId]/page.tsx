import React from 'react'
import { Metadata } from 'next'
import DashboardView from './components/DashboardView';


export const metadata: Metadata = {
    title: 'Negocio',
    description: 'Editar negocio',
}

export default async function page({ params }: { params: Promise<{ negocioId: string, clienteId: string }> }) {
    const { negocioId, clienteId } = await params
    console.log(negocioId, clienteId);
    return <DashboardView negocioId={negocioId} />;

}
