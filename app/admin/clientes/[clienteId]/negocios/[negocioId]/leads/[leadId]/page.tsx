// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import LeadFormEditar from './components/LeadEditForm';
import LeadGestionCitas from './components/LeadGestionCitas';
import LeadBitacora from './components/LeadBitacora';
import { Metadata } from 'next';


export const metadata: Metadata = {
    title: 'Editar Lead',
    description: 'Edita los detalles de un lead existente.'
};

import {
    obtenerLeadDetallesAction,
    obtenerDatosParaFormularioLeadAction
} from '@/app/admin/_lib/actions/lead/lead.actions';
import type {
    LeadDetalleData,
    DatosFormularioLeadData
} from '@/app/admin/_lib/actions/lead/lead.schemas';
// import { metadata } from '../page';



interface Props {
    clienteId: string;
    negocioId: string;
    leadId: string;
}

export default async function LeadDetailPage({ params: paramsPromise }: { params: Promise<Props> }) {
    const { leadId, negocioId, clienteId } = await paramsPromise;

    const [leadResult, datosFormularioResult] = await Promise.all([
        obtenerLeadDetallesAction({ leadId }),
        obtenerDatosParaFormularioLeadAction({ negocioId })
    ]);

    if (!leadResult.success || !leadResult.data) {
        notFound();
    }

    if (!datosFormularioResult.success) {
        console.warn("Error cargando datos para selects del formulario:", datosFormularioResult.error);
    }

    const leadInicial: LeadDetalleData = leadResult.data;
    const datosSelects: DatosFormularioLeadData | null = datosFormularioResult.data ?? null;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
                <LeadFormEditar
                    leadInicial={leadInicial}
                    // ✅ Se pasan los datos del formulario, que ahora incluyen los campos personalizados
                    datosFormulario={datosSelects}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

            <div className="xl:col-span-1 space-y-4">
                <LeadGestionCitas leadId={leadId} negocioId={negocioId} />
                <LeadBitacora leadId={leadId} />
            </div>

        </div>
    );
}
