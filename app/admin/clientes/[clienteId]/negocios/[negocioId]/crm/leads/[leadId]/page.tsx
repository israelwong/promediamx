import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation'; // Para manejar lead no encontrado
import LeadFormEditar from '../components/LeadEditForm';
import LeadGestionCitas from '../components/LeadGestionCitas';
import { obtenerDetallesLead, obtenerDatosParaFormularioLead } from '@/app/admin/_lib/crmLead.actions'; // Ajusta ruta
import { DatosFormularioLead } from '@/app/admin/_lib/types'; // Asegúrate de que este tipo esté exportado


// Función para generar metadata dinámica (opcional)
export async function generateMetadata({ params }: { params: Promise<{ leadId: string }> }): Promise<Metadata> {
    const { leadId } = await params; // Asegurarse de esperar params
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
    const datosSelects = datosFiltrosResult.success ? datosFiltrosResult.data : null as DatosFormularioLead | null;

    return (
        // Usar un layout de Grid o Flex para organizar los componentes si es necesario
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Columna Principal (Formulario de Edición) */}
            <div className="lg:col-span-1 space-y-6">

                <LeadFormEditar
                    leadInicial={leadInicial}
                    datosSelects={datosSelects ?? null} // Pasar datos (puede ser null)
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </div>

            {/* Columna Secundaria (Gestión de Citas) */}
            <div className="lg:col-span-1 space-y-4 bg-zinc-800/50 p-4 rounded-lg shadow-md border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-200 border-b border-zinc-700 pb-2">Agenda y Seguimiento</h3>
                {/* Pasar leadId y negocioId (o crmId si ya lo tienes) */}
                <LeadGestionCitas leadId={leadId} negocioId={negocioId} />
                {/* Aquí podrías añadir también la Bitácora del Lead en el futuro */}
            </div>

        </div>
    );
}
