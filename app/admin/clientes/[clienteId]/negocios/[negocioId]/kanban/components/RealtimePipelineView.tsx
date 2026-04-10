"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Lead } from '@prisma/client';

// Se asume que este componente existe y se encarga de renderizar el tablero
import PipelineKanbanBoard from './PipelineKanbanBoard';

import type { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';

interface RealtimePipelineViewProps {
    initialKanbanData: KanbanBoardData;
    clienteId: string;
    negocioId: string;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimePipelineView({
    initialKanbanData, negocioId, clienteId
}: RealtimePipelineViewProps) {

    const [kanbanData, setKanbanData] = useState(initialKanbanData);

    useEffect(() => {
        setKanbanData(initialKanbanData);
    }, [initialKanbanData]);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase.channel(`pipeline-updates-${negocioId}`);
        channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Lead' },
            (payload) => {
                const newLeadFromDb = payload.new as Lead;

                // ✅ CORRECCIÓN: Se añade la propiedad 'fechaProximaCita' que faltaba.
                const newLeadForKanban: LeadInKanbanCard = {
                    ...newLeadFromDb,
                    createdAt: new Date(newLeadFromDb.createdAt),
                    updatedAt: new Date(newLeadFromDb.updatedAt),
                    valorEstimado: newLeadFromDb.valorEstimado ?? null,
                    agente: null,
                    Etiquetas: [],
                    fechaProximaCita: null, // Un nuevo lead no tiene citas aún.
                };

                setKanbanData(prev => {
                    const targetColumnIndex = prev.columns.findIndex(c => c.nombre.toLowerCase() === 'nuevo');
                    const insertIndex = targetColumnIndex !== -1 ? targetColumnIndex : 0;

                    if (prev.columns.length === 0) return prev;

                    const newColumns = prev.columns.map((col, index) => {
                        if (index === insertIndex) {
                            return { ...col, leads: [newLeadForKanban, ...col.leads] };
                        }
                        return col;
                    });
                    return { ...prev, columns: newColumns };
                });
            }
        ).subscribe();

        return () => { if (supabase) supabase.removeChannel(channel); };
    }, [negocioId]);

    const handleKanbanChange = (newKanbanData: KanbanBoardData) => {
        setKanbanData(newKanbanData);
    };

    // Se asume que el componente PipelineView fue renombrado o reemplazado por PipelineKanbanBoard
    return (
        <PipelineKanbanBoard
            boardData={kanbanData}
            onBoardChange={handleKanbanChange}
            negocioId={negocioId}
            clienteId={clienteId} // <-- Añade esta línea

        />
    );
}
