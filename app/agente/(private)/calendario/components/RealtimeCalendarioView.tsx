// app/agente/calendario/components/RealtimeCalendarioView.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type CitaParaCalendario } from '@/app/admin/_lib/actions/citas/citas.schemas'; // Reutilizamos el schema
import CitasCalendario from './CitasCalendario';
// --- CAMBIO: Se importa la nueva acción específica para el agente ---
import { listarCitasParaCalendarioAgenteAction } from '@/app/admin/_lib/actions/citas/citas.actions';

interface RealtimeCalendarioViewProps {
    initialData: CitaParaCalendario[];
    negocioId: string; // Necesario para el filtro del canal de Supabase
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimeCalendarioView({ initialData, negocioId }: RealtimeCalendarioViewProps) {
    const [citas, setCitas] = useState(initialData);

    useEffect(() => { setCitas(initialData); }, [initialData]);

    useEffect(() => {
        if (!supabase) return;

        // El canal sigue escuchando por negocio, ya que Supabase no puede filtrar por relaciones complejas.
        // El filtrado real se hace en la server action que llamamos.
        const channel = supabase.channel(`citas-calendario-updates-${negocioId}`);

        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Agenda', filter: `negocioId=eq.${negocioId}` },
            async () => {
                // --- CAMBIO: Al detectar un cambio, se llama a la acción del AGENTE ---
                // Esta acción ya contiene la lógica de filtrado por las ofertas del agente.
                const result = await listarCitasParaCalendarioAgenteAction();
                if (result.success && result.data) {
                    setCitas(result.data);
                }
            }
        ).subscribe();

        return () => { if (supabase) supabase.removeChannel(channel); };
    }, [negocioId]);

    return (
        <div className="flex-grow bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            {/* El componente CitasCalendario no necesita cambios */}
            <CitasCalendario events={citas} />
        </div>
    );
}