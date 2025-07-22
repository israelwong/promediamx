// app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/components/RealtimeCitasList.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type CitaListItem } from '@/app/admin/_lib/actions/citas/citas.schemas';

// Importamos el componente que renderiza la lista
import { CitasLista } from './CitasLista';

interface RealtimeCitasListProps {
    initialData: CitaListItem[];
    negocioId: string;
    clienteId: string;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimeCitasList({ initialData, negocioId, clienteId }: RealtimeCitasListProps) {
    const [citas, setCitas] = useState(initialData);

    useEffect(() => {
        setCitas(initialData);
    }, [initialData]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase.channel(`citas-list-updates-${negocioId}`);

        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Agenda', filter: `negocioId=eq.${negocioId}` },
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
        <CitasLista
            citas={citas.map(cita => ({
                id: cita.id,
                asunto: cita.asunto,
                status: cita.status,
                lead: cita.lead
                    ? { id: cita.lead.id, nombre: cita.lead.nombre, telefono: cita.lead.telefono }
                    : { id: '', nombre: 'Lead no encontrado', telefono: null },
                tipoDeCita: cita.tipoDeCita
                    ? {
                        nombre: cita.tipoDeCita.nombre,
                        duracionMinutos: (cita.tipoDeCita as { nombre: string; duracionMinutos?: number | null })?.duracionMinutos ?? null
                    }
                    : null,
                fecha: cita.start,
            }))}
            negocioId={negocioId}
            clienteId={clienteId}
        />
    );
}
