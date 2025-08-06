'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// --- CAMBIO CLAVE: Importamos el tipo correcto desde el archivo de schemas ---
import { type KanbanData } from '@/app/admin/_lib/actions/agente/agente.schemas';
import PipelineKanbanBoard from './PipelineKanbanBoard';

interface RealtimeKanbanViewProps {
    initialBoardData: KanbanData;
    crmId: string;
    negocioId: string;
    clienteId: string;
}

// ... (código de inicialización de Supabase sin cambios)
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}


export default function RealtimeKanbanView({
    initialBoardData,
    crmId,
    negocioId,
    clienteId
}: RealtimeKanbanViewProps) {
    const router = useRouter();
    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel(`realtime-kanban-updates-${crmId}`);

        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Lead', filter: `crmId=eq.${crmId}` },
            () => {
                // console.log('Cambio detectado en el Kanban:', payload);
                router.refresh();
            }
        ).subscribe();

        return () => {
            if (supabase) supabase.removeChannel(channel);
        };
    }, [crmId, router]);

    // Transformamos los datos al formato que espera PipelineKanbanBoard
    const boardData = {
        columns: initialBoardData.etapasPipeline.map(etapa => ({
            id: etapa.id,
            nombre: etapa.nombre,
            leads: initialBoardData.leads.filter(lead => lead.pipelineId === etapa.id),
        }))
    };
    return (
        <PipelineKanbanBoard
            initialBoardData={boardData}
            // --- CAMBIO CLAVE: Pasamos los IDs que recibimos por props ---
            negocioId={negocioId}
            clienteId={clienteId}
        />
    );
}