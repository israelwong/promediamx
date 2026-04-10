"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type DashboardData } from '@/app/admin/_lib/actions/dashboard/dashboard.schemas';

// Importamos los sub-componentes que ya creamos
import KpiCard from './KpiCard';
import PipelineStatusChart from './PipelineStatusChart';
import AppointmentStatusChart from './AppointmentStatusChart';
// import ActionItemsWidget from './ActionItemsWidget';

// Iconos
import { UserPlus, CalendarCheck } from 'lucide-react';

interface RealtimeDashboardProps {
    initialData: DashboardData;
    negocioId: string;
}

// Inicialización del cliente Supabase
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
}

export default function RealtimeDashboard({ initialData, negocioId }: RealtimeDashboardProps) {
    // El estado del dashboard ahora vive en el cliente, inicializado con los datos del servidor.
    const [data, setData] = useState(initialData);

    useEffect(() => {
        if (!supabase) return;

        // Creamos un único canal para todas nuestras suscripciones de este dashboard.
        const channel = supabase.channel(`dashboard-updates-${negocioId}`);

        // Suscripción a la tabla 'Lead'
        channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Lead' },
            (payload) => {
                // En un caso real necesitaríamos una forma de saber si el nuevo lead
                // pertenece a este negocio. Si tu modelo Lead no tiene negocioId directo,
                // por ahora, incrementaremos para la demo.
                console.log('Nuevo Lead detectado:', payload.new);
                setData(prevData => ({
                    ...prevData,
                    kpis: { ...prevData.kpis, leadsNuevosHoy: prevData.kpis.leadsNuevosHoy + 1 }
                }));
            }
        );

        // Definir el tipo para los datos nuevos de Agenda
        type AgendaPayload = {
            negocioId: string;
            // Agrega aquí otros campos relevantes si es necesario
            [key: string]: unknown;
        };

        // Suscripción a la tabla 'Agenda'
        channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Agenda' },
            (payload) => {
                const newAgenda = payload.new as AgendaPayload;
                // Aquí sí podemos verificar porque 'Agenda' tiene 'negocioId'
                if (newAgenda?.negocioId === negocioId) {
                    console.log('Nueva Cita detectada para este negocio:', payload.new);
                    setData(prevData => ({
                        ...prevData,
                        kpis: { ...prevData.kpis, citasAgendadasHoy: prevData.kpis.citasAgendadasHoy + 1 }
                    }));
                }
            }
        );

        // Suscripción a la tabla 'Conversacion'
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Conversacion' }, // El filtro aquí es más complejo, lo hacemos en el cliente
            (payload) => {
                // En un caso real, necesitaríamos verificar que esta conversación pertenece al negocio.
                // Por ahora, para el MVP, asumimos que si llega, es relevante.
                console.log('Nueva Conversación detectada:', payload.new);
                setData(prevData => ({
                    ...prevData,
                    kpis: {
                        ...prevData.kpis,
                        conversacionesActivas: prevData.kpis.conversacionesActivas + 1,
                    }
                }));
            }
        );

        channel.subscribe((status, err) => {
            if (err) console.error(`Error en suscripción Realtime del Dashboard:`, err);
            else console.log(`Canal Realtime '${channel.topic}' suscrito con estado: ${status}`);
        });

        // Limpiamos la suscripción cuando el componente se desmonta.
        return () => {
            if (supabase) {
                supabase.removeChannel(channel).catch(console.error);
            }
        };
    }, [negocioId]);

    // El JSX es el mismo que el de DashboardView, pero ahora usa el estado local 'data'.
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {/* <KpiCard title="Conversaciones Activas" value={data.kpis.conversacionesActivas} icon={MessageSquare} /> */}
                <KpiCard title="Leads Nuevos (Hoy)" value={data.kpis.leadsNuevosHoy} icon={UserPlus} />
                <KpiCard title="Citas Agendadas (Hoy)" value={data.kpis.citasAgendadasHoy} icon={CalendarCheck} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PipelineStatusChart data={data.pipelineStatus} />
                <AppointmentStatusChart data={data.appointmentStatus} />
            </div>

            {/* <ActionItemsWidget data={data.actionItems} negocioId={negocioId} /> */}
        </div>
    );
}