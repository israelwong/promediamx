// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/RealtimeLeadList.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Lead } from '@prisma/client';

// Asumimos que este componente ya existe y muestra la tabla/lista de leads.
import LeadList from './LeadList';

import type { ListarLeadsResult, LeadListItem } from '@/app/admin/_lib/actions/lead/lead.schemas';

interface RealtimeLeadListProps {
    initialLeadsData: ListarLeadsResult;
    clienteId: string;
    negocioId: string;
}

// La inicialización de Supabase se mantiene igual.
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimeLeadList({
    initialLeadsData, clienteId, negocioId
}: RealtimeLeadListProps) {

    const [leadsData, setLeadsData] = useState(initialLeadsData);

    // Sincroniza el estado con los datos iniciales del servidor.
    useEffect(() => {
        setLeadsData(initialLeadsData);
    }, [initialLeadsData]);

    // Efecto para escuchar los cambios en tiempo real de Supabase.
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase.channel(`leads-list-updates-${negocioId}`);
        channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Lead' },
            (payload) => {
                const newLeadFromDb = payload.new as Lead;
                // Prepara el nuevo lead para que coincida con el tipo de la lista.
                const newLeadForList: LeadListItem = {
                    ...newLeadFromDb,
                    createdAt: new Date(newLeadFromDb.createdAt),
                    etapaPipeline: null, // Puedes enriquecer esto si es necesario.
                    agenteAsignado: null
                };

                // Actualiza el estado para añadir el nuevo lead al principio de la lista.
                setLeadsData(prev => ({
                    ...prev,
                    leads: [newLeadForList, ...prev.leads],
                    totalCount: prev.totalCount + 1
                }));
            }
        ).subscribe();

        // Limpia la suscripción al desmontar el componente.
        return () => { if (supabase) supabase.removeChannel(channel); };
    }, [negocioId]);

    // ✅ Ya no hay pestañas, se renderiza directamente la lista de leads.
    return (
        <LeadList data={leadsData} clienteId={clienteId} negocioId={negocioId} />
    );
}
