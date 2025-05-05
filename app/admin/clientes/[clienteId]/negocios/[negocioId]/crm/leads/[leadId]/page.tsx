// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Para manejar lead no encontrado
import LeadFormEditar from '../components/LeadEditForm';
import { obtenerDetallesLead, obtenerDatosParaFormularioLead } from '@/app/admin/_lib/crmLead.actions'; // Ajusta ruta
// import HeaderPage from '@/app/admin/_components/HeaderPage'; // Opcional

// Función para generar metadata dinámica (opcional)
export async function generateMetadata({ params }: { params: { leadId: string } }): Promise<Metadata> {
    const { leadId } = await params;
    const result = await obtenerDetallesLead(leadId);
    const leadName = result.success ? result.data?.nombre : 'Lead';
    return {
        title: `Editar Lead: ${leadName || leadId}`,
    };
}

interface Props {
    clienteId: string;
    negocioId: string;
    leadId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { leadId, negocioId, clienteId } = await params;

    // Obtener datos en paralelo
    const [leadResult, datosFiltrosResult] = await Promise.all([
        obtenerDetallesLead(leadId),
        obtenerDatosParaFormularioLead(negocioId) // Reutilizar acción
    ]);

    // Manejar si el lead no se encuentra
    if (!leadResult.success || !leadResult.data) {
        console.error("Lead no encontrado:", leadResult.error);
        notFound(); // Muestra página 404 de Next.js
    }

    // Manejar si los datos para filtros fallan (menos crítico, el form puede mostrar selects vacíos)
    if (!datosFiltrosResult.success) {
        console.warn("Error cargando datos para selects:", datosFiltrosResult.error);
    }

    const leadInicial = leadResult.data;
    const datosSelects = datosFiltrosResult.success ? datosFiltrosResult.data : null;

    return (
        <div className="space-y-6">
            {/* <HeaderPage
                title={`Editando Lead: ${leadInicial.nombre}`}
                description="Actualiza la información y asignaciones de este prospecto."
                backButton={{ href: `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`, label: 'Volver a Leads' }}
            /> */}

            {/* Pasar datos iniciales al componente de formulario */}
            <LeadFormEditar
                leadInicial={leadInicial}
                datosSelects={datosSelects ?? null}
                negocioId={negocioId}
                clienteId={clienteId}
            />

            {/* Aquí podrías añadir otras secciones relacionadas con el lead */}
            {/* Ej: <ConversacionesLead leadId={leadId} /> */}
            {/* Ej: <BitacoraLead leadId={leadId} /> */}

        </div>
    );
}
