import React from 'react'
import { Metadata } from 'next'
import DashboardView from '../components/DashboardView';

export const metadata: Metadata = {
    title: 'Estadisticas',
    description: 'Estadisticas de rendimiento del negocio',
}

interface PageProps {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<PageProps> }) {
    const { negocioId } = await params;

    return (
        <div>
            <DashboardView negocioId={negocioId} />
        </div>
    )
}
