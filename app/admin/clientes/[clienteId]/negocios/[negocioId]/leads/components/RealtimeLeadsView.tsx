"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Users, Columns } from 'lucide-react';
import { Lead } from '@prisma/client';

import LeadList from './LeadList';
import PipelineView from './PipelineView';

import type { ListarLeadsResult, LeadListItem } from '@/app/admin/_lib/actions/lead/lead.schemas';
import type { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';

interface RealtimeLeadsViewProps {
    initialLeadsData: ListarLeadsResult;
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

export default function RealtimeLeadsView({
    initialLeadsData, initialKanbanData, clienteId, negocioId
}: RealtimeLeadsViewProps) {

    const [leadsData, setLeadsData] = useState(initialLeadsData);
    const [kanbanData, setKanbanData] = useState(initialKanbanData);

    useEffect(() => {
        setLeadsData(initialLeadsData);
        setKanbanData(initialKanbanData);
    }, [initialLeadsData, initialKanbanData]);

    useEffect(() => {
        if (!supabase) return;
        const channel = supabase.channel(`leads-updates-${negocioId}`);
        channel.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'Lead' },
            (payload) => {
                const newLeadFromDb = payload.new as Lead;

                const newLeadForList: LeadListItem = { ...newLeadFromDb, createdAt: new Date(newLeadFromDb.createdAt), etapaPipeline: null, agenteAsignado: null };
                const newLeadForKanban: LeadInKanbanCard = { ...newLeadFromDb, createdAt: new Date(newLeadFromDb.createdAt), updatedAt: new Date(newLeadFromDb.updatedAt), valorEstimado: null, agente: null, Etiquetas: [] };

                setLeadsData(prev => ({ ...prev, leads: [newLeadForList, ...prev.leads], totalCount: prev.totalCount + 1 }));
                setKanbanData(prev => {
                    if (prev.columns.length === 0) return prev;
                    const newColumns = prev.columns.map((col, index) => {
                        if (index === 0) {
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

    return (
        <Tabs defaultValue="pipeline" className="w-full flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800 max-w-md">
                <TabsTrigger value="lista"><Users className="h-4 w-4 mr-2" />Lista de Leads</TabsTrigger>
                <TabsTrigger value="pipeline"><Columns className="h-4 w-4 mr-2" />Vista Pipeline</TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="mt-4 flex-grow">
                <LeadList data={leadsData} clienteId={clienteId} negocioId={negocioId} />
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4 flex-grow">
                <PipelineView
                    data={kanbanData}
                    onBoardChange={handleKanbanChange}
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            </TabsContent>
        </Tabs>
    );
}