// app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/page.tsx
import React from 'react';
import { Metadata } from 'next';
import PagosConfiguracion from './components/PagosConfiguracion';
import { getNegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions';
import { type NegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas';

export const metadata: Metadata = {
    title: 'Pagos y Transacciones',
    description: 'Gestiona la configuración de pagos y transacciones de tu negocio.',
};

interface PageParams {
    clienteId: string;
    negocioId: string;

}

interface NegocioConfiguracionPagoConStatus extends NegocioConfiguracionPago {
    _esNuevaConfiguracion?: boolean;
}

export default async function PagosPage({ params }: { params: Promise<PageParams> }) {
    const { negocioId } = await params;

    if (!negocioId) {
        return <div>Error: ID de negocio no encontrado.</div>;
    }

    // Cargar configuración de pagos
    const configuracionResult = await getNegocioConfiguracionPago({ negocioId });
    let configuracionPago: NegocioConfiguracionPagoConStatus | null = null;
    let errorConfiguracion: string | null = null;

    if (configuracionResult.success) {
        configuracionPago = configuracionResult.data as NegocioConfiguracionPagoConStatus;
    } else {
        errorConfiguracion = configuracionResult.error || 'No se pudo cargar la configuración de pagos.';
    }

    return (
        <div className="grid grid-cols-1 items-stretch">
            <div>
                {errorConfiguracion && (
                    <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" role="alert">
                        <p className="font-bold">Error al cargar configuración:</p>
                        <p>{errorConfiguracion}</p>
                    </div>
                )}
                <PagosConfiguracion
                    negocioId={negocioId}
                    configuracionInicial={configuracionPago}
                />
            </div>

        </div>
    );
}
