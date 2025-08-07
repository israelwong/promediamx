// app/agente/calendario/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { headers } from 'next/headers';
import { verifyToken } from '@/app/agente/_lib/actions/auth.actions'; // Para obtener el negocioId
import { redirect } from 'next/navigation';

import { listarCitasParaCalendarioAgenteAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import RealtimeCalendarioView from './components/RealtimeCalendarioView';
import prisma from '@/app/admin/_lib/prismaClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi Calendario de Citas' };

export default async function CalendarioAgentePage() {
    headers(); // Opt-in para renderizado dinámico

    // --- LÓGICA AGENTE: Se llama a la nueva acción sin parámetros ---
    const initialCitasResult = await listarCitasParaCalendarioAgenteAction();

    // --- LÓGICA AGENTE: Obtenemos el negocioId para el canal de Supabase ---
    // Esta lógica es necesaria para que el canal de Supabase sepa a qué negocio escuchar.
    const tokenCookie = (await headers()).get('cookie')?.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1];
    if (!tokenCookie) redirect('/agente/login');
    const verificationResult = await verifyToken(tokenCookie);
    if (!verificationResult.success || !verificationResult.payload) redirect('/agente/login');

    const agente = await prisma.agente.findUnique({
        where: { id: verificationResult.payload.id },
        select: { crm: { select: { negocioId: true } } }
    });
    const negocioId = agente?.crm?.negocioId;

    if (!negocioId) {
        return <p className="p-6">Error: No se pudo determinar el negocio para este agente.</p>;
    }

    if (!initialCitasResult.success) {
        return <p className="p-6">Error al cargar las citas.</p>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header>
                <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                    <Calendar /> Mi Calendario de Citas
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Visualiza todas las citas de tus prospectos asignados.
                </p>
            </header>
            <RealtimeCalendarioView
                initialData={initialCitasResult.data || []}
                negocioId={negocioId} // Se sigue necesitando para el filtro del canal de Supabase
            />
        </div>
    );
}