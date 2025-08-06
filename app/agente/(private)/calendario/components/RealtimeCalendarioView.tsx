/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/calendario/components/RealtimeCalendarioView.tsx
*/
"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// ✅ Se importa el nuevo tipo de datos para el calendario
import { type CitaParaCalendario } from '@/app/admin/_lib/actions/citas/citas.schemas';
import CitasCalendario from './CitasCalendario';
// ✅ Se importa la nueva acción
import { listarCitasParaCalendarioAction } from '@/app/admin/_lib/actions/citas/citas.actions';

interface RealtimeCalendarioViewProps {
    initialData: CitaParaCalendario[];
    negocioId: string;
    clienteId: string;
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
        const channel = supabase.channel(`citas-calendario-updates-${negocioId}`);
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Agenda', filter: `negocioId=eq.${negocioId}` },
            async () => {
                // ✅ Se llama a la nueva acción y se actualiza el estado directamente, sin mapeos complejos.
                const result = await listarCitasParaCalendarioAction({ negocioId });
                if (result.success && result.data) {
                    setCitas(result.data);
                }
            }
        ).subscribe();
        return () => { if (supabase) supabase.removeChannel(channel); };
    }, [negocioId]);

    return (
        <div className="flex-grow bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
            <CitasCalendario events={citas} />
        </div>
    );
}
