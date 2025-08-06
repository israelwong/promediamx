import { obtenerAgenteConOfertas } from "@/app/admin/_lib/actions/agente/agente.actions";
import AsignarOfertasForm from "./components/AsignarOfertasForm";
import { notFound } from 'next/navigation';
import EditarAgenteForm from "./components/EditarAgenteForm";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Detalle del Agente',
    description: 'Detalles y gestión del agente',
};

interface PaginaDetalleAgenteParams {
    clienteId: string;
    negocioId: string;
    agenteId: string;
}

export default async function PaginaDetalleAgente({ params: paramsPromise }: { params: Promise<PaginaDetalleAgenteParams> }) {

    const params = await paramsPromise; // Se resuelve la promesa
    const { agenteId } = params;

    if (!agenteId) {
        notFound();
    }

    const result = await obtenerAgenteConOfertas(agenteId);

    if (!result.success || !result.data) {
        return <div className="p-8 text-red-500">Error: {result.error}</div>;
    }

    const { agente, todasLasOfertas, ofertasAsignadasIds } = result.data;

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{agente.nombre}</h1>
                <p className="text-muted-foreground">{agente.email}</p>
            </div>

            <EditarAgenteForm agente={agente} />

            <AsignarOfertasForm
                agenteId={agente.id}
                todasLasOfertas={todasLasOfertas}
                ofertasAsignadasIniciales={ofertasAsignadasIds}
            />
        </div>
    );
}