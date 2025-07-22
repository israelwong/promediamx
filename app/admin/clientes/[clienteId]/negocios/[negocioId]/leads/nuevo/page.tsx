// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/nuevo/page.tsx

import React from 'react';
import { Metadata } from 'next';
import LeadFormNuevo from './components/LeadFormNuevo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Nuevo Lead',
};

// Interfaz para los parámetros de la página
interface NuevoLeadPageParams {
    clienteId: string;
    negocioId: string;
}

// ✅ Se actualiza la firma de la función para usar async/await con los parámetros,
// como lo requiere tu versión de Next.js.
export default async function NuevoLeadPage({ params }: { params: Promise<NuevoLeadPageParams> }) {
    const { clienteId, negocioId } = await params;

    return (
        <div className="space-y-6">
            <Link
                href={`/admin/clientes/${clienteId}/negocios/${negocioId}/leads`}
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
            >
                <ArrowLeft size={16} />
                Volver a la lista de leads
            </Link>

            <header>
                <h1 className="text-2xl font-semibold text-zinc-100">
                    Agregar Nuevo Lead
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Crea un nuevo contacto con la información básica. Podrás añadir más detalles después.
                </p>
            </header>

            <LeadFormNuevo negocioId={negocioId} clienteId={clienteId} />
        </div>
    );
}
