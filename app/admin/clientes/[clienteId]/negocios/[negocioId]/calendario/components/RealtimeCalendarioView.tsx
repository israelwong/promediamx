// app/admin/clientes/[clienteId]/negocios/[negocioId]/calendario/components/RealtimeCalendarioView.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type CitaListItem } from '@/app/admin/_lib/actions/citas/citas.schemas';

// Asumimos que el componente CitasCalendario se puede reutilizar desde la carpeta de citas
import CitasCalendario from '../../citas/components/CitasCalendario';

interface RealtimeCalendarioViewProps {
    initialData: CitaListItem[];
    negocioId: string;
    clienteId: string;
}

// La inicialización de Supabase se mantiene igual
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimeCalendarioView({ initialData, negocioId, clienteId }: RealtimeCalendarioViewProps) {
    const [citas, setCitas] = useState(initialData);

    useEffect(() => {
        setCitas(initialData);
    }, [initialData]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase.channel(`citas-calendario-updates-${negocioId}`);

        channel.on(
            'postgres_changes',
            // Escucha cualquier cambio en la tabla de Agenda para este negocio
            { event: '*', schema: 'public', table: 'Agenda', filter: `negocioId=eq.${negocioId}` },
            // Cuando hay un cambio, vuelve a pedir la lista completa de citas
            () => {
                import('@/app/admin/_lib/actions/citas/citas.actions').then(actions => {
                    actions.listarCitasAction({ negocioId }).then(result => {
                        if (result.success && result.data) {
                            setCitas(result.data);
                        }
                    });
                });
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
