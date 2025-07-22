// app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/components/RealtimeCitasView.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { List, Calendar as CalendarIcon } from 'lucide-react';
import { type CitaListItem } from '@/app/admin/_lib/actions/citas/citas.schemas';

// Importamos los componentes para cada pestaña
import { CitasLista } from './CitasLista';
import CitasCalendario from './CitasCalendario';

interface RealtimeCitasViewProps {
    initialData: CitaListItem[];
    negocioId: string;
    clienteId: string; // Opcional, si necesitas el ID del cliente
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export default function RealtimeCitasView({ initialData, negocioId, clienteId }: RealtimeCitasViewProps) {
    const [citas, setCitas] = useState(initialData);

    useEffect(() => {
        if (!supabase) return;

        const channel = supabase.channel(`citas-updates-${negocioId}`);

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

        return () => { supabase.removeChannel(channel); };
    }, [negocioId]);

    return (
        <Tabs defaultValue="calendario" className="w-full flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800 max-w-xs">
                <TabsTrigger value="lista"><List className="h-4 w-4 mr-2" />Lista</TabsTrigger>
                <TabsTrigger value="calendario"><CalendarIcon className="h-4 w-4 mr-2" />Calendario</TabsTrigger>
            </TabsList>
            <TabsContent value="lista" className="mt-4 flex-grow">
                <CitasLista
                    negocioId={negocioId}
                    clienteId={clienteId}
                    citas={citas.map(cita => ({
                        id: cita.id,
                        asunto: cita.asunto,
                        status: cita.status,
                        lead: cita.lead
                            ? {
                                id: cita.lead.id,
                                nombre: cita.lead.nombre,
                                telefono: cita.lead.telefono
                            }
                            : { id: '', nombre: '', telefono: null },
                        tipoDeCita: cita.tipoDeCita
                            ? {
                                nombre: cita.tipoDeCita.nombre,
                                duracionMinutos: (cita.tipoDeCita && 'duracionMinutos' in cita.tipoDeCita
                                    ? (cita.tipoDeCita as { duracionMinutos?: number }).duracionMinutos ?? null
                                    : null)
                            }
                            : null,
                        fecha: cita.start,
                    }))}
                />
            </TabsContent>
            <TabsContent value="calendario" className="mt-4 flex-grow bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <CitasCalendario events={citas} />
            </TabsContent>
        </Tabs>
    );
}