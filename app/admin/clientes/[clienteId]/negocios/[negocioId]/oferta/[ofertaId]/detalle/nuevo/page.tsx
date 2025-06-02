import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card';
import OfertaDetalleNuevaForm from './components/OfertaDetalleNuevoForm';

export const metadata: Metadata = {
    title: 'Añadir Nuevo Detalle a Oferta',
};

// Tipo para los parámetros de la ruta resueltos
interface ResolvedPageParams {
    clienteId: string;
    negocioId: string;
    ofertaId: string;
}

// Tipo para los searchParams resueltos
interface ResolvedSearchParams {
    preguntaOriginal?: string;
    resolverPreguntaId?: string;
}

// Props de la página, donde params y searchParams pueden ser promesas
interface PageProps {
    params: Promise<ResolvedPageParams>;
    searchParams?: Promise<ResolvedSearchParams>; // Hacemos searchParams una promesa opcional
}

export default async function NuevaOfertaDetallePage({
    params: paramsPromise,
    searchParams: searchParamsPromise
}: PageProps) {

    // 1. Resolvemos la promesa de los parámetros de la ruta
    const resolvedParams = await paramsPromise;
    const { clienteId, negocioId, ofertaId } = resolvedParams;

    // 2. Resolvemos la promesa de los searchParams, proveyendo un objeto vacío si es undefined
    const resolvedSearchParams = searchParamsPromise ? await searchParamsPromise : {};
    const { preguntaOriginal, resolverPreguntaId } = resolvedSearchParams;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl md:text-2xl">Añadir Nuevo Detalle</CardTitle>
                            <CardDescription>
                                Define el título y contenido inicial. Podrás añadir multimedia y más detalles después de guardarlo.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`}>
                                <ArrowLeft size={16} className="mr-1.5" /> Volver a Oferta
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <OfertaDetalleNuevaForm
                        ofertaId={ofertaId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                        preguntaOriginalUsuario={preguntaOriginal} // Ya está resuelto
                        resolverPreguntaId={resolverPreguntaId}   // Ya está resuelto
                    />
                </CardContent>
            </Card>
        </div>
    );
}