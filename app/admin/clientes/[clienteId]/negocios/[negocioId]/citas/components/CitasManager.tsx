// -----------------------------------------------------------------------------
// RUTA: app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/components/CitasManager.tsx
// -----------------------------------------------------------------------------
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { CitaType } from '@/app/admin/_lib/actions/citas/citas.schemas';
import { getCitasPorNegocioAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import { toast } from 'react-hot-toast';

import { CitasCalendario } from './CitasCalendario';
import { CitasLista } from './CitasLista';
import { Button } from '@/app/components/ui/button';
import { List, Calendar as CalendarIcon } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface Props {
    initialCitas: CitaType[];
    negocioId: string;
}

type ViewMode = 'lista' | 'calendario';

export default function CitasManager({ initialCitas, negocioId }: Props) {
    const [citas, setCitas] = useState(initialCitas);
    const [viewMode, setViewMode] = useState<ViewMode>('lista');

    useEffect(() => {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error("Supabase URL o Anon Key no están configuradas.");
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const channel = supabase
            .channel('agenda-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'Agenda' }, // Escuchar INSERT, UPDATE, DELETE
                (payload) => {
                    console.log('Cambio detectado en Agenda:', payload);
                    toast.success('La agenda ha sido actualizada.', { icon: '🗓️' });

                    async function refreshCitas() {
                        const result = await getCitasPorNegocioAction(negocioId);
                        if (result.success) {
                            setCitas(result.data || []);
                        }
                    }
                    refreshCitas();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [negocioId]);

    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <div className="flex justify-end mb-4">
                <div className="inline-flex items-center rounded-md bg-zinc-800 p-1">
                    <Button
                        variant={viewMode === 'lista' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('lista')}
                        className={`transition-colors ${viewMode === 'lista' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        <List className="h-4 w-4 mr-2" />
                        Lista
                    </Button>
                    <Button
                        variant={viewMode === 'calendario' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('calendario')}
                        className={`transition-colors ${viewMode === 'calendario' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-zinc-400 hover:bg-zinc-700'}`}
                    >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Calendario
                    </Button>
                </div>
            </div>

            {viewMode === 'lista' ? (
                <CitasLista citas={citas} />
            ) : (
                <CitasCalendario citas={citas} />
            )}
        </div>
    );
}

