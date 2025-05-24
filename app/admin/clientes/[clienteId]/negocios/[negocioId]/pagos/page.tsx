// app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/page.tsx
import React from 'react';
import { Metadata } from 'next';
import PagosConfiguracion from './components/PagosConfiguracion';
// Renombramos PagosLista a PagosHistorial
import PagosHistorial from './components/PagosHistorial';
import { getNegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions';
import { type NegocioConfiguracionPago } from '@/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas';
import { getNegocioTransaccionesAction } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.actions';
import { type NegocioTransaccion } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas';
// import HeaderPage from '@/app/admin/_components/HeaderPage';

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

    // Cargar transacciones (primera página por defecto)
    const transaccionesResult = await getNegocioTransaccionesAction({ negocioId, page: 1, pageSize: 10 });
    let initialTransactions: NegocioTransaccion[] = [];
    let totalTransactions = 0;
    let errorTransacciones: string | null = null;

    if (transaccionesResult.success && transaccionesResult.data) {
        initialTransactions = transaccionesResult.data.transacciones;
        totalTransactions = transaccionesResult.data.totalCount;
    } else {
        errorTransacciones = transaccionesResult.error || 'No se pudo cargar el historial de transacciones.';
    }

    return (
        <div className="space-y-8"> {/* Aumentado el espacio general */}
            {/* <HeaderPage
                    title="Pagos y Transacciones"
                    description="Configura tus métodos de cobro y visualiza el historial de transacciones de tu negocio."
                /> */}

            {errorConfiguracion && (
                <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" role="alert">
                    <p className="font-bold">Error al cargar configuración:</p>
                    <p>{errorConfiguracion}</p>
                </div>
            )}

            <PagosConfiguracion
                negocioId={negocioId}
                configuracionInicial={configuracionPago}
            // esNuevaConfiguracion ya está dentro de configuracionPago
            />

            {errorTransacciones && (
                <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" role="alert">
                    <p className="font-bold">Error al cargar transacciones:</p>
                    <p>{errorTransacciones}</p>
                </div>
            )}

            {/* Separador visual */}
            <hr className="my-8 border-zinc-200 dark:border-zinc-700" />


            <PagosHistorial
                negocioId={negocioId}
                initialTransactions={initialTransactions}
                totalCount={totalTransactions}
            // Podríamos pasar pageSize y page actual si quisiéramos que el server component maneje toda la paginación
            />
        </div>
    );
}
