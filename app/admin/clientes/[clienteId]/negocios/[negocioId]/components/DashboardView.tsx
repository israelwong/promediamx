// app/admin/.../_components/DashboardView.tsx
import React from 'react';
import { getDashboardDataAction } from '@/app/admin/_lib/actions/dashboard/dashboard.actions';

// Iconos para las tarjetas de KPI
import { MessageSquare, UserPlus, CalendarCheck, AlertCircle } from 'lucide-react';

// Importamos los sub-componentes que vamos a crear
import KpiCard from './KpiCard';
import PipelineStatusChart from './PipelineStatusChart';
import AppointmentStatusChart from './AppointmentStatusChart';
import ActionItemsWidget from './ActionItemsWidget';

interface DashboardViewProps {
    negocioId: string;
}

export default async function DashboardView({ negocioId }: DashboardViewProps) {
    // 1. Llamamos a nuestra Server Action para obtener todos los datos de golpe.
    const result = await getDashboardDataAction({ negocioId });

    // 2. Manejamos el caso de error de forma elegante.
    if (!result.success || !result.data) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-red-700/50">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-red-400 mb-2">Error al Cargar el Dashboard</h2>
                <p className="text-zinc-400 max-w-md">
                    No se pudieron obtener los datos. Por favor, intenta recargar la página.
                    <br />
                    <span className="text-xs text-zinc-500 mt-2 block">Error: {result.error}</span>
                </p>
            </div>
        );
    }

    const { kpis, pipelineStatus, appointmentStatus, actionItems } = result.data;

    // 3. Renderizamos el dashboard con los datos obtenidos.
    return (
        <div className="space-y-6">
            {/* Fila 1: KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Conversaciones Activas" value={kpis.conversacionesActivas} icon={MessageSquare} />
                <KpiCard title="Leads Nuevos (Hoy)" value={kpis.leadsNuevosHoy} icon={UserPlus} />
                <KpiCard title="Citas Agendadas (Hoy)" value={kpis.citasAgendadasHoy} icon={CalendarCheck} />
            </div>

            {/* Fila 2: Flujos y Estados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineStatusChart data={pipelineStatus} />
                <AppointmentStatusChart data={appointmentStatus} />
            </div>

            {/* Fila 3: Centro de Acción */}
            <ActionItemsWidget data={actionItems} negocioId={negocioId} />
        </div>
    );
}