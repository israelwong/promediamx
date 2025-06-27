// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LeadFormEditar from './components/LeadEditForm'; // Sin cambios aquí
import LeadGestionCitas from './components/LeadGestionCitas'; // Sin cambios aquí

// --- NUEVAS IMPORTS ---
import {
    obtenerLeadDetallesAction,
    obtenerDatosParaFormularioLeadAction
} from '@/app/admin/_lib/actions/lead/lead.actions'; // Nueva ruta
import type {
    LeadDetalleData,
    DatosFormularioLeadData
} from '@/app/admin/_lib/actions/lead/lead.schemas'; // Nuevos tipos Zod


// export async function generateMetadata... (usaría la nueva obtenerLeadDetallesAction)
export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ leadId: string, negocioId: string, clienteId: string }> }): Promise<Metadata> {
    const { leadId } = await paramsPromise;
    const result = await obtenerLeadDetallesAction({ leadId }); // Nueva action
    const leadName = result.success ? result.data?.nombre : 'Lead';
    return {
        title: `Editar Lead: ${leadName || leadId.substring(0, 8)}`,
    };
}

interface Props {
    clienteId: string;
    negocioId: string;
    leadId: string;
}

export default async function LeadDetailPage({ params: paramsPromise }: { params: Promise<Props> }) {
    const { leadId, negocioId, clienteId } = await paramsPromise;

    const [leadResult, datosFormularioResult] = await Promise.all([
        obtenerLeadDetallesAction({ leadId }),             // Nueva action
        obtenerDatosParaFormularioLeadAction({ negocioId }) // Nueva action
    ]);

    if (!leadResult.success || !leadResult.data) {
        console.error("Lead no encontrado (page.tsx):", leadResult.error);
        notFound();
    }

    // datosFormularioResult puede fallar sin ser crítico, el form manejará null
    if (!datosFormularioResult.success) {
        console.warn("Error cargando datos para selects del formulario (page.tsx):", datosFormularioResult.error);
    }

    const leadInicial: LeadDetalleData = leadResult.data; // Tipado con Zod
    const datosSelects: DatosFormularioLeadData | null = datosFormularioResult.data ?? null; // Tipado con Zod

    // Adaptar leadInicial para cumplir con LeadDetallesEditar (status y otros campos requeridos como string)
    const leadInicialAdaptado = {
        ...leadInicial,
        status: leadInicial.status ?? "",
        email: leadInicial.email ?? "",
        telefono: leadInicial.telefono ?? "",
        pipelineId: leadInicial.pipelineId ?? "",
        agenteId: leadInicial.agenteId ?? "",
        canalId: leadInicial.canalId ?? "",
        valorEstimado: leadInicial.valorEstimado ?? 0,
        createdAt: leadInicial.createdAt ?? new Date(),
        updatedAt: leadInicial.updatedAt ?? new Date(),
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-6"> {/* Ajustado a xl:grid-cols-5 como sugerencia previa */}
            {/* Columna Principal (Formulario de Edición) */}
            <div className="lg:col-span-2 xl:col-span-3 space-y-6"> {/* Ajustado col-span */}
                <LeadFormEditar
                    leadInicial={leadInicialAdaptado}
                    datosSelects={datosSelects} // Puede ser null
                    negocioId={negocioId}
                    clienteId={clienteId}
                // conversacionId si fuera necesario para alguna acción de log
                />
            </div>

            {/* Columna Secundaria (Gestión de Citas y otros) */}
            <div className="lg:col-span-1 xl:col-span-2 space-y-4 bg-zinc-800/50 p-4 rounded-lg shadow-md border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-200 border-b border-zinc-700 pb-2">Agenda y Seguimiento</h3>
                <LeadGestionCitas leadId={leadId} negocioId={negocioId} />
                {/* Aquí podrías añadir también la Bitácora del Lead en el futuro */}
            </div>
        </div>
    );
}