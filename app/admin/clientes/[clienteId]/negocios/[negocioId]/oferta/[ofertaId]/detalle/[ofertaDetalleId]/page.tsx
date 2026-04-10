// app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/editar/[ofertaDetalleId]/page.tsx
import { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';

import OfertaDetalleForm from './components/OfertaDetalleEditarForm'; // El formulario para campos textuales
import OfertaDetalleMultimediaManager from './components/OfertaDetalleMultimediaManager'; // Nuevo manager para multimedia

import { obtenerOfertaDetallePorIdAction } from '@/app/admin/_lib/actions/oferta/ofertaDetalle.actions';

// Metadata para la página
export const metadata: Metadata = {
    title: 'Editar Detalle de Oferta',
    description: 'Modifica el contenido y multimedia de un punto de conocimiento específico de una oferta.',
};

interface PageProps {
    clienteId: string;
    negocioId: string;
    ofertaId: string;
    ofertaDetalleId: string;
}

export default async function page({ params }: { params: Promise<PageProps> }) {
    const { clienteId, negocioId, ofertaId, ofertaDetalleId } = await params;

    const result = await obtenerOfertaDetallePorIdAction(ofertaDetalleId, ofertaId);

    if (!result.success || !result.data) {
        console.error("Error cargando detalle para editar:", result.error);
        notFound();
    }
    const ofertaDetalleData = result.data;

    return (
        <div className="mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100">Editar Detalle de Oferta</h1>
                    <p className="text-sm text-zinc-400">Modifica el contenido y multimedia de este punto de conocimiento.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`}>
                        <ArrowLeft size={16} className="mr-1.5" /> Volver a la Oferta
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Columna 1: Formulario de Texto del Detalle */}
                <div className="col-span-1">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Contenido del Detalle</CardTitle>
                            <CardDescription>Edita el título, descripción y otros datos textuales.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OfertaDetalleForm
                                ofertaId={ofertaId}
                                negocioId={negocioId}
                                clienteId={clienteId}
                                initialData={ofertaDetalleData}
                                ofertaDetalleIdToEdit={ofertaDetalleId}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Columna 2: Gestor de Multimedia del Detalle */}
                <div className="lg:col-span-2">
                    <OfertaDetalleMultimediaManager
                        ofertaId={ofertaId}
                        ofertaDetalleId={ofertaDetalleId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </div>
            </div>
        </div>
    );
}